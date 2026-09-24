import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    Status,
    type LineWrapper,
    type RawTooltipData,
    type StationWrapper,
    type UpdateResult,
} from '../schemas';

import { clamp, formatDate, isActive, parseLabelDates, playPause, relativeCenter } from '../utils';

import {
    applyMapTheme,
    DEFAULT_SETTINGS,
    setupHoverEffect,
    STEP_UNITS,
    update,
    zoomToElement,
    type PlaybackSettings,
} from '../utils_d3';

import chevronLeft from '../assets/chevron-left.svg';
import chevronRight from '../assets/chevron-right.svg';
import cross from '../assets/cross.svg';
import expand from '../assets/expand.svg';
import minus from '../assets/minus.svg';
import pause from '../assets/pause.svg';
import play from '../assets/play.svg';
import plus from '../assets/plus.svg';
import shrink from '../assets/shrink.svg';
import { createStationOptions, type StationOption } from '../stationSearch';
import { systems, type SystemConfig, type SystemKey } from '../systems';
import { BigTooltip } from './BigTooltip';
import Changelog from './Changelog';
import ControlTooltip from './ControlTooltip';
import DatePicker from './DatePicker';
import HeaderCard from './HeaderCard';
import Info from './Info';
import Search from './Search';
import Stats from './Stats';
import Theme from './Theme';
import Tooltip, { TOOLTIP_OFFSET } from './Tooltip';

const SLIDER_THUMB_WIDTH = 24;
const EVENT_DOT_SIZE = 4;

function sameNetwork(a: UpdateResult, b: UpdateResult): boolean {
    return (
        a.stationCount === b.stationCount &&
        a.km === b.km &&
        Object.keys(a.lineKm).length === Object.keys(b.lineKm).length &&
        Object.entries(b.lineKm).every(([id, km]) => a.lineKm[id] === km)
    );
}

