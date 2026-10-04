"""Check a map's data against docs/map-data-spec.md.

Usage, from the repository root: python3 tests/check_map.py <system-key>

Prints each line's present-day length and "<key>: OK", or every problem found; exits 1 on problems.
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from itertools import chain
from pathlib import Path

DATE = r'\d{4}_\d{2}_\d{2}'
STATE = rf'[^=,_\s][^=,\s]*={DATE}(?:-{DATE})?'
LABEL = re.compile(rf'^{STATE}(?:,{STATE})*$')
LINES = re.compile(rf'^[a-z0-9]+={DATE}(?:-{DATE})?(?:,[a-z0-9]+={DATE}(?:-{DATE})?)*$')
LOGO = rf'[a-z0-9]+(?:=(?:{DATE}(?:-{DATE})?|-{DATE}))?'
LOGOS = re.compile(rf'^{LOGO}(?:,{LOGO})*$')
POINTS = r'M[-\d.]+,[-\d.]+(?: L[-\d.]+,[-\d.]+)+'
PATH_ARGS = {'M': 2, 'L': 2, 'T': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'A': 7, 'Z': 0}
MAX_LINE_SEGMENTS = 256  # WebKit restarts the dash pattern every 256 segments (§4)
THIN = 0.57  # the smallest a marker is drawn, fully zoomed in (§5)
CURVE_SAMPLES = 8
PLATFORM_TOLERANCE = 0.5
LUMP = 0.4  # shapes of one interchange closer than this many R are one shape (§5 rule 3)
FOREVER = '9999'
DOT_POINTS = 2  # a dot is a zero-length segment and a pill a segment: two points each

Point = tuple[float, float]
State = tuple[str, str, str | None]  # name, start, end (None: to the present)
Span = tuple[str, str | None]  # start, end


def states(label: str) -> list[State]:
    out = []
    for part in label.split(','):
        name, interval = part.split('=')
        start, _, end = interval.partition('-')
        out.append((name, start.replace('_', '-'), end.replace('_', '-') if end else None))
    return out


def active(start: str | None, end: str | None, t: str) -> bool:
    return (start is None or start <= t) and (end is None or t < end)


def seg_dist(p: Point, a: Point, b: Point) -> float:
    """Distance from p to the segment ab."""
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
    return ((x1 + t * dx - x) ** 2 + (y1 + t * dy - y) ** 2) ** 0.5


def seg_gap(a: Point, b: Point, c: Point, d: Point) -> float:
    """Distance between the segments ab and cd."""

    def side(p: Point, q: Point, r: Point) -> float:
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    if side(a, b, c) * side(a, b, d) < 0 and side(c, d, a) * side(c, d, b) < 0:
        return 0.0
    return min(seg_dist(a, c, d), seg_dist(b, c, d), seg_dist(c, a, b), seg_dist(d, a, b))


def polyline_dist(p: Point, lines: list[list[Point]]) -> float:
    return min((seg_dist(p, q[i], q[i + 1]) for q in lines for i in range(len(q) - 1)), default=math.inf)


def bezier(controls: list[Point], t: float) -> Point:
    m = len(controls) - 1
    weights = [math.comb(m, j) * (1 - t) ** (m - j) * t**j for j in range(m + 1)]
    return (
        sum(w * x for w, (x, _) in zip(weights, controls, strict=True)),
        sum(w * y for w, (_, y) in zip(weights, controls, strict=True)),
    )


def vertices(d: str, curves: bool = False) -> list[Point]:
    """Every vertex of a path, absolute; a curve adds its end point (and, with `curves`, points along it)."""
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    out: list[Point] = []
    cur: Point = (0.0, 0.0)
    start: Point | None = None
    cmd = ''
    previous = ''
    control: Point | None = None
    i = 0
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd in 'Zz' and start:
                cur = start
                out.append(cur)
                previous = 'Z'
            continue
        kind, relative = cmd.upper(), cmd.islower()
        n = PATH_ARGS[kind]
        v = [float(t) for t in tokens[i : i + n]]
        i += n

        targets = [(cur[0] + v[k], cur[1] + v[k + 1]) if relative else (v[k], v[k + 1]) for k in range(0, n - 1, 2)]
        mirror = (2 * cur[0] - control[0], 2 * cur[1] - control[1]) if control else cur
        controls: list[Point] | None = None
        if kind in ('C', 'Q'):
            controls = [cur, *targets]
        elif kind == 'S':
            controls = [cur, mirror if previous in ('C', 'S') else cur, *targets]
        elif kind == 'T':
            controls = [cur, mirror if previous in ('Q', 'T') else cur, *targets]
        if controls and curves:
            out.extend(bezier(controls, k / CURVE_SAMPLES) for k in range(1, CURVE_SAMPLES))
        control, previous = (controls[-2] if controls else None), kind
        if kind == 'H':
            cur = (cur[0] + v[0] if relative else v[0], cur[1])
        elif kind == 'V':
            cur = (cur[0], cur[1] + v[0] if relative else v[0])
        else:
            cur = (cur[0] + v[-2], cur[1] + v[-1]) if relative else (v[-2], v[-1])
        out.append(cur)
        if kind == 'M':
            start = cur
            cmd = 'l' if relative else 'L'
    return out


def attr(attrs: str, name: str) -> str | None:
    match = re.search(rf'\b{name}="([^"]*)"', attrs)
    return match.group(1) if match else None


def number(attrs: str, name: str) -> float:
    value = attr(attrs, name)
    if value is None:
        raise ValueError(f'missing {name}= in <{attrs.strip()[:80]}>')
    return float(value)


def find(pattern: str, text: str, what: str) -> str:
    match = re.search(pattern, text)
    if match is None:
        raise ValueError(f'map.svg has no {what}')
    return match.group(1)


def spans(element_states: list[State]) -> list[Span]:
    """An element's states, with renames (one ends where the next starts) merged into one span."""
    out: list[Span] = []
    for _, start, end in element_states:
        if out and out[-1][1] == start:
            out[-1] = (out[-1][0], end)
        else:
            out.append((start, end))
    return out


