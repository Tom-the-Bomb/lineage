import type { LegendWrapper, LineWrapper, TrackFamily } from './schemas';

export type Spans = [number, number][];

const EPSILON = 1e-3;
const SNAP = 0.05;

const ordered = ([a, b]: [number, number]): [number, number] => (a < b ? [a, b] : [b, a]);

export function union(spans: Spans): Spans {
    const merged: Spans = [];
    for (const [a, b] of [...spans].sort((p, q) => p[0] - q[0])) {
        const last = merged.at(-1);
        if (last && a <= last[1] + EPSILON) {
            last[1] = Math.max(last[1], b);
        } else {
            merged.push([a, b]);
        }
    }
    return merged;
}

export function intersect(spans: Spans, other: Spans): Spans {
    return spans.flatMap(([a, b]) =>
        other.flatMap(([c, d]): Spans => {
            const [from, to] = [Math.max(a, c), Math.min(b, d)];
            return to - from > EPSILON ? [[from, to]] : [];
        }),
    );
}

function subtract(spans: Spans, other: Spans): Spans {
    return spans.flatMap(span =>
        other.reduce<Spans>(
            (rest, [c, d]) =>
                rest.flatMap(([a, b]): Spans => [
                    ...(c - a > EPSILON ? [[a, Math.min(b, c)] as [number, number]] : []),
                    ...(b - d > EPSILON ? [[Math.max(a, d), b] as [number, number]] : []),
                ]),
            [span],
        ),
    );
}

const covers = (spans: Spans, x: number) =>
    spans.some(([a, b]) => a - EPSILON <= x && x <= b + EPSILON);

const same = (spans: Spans, other: Spans) =>
    spans.length === other.length &&
    spans.every(
        ([a, b], i) => Math.abs(a - other[i][0]) < EPSILON && Math.abs(b - other[i][1]) < EPSILON,
    );

export function drawsWhole(track: LineWrapper, spans: Spans): boolean {
    const own: Spans = [ordered(track.span)];
    return same(intersect(spans, own), own);
}

export function localSpans({ span: [start, end] }: LineWrapper, spans: Spans): Spans {
    const along = (x: number) => (end > start ? x - start : start - x);
    return intersect(spans, [ordered([start, end])])
        .map(([a, b]) => ordered([along(a), along(b)]))
        .sort((p, q) => p[0] - q[0]);
}

