import type { ZoomBehavior } from 'd3';
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { LegendWrapper, RawTooltipData, StationWrapper } from '../schemas';
import { stationIdentity } from '../stationSearch';
import type { SystemConfig } from '../systems';
import { clamp, findActive, formatDate, isActive, servesLine } from '../utils';

interface TooltipProps {
    tooltip: RawTooltipData | null;
    stations: StationWrapper[];
    time: number;
    config: SystemConfig;
    presentLines: { line: LegendWrapper; name: string }[];
    zoom: RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
}

export const TOOLTIP_OFFSET = 10;

function since(
    stations: StationWrapper[],
    station: StationWrapper,
    name: string,
    time: number,
): Date {
    const id = stationIdentity(station);
    const ranges = stations
        .filter(other => stationIdentity(other) === id)
        .flatMap(other =>
            other.states.filter(state => state.name === name).map(state => state.dateRange),
        )
        .sort((a, b) => b.appear.getTime() - a.appear.getTime());

    let appear = time;
    for (const range of ranges) {
        if (range.appear.getTime() <= appear && appear <= range.removed.getTime()) {
            appear = Math.min(appear, range.appear.getTime());
        }
    }
    return new Date(appear);
}

interface Size {
    width: number;
    height: number;
}

function beside(tooltip: RawTooltipData, size: Size) {
    const left = tooltip.x + TOOLTIP_OFFSET + size.width > window.innerWidth;
    const x = clamp(
        left ? tooltip.x - TOOLTIP_OFFSET - size.width : tooltip.x + TOOLTIP_OFFSET,
        0,
        window.innerWidth - size.width,
    );
    const y = clamp(
        tooltip.y + TOOLTIP_OFFSET - size.height / 2,
        0,
        window.innerHeight - size.height,
    );
    return {
        x,
        y,
        arrow: {
            className: `-translate-y-1/2
                ${left ? '-right-1 border-t border-r' : '-left-1 border-b border-l'}`,
            style: { top: clamp(tooltip.y + TOOLTIP_OFFSET - y, 8, size.height - 8) },
        },
    };
}

function above(marker: DOMRect, size: Size) {
    const center = marker.left + marker.width / 2;
    const below = marker.top - TOOLTIP_OFFSET - size.height < 0;
    const x = clamp(center - size.width / 2, 0, window.innerWidth - size.width);
    return {
        x,
        y: below ? marker.bottom + TOOLTIP_OFFSET : marker.top - TOOLTIP_OFFSET - size.height,
        arrow: {
            className: `-translate-x-1/2
                ${below ? '-top-1 border-t border-l' : '-bottom-1 border-r border-b'}`,
            style: { left: clamp(center - x, 8, size.width - 8) },
        },
    };
}

export default function Tooltip({
    tooltip,
    stations,
    time,
    config,
    presentLines,
    zoom,
}: TooltipProps): React.JSX.Element | null {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [, follow] = useReducer((frame: number) => frame + 1, 0);
    const shown = tooltip !== null;

    useEffect(() => {
        const behavior = zoom.current;
        if (!shown || !behavior) {
            return;
        }
        behavior.on('zoom.tooltip', () => flushSync(follow));
        return () => {
            behavior.on('zoom.tooltip', null);
        };
    }, [shown, zoom]);

    useLayoutEffect(() => {
        if (ref.current) {
            const { width, height } = ref.current.getBoundingClientRect();
            setSize({ width, height });
        }
    }, [tooltip?.station, time, config]);

    const state = tooltip && findActive(tooltip.station.states, time);
    if (!tooltip || !state) {
        return null;
    }

    const logos = tooltip.station.operators.flatMap(({ name, dateRange }) => {
        const logo = config.operators[name];
        return logo && isActive(dateRange, time) ? [logo] : [];
    });

    const lines = presentLines
        .filter(({ line }) => servesLine(tooltip.station.lines, line.id, time))
        .map(({ line, name }) => ({ id: line.id, name, color: line.color }));

    const { x, y, arrow } = window.matchMedia('(min-width: 768px)').matches
        ? beside(tooltip, size)
        : above(tooltip.station.el.getBoundingClientRect(), size);

    return (
        <div
            ref={ref}
            role="tooltip"
            className="tooltip w-max max-w-[calc(100vw-1rem)] px-3 py-2 text-sm whitespace-normal"
            style={{ left: x, top: y }}
        >
            <div className="flex items-center gap-2">
                {logos.map(logo => (
                    <img
                        key={logo.alt}
                        src={logo.src}
                        alt={logo.alt}
                        className="h-4"
                        style={{ height: config.tooltipLogoSize }}
                    />
                ))}
                <span className="flex items-baseline gap-2">
                    {state.name}
                    <span className="meta ml-auto text-[9px]">
                        since {formatDate(since(stations, tooltip.station, state.name, time))}
                    </span>
                </span>
            </div>
            {lines.length > 0 && (
                <div className="text-ink-faint mt-1 flex flex-wrap gap-x-2 text-xs">
                    {lines.map(line => (
                        <span key={line.id} className="flex items-center gap-1">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: line.color }}
                            ></span>
                            {line.name}
                        </span>
                    ))}
                </div>
            )}
            <div className={`tooltip-arrow ${arrow.className}`} style={arrow.style}></div>
        </div>
    );
}
