import * as d3 from 'd3';

import { type LegendWrapper, type LineWrapper, type StationWrapper } from './schemas';

import { findName, isActive } from './utils';

export const MAP_TRANSITION_MS = 650;

const DIM_SATURATION = 0.2;
const DIM_OPACITY = '0.25';
const DIM_TRANSITION = 'stroke 0.2s, stroke-opacity 0.2s, fill-opacity 0.2s';

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

function setDimmed(el: SVGElement, dimmed: boolean, fade: boolean): void {
    const opacity = dimmed ? DIM_OPACITY : '';
    if (el.style.strokeOpacity === opacity) return;

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
    highlight: string[] = [],
): void {
    const colors = new Map(legend.map(({ color, states }) => [findName(states, dateNum), color]));

    const lit = new Set(
        legend
            .filter(({ id }) => highlight.includes(id))
            .map(({ states }) => findName(states, dateNum))
            .filter(name => name !== null),
    );

    for (const { el, states, length, dashArray } of lines) {
        const name = findName(states, dateNum);

        if (name !== null) {
            const dimmed = lit.size > 0 && !lit.has(name);

            const color = colors.get(name);
            if (color) {
                el.style.stroke = dimmed ? desaturate(color) : color;
            }
            setDimmed(el, dimmed, el.dataset.hidden === 'false');

            if (el.style.strokeDashoffset !== '0') {
                el.dataset.hidden = 'false';

                const selection = d3.select(el);

                if (dashArray !== 'none') {
                    selection.style('stroke-dasharray', dashArray);
                }

                selection
                    .transition()
                    .duration(MAP_TRANSITION_MS)
                    .ease(d3.easeLinear)
                    .style('stroke-dashoffset', '0');
            }
        } else if (el.dataset.hidden !== 'true') {
            el.dataset.hidden = 'true';

            d3.select(el)
                .transition()
                .duration(MAP_TRANSITION_MS)
                .ease(d3.easeLinear)
                .style('stroke-dashoffset', String(length))
                .style('stroke-dasharray', String(length));
        }
    }

    for (const { el, states, lines } of stations) {
        if (findName(states, dateNum) !== null) {
            const dimmed =
                lit.size > 0 &&
                !lines.some(
                    ({ name: id, dateRange }) =>
                        highlight.includes(id) && isActive(dateRange, dateNum),
                );
            setDimmed(el, dimmed, el.style.opacity === '1');

            el.style.pointerEvents = '';
            if (el.style.opacity !== '1') {
                d3.select(el)
                    .transition('appear')
                    .duration(MAP_TRANSITION_MS)
                    .ease(d3.easeLinear)
                    .style('opacity', '1');
            }
        } else {
            el.style.pointerEvents = 'none';
            if (el.style.opacity !== '0') {
                d3.select(el)
                    .transition('disappear')
                    .duration(MAP_TRANSITION_MS)
                    .ease(d3.easeLinear)
                    .style('opacity', '0');
            }
        }
    }
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
