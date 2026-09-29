import { useCallback, useRef, useState } from 'react';
import { lengthAt, type LengthPoint } from '../lengthSeries';
import { clamp, formatDate } from '../utils';
import LengthChart from './LengthChart';

const EVENT_DOT_SIZE = 4;

interface Hover {
    time: number;
    x: number;
}

interface TimelineSliderProps {
    series: LengthPoint[];
    eventDates: number[];
    ticks: Date[];
    minTime: number;
    maxTime: number;
    time: number;
    onTimeChange: (time: number) => void;
    highlighted: boolean;
    thumbWidth: number;
    sliderTrackWidth: number | null;
    sliderRef: (slider: HTMLInputElement | null) => void;
    svgVersion: number;
}

export default function TimelineSlider({
    series,
    eventDates,
    ticks,
    minTime,
    maxTime,
    time,
    onTimeChange,
    highlighted,
    thumbWidth,
    sliderTrackWidth,
    sliderRef,
    svgVersion,
}: TimelineSliderProps) {
    const [hover, setHover] = useState<Hover | null>(null);
    const [hoveredDot, setHoveredDot] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setInput = useCallback(
        (slider: HTMLInputElement | null) => {
            inputRef.current = slider;
            sliderRef(slider);
        },
        [sliderRef],
    );

    const timelineDuration = maxTime - minTime;
    const fraction = (t: number) => (t - minTime) / timelineDuration;
    const timeProgress = fraction(time);
    const hoverPoint = hover === null ? undefined : lengthAt(series, hover.time);

    return (
        <div
            className="group pointer-events-auto relative flex h-12 w-full items-center px-4"
            onPointerMove={e => {
                const dot =
                    e.buttons === 0 && e.target instanceof HTMLElement
                        ? e.target.dataset.eventDate
                        : undefined;
                setHoveredDot(dot ? Number(dot) : null);
                if (e.pointerType !== 'mouse' || sliderTrackWidth === null || !inputRef.current) {
                    return;
                }
                const box = e.currentTarget.getBoundingClientRect();
                const start = inputRef.current.getBoundingClientRect().left + thumbWidth / 2;
                const at = clamp((e.clientX - start) / sliderTrackWidth, 0, 1);
                setHover({
                    time: minTime + at * timelineDuration,
                    x: start - box.left + at * sliderTrackWidth,
                });
            }}
            onPointerLeave={() => {
                setHover(null);
                setHoveredDot(null);
            }}
        >
            <LengthChart
                series={series}
                minTime={minTime}
                maxTime={maxTime}
                time={time}
                highlighted={highlighted}
                className="pointer-events-none absolute
                    inset-x-[calc(1rem+var(--slider-thumb-width)/2)] bottom-1/2 h-8
                    w-[calc(100%-2rem-var(--slider-thumb-width))]"
            />
            {hover && hoverPoint && (
                <div
                    role="tooltip"
                    className="tooltip bottom-full mb-1 -translate-x-1/2 px-2 py-1"
                    style={{ left: `${hover.x}px` }}
                >
                    <span className="meta block">{formatDate(new Date(hover.time))}</span>
                    <span className="text-2xs text-ink tabular-nums">
                        {hoverPoint.lit === null
                            ? `${hoverPoint.total.toFixed(1)} km`
                            : `${hoverPoint.lit.toFixed(1)} of ${hoverPoint.total.toFixed(1)} km`}
                    </span>
                </div>
            )}
            <div
                className="pointer-events-none absolute
                    inset-x-[calc(1rem+var(--slider-thumb-width)/2)]"
                onKeyDown={e => e.stopPropagation()}
            >
                {eventDates.map(date => {
                    const progress = fraction(date);
                    const blockedByThumb =
                        date === time ||
                        (sliderTrackWidth !== null &&
                            Math.abs(progress - timeProgress) * sliderTrackWidth <=
                                (thumbWidth + EVENT_DOT_SIZE) / 2);
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
                                data-event-date={date}
                                onClick={() => onTimeChange(date)}
                                className="pointer-events-auto absolute z-20 h-3 w-1.5
                                    -translate-1/2 cursor-pointer disabled:pointer-events-none"
                            />
                            <span
                                aria-hidden="true"
                                className={`${date === time || (date === hoveredDot && !blockedByThumb) ? 'bg-accent' : 'bg-rule-strong'}
                                absolute z-1 size-1 -translate-1/2 rounded-full opacity-0
                                transition-opacity duration-150 group-hover:opacity-100`}
                            />
                        </div>
                    );
                })}
            </div>
            <input
                key={svgVersion}
                ref={setInput}
                id="date-slider"
                type="range"
                aria-label="Timeline"
                min={minTime}
                max={maxTime}
                value={time}
                onChange={e => onTimeChange(Number(e.target.value))}
                className="absolute top-1/2 right-4 left-4 z-10 -translate-y-1/2 cursor-pointer"
            />
            <div
                className="pointer-events-none absolute
                    inset-x-[calc(1rem+var(--slider-thumb-width)/2)] top-1/2 h-full
                    -translate-y-1/2"
            >
                {ticks.map(date => (
                    <div
                        key={date.getTime()}
                        className="absolute top-1/2 flex -translate-1/2 flex-col items-center"
                        style={{
                            left: `${fraction(date.getTime()) * 100}%`,
                        }}
                    >
                        <div className="bg-rule-strong mt-6 h-2 w-px"></div>
                        <span className="meta mt-1">{date.getUTCFullYear()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