def within(start: str, end: str | None, element_spans: list[Span]) -> bool:
    return any(s <= start and (e is None or (end is not None and end <= e)) for s, e in element_spans)


def served_lines(data_lines: str | None) -> set[str]:
    return {entry.split('=')[0] for entry in data_lines.split(',')} if data_lines else set()


@dataclass
class Track:
    label: str
    states: list[State]
    points: list[Point]
    cap: str | None  # its own stroke-linecap
    width: float | None  # its own stroke-width
    open_ends: list[str]  # ends marked data-continues: 'start', 'end'


@dataclass
class TrackEnd:
    index: int  # the track's position in MapCheck.tracks
    which: str  # 'starts' or 'ends'
    point: Point
    own: list[Point]  # the track's own path away from this end
    moments: list[str]  # every date the end must be checked on
    slack: float


@dataclass
class Marker:
    label: str
    states: list[State]
    lines: str | None
    logos: str | None


@dataclass
class Reach:
    """A marker's drawn extent: a circle, or an interchange's dot segments and bridge polylines."""

    label: str
    states: list[State]
    centre: Point | None = None
    radius: float = 0.0
    dots: list[list[Point]] = field(default_factory=list)
    bridges: list[list[Point]] = field(default_factory=list)
    bridge_half: float = 0.0


