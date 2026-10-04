import * as d3 from 'd3';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { LineWrapper, RawTooltipData, StationWrapper, UpdateResult } from '../schemas';

import {
    clamp,
    findActive,
    parseLabelDates,
    playPause,
    relativeCenter,
    servesLine,
} from '../utils';

import {
    applyMapTheme,
    DEFAULT_SETTINGS,
    setupHairlines,
    setupHoverEffect,
    setupZoomThinning,
    STEP_UNITS,
    update,
    zoomToElement,
    type MapSettings,
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
import { lengthSeries } from '../lengthSeries';
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
import TimelineSlider from './TimelineSlider';
import Tooltip, { TOOLTIP_OFFSET } from './Tooltip';

const ZOOM_STEP = 1.3;

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
    const thumbWidth = config.logoSize ?? 24;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.title = `${config.name} History`;
    }, [config.name]);

    const svgRef = useRef<HTMLObjectElement | null>(null);
    const linesRef = useRef<LineWrapper[]>([]);
    const stationsRef = useRef<StationWrapper[]>([]);
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
    const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
    const [stationMarkers, setStationMarkers] = useState<StationWrapper[]>([]);
    const [tracks, setTracks] = useState<LineWrapper[]>([]);
    const [sliderTrackWidth, setSliderTrackWidth] = useState<number | null>(null);

    const timeRef = useRef(time);

    const eventDates = useMemo(
        () =>
            config.events
                .map(({ date }) => Date.parse(date))
                .filter(date => minDate.getTime() <= date && date <= maxDate.getTime()),
        [config.events, minDate, maxDate],
    );

    const sliderRef = useCallback(
        (slider: HTMLInputElement | null) => {
            if (slider) {
                setSliderTrackWidth(slider.clientWidth - thumbWidth);
            }
        },
        [thumbWidth],
    );

    useEffect(() => {
        timeRef.current = time;
    }, [time]);

    const findPreviousEventDate = useCallback(
        (currentTime: number): number =>
            eventDates.findLast(date => date < currentTime) ?? minDate.getTime(),
        [eventDates, minDate],
    );

    const findNextEventDate = useCallback(
        (currentTime: number): number =>
            eventDates.find(date => date > currentTime) ?? maxDate.getTime(),
        [eventDates, maxDate],
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
                color: line.color,
                states: parseLabelDates(line.label),
            })),
        [config.lines],
    );

    useLayoutEffect(() => {
        if (!svgDoc) {
            return;
        }

        svgDoc.addEventListener('keydown', keyDownHandler);

        const lines = svgDoc.querySelector('g#lines')!;
        const stations = svgDoc.querySelector('g#stations')!;
        const [defaultOperator] = Object.keys(config.operators);

        const thin = setupZoomThinning(svgDoc);
        const hairlines = setupHairlines(svgDoc);

        linesRef.current = Array.from(lines.querySelectorAll('path')).map(el => {
            const length = el.getTotalLength();
            const width = parseFloat(svgDoc.defaultView!.getComputedStyle(el).strokeWidth);

            el.style.strokeDashoffset = String(length);
            el.style.strokeDasharray = `${length} ${length + width}`;
            el.dataset.hidden = 'true';

            return {
                el,
                states: parseLabelDates(el.getAttribute('inkscape:label')!),
                length,
                km: parseFloat(el.dataset.km!),
                partners: [],
            };
        });

        const tracksById = new globalThis.Map(linesRef.current.map(line => [line.el.id, line]));
        for (const line of linesRef.current) {
            for (const id of line.el.dataset.takesOver?.split(' ') ?? []) {
                const from = tracksById.get(id)!;
                from.partners.push(line);
                line.partners.push(from);
            }
        }

        stationsRef.current = (Array.from(stations.children) as SVGElement[]).map(el => {
            el.style.opacity = '0';
            el.dataset.hidden = 'true';

            setupHoverEffect(el);

            const station = {
                el,
                states: parseLabelDates(el.getAttribute('inkscape:label')!),
                lines: el.dataset.lines ? parseLabelDates(el.dataset.lines) : [],
                operators: parseLabelDates(el.dataset.logos ?? defaultOperator),
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
        setTracks(linesRef.current);

        const svgd3 = d3.select(svgDoc).select<SVGSVGElement>('svg');
        const zoomLayer = d3.select(svgDoc).select<SVGGElement>('#zoom-layer');
        const svgEl = svgd3.node()!;

        const viewBox = svgEl.viewBox.baseVal;

        const { width: viewportWidth, height: viewportHeight } = svgEl.getBoundingClientRect();

        const [initialWidth, initialHeight] = config.initialBounds;
        const scaleWidth = viewportWidth / initialWidth;
        const scaleHeight = viewportHeight / initialHeight;

        const initialScale = Math.max(scaleWidth, scaleHeight);

        const view = config.initialView;
        const viewZoom = initialScale * (view?.zoom ?? 1);

        const initialTranslateX = view
            ? clamp(
                  viewportWidth / 2 - view.center[0] * viewZoom,
                  viewportWidth - initialWidth * viewZoom,
                  0,
              )
            : (viewportWidth - initialWidth * initialScale) / 2;
        const initialTranslateY = view
            ? clamp(
                  viewportHeight / 2 - view.center[1] * viewZoom,
                  viewportHeight - initialHeight * viewZoom,
                  0,
              )
            : viewportHeight - initialHeight * initialScale;

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([
                Math.max(viewportWidth / viewBox.width, viewportHeight / viewBox.height),
                initialScale * 4,
            ])
            .translateExtent([
                [viewBox.x, viewBox.y],
                [viewBox.x + viewBox.width, viewBox.y + viewBox.height],
            ])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                zoomLayer.attr('transform', event.transform.toString());
                thin(event.transform.k / initialScale);
                hairlines(event.transform.k);
            });

        let lastDistance = 0;

        function pinchDistance({ touches }: TouchEvent) {
            return Math.hypot(
                touches[1].clientX - touches[0].clientX,
                touches[1].clientY - touches[0].clientY,
            );
        }

        svgEl.addEventListener(
            'touchstart',
            e => {
                if (e.touches.length === 2) {
                    lastDistance = pinchDistance(e);
                }
            },
            { passive: true },
        );

        svgEl.addEventListener(
            'touchmove',
            e => {
                e.preventDefault();
                if (e.touches.length === 2 && lastDistance > 0) {
                    const distance = pinchDistance(e);
                    svgd3.call(zoom.scaleBy, distance / lastDistance);
                    lastDistance = distance;
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
    }, [svgDoc, keyDownHandler, config.initialView, config.initialBounds, config.operators]);

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

    useLayoutEffect(() => {
        const geography = svgDoc?.querySelector<SVGElement>('#geography');
        if (geography) {
            geography.style.display = settings.showGeography ? '' : 'none';
        }
    }, [svgDoc, settings.showGeography]);

    useLayoutEffect(() => {
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

        const delay = eventDates.includes(time) ? settings.pauseMs : settings.tickMs;
        const { interval } = STEP_UNITS[settings.step.unit];

        const timer = d3.interval(() => {
            const nextDate = interval.offset(interval.floor(new Date(time)), settings.step.count);
            const nextMs = Math.min(nextDate.getTime(), findNextEventDate(time));

            if (nextMs >= maxDate.getTime()) {
                setPlaying(false);
            }
            setTime(Math.min(nextMs, maxDate.getTime()));
        }, delay);
        return () => timer.stop();
    }, [
        playing,
        time,
        svgDoc,
        eventDates,
        maxDate,
        findNextEventDate,
        settings.pauseMs,
        settings.tickMs,
        settings.step,
    ]);

    const presentLines = legend.flatMap(line => {
        const state = findActive(line.states, time);
        return state ? [{ line, name: state.name, since: state.dateRange.appear }] : [];
    });

    const series = useMemo(() => {
        const dates =
            eventDates[0] === minDate.getTime() ? eventDates : [minDate.getTime(), ...eventDates];
        return lengthSeries(tracks, legend, highlight, dates);
    }, [tracks, legend, highlight, eventDates, minDate]);

    const searchableStations = useMemo(
        () => createStationOptions(stationMarkers, legend, highlight),
        [stationMarkers, legend, highlight],
    );

    function zoomBy(factor: number) {
        if (svgD3Ref.current && zoomRef.current) {
            svgD3Ref.current.transition().duration(300).call(zoomRef.current.scaleBy, factor);
        }
    }

    function focusStation(option: StationOption) {
        const svgd3 = svgD3Ref.current;
        const zoom = zoomRef.current;
        if (!svgd3 || !zoom) {
            return;
        }

        const current = findActive(option.matches, time);
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
            style={
                {
                    '--slider-thumb': `url("${config.logos[0]}")`,
                    '--slider-thumb-width': `${thumbWidth}px`,
                    '--slider-thumb-height': `${config.logoSize ?? 16}px`,
                } as React.CSSProperties
            }
        >
            <div
                role="status"
                aria-hidden={!!svgDoc}
                className={`bg-paper fixed inset-0 z-50 flex flex-col items-center justify-center
                    gap-3 transition-opacity duration-300 motion-reduce:transition-none
                    ${svgDoc ? 'pointer-events-none opacity-0' : ''}`}
            >
                <img src="/logo.svg" alt="" className="size-12" />
                <span className="text-sm">{config.name}</span>
                <span className="meta motion-safe:animate-pulse">Loading map…</span>
            </div>
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
            <main className="h-dvh w-dvw touch-none" aria-busy={!svgDoc}>
                <object
                    key={svgVersion}
                    ref={svgRef}
                    data={config.map}
                    onLoad={() => setSvgDoc(svgRef.current!.contentDocument)}
                    type="image/svg+xml"
                    aria-label={`Interactive ${config.name} History map, ${minDate.getUTCFullYear()}-${maxDate.getUTCFullYear()}`}
                    className="absolute top-0 left-0 h-full w-full touch-none"
                    style={{ visibility: svgDoc ? 'visible' : 'hidden' }}
                />
                {svgDoc && (
                    <Tooltip
                        tooltip={tooltip}
                        stations={stationMarkers}
                        time={time}
                        config={config}
                        presentLines={presentLines}
                    />
                )}
            </main>
            <div
                className={`pointer-events-auto absolute bottom-31 left-4 flex flex-col gap-2
                    ${expanded ? 'translate-y-25.5' : ''} slide-out-settings`}
            >
                <button
                    type="button"
                    onClick={() => zoomBy(ZOOM_STEP)}
                    className="zoom-btn"
                    aria-label="Zoom in"
                >
                    <img src={plus} alt="Zoom in" className="icon h-6 w-6" />
                </button>
                <button
                    type="button"
                    onClick={() => zoomBy(1 / ZOOM_STEP)}
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
                            key={line.id}
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
                                            servesLine(station.lines, line.id, time),
                                        ).length,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
                {presentLines.some(({ line }) => highlight.includes(line.id)) && (
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
                        onClick={() => setTime(prev => findNextEventDate(prev))}
                        aria-label="Next event"
                        className="group relative"
                    >
                        <img src={chevronRight} alt=">" className="icon-btn" />
                        <ControlTooltip>Next event</ControlTooltip>
                    </button>
                </div>
                <TimelineSlider
                    series={series}
                    eventDates={eventDates}
                    ticks={ticks}
                    minTime={minDate.getTime()}
                    maxTime={maxDate.getTime()}
                    time={time}
                    onTimeChange={setTime}
                    highlighted={highlight.length > 0}
                    thumbWidth={thumbWidth}
                    sliderTrackWidth={sliderTrackWidth}
                    sliderRef={sliderRef}
                    svgVersion={svgVersion}
                />
            </footer>
        </div>
    );
}
