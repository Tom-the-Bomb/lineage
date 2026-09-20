import { type LineStats } from '../schemas';
import Figure from './Figure';

export function BigTooltip({ stats }: { stats: LineStats }) {
    return (
        <div
            role="tooltip"
            className="tooltip bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 flex gap-6 text-left"
        >
            <Figure value={stats.stations} label={stats.stations === 1 ? 'station' : 'stations'} />
            <Figure value={stats.km.toFixed(1)} label="km" />
            <div className="tooltip-arrow border-r border-b left-1/2 -translate-x-1/2 -bottom-1"></div>
        </div>
    );
}