class MapCheck:
    def __init__(self, key: str) -> None:
        assets = Path('src/assets') / key
        self.key = key
        self.svg = (assets / 'map.svg').read_text(encoding='utf-8')
        self.legend = json.loads((assets / 'data/lines.json').read_text(encoding='utf-8'))['lines']
        events = assets / 'data/events.json'
        self.events = json.loads(events.read_text(encoding='utf-8')) if events.exists() else None
        self.errors: list[str] = []
        self.log: defaultdict[str, set[str]] = defaultdict(set)  # date -> what changes on the map that day
        self.tracks: list[Track] = []
        self.track_names: list[State] = []
        self.track_km: list[tuple[list[State], float]] = []
        self.track_widths: list[float] = []
        self.markers: list[Marker] = []
        self.reach: list[Reach] = []
        self.identities: defaultdict[str, list[tuple[str, list[State]]]] = defaultdict(list)
        self.platform_checks: list[tuple[str, str | None, str, Reach]] = []
        self.circle_checks: list[tuple[str, str | None, Point]] = []
        self.legend_states: list[State] = []
        self.legend_ids: dict[str, list[State]] = {}
        self.border = 0.0
        self.width = 1.0

    def run(self) -> bool:
        ids = re.findall(r'\bid="([^"]+)"', self.svg)
        if len(ids) != len(set(ids)):
            self.errors.append('SVG ids must be unique (§3)')
        if not re.search(r'<g\b[^>]*\bid="zoom-layer"', self.svg):
            self.errors.append('missing <g id="zoom-layer">')
        self.read_tracks()
        self.read_stations()
        self.check_identities()
        self.check_track_ends()
        self.check_platforms()
        self.check_circles()
        self.check_lumps()
        self.check_legend()
        self.check_markers()
        self.check_events()
        if not self.errors:
            self.print_lengths()
        print('\n'.join(self.errors) or f'{self.key}: OK ({len(self.log)} change dates)')
        return not self.errors

    def children(self, layer_id: str) -> list[list[str]]:
        """The layer's top-level elements as [tag, attributes, contents of a <g>]."""
        start = re.search(rf'<g\b[^>]*\bid="{layer_id}"[^>]*>', self.svg)
        if not start:
            self.errors.append(f'missing <g id="{layer_id}">')
            return []
        out: list[list[str]] = []
        depth = 0
        for match in re.finditer(r'<(/?)(\w+)\b([^>]*?)(/?)>', self.svg[start.end() :]):
            closing, tag, attrs, empty = match.groups()
            if closing:
                if depth == 0:
                    return out
                depth -= 1
            elif depth == 0:
                out.append([tag, attrs, ''])
                depth += not empty
            else:
                out[-1][2] += match.group(0)
                depth += not empty
        return out

    def check_label(self, where: str, label: str) -> list[State]:
        if not LABEL.match(label):
            self.errors.append(f'{where}: bad label {label!r}')
            return []
        result = states(label)
        for i, (_, start, end) in enumerate(result):
            if end is not None and end <= start:
                self.errors.append(f'{where}: state ends before it starts in {label!r}')
            if i + 1 < len(result) and (end is None or end > result[i + 1][1]):
                self.errors.append(f'{where}: states overlap or are out of order in {label!r}')
        return result

    def record(self, kind: str, element_states: list[State]) -> None:
        for i, (name, start, end) in enumerate(element_states):
            previous = element_states[i - 1] if i else None
            if previous is not None and previous[2] == start:
                self.log[start].add(f'{kind} renamed {previous[0]} -> {name}')
            else:
                self.log[start].add(f'{kind} {name}')
            if end and (i + 1 == len(element_states) or element_states[i + 1][1] != end):
                self.log[end].add(f'{kind} {name} ends')

    def read_tracks(self) -> None:
        for tag, attrs, _ in self.children('lines'):
            label = attr(attrs, 'inkscape:label')
            if tag != 'path' or label is None:
                self.errors.append(f'lines layer: only labelled <path> allowed, found <{tag}>')
                continue
            track_states = self.check_label('track', label)
            self.record('track', track_states)
            d = attr(attrs, 'd')
            if d is not None:
                own_width = re.search(r'stroke-width="([\d.]+)"', attrs)
                continues = attr(attrs, 'data-continues')
                self.tracks.append(
                    Track(
                        label,
                        track_states,
                        vertices(d, curves=True),
                        attr(attrs, 'stroke-linecap'),
                        float(own_width.group(1)) if own_width else None,
                        continues.split() if continues else [],
                    )
                )
            width = re.search(r'stroke-width[:="]+\s*([\d.]+)', attrs)
            if width:
                self.track_widths.append(float(width.group(1)))
            if d is not None and len(re.findall(r'[Ll]', d)) >= MAX_LINE_SEGMENTS:
                self.errors.append(f'track {label!r} has 256+ straight segments: Safari draws it in pieces (§4)')
            if 'stroke-dasharray' in attrs:
                self.errors.append(f'track {label!r} is dashed: the app draws tracks in with the dash pattern (§4)')
            km = attr(attrs, 'data-km')
            if km is None or not re.fullmatch(r'\d+\.\d', km) or float(km) <= 0:
                self.errors.append(f'track {label!r}: missing or malformed data-km (§4)')
            else:
                self.track_km.append((track_states, float(km)))
            self.track_names += track_states

    def read_stations(self) -> None:
        self.border = float(
            find(r'<g\b[^>]*\bid="stations"[^>]*\sstroke-width="([\d.]+)"', self.svg, 'stations border')
        )
        seen_marker = False
        for tag, attrs, inner in self.children('stations'):
            label = attr(attrs, 'inkscape:label')
            connector = tag == 'path' and re.search(r'\bid="walking-transfer', attrs) is not None
            if label is None or not (tag in ('circle', 'g') or connector):
                self.errors.append(
                    f'stations layer: only labelled <circle>, <g> and connector <path> allowed, found <{tag}>'
                )
                continue
            if connector and seen_marker:
                self.errors.append(f'connector {label!r} must precede station markers (§3)')
            seen_marker |= not connector
            if connector and 'fill="none"' not in attrs:
                self.errors.append(f'connector {label!r} needs fill="none"')
            marker_states = self.check_label(tag, label)
            self.record('connector' if connector else {'circle': 'station', 'g': 'interchange'}[tag], marker_states)
            if connector:
                continue
            marker_id = attr(attrs, 'id')
            if marker_id is None:
                self.errors.append(f'marker {label!r}: missing search identity id (§3)')
            else:
                identity, _, version = marker_id.partition('--')
                if version and (not marker_states or version != marker_states[0][1]):
                    self.errors.append(f'marker {marker_id!r}: version must match first appearance (§3)')
                self.identities[identity].append((marker_id, marker_states))
            marker = Marker(label, marker_states, attr(attrs, 'data-lines'), attr(attrs, 'data-logos'))
            self.markers.append(marker)
            if tag == 'circle':
                centre = (number(attrs, 'cx'), number(attrs, 'cy'))
                self.reach.append(Reach(label, marker_states, centre=centre, radius=number(attrs, 'r')))
                self.circle_checks.append((label, marker.lines, centre))
            else:
                self.read_interchange(label, marker_states, attrs, inner, marker)

    def read_interchange(self, label: str, marker_states: list[State], attrs: str, inner: str, marker: Marker) -> None:
        """An interchange: dots then bridges, grey, then the same in white (§5)."""
        layers = re.findall(
            r'<path class="(dots|bridges)" d="([^"]*)"((?: stroke="#fff")?) stroke-width="([\d.]+)"/>', inner
        )
        kinds = [(kind, bool(white)) for kind, _, white, _ in layers]
        expected = [(kind, white) for white in (False, True) for kind in ('dots', 'bridges')]
        half = len(layers) // 2
        bridged = len(layers) == len(expected)
        if (
            len(layers) != inner.count('<')
            or kinds not in (expected, [expected[0], expected[2]])
            or layers[0][1] != layers[half][1]
            or layers[-1][1] != layers[half - 1][1]
            or 'fill="none"' not in attrs
        ):
            self.errors.append(
                f'interchange {label!r}: a <g fill="none"> of class="dots" [and "bridges"] paths, '
                'grey then the same in stroke="#fff" (§5)'
            )
            return
        shape = f'{POINTS}(?: {POINTS})*'
        if not re.fullmatch(shape, layers[0][1]) or (bridged and not re.fullmatch(shape, layers[1][1])):
            self.errors.append(f'interchange {label!r}: dots and bridges are absolute "M x,y L x,y" polylines (§5)')
            return
        dots = polylines(layers[0][1])
        if any(len(dot) != DOT_POINTS for dot in dots):
            self.errors.append(f'interchange {label!r}: a dot is "M x,y L x,y" and a pill "M a L b" (§5)')
            return
        widths = [float(width) for *_, width in layers]
        bridges = polylines(layers[1][1]) if bridged else []
        reach = Reach(
            label,
            marker_states,
            radius=(widths[0] - self.border) / 2,
            dots=dots,
            bridges=bridges,
            bridge_half=(widths[1] - self.border) / 2 if bridges else 0,
        )
        self.reach.append(reach)
        platforms = attr(attrs, 'data-platforms')
        if platforms is None:
            self.errors.append(f'interchange {label!r}: needs data-platforms (§5)')
        else:
            self.platform_checks.append((label, marker.lines, platforms, reach))

    def check_identities(self) -> None:
        for identity, versions in self.identities.items():
            for i, (a_id, a) in enumerate(versions):
                for b_id, b in versions[:i]:
                    if any(s < (e2 or FOREVER) and s2 < (e or FOREVER) for _, s, e in a for _, s2, e2 in b):
                        self.errors.append(
                            f'station identity {identity!r}: {a_id} and {b_id} overlap; '
                            'separate stations need separate ids (§3)'
                        )

    def marker_gap(self, p: Point, m: Reach, thin: float = 1.0) -> float:
        """How far p lies outside marker m, to its border's centre line (negative inside)."""
        b = self.border
        if m.centre is not None:
            return math.dist(p, m.centre) - (m.radius + b / 2) * thin + b / 2
        gaps = [min(seg_dist(p, a, z) for a, z in m.dots) - (m.radius + b / 2) * thin + b / 2]
        gaps += [
            seg_dist(p, q[i], q[i + 1]) - (m.bridge_half + b / 2) * thin + b / 2
            for q in m.bridges
            for i in range(len(q) - 1)
        ]
        return min(gaps)

    def check_track_ends(self) -> None:
        """Every track starts and ends inside a station marker present at every moment of its life (§4).

        Exempt: an end that meets other active track of its line (a junction, a loop), runs off the canvas,
        belongs to a line the legend marks "simplified", or is marked data-continues. The lines layer is butt;
        a track has its own round cap exactly when an end may lie away from a marker. A round cap reaches half
        the stroke width past the end, so it gets that much less slack.
        """
        lines_tag = re.search(r'<g\b[^>]*\bid="lines"[^>]*stroke-width[:="]+\s*([\d.]+)', self.svg)
        if lines_tag:
            self.width = float(lines_tag.group(1))
        elif self.track_widths:
            self.width = max(self.track_widths, key=self.track_widths.count)
        caps = re.search(r'<g\b[^>]*\bid="lines"[^>]*stroke-linecap[:="]+\s*(\w+)', self.svg)
        cap = caps.group(1) if caps else 'butt'
        if cap != 'butt':
            self.errors.append(f'lines layer: stroke-linecap must be butt, not {cap} (§4)')
        vx, vy, vw, vh = (float(v) for v in find(r'viewBox="([^"]*)"', self.svg, 'viewBox').split())
        simplified = {name for entry in self.legend if entry.get('simplified') for name, _, _ in states(entry['label'])}
        all_dates = {
            d
            for element in [m.states for m in self.reach] + [t.states for t in self.tracks]
            for _, s, e in element
            for d in (s, e)
            if d
        }

        for k, track in enumerate(self.tracks):
            names = {name for name, _, _ in track.states}
            free_end = bool(names & simplified) or bool(track.open_ends)
            if (track.cap or cap) != ('round' if free_end else 'butt'):
                self.errors.append(
                    f'track {track.label!r}: stroke-linecap must be {"round" if free_end else "butt"}; round only '
                    'where an end may lie away from a marker (simplified line or data-continues) (§4)'
                )
            if names & simplified:
                continue
            slack = 1 - (track.width or self.width) / 2 if (track.cap or cap) == 'round' else 1
            born, gone = track.states[0][1], track.states[-1][2]
            moments = [born, *sorted(d for d in all_dates if born < d and (gone is None or d < gone))]
            for which, p in (('starts', track.points[0]), ('ends', track.points[-1])):
                if which[:-1] in track.open_ends:
                    continue
                if not (vx < p[0] < vx + vw and vy < p[1] < vy + vh):
                    continue
                own = self.away_from_end(track.points if which == 'starts' else track.points[::-1])
                self.check_end(TrackEnd(k, which, p, own, moments, slack))

    def away_from_end(self, points: list[Point]) -> list[Point]:
        """A track's own path, minus the 2 W + 1 nearest the end it starts from."""
        run = 0.0
        for i in range(1, len(points)):
            run += math.dist(points[i - 1], points[i])
            if run > 2 * self.width + 1:
                return points[i:]
        return []

    def check_end(self, end: TrackEnd) -> None:
        track, p = self.tracks[end.index], end.point
        for t in end.moments:
            names = {name for name, s, e in track.states if active(s, e, t)}
            if not names:
                continue
            present = [m for m in self.reach if any(active(s, e, t) for _, s, e in m.states)]
            # zoomed in, markers shrink around their platforms, so the end must lie inside the smallest marker
            name, gap = min(
                ((m.label, self.marker_gap(p, m, THIN)) for m in present),
                key=lambda item: item[1],
                default=('nothing', math.inf),
            )
            if gap <= end.slack:
                continue
            others = [
                other.points
                for j, other in enumerate(self.tracks)
                if j != end.index and any(n in names and active(s, e, t) for n, s, e in other.states)
            ]
            if polyline_dist(p, [*others, end.own]) <= min(1, self.width / 2):
                continue
            self.errors.append(
                f'track {track.label!r} {end.which} {gap:.1f} units outside the nearest marker ({name}, as drawn fully '
                f'zoomed in) on {t} and not on another track of the line (§4)'
            )
            return

    def line_tracks(self, line_id: str, line_of: dict[str, str]) -> list[list[Point]]:
        return [t.points for t in self.tracks if any(line_of.get(n) == line_id for n, _, _ in t.states)]

    def line_of(self) -> dict[str, str]:
        return {name: entry['id'] for entry in self.legend for name, _, _ in states(entry['label'])}

    def check_platforms(self) -> None:
        """Each line an interchange serves has one platform point, on its centreline, inside the marker (§5)."""
        line_of = self.line_of()
        for label, data_lines, value, reach in self.platform_checks:
            points: dict[str, Point] = {}
            for entry in value.split():
                line_id, _, xy = entry.partition(':')
                try:
                    x, y = xy.split(',')
                    points[line_id] = (float(x), float(y))
                except ValueError:
                    self.errors.append(f'interchange {label!r}: malformed data-platforms entry {entry!r} (§5)')
            served = served_lines(data_lines)
            if set(points) != served:
                self.errors.append(
                    f'interchange {label!r}: data-platforms lines {sorted(points)} differ from data-lines '
                    f'{sorted(served)} (§5)'
                )
            for line_id, p in points.items():
                off = polyline_dist(p, self.line_tracks(line_id, line_of))
                if off > PLATFORM_TOLERANCE:
                    self.errors.append(
                        f'interchange {label!r}: {line_id} platform is {off:.2f} off the centreline of its line (§5)'
                    )
                if self.marker_gap(p, reach) > 0:
                    self.errors.append(f'interchange {label!r}: {line_id} platform lies outside the marker (§5)')

    def check_circles(self) -> None:
        """A circle's centre lies on every line it serves; a simplified line need only pass under it (§5, §8)."""
        line_of = self.line_of()
        simplified_ids = {entry['id'] for entry in self.legend if entry.get('simplified')}
        for label, data_lines, centre in self.circle_checks:
            for line_id in sorted(served_lines(data_lines) - simplified_ids):
                off = polyline_dist(centre, self.line_tracks(line_id, line_of))
                if off > PLATFORM_TOLERANCE:
                    self.errors.append(
                        f'station {label!r}: centre is {off:.2f} off the centreline of line {line_id} (§5)'
                    )

    def check_lumps(self) -> None:
        """Separate shapes of one interchange are at least 0.4 R apart (§5 rule 3)."""
        for m in self.reach:
            if m.centre is not None:
                continue
            shapes: list[list[list[Point]]] = []
            for segment in m.dots:  # dots, pills and blobs of segments sharing ends
                joined = [s for s in shapes if any(p in segment for q in s for p in q)]
                shapes = [s for s in shapes if s not in joined] + [[*chain.from_iterable(joined), segment]]
            radius = m.radius + self.border / 2
            for i in range(len(shapes)):
                for j in range(i):
                    gap = min(seg_gap(a, b, c, d) for a, b in shapes[i] for c, d in shapes[j])
                    if gap < LUMP * radius:
                        self.errors.append(
                            f'interchange {m.label!r}: two of its shapes are {gap / radius:.2f} R apart; '
                            'shapes under 0.4 R apart are one shape (§5 rule 3)'
                        )

    def check_legend(self) -> None:
        for entry in self.legend:
            if not re.fullmatch(r'[a-z0-9]+', str(entry.get('id', ''))) or entry['id'] in self.legend_ids:
                self.errors.append(f'legend {entry["label"]!r}: needs a unique lowercase id (§9)')
            entry_states = self.check_label('legend', entry['label'])
            self.record('legend', entry_states)
            self.legend_states += entry_states
            self.legend_ids[entry['id']] = entry_states
        # a track is coloured and highlighted by the legend entry whose name matches its name at that moment
        boundaries = sorted({d for _, s, e in self.legend_states for d in (s, e) if d})
        for name, start, end in self.track_names:
            moments = [start] + [d for d in boundaries if start < d and (end is None or d < end)]
            uncovered = [t for t in moments if not any(n == name and active(s, e, t) for n, s, e in self.legend_states)]
            if uncovered:
                self.errors.append(
                    f'track {name!r} ({start}..{end or "now"}) has no legend entry of that name from {uncovered[0]}: '
                    'it gets no colour and never highlights (§9)'
                )

    def check_markers(self) -> None:
        """Every marker lists the lines that call there, within its own dates and the legend's (§5)."""
        for marker in self.markers:
            if not marker.lines or not LINES.match(marker.lines):
                self.errors.append(f'marker {marker.label!r}: missing or malformed data-lines (§5)')
                continue
            presence = spans(marker.states)
            for line_id, start, end in states(marker.lines):
                period = f'{start}..{end or "now"}'
                if line_id not in self.legend_ids:
                    self.errors.append(f'marker {marker.label!r}: data-lines id {line_id!r} is not in lines.json')
                elif not within(start, end, spans(self.legend_ids[line_id])):
                    self.errors.append(
                        f'marker {marker.label!r}: line {line_id!r} is not on the legend for all of {period}'
                    )
                if not within(start, end, presence):
                    self.errors.append(
                        f"marker {marker.label!r}: line {line_id!r} {period} is outside the marker's own dates"
                    )
            if marker.logos:
                self.check_logos(marker, marker.logos)

    def check_logos(self, marker: Marker, logos: str) -> None:
        if not LOGOS.fullmatch(logos):
            self.errors.append(f'marker {marker.label!r}: malformed data-logos (§5)')
            return
        first, last = marker.states[0][1], marker.states[-1][2]
        entries: list[tuple[str | None, str | None]] = []
        previous: dict[str, str | None] = {}
        for part in logos.split(','):
            logo, _, interval = part.partition('=')
            start, _, end = interval.partition('-')  # a missing date is the marker's own first or last day
            start, end = start.replace('_', '-') or None, end.replace('_', '-') or None
            if not all(first < d and (last is None or d < last) for d in (start, end) if d):
                self.errors.append(
                    f'marker {marker.label!r}: logo {logo!r} repeats or exceeds the marker dates; '
                    'leave out a date on its first or last day (§5)'
                )
            if start and end and end <= start:
                self.errors.append(f'marker {marker.label!r}: logo {logo!r} ends before it starts')
            earlier_end = previous.get(logo)
            if logo in previous and (earlier_end is None or start is None or start <= earlier_end):
                self.errors.append(f'marker {marker.label!r}: logo {logo!r} intervals overlap or need merging')
            previous[logo] = end
            entries.append((start, end))
            for d in (start, end):  # an operator handover is a map change: it needs an event (§5, §7)
                if d:
                    self.log[d].add(
                        f'operator {logo} {"starts" if d == start else "ends"} at {marker.label.split("=")[0]}'
                    )
        bounds = {s for _, s, _ in marker.states} | {d for entry in entries for d in entry if d}
        for t in sorted(bounds):
            shown = any(active(s, e, t) for _, s, e in marker.states)
            if shown and not any(active(s, e, t) for s, e in entries):
                self.errors.append(f'marker {marker.label!r}: no logo on {t} (§5)')
                return

    def check_events(self) -> None:
        if self.events is None:
            return
        dates = [event['date'] for event in self.events]
        if dates != sorted(set(dates)):
            self.errors.append('events.json: dates must be unique and ascending')
        for event in self.events:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', event['date']) or not event['descriptions']:
                self.errors.append(f'events.json: bad entry {event}')
        for d in sorted(set(self.log) - set(dates)):
            self.errors.append(f'map changes on {d} but events.json has no entry: {sorted(self.log[d])}')
        # a date without a map change may only record an opening or the start of regular service after a
        # preview already on the map (§7)
        text = {event['date']: event['descriptions'] for event in self.events}
        for d in sorted(set(dates) - set(self.log)):
            if not all(' opens' in t or 'regular service' in t for t in text[d]):
                self.errors.append(
                    f'events.json has {d} but nothing changes on the map that day, '
                    'and it records no opening or start of regular service (§7, §10)'
                )

    def print_lengths(self) -> None:
        """Each line's length on the last change date, to compare with the operator's figure."""
        last = max(self.log)
        for name, start, end in self.legend_states:
            if active(start, end, last):
                total = sum(
                    km
                    for track_states, km in self.track_km
                    if any(n == name and active(s, e, last) for n, s, e in track_states)
                )
                print(f'  {name}: {total:.1f} km')


def polylines(d: str) -> list[list[Point]]:
    return [
        [(float(x), float(y)) for x, y in re.findall(r'([-\d.]+),([-\d.]+)', part)]
        for part in d.split('M')
        if part.strip()
    ]


if __name__ == '__main__':
    try:
        sys.exit(0 if MapCheck(sys.argv[1]).run() else 1)
    except IndexError:
        print('Usage: python3 mapcheck.py <key>')
        sys.exit(2)
