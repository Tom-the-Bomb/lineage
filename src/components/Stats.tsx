import { useState } from 'react';
import chevronDown from '../assets/chevron-down.svg';
import Figure from './Figure';
import useScrollOverflow from '../hooks/useScrollOverflow';

export interface LineBar {
    id: string;
    name: string;
    color: string;
    km: number;
}

interface StatsProps {
    stations: number;
    km: number;
    lines: LineBar[];
    highlight: string[];
}

const ROW_HEIGHT = 18;

export default function Stats({ stations, km, lines, highlight }: StatsProps) {
    const [open, setOpen] = useState<boolean>(
        () => window.matchMedia('(min-width: 768px)').matches,
    );
    const { listRef, hintRef, measure, overflowing, hiddenBelow } = useScrollOverflow(
        lines.length,
        open,
    );
    const lit = new Set(lines.filter(line => highlight.includes(line.id)));
    const lineCount = lit.size || lines.length;
    const maxKm = Math.max(1, ...lines.map(line => line.km));
    const rank = new Map(
        [...lines].sort((a, b) => b.km - a.km).map((line, index) => [line.id, index] as const),
    );

    return (
        <section className="panel pointer-events-auto mt-2 flex min-h-0 w-80 flex-col px-4 py-3">
            <button
                type="button"
                aria-expanded={open}
                aria-label={open ? 'Minimize statistics' : 'Expand statistics'}
                onClick={() => setOpen(value => !value)}
                className="group relative shrink-0 cursor-pointer text-left"
            >
                {open ? (
                    <span className="flex gap-6">
                        <Figure value={stations} label={stations === 1 ? 'station' : 'stations'} />
                        <Figure value={lineCount} label={lineCount === 1 ? 'line' : 'lines'} />
                        <Figure value={km.toFixed(1)} label="km" />
                    </span>
                ) : (
                    <span className="meta block tabular-nums">
                        {stations} stations · {lineCount} lines · {km.toFixed(1)} km
                    </span>
                )}
                <img
                    src={chevronDown}
                    alt="v"
                    className={`icon-btn absolute right-0 transition-transform duration-300
                        group-hover:opacity-100 group-focus-visible:opacity-100
                        ${open ? 'top-1 rotate-180' : 'top-0.5'}`}
                />
            </button>
            {open && lines.length > 0 && (
                <>
                    <div
                        ref={listRef}
                        onScroll={measure}
                        className="scroll-hidden mt-3 min-h-0 overflow-y-auto overscroll-contain"
                    >
                        <div className="relative" style={{ height: lines.length * ROW_HEIGHT }}>
                            {lines.map(line => {
                                const dimmed = lit.size > 0 && !lit.has(line);

                                return (
                                    <div
                                        key={line.id}
                                        className="absolute inset-x-0 flex items-center gap-2
                                            transition-[transform,opacity] duration-500 ease-out"
                                        style={{
                                            height: ROW_HEIGHT,
                                            transform: `translateY(${(rank.get(line.id) ?? 0) * ROW_HEIGHT}px)`,
                                            opacity: dimmed ? 0.35 : 1,
                                        }}
                                    >
                                        <span
                                            className="text-3xs text-ink-muted w-28 shrink-0
                                                truncate"
                                        >
                                            {line.name}
                                        </span>
                                        <span className="bg-rule/50 h-1.5 flex-1 rounded-full">
                                            <span
                                                className="block h-full rounded-full
                                                    transition-[width] duration-500 ease-out"
                                                style={{
                                                    width: `${(line.km / maxKm) * 100}%`,
                                                    backgroundColor: line.color,
                                                }}
                                            ></span>
                                        </span>
                                        <span className="meta w-9 shrink-0 text-right tabular-nums">
                                            {line.km.toFixed(1)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {overflowing && (
                        <div ref={hintRef} className="shrink-0 pt-2">
                            <div className="meta border-rule h-4 border-t pt-1 text-right">
                                {hiddenBelow > 0 && `↓ ${hiddenBelow} more`}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
