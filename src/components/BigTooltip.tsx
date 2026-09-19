import React from 'react';
import { type LineStats } from '../schemas';

export function BigTooltip({ stats }: { stats: LineStats }): React.JSX.Element {
    return (
        <div
            role="tooltip"
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3
                flex gap-6 text-left bg-white backdrop-opacity-75 text-gray-900 rounded-xl
                shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/10
                whitespace-nowrap pointer-events-none z-50`}
        >
            <div>
                <div className="text-lg font-semibold leading-tight tabular-nums">
                    {stats.stations}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">
                    {stats.stations === 1 ? 'station' : 'stations'}
                </div>
            </div>
            <div>
                <div className="text-lg font-semibold leading-tight tabular-nums">
                    {stats.km.toFixed(1)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">km</div>
            </div>
            <div
                className={`
                    absolute w-3 h-3 bg-white/90 ring-1 ring-gray-900/10
                    rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5
                    [clip-path:polygon(0_100%,100%_100%,100%_0)]`}
            ></div>
        </div>
    );
}
