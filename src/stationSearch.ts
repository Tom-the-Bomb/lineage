import type { DateInterval, LegendWrapper, StationWrapper } from './schemas';

export interface StationOption {
    id: string;
    name: string;
    colors: Set<string>;
    start: number;
    matches: { station: StationWrapper; dateRange: DateInterval }[];
}

export function createStationOptions(
    stations: StationWrapper[],
    legend: LegendWrapper[],
    highlight: string[],
): StationOption[] {
    const colors = new Map(legend.map(line => [line.id, line.color]));
    const groups: StationOption[] = [];

    for (const station of stations) {
        if (station.el.localName === 'path') {
            continue;
        }

        const id = station.el.id.split('--')[0];
        for (const state of station.states) {
            const start = state.dateRange.appear.getTime();
            let group = groups.find(option => option.id === id && option.name === state.name);

            if (!group) {
                group = {
                    id,
                    name: state.name,
                    colors: new Set(),
                    start,
                    matches: [],
                };
                groups.push(group);
            }

            for (const line of station.lines) {
                if (
                    line.dateRange.appear < state.dateRange.removed &&
                    state.dateRange.appear < line.dateRange.removed
                ) {
                    group.colors.add(colors.get(line.name)!);
                }
            }

            group.start = Math.min(group.start, start);
            group.matches.push({ station, dateRange: state.dateRange });
        }
    }

    for (const group of groups) {
        if (highlight.length) {
            group.matches = group.matches.flatMap(({ station, dateRange }) =>
                station.lines
                    .filter(line => highlight.includes(line.name))
                    .flatMap(({ dateRange: service }) => {
                        const appear =
                            service.appear > dateRange.appear ? service.appear : dateRange.appear;
                        const removed =
                            service.removed < dateRange.removed
                                ? service.removed
                                : dateRange.removed;
                        return appear < removed
                            ? [{ station, dateRange: { appear, removed } }]
                            : [];
                    }),
            );
        }
        group.matches.sort((a, b) => a.dateRange.appear.getTime() - b.dateRange.appear.getTime());
    }
    return groups.filter(group => group.matches.length > 0);
}
