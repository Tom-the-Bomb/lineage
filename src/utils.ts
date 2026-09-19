import { type DateInterval, type State } from './schemas';

// Max date object Javascript can handle:
// September 13, 275760
const END_OF_TIME = new Date(8.64e15);

export function playPause(
    setPlaying: (f: (playing: boolean) => boolean) => void,
    time: number,
    setTime: (time: number) => void,
    minDate: Date,
    maxDate: Date,
): void {
    setPlaying(playing => {
        const next = !playing;
        if (next && time >= maxDate.getTime()) {
            setTime(minDate.getTime());
        }
        return next;
    });
}

export function formatDate(date: Date, end: number = 10): string {
    return date.toISOString().slice(0, end).replace(/-/g, '/');
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function parseLabelDates(label: string): State[] {
    const parts = label.split(',');

    return parts.map(part => {
        const [name, rawInterval] = part.split('=');
        const interval = rawInterval.split('-');

        const appear = new Date(interval[0].replace(/_/g, '-'));
        const removed = interval[1] ? new Date(interval[1].replace(/_/g, '-')) : END_OF_TIME;

        return {
            name: name.replace(/_/g, ' '),
            dateRange: { appear, removed },
        };
    });
}

export function isActive({ appear, removed }: DateInterval, time: number): boolean {
    return appear.getTime() <= time && time < removed.getTime();
}

export function findName(states: State[], time: number): string | null {
    return states.find(({ dateRange }) => isActive(dateRange, time))?.name || null;
}