export default function Map({ system }: { system: SystemKey }) {
    const config: SystemConfig = systems[system];
    const { minDate, maxDate } = config;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.title = config.title;
    }, [config.title]);

    const svgRef = useRef<HTMLObjectElement | null>(null);
    const linesRef = useRef<LineWrapper[]>([]);
    const stationsRef = useRef<StationWrapper[]>([]);
    const eventDatesRef = useRef<number[]>([]);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const svgD3Ref = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

    const [svgDoc, setSvgDoc] = useState<Document | null>(null);
    const [svgVersion, setSvgVersion] = useState(0);
    const [time, setTime] = useState<number>(minDate.getTime());
    const [playing, setPlaying] = useState<boolean>(true);
    const [tooltip, setTooltip] = useState<RawTooltipData | null>(null);
    const [highlight, setHighlight] = useState<string[]>([]);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [network, setNetwork] = useState<UpdateResult>({ stationCount: 0, km: 0, lineKm: {} });
    const [expanded, setExpanded] = useState<boolean>(false);
    const [settings, setSettings] = useState<PlaybackSettings>(DEFAULT_SETTINGS);
    const [stationMarkers, setStationMarkers] = useState<StationWrapper[]>([]);
    const [sliderTrackWidth, setSliderTrackWidth] = useState<number | null>(null);

    const timeRef = useRef(time);

    const sliderRef = useCallback((slider: HTMLInputElement | null) => {
        if (slider) {
            setSliderTrackWidth(slider.clientWidth - SLIDER_THUMB_WIDTH);
        }
    }, []);

    useEffect(() => {
        timeRef.current = time;
    }, [time]);

    const findPreviousEventDate = useCallback(
        (currentTime: number): number => {
            const eventDates = eventDatesRef.current;
            return eventDates.findLast(date => date < currentTime) ?? minDate.getTime();
        },
        [minDate],
    );

    const findNextEventDate = useCallback(
        (currentTime: number): number => {
            const eventDates = eventDatesRef.current;
            return eventDates.find(date => date > currentTime) ?? maxDate.getTime();
        },
        [maxDate],
    );

    const keyDownHandler = useCallback(
        (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.id !== 'date-slider') {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                playPause(setPlaying, timeRef.current, setTime, minDate, maxDate);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                setTime(prev => findPreviousEventDate(prev));
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                setTime(prev => findNextEventDate(prev));
            }
        },
        [minDate, maxDate, findPreviousEventDate, findNextEventDate],
    );

    const ticks = useMemo(() => {
        const startYear = minDate.getUTCFullYear();
        const endYear = maxDate.getUTCFullYear();
        const step = Math.max(
            5,
            d3.tickStep(startYear, endYear, (sliderTrackWidth ?? window.innerWidth) / 50),
        );
        const tickDates = [];
        for (let year = Math.ceil(startYear / step) * step; year < endYear; year += step) {
            tickDates.push(new Date(Date.UTC(year, 0, 1)));
        }
        return tickDates;
    }, [minDate, maxDate, sliderTrackWidth]);

    useEffect(() => {
        let timer: number;

        const reloadMap = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setTooltip(null);
                setSvgDoc(null);
                setSvgVersion(version => version + 1);
            }, 200);
        };
        window.addEventListener('resize', reloadMap);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', reloadMap);
        };
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', keyDownHandler);
        return () => document.removeEventListener('keydown', keyDownHandler);
    }, [keyDownHandler]);

    const legend = useMemo(
        () =>
            config.lines.map(line => ({
                id: line.id,
                label: line.label,
                color: line.color,
                states: parseLabelDates(line.label),
            })),
        [config.lines],
    );

    useEffect(() => {
        if (!svgDoc) {
            return;
        }

        svgDoc.addEventListener('keydown', keyDownHandler);

        const lines = svgDoc.querySelector('g#lines')!;
        const stations = svgDoc.querySelector('g#stations')!;

        linesRef.current = Array.from(lines.querySelectorAll('path')).map(el => {
            const length = el.getTotalLength();
            const dashArray = svgDoc.defaultView!.getComputedStyle(el).strokeDasharray;

            el.style.strokeDashoffset = String(length);
            el.style.strokeDasharray = String(length);
            el.dataset.hidden = 'true';

            return {
                el,
                states: parseLabelDates(el.getAttribute('inkscape:label')!),
                length,
                dashArray,
                km: parseFloat(el.dataset.km!),
            };
        });

        stationsRef.current = Array.from(
            stations.querySelectorAll<SVGElement>('path, circle, rect'),
        ).map(el => {
            el.style.opacity = '0';
            el.dataset.hidden = 'true';

            setupHoverEffect(el);
            let label = el.getAttribute('inkscape:label')!;

            const status = label.startsWith('^')
                ? Status.SecondaryOnly
                : label.startsWith('!')
                  ? Status.Both
                  : Status.PrimaryOnly;
            label = label.replace(/^[!^]/, '');

            const station = {
                el,
                status,
                states: parseLabelDates(label),
                lines: el.dataset.lines ? parseLabelDates(el.dataset.lines) : [],
            };

            if (el.localName !== 'path') {
                el.addEventListener('mouseenter', e => {
                    const rect = svgRef.current!.getBoundingClientRect();
                    setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        station,
                    });
                });
                el.addEventListener('mousemove', e => {
                    const rect = svgRef.current!.getBoundingClientRect();
                    setTooltip(prev =>
                        prev
                            ? {
                                  ...prev,
                                  x: e.clientX - rect.left,
                                  y: e.clientY - rect.top,
                              }
                            : null,
                    );
                });
                el.addEventListener('mouseleave', () => setTooltip(null));
            }
            return station;
        });

        setStationMarkers(stationsRef.current);

        const eventDates = new Set<number>();
        for (const { states } of [...legend, ...linesRef.current, ...stationsRef.current]) {
            for (const { dateRange } of states) {
                eventDates.add(dateRange.appear.getTime());
                eventDates.add(dateRange.removed.getTime());
            }
        }
        eventDatesRef.current = [...eventDates]
            .filter(date => minDate.getTime() <= date && date <= maxDate.getTime())
            .sort((a, b) => a - b);

        const svgd3 = d3.select(svgDoc).select<SVGSVGElement>('svg');
        const zoomLayer = d3.select(svgDoc).select<SVGGElement>('#zoom-layer');
        const svgEl = svgd3.node()!;

        const viewBox = svgEl.viewBox.baseVal;

        const { width: viewportWidth, height: viewportHeight } = svgEl.getBoundingClientRect();

        const scaleWidth = viewportWidth / viewBox.width;
        const scaleHeight = viewportHeight / viewBox.height;

        const initialScale = Math.max(scaleWidth, scaleHeight);

        const view = config.initialView;
        const viewZoom = initialScale * (view?.zoom ?? 1);

        const initialTranslateX = view
            ? clamp(
                  viewportWidth / 2 - view.center[0] * viewZoom,
                  viewportWidth - viewBox.width * viewZoom,
                  0,
              )
            : (viewportWidth - viewBox.width * initialScale) / 2;
        const initialTranslateY = view
            ? clamp(
                  viewportHeight / 2 - view.center[1] * viewZoom,
                  viewportHeight - viewBox.height * viewZoom,
                  0,
              )
            : viewportHeight - viewBox.height * initialScale;

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([initialScale, initialScale * 4])
            .translateExtent([
                [0, 0],
                [viewBox.width, viewBox.height],
            ])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                zoomLayer.attr('transform', event.transform.toString());
            });

        svgEl.addEventListener(
            'touchmove',
            e => {
                e.preventDefault();
            },
            { passive: false },
        );

        let lastDistance = 0;

        svgEl.addEventListener(
            'touchstart',
            e => {
                if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    lastDistance = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY,
                    );
                }
            },
            { passive: true },
        );

        svgEl.addEventListener(
            'touchmove',
            e => {
                if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];

                    const distance = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY,
                    );

                    if (lastDistance > 0) {
                        const scale = distance / lastDistance;
                        svgD3Ref.current?.call(zoomRef.current!.scaleBy, scale);
                        lastDistance = distance;
                    }
                }
            },
            { passive: false },
        );

        svgEl.addEventListener(
            'touchend',
            () => {
                lastDistance = 0;
            },
            { passive: true },
        );

        svgd3
            .call(zoom)
            .call(
                zoom.transform,
                d3.zoomIdentity.translate(initialTranslateX, initialTranslateY).scale(viewZoom),
            );

        zoomRef.current = zoom;
        svgD3Ref.current = svgd3;

        svgEl.removeAttribute('viewBox');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';

        return () => svgDoc.removeEventListener('keydown', keyDownHandler);
    }, [svgDoc, legend, keyDownHandler, minDate, maxDate, config.initialView]);

    useEffect(() => {
        if (!svgDoc) {
            return;
        }
        const next = update(
            time,
            linesRef.current,
            stationsRef.current,
            legend,
            settings.transitionMs,
            highlight,
        );
        setNetwork(prev => (sameNetwork(prev, next) ? prev : next));
    }, [svgDoc, time, legend, highlight, settings.transitionMs]);

    useEffect(() => {
        if (!svgDoc) {
            return;
        }
        applyMapTheme(svgDoc);
        const observer = new MutationObserver(() => {
            applyMapTheme(svgDoc);
            update(
                timeRef.current,
                linesRef.current,
                stationsRef.current,
                legend,
                settings.transitionMs,
                highlight,
            );
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => observer.disconnect();
    }, [svgDoc, legend, highlight, settings.transitionMs]);

    useEffect(() => {
        if (!playing || !svgDoc) {
            return;
        }

        const { tickMs, step, pauseMs } = settings;
        const delay = eventDatesRef.current.includes(time) ? pauseMs : tickMs;
        const { interval } = STEP_UNITS[step.unit];

        const timer = d3.interval(() => {
            setTime(prev => {
                const nextDate = interval.offset(interval.floor(new Date(prev)), step.count);
                const nextMs = Math.min(nextDate.getTime(), findNextEventDate(prev));

                if (nextMs >= maxDate.getTime()) {
                    setPlaying(false);
                    return maxDate.getTime();
                }
                return nextMs;
            });
        }, delay);
        return () => timer.stop();
    }, [playing, time, svgDoc, maxDate, findNextEventDate, settings]);

    const presentLines = legend.flatMap(line => {
        const state = line.states.find(({ dateRange }) => isActive(dateRange, time));
        return state ? [{ line, name: state.name, since: state.dateRange.appear }] : [];
    });

    const activeLines = presentLines.filter(({ line }) => highlight.includes(line.id));
    const searchableStations = useMemo(
        () => createStationOptions(stationMarkers, legend, highlight),
        [stationMarkers, legend, highlight],
    );
    const timelineDuration = maxDate.getTime() - minDate.getTime();
    const timeProgress = (time - minDate.getTime()) / timelineDuration;

    function focusStation(option: StationOption) {
        const svgd3 = svgD3Ref.current;
        const zoom = zoomRef.current;
        if (!svgd3 || !zoom) {
            return;
        }

        const current = option.matches.find(({ dateRange }) => isActive(dateRange, time));
        const { station, dateRange } = current ?? option.matches[0];
        if (!current) {
            setTime(dateRange.appear.getTime());
        }

        setTooltip(null);

        zoomToElement(svgd3, zoom, station.el, () => {
            const [x, y] = relativeCenter(station.el, svgRef.current!);
            const searchTooltip = { x, y: y - TOOLTIP_OFFSET, station };
            setTooltip(searchTooltip);
            zoom.on('start.search', () => {
                setTooltip(current => (current === searchTooltip ? null : current));
                zoom.on('start.search', null);
            });
        });
    }

    return (
        <div
            className="flex h-dvh w-dvw touch-none items-center justify-center"
            style={{ '--slider-thumb': `url("${config.logos[0]}")` } as React.CSSProperties}
        >
            <header
                className={`pointer-events-none absolute top-4 left-4 z-10 flex
                    max-h-[calc(100dvh-17.5rem)] flex-col ${expanded ? '-translate-x-100' : ''}
                    slide-out-settings`}
            >
                <HeaderCard config={config} />
                <Stats
                    stations={network.stationCount}
                    km={network.km}
                    lines={presentLines.map(({ line, name }) => ({
                        id: line.id,
                        name,
                        color: line.color,
                        km: network.lineKm[line.id] ?? 0,
                    }))}
                    highlight={highlight}
                />
            </header>
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <Search stations={searchableStations} onSelect={focusStation} />
                <Theme />
                <Info
                    settings={settings}
                    onSettings={patch => setSettings(current => ({ ...current, ...patch }))}
                />
            </div>
            <main className="h-dvh w-dvw touch-none">
                <object
                    key={svgVersion}
                    ref={svgRef}
                    data={config.map}
                    onLoad={() => setSvgDoc(svgRef.current!.contentDocument)}
                    type="image/svg+xml"
                    aria-label={`Interactive ${config.title} map, ${minDate.getUTCFullYear()}-${maxDate.getUTCFullYear()}`}
                    className="absolute top-0 left-0 h-full w-full touch-none"
                />
                {svgDoc && (
                    <Tooltip tooltip={tooltip} time={time} config={config} legend={legend} />
                )}
            </main>
            <div
                className={`pointer-events-auto absolute bottom-31 left-4 flex flex-col gap-2
                    ${expanded ? 'translate-y-25.5' : ''} slide-out-settings`}
            >
                <button
                    type="button"
                    onClick={() => {
                        if (svgD3Ref.current && zoomRef.current) {
                            svgD3Ref.current
                                .transition()
                                .duration(300)
                                .call(zoomRef.current.scaleBy, 1.3);
                        }
                    }}
                    className="zoom-btn"
                    aria-label="Zoom in"
                >
                    <img src={plus} alt="Zoom in" className="icon h-6 w-6" />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (svgD3Ref.current && zoomRef.current) {
                            svgD3Ref.current
                                .transition()
                                .duration(300)
                                .call(zoomRef.current.scaleBy, 1 / 1.3);
                        }
                    }}
                    className="zoom-btn"
                    aria-label="Zoom out"
                >
                    <img src={minus} alt="Zoom out" className="icon h-6 w-6" />
                </button>
                <button
                    type="button"
                    className="zoom-btn"
                    aria-label="full view"
                    onClick={() => setExpanded(e => !e)}
                >
                    <img
                        src={expanded ? shrink : expand}
                        alt="Full view"
                        className="icon h-6 w-6"
                    />
                </button>
            </div>
            <Changelog
                className={`${expanded ? 'translate-x-100' : ''} slide-out-settings`}
                events={config.events}
                highlight={highlight}
                time={time}
                setTime={setTime}
                legend={legend}
            />
            <div
                className={`pointer-events-none absolute bottom-29 flex w-2/3 flex-wrap items-center
                    justify-center gap-1.5 lg:w-1/2 ${expanded ? 'translate-y-25.5' : ''}
                    slide-out-settings`}
            >
                {presentLines.map(({ line, name, since }) => {
                    const selected = highlight.includes(line.id);

                    return (
                        <button
                            type="button"
                            key={line.label}
                            onClick={() =>
                                setHighlight(
                                    selected
                                        ? highlight.filter(id => id !== line.id)
                                        : [...highlight, line.id],
                                )
                            }
                            onMouseEnter={() => setHoveredLine(line.id)}
                            onMouseLeave={() => setHoveredLine(null)}
                            aria-pressed={selected}
                            className="pill"
                        >
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: line.color }}
                            ></div>
                            {name}
                            {svgDoc && line.id === hoveredLine && (
                                <BigTooltip
                                    since={since}
                                    stats={{
                                        km: network.lineKm[line.id] ?? 0,
                                        stations: stationMarkers.filter(station =>
                                            station.lines.some(
                                                ({ name: id, dateRange }) =>
                                                    id === line.id && isActive(dateRange, time),
                                            ),
                                        ).length,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
                {activeLines.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setHighlight([])}
                        className="pill"
                        aria-label="Clear highlight"
                    >
                        <img src={cross} alt="Clear" className="icon h-3 md:h-4" />
                    </button>
                )}
            </div>
            <footer
                className={`bg-surface/85 border-rule pointer-events-none absolute bottom-0 left-0
                    flex w-dvw flex-col items-center justify-center gap-2 border-t p-4 pt-2
                    ${expanded ? 'translate-y-25.5' : ''} slide-out-settings`}
            >
                <button
                    type="button"
                    onClick={() => playPause(setPlaying, time, setTime, minDate, maxDate)}
                    className="pointer-events-auto absolute top-4 left-7 flex h-6 cursor-pointer
                        items-center justify-center"
                    aria-label={playing ? 'Pause timeline' : 'Play timeline'}
                >
                    <img
                        src={playing ? pause : play}
                        alt={playing ? 'Pause' : 'Play'}
                        className="icon h-full"
                    />
                </button>
                <div className="flex items-center gap-3 *:pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setTime(prev => findPreviousEventDate(prev))}
                        aria-label="Previous event"
                        className="group relative"
                    >
                        <img src={chevronLeft} alt="<" className="icon-btn" />
                        <ControlTooltip>Previous event</ControlTooltip>
                    </button>
                    <DatePicker
                        time={time}
                        minDate={minDate}
                        maxDate={maxDate}
                        onChange={setTime}
                    />
                    <button
                        type="button"
                        onClick={e => {
                            e.preventDefault();
                            setTime(prev => findNextEventDate(prev));
                        }}
                        aria-label="Next event"
                        className="group relative"
                    >
                        <img src={chevronRight} alt=">" className="icon-btn" />
                        <ControlTooltip>Next event</ControlTooltip>
                    </button>
                </div>
                <div
                    className="group pointer-events-auto relative flex h-12 w-full items-center
                        px-4"
                >
                    <div
                        className="pointer-events-none absolute inset-x-7"
                        onKeyDown={e => e.stopPropagation()}
                    >
                        {config.events
                            .map(event => Date.parse(event.date))
                            .filter(date => minDate.getTime() <= date && date <= maxDate.getTime())
                            .map(date => {
                                const progress = (date - minDate.getTime()) / timelineDuration;
                                const blockedByThumb =
                                    date === time ||
                                    (sliderTrackWidth !== null &&
                                        Math.abs(progress - timeProgress) * sliderTrackWidth <=
                                            (SLIDER_THUMB_WIDTH + EVENT_DOT_SIZE) / 2);
                                return (
                                    <div
                                        key={date}
                                        className="absolute top-1/2"
                                        style={{ left: `${progress * 100}%` }}
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Jump to ${formatDate(new Date(date))}`}
                                            disabled={blockedByThumb}
                                            onClick={() => setTime(date)}
                                            className="peer pointer-events-auto absolute z-20 h-3
                                                w-1.5 -translate-1/2 cursor-pointer
                                                disabled:pointer-events-none"
                                        />
                                        <span
                                            aria-hidden="true"
                                            className={`${date === time ? 'bg-accent' : 'bg-rule-strong peer-hover:bg-accent'}
                                            absolute z-1 size-1 -translate-1/2 rounded-full
                                            opacity-0 transition-opacity duration-150
                                            group-hover:opacity-100`}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                    <input
                        key={svgVersion}
                        ref={sliderRef}
                        id="date-slider"
                        type="range"
                        aria-label="Timeline"
                        min={minDate.getTime()}
                        max={maxDate.getTime()}
                        value={time}
                        onChange={e => setTime(Number(e.target.value))}
                        className="absolute top-1/2 right-4 left-4 z-10 -translate-y-1/2
                            cursor-pointer"
                    />
                    <div
                        className="pointer-events-none absolute inset-x-7 top-1/2 h-full
                            -translate-y-1/2"
                    >
                        {ticks.map(date => (
                            <div
                                key={date.getTime()}
                                className="absolute top-1/2 flex -translate-1/2 flex-col
                                    items-center"
                                style={{
                                    left: `${((date.getTime() - minDate.getTime()) / timelineDuration) * 100}%`,
                                }}
                            >
                                <div className="bg-rule-strong mt-6 h-2 w-px"></div>
                                <span className="meta mt-1">{date.getUTCFullYear()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
