import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangelogEvent, LegendWrapper } from '../schemas';
import { formatDate } from '../utils';
import chevronDown from '../assets/chevron-down.svg';
import changelogIcon from '../assets/changelog.svg';

const wide = window.matchMedia('(min-width: 1280px)').matches;

interface ChangelogProps {
    events: ChangelogEvent[];
    time: number;
    legend: LegendWrapper[];
    className?: string;
}

export default function Changelog({ events, time, legend, className = '' }: ChangelogProps) {
    const [open, setOpen] = useState(wide);
    const listRef = useRef<HTMLDivElement | null>(null);

    const entries = useMemo(() => {
        const byName = new Map(
            legend.flatMap(entry => entry.states.map(({ name }) => [name, entry] as const)),
        );
        return events.map(({ date, descriptions }) => ({
            date,
            ms: Date.parse(date),
            items: descriptions.map(description => ({
                description,
                line: byName.get(description.split(/: | → /)[0]),
            })),
        }));
    }, [events, legend]);

    const past = entries.filter(event => event.ms <= time).reverse();
    const latestDate = past[0]?.date;

    useEffect(() => {
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [latestDate]);

    if (!open && !wide) {
        return (
            <button
                type="button"
                aria-expanded={false}
                aria-label="Expand changelog"
                onClick={() => setOpen(true)}
                className={`zoom-btn w-12 h-12 pointer-events-auto absolute right-4 bottom-28 z-10 cursor-pointer rounded-full ${className}`}
            >
                <img src={changelogIcon} alt="changelog" className="icon h-5 w-5" />
            </button>
        );
    }

    return (
        <aside
            className={`panel pointer-events-auto absolute right-4 bottom-28 z-10 w-72 px-4 py-3 ${className}`}
        >
            <div className="flex items-center justify-between gap-4">
                <span className="meta">
                    changelog · {past.length} {past.length === 1 ? 'event' : 'events'}
                </span>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? 'Minimize changelog' : 'Expand changelog'}
                    onClick={() => setOpen(value => !value)}
                >
                    <img
                        src={chevronDown}
                        alt={open ? 'v' : '^'}
                        className={`icon-btn transition-transform duration-300 ${open ? '' : 'rotate-180'}`}
                    />
                </button>
            </div>
            {open && past.length === 0 && (
                <p className="mt-3 text-2xs text-ink-faint">No events yet</p>
            )}
            {open && past.length > 0 && (
                <div
                    ref={listRef}
                    className="log scroll-hidden mt-3 max-h-72 overflow-y-auto overscroll-contain"
                >
                    {past.map((event, index) => (
                        <div
                            key={event.date}
                            className={`border-l-2 pl-3 py-1.5 ${
                                index === 0
                                    ? 'animate-log-in border-accent text-ink'
                                    : 'border-rule text-ink-muted'
                            }`}
                        >
                            <div className="meta flex items-center gap-2">
                                <span className={index === 0 ? 'text-accent' : ''}>
                                    {formatDate(new Date(event.date))}
                                </span>
                                {event.items.length > 1 && (
                                    <span>· {event.items.length} changes</span>
                                )}
                            </div>
                            <ul className="mt-0.5 flex flex-col gap-1 text-2xs leading-snug">
                                {event.items.map(({ description, line }) => {
                                    const [head, ...rest] = description.split(': ');

                                    return (
                                        <li key={description} className="flex gap-1.5">
                                            <span
                                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rule-strong"
                                                style={line && { backgroundColor: line.color }}
                                            ></span>
                                            <span>
                                                {rest.length > 0 ? (
                                                    <>
                                                        <span className="font-medium">{head}:</span>{' '}
                                                        {rest.join(': ')}
                                                    </>
                                                ) : (
                                                    description
                                                )}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