function project(el: SVGPathElement, length: number, point: DOMPoint): number {
    const distance = (s: number) => {
        const { x, y } = el.getPointAtLength(s);
        return Math.hypot(x - point.x, y - point.y);
    };
    if (distance(0) < SNAP) {
        return 0;
    }
    if (distance(length) < SNAP) {
        return length;
    }
    const step = length / 32;
    let nearest = 0;
    for (let i = 1; i <= 32; i++) {
        if (distance(i * step) < distance(nearest * step)) {
            nearest = i;
        }
    }
    let [lo, hi] = [Math.max(0, (nearest - 1) * step), Math.min(length, (nearest + 1) * step)];
    while (hi - lo > EPSILON / 10) {
        const [m1, m2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
        if (distance(m1) < distance(m2)) {
            hi = m2;
        } else {
            lo = m1;
        }
    }
    return (lo + hi) / 2;
}

export function linkTracks(
    tracks: Omit<LineWrapper, 'family' | 'span'>[],
    legend: LegendWrapper[],
): LineWrapper[] {
    const linked = tracks as LineWrapper[];
    const byId = new Map(linked.map(track => [track.el.id, track]));
    const ends = new Map(
        linked.map(track => [track, [0, track.length].map(s => track.el.getPointAtLength(s))]),
    );
    const along = ({ span: [start, end] }: LineWrapper, s: number) =>
        start + Math.sign(end - start) * s;
    const snap = (family: TrackFamily, x: number) => {
        const near = family.cuts.find(cut => Math.abs(cut - x) < SNAP);
        if (near !== undefined) {
            return near;
        }
        family.cuts.push(x);
        return x;
    };

    for (const track of linked) {
        const replaced = byId.get(track.el.dataset.takesOver ?? '');
        if (replaced) {
            track.family = replaced.family;
            track.span = ends
                .get(track)!
                .map(point =>
                    snap(
                        track.family,
                        along(replaced, project(replaced.el, replaced.length, point)),
                    ),
                ) as [number, number];
            track.family.tracks.push(track);
        } else {
            track.family = { tracks: [track], joins: [], cuts: [0, track.length] };
            track.span = [0, track.length];
        }
    }

    const idsByName = new Map<string, string[]>();
    for (const { id, states } of legend) {
        for (const { name } of states) {
            idsByName.set(name, [...(idsByName.get(name) ?? []), id]);
        }
    }
    const lineIds = new Map(
        linked.map(track => [
            track,
            new Set(track.states.flatMap(({ name }) => idsByName.get(name) ?? [])),
        ]),
    );

    for (const track of linked) {
        const ids = lineIds.get(track)!;
        for (const [i, point] of ends.get(track)!.entries()) {
            for (const other of linked) {
                if (
                    other.family !== track.family &&
                    [...lineIds.get(other)!].some(id => ids.has(id)) &&
                    other.el.isPointInStroke(point)
                ) {
                    const [at, to] = [
                        track.span[i],
                        snap(other.family, along(other, project(other.el, other.length, point))),
                    ];
                    if (
                        !track.family.joins.some(
                            join =>
                                join.family === other.family && join.at === at && join.to === to,
                        )
                    ) {
                        track.family.joins.push({ at, family: other.family, to });
                        other.family.joins.push({ at: to, family: track.family, to: at });
                    }
                }
            }
        }
    }

    for (const family of new Set(linked.map(track => track.family))) {
        family.cuts.sort((a, b) => a - b);
    }
    return linked;
}

interface Node {
    family: TrackFamily;
    x: number;
    distance: number;
    links: { node: Node; length: number }[];
}

interface Edge {
    from: Node;
    to: Node;
    ends: [number, number];
    reach: number;
}

function measure(
    families: Set<TrackFamily>,
    spans: (family: TrackFamily) => Spans,
    kept: (family: TrackFamily) => Spans,
): Edge[] {
    const nodes = new Map<TrackFamily, Map<number, Node>>();
    const node = (family: TrackFamily, x: number) => {
        const byX = nodes.get(family) ?? nodes.set(family, new Map()).get(family)!;
        return byX.get(x) ?? byX.set(x, { family, x, distance: Infinity, links: [] }).get(x)!;
    };
    const link = (from: Node, to: Node, length: number) => {
        from.links.push({ node: to, length });
        to.links.push({ node: from, length });
    };

    const pairs: [Node, Node][] = [];
    for (const family of families) {
        for (const [a, b] of spans(family)) {
            const cuts = [a, ...family.cuts.filter(x => x > a && x < b), b];
            for (let i = 1; i < cuts.length; i++) {
                const [from, to] = [node(family, cuts[i - 1]), node(family, cuts[i])];
                link(from, to, to.x - from.x);
                pairs.push([from, to]);
            }
        }
    }

    const all = [...nodes.values()].flatMap(byX => [...byX.values()]);
    for (const n of all) {
        if (covers(kept(n.family), n.x)) {
            n.distance = 0;
        }
        for (const join of n.family.joins) {
            if (join.at === n.x) {
                const other = nodes.get(join.family)?.get(join.to);
                if (other) {
                    link(n, other, 0);
                } else if (covers(kept(join.family), join.to)) {
                    n.distance = 0;
                }
            }
        }
    }

    const settled = new Set<Node>();
    const unsettled = () => all.filter(n => !settled.has(n));
    const closest = () =>
        unsettled().reduce<Node | undefined>(
            (best, n) => (n.distance < (best?.distance ?? Infinity) ? n : best),
            undefined,
        );
    const settle = () => {
        for (let next = closest(); next; next = closest()) {
            settled.add(next);
            for (const { node: other, length } of next.links) {
                other.distance = Math.min(other.distance, next.distance + length);
            }
        }
    };
    const opened = (n: Node) =>
        Math.min(
            ...n.family.tracks
                .filter(track => track.span[0] === n.x)
                .map(track => track.states[0].dateRange.appear.getTime()),
        );
    settle();
    for (let rest = unsettled(); rest.length > 0; rest = unsettled()) {
        rest.reduce((first, n) => (opened(n) < opened(first) ? n : first)).distance = 0;
        settle();
    }

    const ends = ([from, to]: [Node, Node]): [number, number] => [from.distance, to.distance];
    const part = new Map<Node, Node[]>();
    for (const n of all) {
        if (!part.has(n)) {
            const members = [n];
            part.set(n, members);
            for (const member of members) {
                for (const { node: other } of member.links) {
                    if (!part.has(other)) {
                        part.set(other, members);
                        members.push(other);
                    }
                }
            }
        }
    }
    const reach = new Map<Node[], number>();
    for (const pair of pairs) {
        const [a, b] = ends(pair);
        const members = part.get(pair[0])!;
        reach.set(
            members,
            Math.max(reach.get(members) ?? 0, Math.min(a, b) + pair[1].x - pair[0].x),
        );
    }
    return pairs.map(pair => ({
        from: pair[0],
        to: pair[1],
        ends: ends(pair),
        reach: reach.get(part.get(pair[0])!)!,
    }));
}

function reached({ from, to, ends: [a, b] }: Edge, distance: number): Spans {
    if (a <= b) {
        return distance > a ? [[from.x, Math.min(to.x, from.x + distance - a)]] : [];
    }
    return distance > b ? [[Math.max(from.x, to.x - (distance - b)), to.x]] : [];
}

export function planFronts(
    changed: LineWrapper[],
    drawn: (track: LineWrapper) => Spans,
    active: (track: LineWrapper) => boolean,
): Map<LineWrapper, (progress: number) => Spans> {
    const target = (track: LineWrapper): Spans => (active(track) ? [ordered(track.span)] : []);
    const moving = (track: LineWrapper) => !same(drawn(track), target(track));
    const families = new Set(changed.map(track => track.family));
    for (const family of families) {
        for (const join of family.joins) {
            if (join.family.tracks.some(moving)) {
                families.add(join.family);
            }
        }
    }

    const sets = new Map<TrackFamily, Record<'kept' | 'gone' | 'new', Spans>>();
    const setsOf = (family: TrackFamily) => {
        if (!sets.has(family)) {
            const before = union(family.tracks.flatMap(drawn));
            const after = union(family.tracks.flatMap(target));
            sets.set(family, {
                kept: intersect(before, after),
                gone: subtract(before, after),
                new: subtract(after, before),
            });
        }
        return sets.get(family)!;
    };
    const gone = measure(
        families,
        f => setsOf(f).gone,
        f => setsOf(f).kept,
    );
    const added = measure(
        families,
        f => setsOf(f).new,
        f => setsOf(f).kept,
    );

    return new Map(
        [...families].flatMap(family => {
            const { kept } = setsOf(family);
            const retracting = gone.filter(edge => edge.from.family === family);
            const growing = added.filter(edge => edge.from.family === family);
            return family.tracks.map(track => {
                const own = target(track);
                const was = drawn(track);
                const spansAt = (progress: number) =>
                    own.length > 0
                        ? intersect(
                              union([
                                  ...kept,
                                  ...growing.flatMap(edge => reached(edge, progress * edge.reach)),
                              ]),
                              own,
                          )
                        : intersect(
                              union(
                                  retracting.flatMap(edge =>
                                      reached(edge, (1 - progress) * edge.reach),
                                  ),
                              ),
                              was,
                          );
                return [track, spansAt] as const;
            });
        }),
    );
}

export function overlaps(track: LineWrapper, other: LineWrapper): boolean {
    return (
        track.family === other.family &&
        intersect([ordered(track.span)], [ordered(other.span)]).length > 0
    );
}
