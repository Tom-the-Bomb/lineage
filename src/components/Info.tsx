import { useState, type CSSProperties, type ReactNode } from 'react';
import chevronLeft from '../assets/chevron-left.svg';
import chevronRight from '../assets/chevron-right.svg';
import cross from '../assets/cross.svg';
import expand from '../assets/expand.svg';
import infoIcon from '../assets/info.svg';
import minus from '../assets/minus.svg';
import play from '../assets/play.svg';
import plus from '../assets/plus.svg';
import { RANGES, STEP_UNITS, type PlaybackSettings, type Step, type StepUnit } from '../utils_d3';

const UNITS = Object.keys(STEP_UNITS) as StepUnit[];

function nextUnit({ count, unit }: Step): Step {
    const next = UNITS[(UNITS.indexOf(unit) + 1) % UNITS.length];
    return {
        unit: next,
        count: Math.min(count, STEP_UNITS[next].max),
    };
}

interface SettingProps {
    label: string;
    hint: string;
    range: { min: number; max: number; step?: number };
    value: number;
    onChange: (value: number) => void;
    children: ReactNode;
}

function Setting({ label, hint, range, value, onChange, children }: SettingProps) {
    const at = (value - range.min) / (range.max - range.min);

    return (
        <label className="flex items-center gap-3">
            <span className="w-18 shrink-0">{label}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="group relative min-w-0 flex-1">
                    <input
                        type="range"
                        className="range block w-full"
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        value={value}
                        onChange={e => onChange(Number(e.target.value))}
                    />
                    <span
                        role="tooltip"
                        className="tooltip range-tip group-hover:opacity-100"
                        style={{ '--at': at } as CSSProperties}
                    >
                        {hint}
                        <span
                            className="tooltip-arrow top-full left-1/2 -mt-1 -translate-x-1/2
                                border-r border-b"
                        ></span>
                    </span>
                </span>
                <span className="w-16 shrink-0">{children}</span>
            </span>
        </label>
    );
}

function Mini({ icon, alt }: { icon: string; alt: string }) {
    return (
        <span className="mini-btn">
            <img src={icon} alt={alt} className="icon h-2 w-2" />
        </span>
    );
}

const GUIDE: [string, ReactNode][] = [
    [
        'Timeline',
        <>
            Drag the slider or use{' '}
            <span className="whitespace-nowrap">
                <Mini icon={chevronLeft} alt="<" /> <Mini icon={chevronRight} alt=">" />
            </span>{' '}
            to step between events. <Mini icon={play} alt="Play" /> or pressing{' '}
            <kbd className="kbd">Space</kbd> advances one step at a time and pauses on every change.
        </>,
    ],
    [
        'Map',
        <>
            Drag to pan, scroll or pinch to zoom, or use{' '}
            <span className="whitespace-nowrap">
                <Mini icon={plus} alt="+" /> <Mini icon={minus} alt="-" />
            </span>{' '}
            Hover over a station marker to see its lines. Click <Mini icon={expand} alt="expand" />{' '}
            to hide everything but the map.
        </>,
    ],
    ['Legend', 'Click a line to highlight it. Hover over one to see its station count and length.'],
];

interface InfoProps {
    settings: PlaybackSettings;
    onSettings: (patch: Partial<PlaybackSettings>) => void;
}

export default function Info({ settings, onSettings }: InfoProps) {
    const { tickMs, step, transitionMs, pauseMs } = settings;
    const [open, setOpen] = useState(false);

    return (
        <div className="pointer-events-auto relative">
            <button
                type="button"
                aria-label="How to use this map"
                aria-expanded={open}
                onClick={() => setOpen(open => !open)}
                className="zoom-btn cursor-pointer rounded-full"
            >
                <img src={infoIcon} alt="?" className="icon h-4.5 w-4.5" />
            </button>
            {open && (
                <section
                    role="dialog"
                    aria-label="How to use this map"
                    className="panel scroll-hidden bg-surface text-2xs text-ink-muted absolute
                        top-11 right-0 z-30 max-h-[calc(100dvh-4rem)] w-80 overflow-y-auto px-4
                        py-3"
                >
                    <span className="meta">how to use</span>
                    <button
                        type="button"
                        aria-label="Close info"
                        onClick={() => setOpen(false)}
                        className="absolute top-3 right-3"
                    >
                        <img src={cross} alt="x" className="icon-btn h-3 w-3" />
                    </button>
                    <dl className="mt-2 flex flex-col gap-2">
                        {GUIDE.map(([topic, body]) => (
                            <div key={topic}>
                                <dt className="text-ink font-medium">{topic}</dt>
                                <dd className="leading-snug">{body}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="border-rule mt-3 flex flex-col gap-3 border-t pt-2">
                        <span className="meta">settings</span>
                        <div className="flex flex-col gap-2">
                            <Setting
                                label="Event pause"
                                hint="Pause on each change date"
                                range={RANGES.pauseMs}
                                value={pauseMs}
                                onChange={pauseMs => onSettings({ pauseMs })}
                            >
                                <span className="meta">{(pauseMs / 1000).toFixed(1)}s</span>
                            </Setting>
                            <Setting
                                label="Transition"
                                hint="Animation time per change"
                                range={RANGES.transitionMs}
                                value={transitionMs}
                                onChange={transitionMs => onSettings({ transitionMs })}
                            >
                                <span className="meta">{(transitionMs / 1000).toFixed(1)}s</span>
                            </Setting>
                            <Setting
                                label="Interval"
                                hint="Delay between steps"
                                range={RANGES.tickMs}
                                value={tickMs}
                                onChange={tickMs => onSettings({ tickMs })}
                            >
                                <span className="meta">{tickMs}ms</span>
                            </Setting>
                            <Setting
                                label="Step"
                                hint="How far each step advances"
                                range={{ min: 1, max: STEP_UNITS[step.unit].max }}
                                value={step.count}
                                onChange={count => onSettings({ step: { ...step, count } })}
                            >
                                <button
                                    type="button"
                                    aria-label={`Step unit ${step.unit}, click to change`}
                                    onClick={() => onSettings({ step: nextUnit(step) })}
                                    className="meta group cursor-pointer"
                                >
                                    {step.count}{' '}
                                    <span
                                        className="border-rule hover:border-rule-strong
                                            hover:text-ink rounded-sm border px-0.75 py-0.5
                                            transition-colors"
                                    >
                                        {step.unit}
                                        {step.count > 1 ? 's' : ''}
                                    </span>
                                </button>
                            </Setting>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
