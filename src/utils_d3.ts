import * as d3 from 'd3';

import type { LegendWrapper, LineWrapper, StationWrapper, UpdateResult } from './schemas';
import {
    drawsWhole,
    intersect,
    localSpans,
    overlaps,
    planFronts,
    union,
    type Spans,
} from './tracks.ts';

import {
    clamp,
    findActive,
    findName,
    highlightedNames,
    isActive,
    relativeCenter,
    servesLine,
} from './utils.ts';

export const STEP_UNITS = {
    day: {
        interval: d3.utcDay,
        max: 30,
    },
    week: {
        interval: d3.utcWeek,
        max: 12,
    },
    month: {
        interval: d3.utcMonth,
        max: 12,
    },
    year: {
        interval: d3.utcYear,
        max: 10,
    },
} as const;

export type StepUnit = keyof typeof STEP_UNITS;

export interface Step {
    count: number;
    unit: StepUnit;
}

export interface MapSettings {
    showGeography: boolean;
    tickMs: number;
    step: Step;
    transitionMs: number;
    pauseMs: number;
}

export const DEFAULT_SETTINGS: MapSettings = {
    showGeography: true,
    tickMs: 40,
    step: {
        count: 1,
        unit: 'month',
    },
    transitionMs: 1600,
    pauseMs: 2000,
};

export const RANGES = {
    tickMs: {
        min: 10,
        max: 200,
        step: 10,
    },
    transitionMs: {
        min: 0,
        max: 5000,
        step: 100,
    },
    pauseMs: {
        min: 0,
        max: 5000,
        step: 100,
    },
} as const;

export function zoomToElement(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    element: SVGElement,
    onEnd: () => void,
): void {
    const svgElement = svg.node()!;
    const viewport = svgElement.getBoundingClientRect();
    const current = d3.zoomTransform(svgElement);
    const [x, y] = current.invert(relativeCenter(element, svgElement));
    const maxZoom = zoom.scaleExtent()[1];

    const scale = clamp(current.k, (maxZoom * 3) / 4, maxZoom);
    const transform = zoom.constrain()(
        d3.zoomIdentity
            .translate(viewport.width / 2, viewport.height / 2)
            .scale(scale)
            .translate(-x, -y),
        [
            [0, 0],
            [viewport.width, viewport.height],
        ],
        zoom.translateExtent(),
    );

    svg.interrupt()
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, transform)
        .on('end', onEnd);
}

const MAP_PALETTE: Record<string, string> = {
    '#f6f6f3': '--map-land',
    '#eceeef': '--map-foreign',
    '#dde6ed': '--map-water',
    '#c0cfd9': '--map-coast',
};

