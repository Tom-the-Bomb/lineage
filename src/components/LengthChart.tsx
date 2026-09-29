import { memo, useId } from 'react';
import type { LengthPoint } from '../lengthSeries';
import { clamp } from '../utils';

interface LengthChartProps {
    series: LengthPoint[];
    minTime: number;
    maxTime: number;
    time: number;
    highlighted: boolean;
    className?: string;
}

const WIDTH = 1000;
const HEIGHT = 100;
const TOP_MARGIN = 4;

export default memo(function LengthChart({
    series,
    minTime,
    maxTime,
    time,
    highlighted,
    className = '',
}: LengthChartProps) {
    const clipId = useId();
    const maxKm = Math.max(1, ...series.map(point => point.total));

    if (series.length === 0) {
        return null;
    }

    const x = (t: number) => ((t - minTime) / (maxTime - minTime)) * WIDTH;
    const y = (km: number) => HEIGHT - (km / maxKm) * (HEIGHT - TOP_MARGIN);

    function paths(value: (point: LengthPoint) => number) {
        let line = `M${x(series[0].time)},${y(value(series[0]))}`;
        for (const point of series.slice(1)) {
            line += `H${x(point.time)}V${y(value(point))}`;
        }
        line += `H${WIDTH}`;
        return { line, area: `${line}V${HEIGHT}H${x(series[0].time)}Z` };
    }

    const total = paths(point => point.total);
    const lit = highlighted ? paths(point => point.lit ?? 0) : null;
    const accent = lit ?? total;
    const progress = clamp(x(time), 0, WIDTH);
    const stroke = { fill: 'none', vectorEffect: 'non-scaling-stroke' } as const;

    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className={`overflow-visible ${className}`}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect width={progress} height={HEIGHT} />
                </clipPath>
            </defs>
            <path d={total.area} className="fill-rule-strong" opacity={0.1} />
            <path
                d={total.line}
                className="stroke-rule-strong"
                strokeWidth={1}
                opacity={0.45}
                style={stroke}
            />
            {lit && (
                <path
                    d={lit.line}
                    className="stroke-accent"
                    strokeWidth={1}
                    opacity={0.25}
                    style={stroke}
                />
            )}
            <g clipPath={`url(#${clipId})`}>
                <path d={accent.area} className="fill-accent" opacity={0.08} />
                <path
                    d={accent.line}
                    className="stroke-accent"
                    strokeWidth={1}
                    opacity={0.6}
                    style={stroke}
                />
            </g>
        </svg>
    );
});
