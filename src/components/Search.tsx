import { useId, useMemo, useRef, useState } from 'react';
import searchIcon from '../assets/search.svg';
import type { StationOption } from '../stationSearch';
import { formatDate } from '../utils';
import useScrollOverflow from '../hooks/useScrollOverflow';

interface SearchProps {
    stations: StationOption[];
    onSelect: (station: StationOption) => void;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

function normalize(value: string): string {
    return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

export default function Search({ stations, onSelect }: SearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const normalizedQuery = normalize(query.trim());

    const results = useMemo(() => {
        if (!normalizedQuery) {
            return [];
        }
        return stations
            .flatMap(station => {
                const name = normalize(station.name);
                const index = name.indexOf(normalizedQuery);
                return index < 0 ? [] : [{ station, exact: name === normalizedQuery, index }];
            })
            .sort(
                (a, b) =>
                    Number(b.exact) - Number(a.exact) ||
                    a.index - b.index ||
                    collator.compare(a.station.name, b.station.name) ||
                    b.station.start - a.station.start,
            )
            .map(result => result.station);
    }, [normalizedQuery, stations]);

    const activeIndex = Math.min(active, results.length - 1);
    const showResults = open && normalizedQuery.length > 0;
    const { listRef, hintRef, measure, overflowing, hiddenBelow } = useScrollOverflow(
        results.length,
        showResults,
    );

    function select(station: StationOption) {
        setQuery(station.name);
        onSelect(station);
        inputRef.current?.blur();
    }

    return (
        <div
            className="station-search pointer-events-auto relative"
            onBlur={() => setOpen(false)}
            onKeyDown={e => {
                e.stopPropagation();

                if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length > 0) {
                    e.preventDefault();
                    const direction = e.key === 'ArrowDown' ? 1 : -1;
                    const next = (activeIndex + direction + results.length) % results.length;
                    setActive(next);
                    document
                        .getElementById(`${listId}-${next}`)
                        ?.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter' && showResults && results[activeIndex]) {
                    e.preventDefault();
                    select(results[activeIndex]);
                }
            }}
        >
            <label
                className="search-field zoom-btn overflow-hidden rounded-full px-2
                    transition-[width,gap] duration-300 ease-in-out"
            >
                <img src={searchIcon} alt="" className="icon h-4 w-4 shrink-0 cursor-pointer" />
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-label="Search stations"
                    aria-autocomplete="list"
                    aria-controls={listId}
                    aria-expanded={showResults}
                    aria-activedescendant={
                        showResults && results[activeIndex] ? `${listId}-${activeIndex}` : undefined
                    }
                    placeholder="Search for a station"
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={e => {
                        setQuery(e.target.value);
                        setActive(0);
                    }}
                    className="bg-transparent text-sm transition-opacity duration-300 outline-none"
                />
            </label>
            {showResults && (
                <div
                    className="panel bg-surface absolute top-11 right-0 flex max-h-72
                        w-(--search-width) flex-col py-1"
                >
                    <div
                        ref={listRef}
                        onScroll={measure}
                        id={listId}
                        role="listbox"
                        aria-label="Station results"
                        className="scroll-hidden min-h-0 overflow-y-auto overscroll-contain"
                    >
                        <div>
                            {results.length > 0 ? (
                                results.map((station, index) => (
                                    <button
                                        key={`${station.id}-${station.name}`}
                                        id={`${listId}-${index}`}
                                        type="button"
                                        role="option"
                                        tabIndex={-1}
                                        aria-selected={index === activeIndex}
                                        onMouseDown={e => e.preventDefault()}
                                        onMouseEnter={() => setActive(index)}
                                        onClick={() => select(station)}
                                        className="text-ink-muted aria-selected:bg-rule/50
                                            aria-selected:text-ink flex w-full cursor-pointer
                                            items-center gap-2 px-3 py-1.5 text-left text-sm"
                                    >
                                        <span className="flex-1 truncate">{station.name}</span>
                                        <span className="meta shrink-0">
                                            {formatDate(new Date(station.start))}
                                        </span>
                                        <span className="flex shrink-0 gap-1" aria-hidden="true">
                                            {[...station.colors].map(color => (
                                                <span
                                                    key={color}
                                                    className="size-2 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <p className="text-ink-faint px-3 py-2 text-sm">
                                    No stations found
                                </p>
                            )}
                        </div>
                    </div>
                    {overflowing && (
                        <div
                            ref={hintRef}
                            className="text-3xs text-ink-faint h-5 shrink-0 px-3 text-center
                                leading-5"
                        >
                            {hiddenBelow > 0 && `↓ ${hiddenBelow} more`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