function pageToken(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function applyMapTheme(svgDoc: Document): void {
    svgDoc.documentElement.style.background = pageToken('--map-land');

    for (const el of [
        svgDoc.querySelector<SVGElement>('#geography'),
        ...svgDoc.querySelectorAll<SVGElement>('#geography *'),
    ]) {
        if (!el) {
            continue;
        }
        for (const prop of ['fill', 'stroke'] as const) {
            const painted = el.getAttribute(prop) ?? el.style.getPropertyValue(prop);
            const name = MAP_PALETTE[painted.trim().toLowerCase()];
            if (name) {
                el.style[prop] = pageToken(name);
            }
        }
    }
    const stations = svgDoc.querySelector<SVGElement>('#stations');
    if (stations) {
        stations.style.fill = pageToken('--map-marker');
        stations.style.stroke = pageToken('--map-marker-rim');
        for (const connector of stations.querySelectorAll<SVGElement>(':scope > path')) {
            connector.style.stroke = pageToken('--map-walk');
        }
        for (const layer of stations.querySelectorAll<SVGElement>('g [stroke="#fff"]')) {
            layer.style.stroke = pageToken('--map-marker');
        }
    }
}

const STATION_THINNING = 0.4;

export function setupZoomThinning(svgDoc: Document): (z: number) => void {
    const stations = svgDoc.getElementById('stations')!;
    const size = (value: string | null) => `calc(var(--station-size) * ${value}px)`;
    stations.style.setProperty('--station-size', '1');
    stations.style.strokeWidth = size(stations.getAttribute('stroke-width'));

    for (const el of stations.querySelectorAll<SVGElement>(':scope > g [stroke-width]')) {
        el.style.strokeWidth = size(el.getAttribute('stroke-width'));
    }

    for (const el of stations.querySelectorAll<SVGCircleElement>(':scope > circle')) {
        el.style.setProperty(
            'r',
            `calc(var(--station-size) * var(--h, 1) * ${el.getAttribute('r')}px)`,
        );
    }

    let current = '1';
    return z => {
        const next = String(Math.round(Math.min(1, z ** -STATION_THINNING) * 100) / 100);
        if (next !== current) {
            stations.style.setProperty('--station-size', (current = next));
        }
    };
}

const HAIRLINE_STEP = 1.02;

export function setupHairlines(svgDoc: Document): (k: number) => void {
    const geography = svgDoc.getElementById('geography')!;
    const view = svgDoc.defaultView!;
    for (const el of geography.querySelectorAll<SVGElement>(
        '[vector-effect="non-scaling-stroke"]',
    )) {
        el.style.strokeWidth = `calc(var(--hairline) * ${view.getComputedStyle(el).strokeWidth})`;
        el.removeAttribute('vector-effect');
    }

    let current = '';
    return k => {
        const next = String(HAIRLINE_STEP ** Math.round(Math.log(1 / k) / Math.log(HAIRLINE_STEP)));
        if (next !== current) {
            geography.style.setProperty('--hairline', (current = next));
        }
    };
}

const DIM_SATURATION = 0.2;
const DIM_TRANSITION = 'stroke 0.2s, stroke-opacity 0.2s, fill-opacity 0.2s';

const EASE = d3.easeCubicOut;

const dimColorsCache = new Map<string, string>();

function desaturate(color: string): string {
    let dimColor = dimColorsCache.get(color);
    if (!dimColor) {
        const { r, g, b } = d3.rgb(color);

        // weighted avg for grayscale from CSS spec
        const grey = 0.213 * r + 0.715 * g + 0.072 * b;
        const mix = (c: number) => grey + DIM_SATURATION * (c - grey);

        dimColor = d3.rgb(mix(r), mix(g), mix(b)).formatRgb();
        dimColorsCache.set(color, dimColor);
    }
    return dimColor;
}

function setDimmed(el: SVGElement, dimmed: boolean, fade: boolean, dimOpacity: string): void {
    const opacity = dimmed ? dimOpacity : '';
    const drawing = el.localName === 'g' ? (el.lastElementChild as SVGElement) : null;
    const target = drawing ?? el;

    if ((drawing ? target.style.opacity : target.style.strokeOpacity) === opacity) {
        return;
    }

    target.style.transition = fade ? (drawing ? 'opacity 0.2s' : DIM_TRANSITION) : '';
    if (fade) {
        target.addEventListener('transitionend', () => (target.style.transition = ''), {
            once: true,
        });
    }
    if (drawing) {
        drawing.style.opacity = opacity;
    } else {
        el.style.strokeOpacity = el.style.fillOpacity = opacity;
    }
}

const CUE_MS = 900;
const PING_REACH = 2;
const PING_OPACITY = 0.4;
const HALO_WIDTH = 3;
const HALO_OPACITY = 0.3;

let halos: Element | null = null;

function cueTrack(el: SVGElement, color: string): void {
    if (!halos) {
        halos = el.ownerDocument.createElementNS(el.namespaceURI, 'g');
        el.parentElement!.prepend(halos);
        d3.select(halos)
            .style('opacity', '0')
            .transition()
            .duration(CUE_MS)
            .styleTween('opacity', () => t => String(HALO_OPACITY * Math.sin(Math.PI * t)))
            .remove();
        queueMicrotask(() => (halos = null));
    }
    const width = parseFloat(el.ownerDocument.defaultView!.getComputedStyle(el).strokeWidth);
    const halo = el.cloneNode() as SVGElement;
    halo.removeAttribute('id');
    halos.append(halo);

    d3.select(halo)
        .style('stroke', color)
        .style('stroke-width', `${width * HALO_WIDTH}px`)
        .style('stroke-linecap', 'round');
}

function cueStation(el: SVGElement, lineColor: string): void {
    const box = (el as SVGGraphicsElement).getBBox();
    const interchange = el.localName === 'g';
    const outline = interchange ? el.firstElementChild! : el;
    const stroke = parseFloat(el.ownerDocument.defaultView!.getComputedStyle(outline).strokeWidth);
    const r = (Math.max(box.width, box.height) + stroke) / 2;

    d3.select(el.parentNode as SVGElement)
        .insert<SVGElement>('circle', () => el)
        .attr('cx', box.x + box.width / 2)
        .attr('cy', box.y + box.height / 2)
        .attr('fill', interchange ? pageToken('--map-marker-rim') : lineColor)
        .attr('stroke', 'none')
        .attr('pointer-events', 'none')
        .transition()
        .duration(CUE_MS)
        .ease(d3.easeLinear)
        .attrTween('r', () => t => String(r * (1 + PING_REACH * EASE(t))))
        .styleTween('opacity', () => t => String(PING_OPACITY * (1 - t)))
        .remove();
}

const moves = new WeakMap<
    LineWrapper,
    { at: (time: number) => Spans; start: number; active: boolean; depth: number }
>();
const PACED_MOVES = 8;

function spansNow(line: LineWrapper, now: number): Spans {
    return moves.get(line)?.at(now) ?? [];
}

function drawTrack(line: LineWrapper, spans: Spans): void {
    const { el, length } = line;
    const dashes = localSpans(line, spans);
    const whole = drawsWhole(line, spans);
    el.style.visibility = dashes.length > 0 ? '' : 'hidden';
    el.style.strokeDasharray =
        whole || dashes.length === 0
            ? 'none'
            : dashes
                  .flatMap(([a, b], i) => [b - a, (dashes[i + 1]?.[0] ?? b + 2 * length) - b])
                  .join(' ');
    el.style.strokeDashoffset = whole || dashes.length === 0 ? '' : String(-dashes[0][0]);
}

export function update(
    dateNum: number,
    lines: LineWrapper[],
    stations: StationWrapper[],
    legend: LegendWrapper[],
    transitionMs: number,
    highlight: string[] = [],
    since = dateNum,
    cue = false,
): UpdateResult {
    const before = cue && since !== dateNum ? [since, dateNum - 1] : [];
    const entries = new Map(legend.map(entry => [findName(entry.states, dateNum), entry]));

    const lit = highlightedNames(legend, highlight, dateNum);

    const dimOpacity = String(Number(pageToken('--dim-opacity')));

    let km = 0;
    const lineKm: Record<string, number> = {};
    const active = (line: LineWrapper) => findName(line.states, dateNum) !== null;
    const changed = lines.filter(line => (line.el.dataset.hidden === 'false') !== active(line));
    for (const line of lines) {
        const { el, states, km: trackKm } = line;
        const name = findName(states, dateNum);
        if (since !== dateNum) {
            delete el.dataset.cue;
        }

        if (name !== null) {
            const dimmed = lit.size > 0 && !lit.has(name);
            const entry = entries.get(name);

            if (!dimmed) {
                km += trackKm;
            }
            if (entry) {
                lineKm[entry.id] = (lineKm[entry.id] ?? 0) + trackKm;
                const color = dimmed ? desaturate(entry.color) : entry.color;
                el.style.stroke = color;
                if (
                    line.family.tracks.some(
                        other =>
                            overlaps(line, other) &&
                            before.some(t => (findName(other.states, t) ?? name) !== name),
                    )
                ) {
                    if (el.style.strokeDasharray === 'none') {
                        cueTrack(el, color);
                    } else {
                        el.dataset.cue = color;
                    }
                }
            }
            setDimmed(el, dimmed, el.dataset.hidden === 'false', dimOpacity);
        }
        el.dataset.hidden = String(name === null);
    }

    const now = d3.now();
    const fronts = planFronts(changed, line => spansNow(line, now), active);
    for (const [line, spansAt] of fronts) {
        const growing = active(line);
        const progress = (time: number) =>
            EASE(transitionMs > 0 ? Math.min(1, (time - now) / transitionMs) : 1);
        const planned = (time: number) => spansAt(progress(time));
        const earlier = moves.get(line);
        const paced = earlier && earlier.start + transitionMs > now && earlier.depth < PACED_MOVES;
        const at = paced
            ? (time: number) => {
                  const was = earlier.at(
                      earlier.active === growing
                          ? time
                          : now - (now - earlier.start) * progress(time),
                  );
                  return growing
                      ? union([...planned(time), ...was])
                      : intersect(planned(time), was);
              }
            : planned;
        moves.set(line, {
            at,
            start: now,
            active: growing,
            depth: paced ? earlier.depth + 1 : 0,
        });
        drawTrack(line, at(now));
        d3.select(line.el)
            .interrupt('front')
            .transition('front')
            .duration(transitionMs)
            .tween('front', () => () => drawTrack(line, at(d3.now())))
            .on('end', () => {
                if (line.el.dataset.cue) {
                    cueTrack(line.el, line.el.dataset.cue);
                    delete line.el.dataset.cue;
                }
            });
    }

    let stationCount = 0;
    const lineColors = new Map(legend.map(({ id, color }) => [id, color]));

    for (const { el, states, lines, operators } of stations) {
        const name = findName(states, dateNum);
        if (since !== dateNum) {
            delete el.dataset.cue;
        }
        if (name !== null) {
            if (
                el.localName !== 'path' &&
                before.some(t => {
                    const then = findName(states, t);
                    return (
                        then !== null &&
                        (then !== name ||
                            operators.some(
                                ({ dateRange }) =>
                                    isActive(dateRange, t) !== isActive(dateRange, dateNum),
                            ))
                    );
                })
            ) {
                const color = lineColors.get(findActive(lines, dateNum)!.name)!;
                if (el.style.opacity === '1') {
                    cueStation(el, color);
                } else {
                    el.dataset.cue = color;
                }
            }
            const dimmed = lit.size > 0 && !highlight.some(id => servesLine(lines, id, dateNum));
            if (!dimmed && lines.length > 0) {
                stationCount++;
            }
            setDimmed(el, dimmed, el.dataset.hidden === 'false', dimOpacity);

            el.style.pointerEvents = '';
            if (el.dataset.hidden !== 'false') {
                el.dataset.hidden = 'false';

                d3.select(el)
                    .interrupt('disappear')
                    .transition('appear')
                    .duration(transitionMs)
                    .ease(EASE)
                    .style('opacity', '1')
                    .on('end', () => {
                        if (el.dataset.cue) {
                            cueStation(el, el.dataset.cue);
                            delete el.dataset.cue;
                        }
                    });
            }
        } else {
            el.style.pointerEvents = 'none';
            if (el.dataset.hidden !== 'true') {
                el.dataset.hidden = 'true';

                d3.select(el)
                    .interrupt('appear')
                    .transition('disappear')
                    .duration(transitionMs)
                    .ease(EASE)
                    .style('opacity', '0');
            }
        }
    }
    return { stationCount, km, lineKm };
}

const HOVER_SCALE = 5 / 3;

function hoverTween(el: Element, draw: (h: number) => void): (target: number) => void {
    let h = 1;
    return target => {
        const from = h;
        d3.select(el)
            .transition('hoverEffect')
            .duration(300)
            .tween('hover', () => t => draw((h = from + (target - from) * t)));
    };
}

function setupInterchange(el: SVGElement): (h: number) => void {
    const doc = el.ownerDocument;
    const drawing = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    drawing.style.pointerEvents = 'none';

    for (const layer of Array.from(el.children)) {
        if (!layer.hasAttribute('stroke')) {
            const hit = layer.cloneNode() as SVGElement;
            hit.style.stroke = 'transparent';
            el.append(hit);
        }
        drawing.append(layer);
    }
    el.append(drawing);

    const box = (el as SVGGraphicsElement).getBBox();
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    const radius = parseFloat(drawing.firstElementChild!.getAttribute('stroke-width')!) / 2;
    const size = Math.max(box.width, box.height) + 2 * radius;
    const scale = 1 + (HOVER_SCALE - 1) * Math.min(1, (3 * radius) / size);

    return h => {
        const k = 1 + ((scale - 1) * (h - 1)) / (HOVER_SCALE - 1);
        drawing.setAttribute(
            'transform',
            `translate(${cx},${cy}) scale(${k}) translate(${-cx},${-cy})`,
        );
    };
}

export function setupHoverEffect(el: SVGElement): void {
    let animate: (target: number) => void;

    if (el.localName === 'circle') {
        animate = hoverTween(el, h => el.style.setProperty('--h', String(h)));
    } else if (el.localName === 'g') {
        animate = hoverTween(el, setupInterchange(el));
    } else {
        return;
    }
    d3.select(el)
        .on('mouseenter', () => animate(HOVER_SCALE))
        .on('mouseleave', () => animate(1));
}
