import * as d3 from 'd3';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import {
    type LineStats,
    type LineWrapper,
    type StationWrapper,
    type RawTooltipData,
    Status,
} from '../schemas';

import { clamp, findName, formatDate, lineStats, parseLabelDates, playPause } from '../utils';

import { MAP_TRANSITION_MS, update, setupHoverEffect } from '../utils_d3';

import { systems, type SystemKey, type SystemConfig } from '../systems';
import pause from '../assets/pause.svg';
import play from '../assets/play.svg';
import plus from '../assets/plus.svg';
import minus from '../assets/minus.svg';
import chevronLeft from '../assets/chevron-left.svg';
import chevronRight from '../assets/chevron-right.svg';
import Tooltip from './Tooltip';
import cross from '../assets/cross.svg';
import { BigTooltip } from './BigTooltip';

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
    const [playing, setPlaying] = useState(false);
    const [tooltip, setTooltip] = useState<RawTooltipData | null>(null);
    const [highlight, setHighlight] = useState<string[]>([]);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const timeRef = useRef(time);

    useEffect(() => {
        timeRef.current = time;
    }, [time]);

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
        if (!svgDoc) return;

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

        update(timeRef.current, linesRef.current, stationsRef.current, legend);

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
        update(time, linesRef.current, stationsRef.current, legend, highlight);
    }, [time, legend, highlight]);

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

        const eventDates = eventDatesRef.current;
        const delay = eventDates.includes(time) ? MAP_TRANSITION_MS + 100 : 40;

        const timer = d3.interval(() => {
            setTime(prev => {
                const nextDate = d3.utcMonth.offset(d3.utcMonth.floor(new Date(prev)), 1);
                const nextMs = Math.min(nextDate.getTime(), findNextEventDate(prev));

                if (nextMs >= maxDate.getTime()) {
                    setPlaying(false);
                    return maxDate.getTime();
                }
                return nextMs;
            });
        }, delay);
        return () => timer.stop();
    }, [playing, time, svgDoc, maxDate, findNextEventDate]);

    return (
        <div
            className="w-dvw h-dvh flex justify-center items-center touch-none"
            style={{ '--slider-thumb': `url("${config.logo}")` } as React.CSSProperties}
        >
            <header
                className={`absolute top-0 left-0 w-dvw pl-5 pt-5 flex flex-col gap-5 pointer-events-none z-10`}
            >
                <div>
                    <h1 className="text-5xl font-bold font-serif text-shadow-xl">{config.title}</h1>
                    <h2 className="text-2xl font-zh" lang="zh-Hans">
                        {config.chineseTitle}
                    </h2>
                </div>
                <div className="flex flex-col gap-5 justify-center items-center">
                    <h3 className="text-sm font-normal text-shadow-xl opacity-70">
                        {config.description}
                    </h3>
                    {config.article && (
                        <Link to={config.article} className="pointer-events-auto nav-btn">
                            Read more
                        </Link>
                    )}
                </div>
            </header>
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
            <div className="absolute bottom-31 left-4 flex flex-col gap-2 pointer-events-auto">
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
                    <img src={plus} alt="Zoom in" className="h-6 w-6" />
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
                    <img src={minus} alt="Zoom out" className="h-6 w-6" />
                </button>
            </div>
            <div className="absolute bottom-29 flex flex-wrap justify-center w-2/3 lg:w-1/2 items-center gap-1 pointer-events-none">
                {legend.map(line => {
                    const name = findName(line.states, time);
                    const selected = highlight.includes(line.id);

                    if (name) {
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
                                className={`relative p-1 rounded-md
                                    flex items-center gap-2 text-[7px] md:text-[10px] pointer-events-auto cursor-pointer
                                    ${selected ? 'bg-gray-400/40 text-gray-900 ring-1 ring-gray-500' : 'bg-gray-400/10 text-gray-600'}`}
                            >
                                <div
                                    className="w-3 md:w-4 h-1 md:h-2 rounded-sm"
                                    style={{ backgroundColor: line.color }}
                                ></div>
                                {name}
                                {stats && line.id === hoveredLine && <BigTooltip stats={stats} />}
                            </button>
                        );
                    }
                    return null;
                })}
                {legend.some(
                    line => highlight.includes(line.id) && findName(line.states, time) !== null,
                ) && (
                    <button
                        type="button"
                        onClick={() => setHighlight([])}
                        className={`p-1 rounded-md text-[7px] md:text-[10px] pointer-events-auto cursor-pointer
                            bg-gray-400/10 text-gray-600`}
                    >
                        <img src={cross} alt="Clear" className="h-3 md:h-4" />
                    </button>
                )}
            </div>
            <footer
                className={`absolute bottom-0 left-0 w-dvw p-4 pt-2 flex flex-col justify-center items-center gap-2
                bg-gray-400/50 pointer-events-none`}
            >
                <button
                    type="button"
                    onClick={() => playPause(setPlaying, time, setTime, minDate, maxDate)}
                    className="absolute left-5 top-4 h-10 flex justify-center items-center pointer-events-auto"
                    aria-label={playing ? 'Pause timeline' : 'Play timeline'}
                >
                    <img
                        src={playing ? pause : play}
                        alt={playing ? 'Pause' : 'Play'}
                        className="h-full"
                    />
                </button>
                <div className="flex gap-3 items-center *:pointer-events-auto">
                    <img
                        src={chevronLeft}
                        alt="Previous"
                        className="h-3 w-3 hover:opacity-50"
                        onClick={e => {
                            e.preventDefault();
                            setTime(prev => findPreviousEventDate(prev));
                        }}
                    />
                    <label
                        htmlFor="date-slider"
                        className="inline-block text-lg font-medium align-middle"
                    >
                        {formatDate(new Date(time))}
                    </label>
                    <img
                        src={chevronRight}
                        alt="Next"
                        className="h-3 w-3 hover:opacity-50"
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
                        className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-10 opacity-80 cursor-pointer"
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
                                    style={{ left: `${pct}%`, transform: `translate(-50%, -50%)` }}
                                >
                                    <div className="h-3 w-0.5 bg-gray-800/50 mt-6"></div>
                                    <span className="text-[10px] font-medium text-gray-800 mt-0.5">
                                        {date.getUTCFullYear()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </footer>
        </div>
    );
}
