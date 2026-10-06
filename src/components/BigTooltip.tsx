import type { ReactNode } from 'react';
import { type LineStats } from '../schemas';
import { formatDate } from '../utils';
import Figure from './Figure';

interface BigTooltipProps {
    stats: LineStats;
    since: Date;
    children: ReactNode;
}

export function BigTooltip({ stats, since, children }: BigTooltipProps) {
    return (
        <div
            role="tooltip"
            className="tooltip bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col gap-1 px-4
                pt-2.5 pb-3 text-left pointer-coarse:hidden"
        >
            <div className="meta flex items-center justify-between gap-2 text-[8px]">
                <span>SINCE</span>
                <span className="flex gap-1">{children}</span>
                <span>{formatDate(since)}</span>
            </div>
            <div className="flex gap-6">
                <Figure
                    value={stats.stations}
                    label={stats.stations === 1 ? 'station' : 'stations'}
                />
                <Figure value={stats.km.toFixed(1)} label="km" />
            </div>
            <div className="tooltip-arrow -bottom-1 left-1/2 -translate-x-1/2 border-r border-b"></div>
        </div>
    );
}
