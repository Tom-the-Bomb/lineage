import { type LineStats } from '../schemas';

export function BigTooltip({ stats }: { stats: LineStats }) {
    return (
        <div
            role="tooltip"
            className="tooltip bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 flex gap-6 text-left"
        >
            <div>
                <div className="text-lg font-semibold leading-tight tabular-nums">
                    {stats.stations}
                </div>
                <div className="text-3xs uppercase tracking-wider text-ink-faint">
                    {stats.stations === 1 ? 'station' : 'stations'}
                </div>
            </div>
            <div>
                <div className="text-lg font-semibold leading-tight tabular-nums">
                    {stats.km.toFixed(1)}
                </div>
                <div className="text-3xs uppercase tracking-wider text-ink-faint">km</div>
            </div>
            <div className="tooltip-arrow border-r border-b left-1/2 -translate-x-1/2 -bottom-1"></div>
        </div>
    );
}
