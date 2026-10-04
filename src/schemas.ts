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
    km: number;
    partners: LineWrapper[];
}

export interface ChangelogEvent {
    date: string;
    descriptions: string[];
}

export interface UpdateResult {
    stationCount: number;
    km: number;
    lineKm: Record<string, number>;
}

export interface LineStats {
    km: number;
    stations: number;
}

export interface State {
    name: string;
    dateRange: DateInterval;
}

export interface StationWrapper {
    el: SVGElement;
    states: State[];
    lines: State[];
    operators: State[];
}

export interface RawTooltipData {
    x: number;
    y: number;
    station: StationWrapper;
}
