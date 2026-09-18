import * as d3 from 'd3';

import {
    type LegendWrapper,
    type LineWrapper,
    type StationWrapper,
} from './schemas';

import {
    findName,
} from './utils';

export function update(
    dateNum: number,
    lines: LineWrapper[],
    stations: StationWrapper[],
    legend: LegendWrapper[],
): void {
    const colors = new Map(legend.map(({ color, states }) => [findName(states, dateNum), color]));

    for (const { el, states, length, dashArray } of lines) {
        const name = findName(states, dateNum);

        if (name !== null) {
            const color = colors.get(name);
            if (color) {
                el.style.stroke = color;
            }

            if (el.style.strokeDashoffset !== '0') {
                el.dataset.hidden = 'false';

                const selection = d3.select(el);

                if (dashArray !== 'none') {
                    selection.style('stroke-dasharray', dashArray);
                }

                selection
                    .transition()
                    .duration(500)
                    .ease(d3.easeLinear)
                    .style('stroke-dashoffset', '0');
            }
        } else if (el.dataset.hidden !== 'true') {
            el.dataset.hidden = 'true';

            d3.select(el)
                .transition()
                .duration(500)
                .ease(d3.easeLinear)
                .style('stroke-dashoffset', String(length))
                .style('stroke-dasharray', String(length));
        }
    }

    for (const { el, states } of stations) {
        if (findName(states, dateNum) !== null) {
            el.style.pointerEvents = '';
            if (el.style.opacity !== '1') {
                d3.select(el)
                    .transition('appear')
                    .duration(500)
                    .ease(d3.easeLinear)
                    .style('opacity', '1')
            }
        } else {
            el.style.pointerEvents = 'none';
            if (el.style.opacity !== '0') {
                d3.select(el)
                    .transition('disappear')
                    .duration(500)
                    .ease(d3.easeLinear)
                    .style('opacity', '0')
            }
        }
    }
}

function hoverMouseEnter(
    rect: Element,
    currentX: number, currentY: number,
    width: number, height: number,
    rx: number, scaleFactor: number,
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

function hoverMouseLeave(rect: Element,
    currentX: number, currentY: number,
    width: number, height: number,
    rx: number
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
                d3.select(el)
                    .transition('hoverEffect')
                    .duration(300)
                    .attr('r', String(r));
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
