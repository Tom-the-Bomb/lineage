import { useCallback, useEffect, useRef, useState } from 'react';
import chevronDown from '../assets/chevron-down.svg';
import Figure from './Figure';

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
    const [overflowing, setOverflowing] = useState<boolean>(false);
    const [hiddenBelow, setHiddenBelow] = useState<number>(0);
    const listRef = useRef<HTMLDivElement | null>(null);

    const measure = useCallback(() => {
        const el = listRef.current;
        if (!el) {
            setOverflowing(false);
            setHiddenBelow(0);
            return;
        }
        const content = el.firstElementChild?.clientHeight ?? 0;
        setOverflowing(content > el.clientHeight + 1);
        setHiddenBelow(
            Math.max(0, Math.round((content - el.scrollTop - el.clientHeight) / ROW_HEIGHT)),
        );
    }, []);

    useEffect(() => {
        measure();
        const el = listRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [measure, open, lines.length]);

    const lit = new Set(lines.filter(line => highlight.includes(line.id)));
    const lineCount = lit.size || lines.length;
    const maxKm = Math.max(1, ...lines.map(line => line.km));
    const rank = new Map(
        [...lines].sort((a, b) => b.km - a.km).map((line, index) => [line.id, index] as const),
    );

    return (
        <section className="pointer-events-auto relative mt-2 flex min-h-0 w-80 flex-col px-4 py-3">
            {open ? (
                <div className="flex gap-6">
                    <Figure value={stations} label={stations === 1 ? 'station' : 'stations'} />
                    <Figure value={lineCount} label={lineCount === 1 ? 'line' : 'lines'} />
                    <Figure value={km.toFixed(1)} label="km" />
                </div>
            ) : (
                <div className="meta tabular-nums">
                    {stations} stations · {lineCount} lines · {km.toFixed(1)} km
                </div>
            )}
            <button
                type="button"
                aria-expanded={open}
                aria-label={open ? 'Minimize statistics' : 'Expand statistics'}
                onClick={() => setOpen(value => !value)}
                className={`absolute ${open ? 'top-4' : 'top-3.5'} right-4 cursor-pointer`}
            >
                <img
                    src={chevronDown}
                    alt={open ? 'v' : '^'}
                    className={`icon-btn transition-transform duration-300 ${open ? '' : 'rotate-180'}`}
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
                                        className="absolute inset-x-0 flex items-center gap-2 transition-[transform,opacity] duration-500 ease-out"
                                        style={{
                                            height: ROW_HEIGHT,
                                            transform: `translateY(${(rank.get(line.id) ?? 0) * ROW_HEIGHT}px)`,
                                            opacity: dimmed ? 0.35 : 1,
                                        }}
                                    >
                                        <span className="text-3xs text-ink-muted w-28 shrink-0 truncate">
                                            {line.name}
                                        </span>
                                        <span className="bg-rule/50 h-1.5 flex-1 rounded-full">
                                            <span
                                                className="block h-full rounded-full transition-[width] duration-500 ease-out"
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
                        <div className="meta border-rule mt-2 h-4 shrink-0 border-t pt-1 text-right">
                            {hiddenBelow > 0 && `↓ ${hiddenBelow} more`}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
