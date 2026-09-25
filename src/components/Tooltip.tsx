import { useLayoutEffect, useRef, useState } from 'react';
import type { LegendWrapper, RawTooltipData } from '../schemas';
import type { SystemConfig } from '../systems';
import { clamp, findName, formatDate, isActive } from '../utils';

interface TooltipProps {
    tooltip: RawTooltipData | null;
    time: number;
    config: SystemConfig;
    legend: LegendWrapper[];
}

export const TOOLTIP_OFFSET = 10;

export default function Tooltip({
    tooltip,
    time,
    config,
    legend,
}: TooltipProps): React.JSX.Element | null {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        if (ref.current) {
            const { width, height } = ref.current.getBoundingClientRect();
            setSize({ width, height });
        }
    }, [tooltip?.station, time, config, legend]);

    if (!tooltip) {
        return null;
    }

    const state = tooltip.station.states.find(({ dateRange }) => isActive(dateRange, time));
    const status = tooltip.station.status;

    const lines = legend.flatMap(entry => {
        const calling = tooltip.station.lines.some(
            ({ name: id, dateRange }) => id === entry.id && isActive(dateRange, time),
        );
        const lineName = calling && findName(entry.states, time);
        return lineName ? [{ id: entry.id, name: lineName, color: entry.color }] : [];
    });

    if (state) {
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

        return (
            <div
                ref={ref}
                role="tooltip"
                className="tooltip w-max max-w-[calc(100vw-1rem)] px-3 py-2 text-sm
                    whitespace-normal"
                style={{ left: x, top: y }}
            >
                <div className="flex items-center gap-2">
                    {config.tooltipLogos?.(status, time).map(logo => (
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
                            since {formatDate(state.dateRange.appear)}
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
                <div
                    className={`tooltip-arrow -translate-y-1/2
                        ${left ? '-right-1 border-t border-r' : '-left-1 border-b border-l'}`}
                    style={{ top: clamp(tooltip.y + TOOLTIP_OFFSET - y, 8, size.height - 8) }}
                ></div>
            </div>
        );
    }
    return null;
}
