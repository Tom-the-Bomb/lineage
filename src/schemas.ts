export interface DateInterval {
    appear: Date;
    removed: Date;
}

export interface LegendWrapper {
    id: string;
    color: string;
    states: State[];
}

export interface LineWrapper {
    el: SVGPathElement;
    states: State[];
    length: number;
    dashArray: string;
    km: number;
}

export interface LineStats {
    km: number;
    stations: number;
}

export interface State {
    name: string;
    dateRange: DateInterval;
}

export const Status = {
    PrimaryOnly: 0, // no prefix, e.g. MTR only, Shanghai Metro only
    SecondaryOnly: 1, // ^, e.g. KCR only, Shanghai Suburban Railway only
    Both: 2, // !, e.g. MTR + KCR, Shanghai Metro + Suburban Railway
} as const;

export type Status = (typeof Status)[keyof typeof Status];

export interface StationWrapper {
    el: SVGElement;
    status: Status;
    states: State[];
    lines: State[];
}

export interface RawTooltipData {
    x: number;
    y: number;
    station: StationWrapper;
}
