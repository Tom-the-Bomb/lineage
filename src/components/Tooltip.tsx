import type { LegendWrapper, RawTooltipData } from '../schemas';
import type { SystemConfig } from '../systems';
import { findName, isActive } from '../utils';

interface TooltipProps {
    tooltip: RawTooltipData | null;
    time: number;
    config: SystemConfig;
    legend: LegendWrapper[];
}

export default function Tooltip({
    tooltip,
    time,
    config,
    legend,
}: TooltipProps): React.JSX.Element | null {
    if (!tooltip) {
        return null;
    }

    const name = findName(tooltip.station.states, time);
    const status = tooltip.station.status;

    const lines = legend.flatMap(entry => {
        const calling = tooltip.station.lines.some(
            ({ name: id, dateRange }) => id === entry.id && isActive(dateRange, time),
        );
        const lineName = calling && findName(entry.states, time);
        return lineName ? [{ id: entry.id, name: lineName, color: entry.color }] : [];
    });

    if (name) {
        return (
            <div
                className={`absolute px-3 py-2 bg-gray-900/90 text-white text-sm rounded-md
                    shadow-lg pointer-events-none z-50 whitespace-nowrap backdrop-blur-sm`}
                style={{
                    left: `${tooltip.x + 10}px`,
                    top: `${tooltip.y + 10}px`,
                    transform: 'translate(0, -50%)',
                }}
            >
                <div className="flex gap-2 items-center">
                    {config.tooltipLogos?.(status, time).map(logo => (
                        <img key={logo.alt} src={logo.src} alt={logo.alt} className="h-4" />
                    ))}
                    {name}
                </div>
                {lines.length > 0 && (
                    <div className="flex gap-x-2 mt-1 text-xs text-gray-300">
                        {lines.map(line => (
                            <span key={line.id} className="flex items-center gap-1">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: line.color }}
                                ></span>
                                {line.name}
                            </span>
                        ))}
                    </div>
                )}
                <div className="absolute w-2 h-2 bg-gray-900/90 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
            </div>
        );
    }
    return null;
}
