import type { LegendWrapper, LineWrapper } from './schemas';
import { findName, highlightedNames } from './utils.ts';

export interface LengthPoint {
    time: number;
    total: number;
    lit: number | null;
}

export function lengthSeries(
    tracks: LineWrapper[],
    legend: LegendWrapper[],
    highlight: string[],
    dates: number[],
): LengthPoint[] {
    return dates.map(time => {
        const lit = highlightedNames(legend, highlight, time);
        let total = 0;
        let litKm = 0;
        for (const { states, km } of tracks) {
            const name = findName(states, time);
            if (name !== null) {
                total += km;
                if (lit.has(name)) {
                    litKm += km;
                }
            }
        }
        return { time, total, lit: lit.size > 0 ? litKm : null };
    });
}

export function lengthAt(series: LengthPoint[], time: number): LengthPoint | undefined {
    return series.findLast(point => point.time <= time);
}
