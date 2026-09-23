import * as d3 from 'd3';

import {
    type LegendWrapper,
    type LineWrapper,
    type StationWrapper,
    type UpdateResult,
} from './schemas';

import { clamp, findName, isActive, relativeCenter } from './utils';

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

export interface PlaybackSettings {
    tickMs: number;
    step: Step;
    transitionMs: number;
    pauseMs: number;
}

export const DEFAULT_SETTINGS: PlaybackSettings = {
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
    const [minZoom, maxZoom] = zoom.scaleExtent();
    const scale = clamp(current.k, minZoom * 3, maxZoom);
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
    }
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

    if (el.style.strokeOpacity === opacity) {
        return;
    }

    el.style.transition = fade ? DIM_TRANSITION : '';
    if (fade) {
        el.addEventListener('transitionend', () => (el.style.transition = ''), { once: true });
    }
    el.style.strokeOpacity = el.style.fillOpacity = opacity;
}

export function update(
    dateNum: number,
    lines: LineWrapper[],
    stations: StationWrapper[],
    legend: LegendWrapper[],
    transitionMs: number,
    highlight: string[] = [],
): UpdateResult {
    const entries = new Map(legend.map(entry => [findName(entry.states, dateNum), entry]));

    const lit = new Set(
        legend
            .filter(({ id }) => highlight.includes(id))
            .map(({ states }) => findName(states, dateNum))
            .filter(name => name !== null),
    );

    const dimOpacity = String(Number(pageToken('--dim-opacity')));

    let km = 0;
    const lineKm: Record<string, number> = {};

    for (const { el, states, length, dashArray, km: trackKm } of lines) {
        const name = findName(states, dateNum);

        if (name !== null) {
            const dimmed = lit.size > 0 && !lit.has(name);
            const entry = entries.get(name);

            if (!dimmed) {
                km += trackKm;
            }
            if (entry) {
                lineKm[entry.id] = (lineKm[entry.id] ?? 0) + trackKm;
                el.style.stroke = dimmed ? desaturate(entry.color) : entry.color;
            }
            setDimmed(el, dimmed, el.dataset.hidden === 'false', dimOpacity);

            if (el.dataset.hidden !== 'false') {
                el.dataset.hidden = 'false';

                const selection = d3.select(el);

                if (dashArray !== 'none') {
                    selection.style('stroke-dasharray', dashArray);
                }

                selection
                    .interrupt('shrink')
                    .transition('grow')
                    .duration(transitionMs)
                    .ease(EASE)
                    .style('stroke-dashoffset', '0');
            }
        } else if (el.dataset.hidden !== 'true') {
            el.dataset.hidden = 'true';

            d3.select(el)
                .interrupt('grow')
                .transition('shrink')
                .duration(transitionMs)
                .ease(EASE)
                .style('stroke-dashoffset', String(length))
                .style('stroke-dasharray', String(length));
        }
    }

    let stationCount = 0;

    for (const { el, states, lines } of stations) {
        if (findName(states, dateNum) !== null) {
            const dimmed =
                lit.size > 0 &&
                !lines.some(
                    ({ name: id, dateRange }) =>
                        highlight.includes(id) && isActive(dateRange, dateNum),
                );
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
                    .style('opacity', '1');
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

function hoverMouseEnter(
    rect: Element,
    currentX: number,
    currentY: number,
    width: number,
    height: number,
    rx: number,
    scaleFactor: number,
): void {
    d3.select(rect)
        .transition('hoverEffect')
        .duration(300)
        .attr('x', String(currentX - (width * scaleFactor - width) / 2))
        .attr('y', String(currentY - (height * scaleFactor - height) / 2))
        .attr('width', String(width * scaleFactor))
        .attr('height', String(height * scaleFactor))
        .attr('rx', String(rx * scaleFactor));
}

function hoverMouseLeave(
    rect: Element,
    currentX: number,
    currentY: number,
    width: number,
    height: number,
    rx: number,
): void {
    d3.select(rect)
        .transition('hoverEffect')
        .duration(300)
        .attr('x', String(currentX))
        .attr('y', String(currentY))
        .attr('width', String(width))
        .attr('height', String(height))
        .attr('rx', String(rx));
}

export function setupHoverEffect(el: SVGElement): void {
    const SCALE_FACTOR = 5 / 3;

    if (el.localName === 'circle') {
        const r = parseFloat(el.getAttribute('r')!);

        d3.select(el)
            .on('mouseenter', () => {
                d3.select(el)
                    .transition('hoverEffect')
                    .duration(300)
                    .attr('r', String(r * SCALE_FACTOR));
            })
            .on('mouseleave', () => {
                d3.select(el).transition('hoverEffect').duration(300).attr('r', String(r));
            });
    } else if (el.localName === 'rect') {
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        const width = parseFloat(el.getAttribute('width') || '0');
        const height = parseFloat(el.getAttribute('height') || '0');
        const rx = parseFloat(el.getAttribute('rx') || '0');

        d3.select(el)
            .on('mouseenter', () => hoverMouseEnter(el, x, y, width, height, rx, SCALE_FACTOR))
            .on('mouseleave', () => hoverMouseLeave(el, x, y, width, height, rx));
    }
}
