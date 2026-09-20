import * as d3 from 'd3';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';

import {
    type LineStats,
    type LineWrapper,
    type StationWrapper,
    type RawTooltipData,
    type UpdateResult,
    Status,
} from '../schemas';

import { clamp, findName, formatDate, lineStats, parseLabelDates, playPause } from '../utils';

import {
    DEFAULT_SETTINGS,
    STEP_UNITS,
    type PlaybackSettings,
    update,
    setupHoverEffect,
    applyMapTheme,
} from '../utils_d3';

import { systems, type SystemKey, type SystemConfig } from '../systems';
import pause from '../assets/pause.svg';
import play from '../assets/play.svg';
import plus from '../assets/plus.svg';
import expand from '../assets/expand.svg';
import shrink from '../assets/shrink.svg';
import minus from '../assets/minus.svg';
import chevronLeft from '../assets/chevron-left.svg';
import chevronRight from '../assets/chevron-right.svg';
import Tooltip from './Tooltip';
import cross from '../assets/cross.svg';
import { BigTooltip } from './BigTooltip';
import HeaderCard from './HeaderCard';
import Stats from './Stats';
import Changelog from './Changelog';
import Theme from './Theme';
import Info from './Info';

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
    const [time, setTime] = useState<number>(minDate.getTime());
    const [playing, setPlaying] = useState<boolean>(true);
    const [tooltip, setTooltip] = useState<RawTooltipData | null>(null);
    const [highlight, setHighlight] = useState<string[]>([]);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [network, setNetwork] = useState<UpdateResult>({ stationCount: 0, km: 0, lineKm: {} });
    const [expanded, setExpanded] = useState<boolean>(false);
    const [settings, setSettings] = useState<PlaybackSettings>(DEFAULT_SETTINGS);

    const timeRef = useRef(time);
    const settingsRef = useRef(settings);

    useEffect(() => {
        timeRef.current = time;
    }, [time]);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    const keyDownHandler = useCallback(
        (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                playPause(setPlaying, timeRef.current, setTime, minDate, maxDate);
            }
        },
        [minDate, maxDate],
    );

    const ticks = useMemo(() => {
        const startYear = minDate.getUTCFullYear();
        const endYear = maxDate.getUTCFullYear();
        const tickDates = [];
        for (let year = Math.ceil(startYear / 5) * 5; year < endYear; year += 5) {
            tickDates.push(new Date(Date.UTC(year, 0, 1)));
        }
        return tickDates;
    }, [minDate, maxDate]);

    useEffect(() => {
        function handler() {
            window.location.reload();
        }
        window.addEventListener('resize', handler);

        return () => window.removeEventListener('resize', handler);
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

        setNetwork(
            update(
                timeRef.current,
                linesRef.current,
                stationsRef.current,
                legend,
                settingsRef.current.transitionMs,
            ),
        );

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
        const next = update(
            time,
            linesRef.current,
            stationsRef.current,
            legend,
            settings.transitionMs,
            highlight,
        );
        setNetwork(prev => (sameNetwork(prev, next) ? prev : next));
    }, [time, legend, highlight, settings.transitionMs]);

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

    const [stats, setStats] = useState<LineStats | null>(null);
    useEffect(() => {
        const entry = legend.find(line => line.id === hoveredLine);
        setStats(
            entry && svgDoc ? lineStats(entry, time, linesRef.current, stationsRef.current) : null,
        );
    }, [hoveredLine, time, legend, svgDoc]);

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
        const name = findName(line.states, time);
        return name === null ? [] : [{ line, name }];
    });

    const activeLines = presentLines.filter(({ line }) => highlight.includes(line.id));

    return (
        <div
            className="w-dvw h-dvh flex justify-center items-center touch-none"
            style={{ '--slider-thumb': `url("${config.logo}")` } as React.CSSProperties}
        >
            <header
                className={`absolute top-4 left-4 z-10 flex max-h-[calc(100dvh-17.5rem)] flex-col pointer-events-none
                ${expanded ? '-translate-x-100' : ''} slide-out-settings`}
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
                <Theme />
                <Info
                    settings={settings}
                    onSettings={patch => setSettings(current => ({ ...current, ...patch }))}
                />
            </div>
            <main className="w-dvw h-dvh touch-none">
                <object
                    ref={svgRef}
                    data={config.map}
                    onLoad={() => setSvgDoc(svgRef.current!.contentDocument)}
                    type="image/svg+xml"
                    aria-label={`Interactive ${config.title} map, ${minDate.getUTCFullYear()}-${maxDate.getUTCFullYear()}`}
                    className="absolute top-0 left-0 w-full h-full touch-none"
                />
                {svgDoc && (
                    <Tooltip tooltip={tooltip} time={time} config={config} legend={legend} />
                )}
            </main>
            <div
                className={`absolute bottom-31 left-4 flex flex-col gap-2 pointer-events-auto
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
                time={time}
                legend={legend}
            />
            <div
                className={`absolute bottom-29 flex flex-wrap justify-center w-2/3 lg:w-1/2 items-center gap-1.5 pointer-events-none
                ${expanded ? 'translate-y-25.5' : ''} slide-out-settings`}
            >
                {presentLines.map(({ line, name }) => {
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
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: line.color }}
                            ></div>
                            {name}
                            {stats && line.id === hoveredLine && <BigTooltip stats={stats} />}
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
                className={`absolute bottom-0 left-0 w-dvw p-4 pt-2 flex flex-col justify-center items-center gap-2
                    bg-surface/85 border-t border-rule pointer-events-none
                    ${expanded ? 'translate-y-25.5' : ''} slide-out-settings`}
            >
                <button
                    type="button"
                    onClick={() => playPause(setPlaying, time, setTime, minDate, maxDate)}
                    className="absolute left-7 top-4 h-6 flex justify-center items-center pointer-events-auto"
                    aria-label={playing ? 'Pause timeline' : 'Play timeline'}
                >
                    <img
                        src={playing ? pause : play}
                        alt={playing ? 'Pause' : 'Play'}
                        className="icon h-full"
                    />
                </button>
                <div className="flex gap-3 items-center *:pointer-events-auto">
                    <img
                        src={chevronLeft}
                        alt="Previous"
                        className="icon-btn"
                        onClick={e => {
                            e.preventDefault();
                            setTime(prev => findPreviousEventDate(prev));
                        }}
                    />
                    <label
                        htmlFor="date-slider"
                        className="font-mono text-sm tracking-wider tabular-nums text-ink"
                    >
                        {formatDate(new Date(time))}
                    </label>
                    <img
                        src={chevronRight}
                        alt="Next"
                        className="icon-btn"
                        onClick={e => {
                            e.preventDefault();
                            setTime(prev => findNextEventDate(prev));
                        }}
                    />
                </div>
                <div className="relative w-full h-12 flex items-center px-4 pointer-events-auto">
                    <input
                        id="date-slider"
                        type="range"
                        min={minDate.getTime()}
                        max={maxDate.getTime()}
                        value={time}
                        onChange={e => setTime(Number(e.target.value))}
                        className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                    />
                    <div className="absolute top-1/2 left-4 right-4 h-full -translate-y-1/2 pointer-events-none">
                        {ticks.map(date => {
                            const min_time = minDate.getTime();
                            const pct =
                                ((date.getTime() - min_time) / (maxDate.getTime() - min_time)) *
                                100;

                            return (
                                <div
                                    key={date.getTime()}
                                    className="absolute top-1/2 flex flex-col items-center"
                                    style={{
                                        left: `${pct}%`,
                                        transform: `translate(-50%, -50%)`,
                                    }}
                                >
                                    <div className="h-2 w-px bg-rule-strong mt-6"></div>
                                    <span className="meta mt-1">{date.getUTCFullYear()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </footer>
        </div>
    );
}
