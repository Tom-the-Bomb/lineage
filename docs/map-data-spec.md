# Map data specification

This is the contract for every metro system in this app. Follow it exactly when adding a system,
converting a source map, or editing dates. `MUST` means the app or the checks break without it.
`SHOULD` means it's the house style, and you need a stated reason to deviate.

Reference implementations: Shanghai (`src/assets/shanghai/`) is the model for new systems. MTR
(`src/assets/hongkong/`) is the original; it follows the same structure, and its system-specific
notes are in [MTR notes](#mtr-notes).

## Contents

1. [Files and registration](#1-files-and-registration)
2. [Label syntax](#2-label-syntax)
3. [SVG document structure](#3-svg-document-structure)
4. [Tracks](#4-tracks)
5. [Station markers and connectors](#5-station-markers-and-connectors)
6. [Interchanges: which marker to draw](#6-interchanges-which-marker-to-draw)
7. [Dates: what to record and when](#7-dates-what-to-record-and-when)
8. [Scope: what goes on the map](#8-scope-what-goes-on-the-map)
9. [`lines.json` (legend)](#9-linesjson-legend)
10. [`events.json` (timeline text)](#10-eventsjson-timeline-text)
11. [Sources and verification](#11-sources-and-verification)
12. [Cleaning a source map](#12-cleaning-a-source-map)
13. [Checklist](#13-checklist)
14. [Appendix: `check_map.py`](#appendix-check_mappy)

---

## 1. Files and registration

```
src/assets/<key>/
  map.svg              the map (tracks, markers, connectors, geography)
  data/lines.json      legend: line names over time and their colours
  data/events.json     one entry per date the map changes
  preview.svg          home-page thumbnail: the present-day tracks in legend colours
  <logo>.svg           one logo per system shown in tooltips
```

- Name logos after their operator or network, e.g. `shanghai-metro.svg`, `toei-subway.svg` or `mtr.svg`, rather than `metro.svg`.
- `<key>` is a readable lowercase place name: `hongkong`, `shanghai`, `taipei`, `singapore`, `tokyo`, `shenzhen`, `hangzhou`, `guangfo`, `chengdu`, `beijing`, `nanjing`, `chongqing`, `xian` or `seoul`. Use the same key for the folder, `systems` entry and URL (e.g. `/shanghai`); no separate key field.
- Register the system in `src/systems.ts` by adding a `defineSystem({ ... })` entry to `systems`:

| Field                | Type / example                                        | Rule                                                                                                        |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `name`               | `'Shanghai Metro'`                                    | System name without “History”; the map heading and browser title append it.                                 |
| `localTitle`         | `'上海地铁历史'`                                      | Full localized title, including “history”.                                                                  |
| `description`        | one sentence                                          | Shown under the title.                                                                                      |
| `map`                | `import shanghaiMap from './assets/shanghai/map.svg'` | The SVG.                                                                                                    |
| `logos`              | `[shanghaiMetroLogo]`                                 | Imported header logos: the system's own brand (see below).                                                  |
| `minDate` (derived)  | `Date`                                                | Automatically January 1 UTC of the first event's year; do not configure it.                                 |
| `maxDate` (derived)  | `Date`                                                | Automatically today at midnight UTC when the app loads; do not configure it.                                |
| `lines`              | `shanghaiLines.lines`                                 | The imported `lines.json` array.                                                                            |
| `events`             | `shanghaiEvents`                                      | The imported `events.json` array, sorted by date.                                                           |
| `milestoneDates`     | `['1993-05-28', ...]`                                 | Dates from `events` to feature on the home page.                                                            |
| `operators`          | `{ metro: { src, alt }, … }`                          | Station tooltip logos by `data-logos` key (§5). The first is the default for markers without the attribute. |
| `article` (optional) | `'/hongkong/article'`                                 | Only if an article route exists.                                                                            |

- Header logos show the system's brand only, even where several companies operate its lines (Seoul
  shows Seoul Metro, Taipei shows Taipei Metro). Add a second header logo only for a system that is
  genuinely two networks presented as one (Tokyo Metro + Toei, Guangzhou + Foshan). Other operators
  appear in station tooltips through `operators` (§5).
- Home page links, `SystemKey` and the routes are derived from `systems`. Add the public URL to `public/sitemap.xml` too. The Hong Kong article is at `/hongkong/article`.
- Optional `logoSize` sets the header logo width (automatic height) and a square image box for the home page and timeline thumb, in pixels. Artwork proportions are preserved. Defaults are 16 px wide in the header, 28 × 28 on the home page and 24 × 16 for the thumb. Tick/dot positions account for thumb width.
- Optional `tooltipLogoSize` sets station tooltip logo height in pixels (default 16); width stays automatic.
- `initialBounds: [width, height]` preserves the opening framing independently of the expanded SVG
  canvas. Optional `initialView: { center: [x, y], zoom }` uses the same unchanged map coordinates.

Each system's scope, sources, logo provenance and documented exceptions are recorded in its section
of [timeline-sources.md](timeline-sources.md), for example
[Xi'an's open naming questions](timeline-sources.md#xian). They don't change
these rules.

## 2. Label syntax

Every track, marker, connector and legend entry carries its whole history in one label. In the SVG the
label is the `inkscape:label` attribute; in `lines.json` it is `"label"`.

```
label  = state { "," state }
state  = name "=" date [ "-" date ]
date   = YYYY "_" MM "_" DD            (zero-padded)
name   = English name, spaces written as "_"
```

Examples: `Line_1=1993_05_28`, `Jiyang_Road=2011_04_12-2011_05_07,Oriental_Sports_Center=2011_05_07-2013_08_31`,
`Hongqiao_Airport_Terminal_2=2024_12_27`.

Rules:

- MUST: each state is visible for `start <= t < end`. `end` is the **first day it no longer exists**,
  not its last day of service. A state with no `end` lasts to the present.
- MUST: states are in chronological order and don't overlap. A rename is two states where the first
  one's `end` equals the second one's `start`. A gap between states means the element is hidden
  during the gap. Use gaps only for real closures (§7); never between a preview and the opening.
- MUST: a name MUST NOT contain `=`, `,`, whitespace or a literal underscore, and MUST NOT start with
  `_`. Hyphens, apostrophes, periods and `·` are fine (`Zhangjiang_High-Tech_Park`,
  `People's_Square`, `Shimen_No._1_Road`, `Site_of_the_First_CPC_National_Congress_·_Xintiandi`).
- MUST: the name is shown **verbatim** (underscores become spaces). Write it exactly as the operator's
  English name at that time: capitalisation, punctuation and word order. Don't add suffixes such as
  `(elevated)`, `*` or line numbers; use the element `id` for disambiguation. The operator's own map
  decides the form, including its short forms (Shenzhen's `OCT`), "Station" where it keeps it
  (`Shenzhen_North_Station`), its apostrophes and its `&` (`Convention_&amp;_Exhibition_Center` in
  the SVG). Line names follow its legend too. Where the English names changed network-wide on a day
  nobody recorded (Shenzhen's pinyin names before 2010–11), show the current form throughout and say
  so in the source notes; don't invent a date.
- Dates are local calendar dates as the operator announced them. They are parsed as UTC midnight.
  Don't shift them for time zones.
- Station operators are not part of the label; they go in `data-logos` (§5).

## 3. SVG document structure

Shanghai's `map.svg`, in outline. Anything not shown here doesn't belong in the file.

```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     viewBox="-3937 -669 12175 7204" width="1600" height="947" version="1.1" style="background:#f6f6f3">
  <g id="zoom-layer" inkscape:label="zoom-layer">
    <g id="geography" pointer-events="none">            <!-- optional; water and outside land -->
      <path d="…" fill="#eceeef" />                                                    <!-- land beyond the operator's territory -->
      <path d="…" fill="#dde6ed" stroke="#c0cfd9" stroke-width="1" vector-effect="non-scaling-stroke" />   <!-- water -->
    </g>
    <g id="lines" fill="none" stroke-width="5" stroke-linecap="butt" stroke-linejoin="round"
       inkscape:groupmode="layer" inkscape:label="lines">
      <path id="line-1--caobao-road--xujiahui--1993-05-28" data-km="2.8" d="M… L…" inkscape:label="Line_1=1993_05_28" stroke="#e3002b" />
      …
    </g>
    <g id="stations" fill="#fff" stroke="#5b6067" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.535"
       inkscape:groupmode="layer" inkscape:label="station_markers">
      <path id="walking-transfer-…" inkscape:label="…" fill="none" stroke="#8f959c" stroke-width="1.000" d="M… L…" />   <!-- connectors first -->
      <circle id="station-…" inkscape:label="…" data-lines="…" data-logos="…" cx="…" cy="…" r="6.383" />
      <g id="station-…" inkscape:label="…" data-lines="…" data-logos="…" data-platforms="…" fill="none">   <!-- interchange -->
        <path class="dots" d="M… L…" stroke-width="15.300" />
        <path class="bridges" d="M… L…" stroke-width="8.255" />
        <path class="dots" d="M… L…" stroke="#fff" stroke-width="10.230" />
        <path class="bridges" d="M… L…" stroke="#fff" stroke-width="3.185" />
      </g>
      …
    </g>
  </g>
</svg>
```

- MUST: the `xmlns:inkscape` namespace, because labels are read with `getAttribute('inkscape:label')`.
- MUST: a `viewBox` covering the complete drawing and geographic margin; its origin may be negative.
  `width` and `height` only size the file in editors (the app sizes the map with CSS): use
  `width="1600"` and a `height` in the `viewBox` proportion.
  It sets the minimum zoom and pan bounds. `initialBounds: [width, height]` in system config defines
  the original `(0, 0)` framing rectangle; `initialView` positions the opening view within it. Keep
  these separate so extending the canvas does not change the opening view or maximum zoom.
- MUST: `<g id="zoom-layer">` wraps everything. Zoom and pan transform this group.
- MUST: `<g id="lines">` contains **only** `<path>` elements, and every one has a label. The app animates
  every child and reads every label, so an unlabelled element breaks it.
- MUST: `<g id="stations">` contains **only** `<circle>` (station), `<g>` (interchange, holding only
  its layer paths, §5) and `<path id="walking-transfer…">` (connector) elements, every one labelled.
  No other nesting, no `<use>`, no `<text>`.
- MUST: marker paint lives on the `stations` group (`fill`, `stroke`, round caps and joins, the border
  `stroke-width`), not on each marker; an interchange's layers carry only their widths (and white),
  connectors their own thinner grey stroke (§5).
- MUST: draw order is geography → lines → stations; inside `stations`, connectors first so markers sit
  on top of them.
- MUST: geography uses one palette across systems: the operator's own land is the off-white page
  background `#f6f6f3` (`style="background:#f6f6f3"` on the root, no fill drawn; the app's `--color-paper`
  token is the same value), water is `#dde6ed`, and land beyond the operator's territory is `#eceeef`
  (Shanghai's neighbouring provinces, Shenzhen). Water shapes carry a one-pixel coastline,
  `stroke="#c0cfd9" stroke-width="1" vector-effect="non-scaling-stroke"`, which stays hairline at every
  zoom. Keep the attribute in the file: at load the app replaces it with a width set from the zoom
  (`calc(var(--hairline) * w)` on each element, `--hairline` = 1/zoom in 2% steps), which Safari
  repaints more cheaply. It reads each element's computed width in map units, so a hairline MUST NOT
  sit under a transform inside `geography` (bake any transform into the path data). A path in
  `<defs>` drawn through `<use>` carries the attribute itself, since it is not inherited through `<use>`.
  A source that only outlines the land (MTR) gets a full-`viewBox` water path first (no stroke) and
  its land filled `#f6f6f3` on top, with the coastline on the land shapes instead.
- MUST NOT: `<title>` or `<desc>` anywhere, because browsers show them as tooltips on top of the app's.
  Also no `<text>` labels (names come from labels and tooltips), no `<defs>`/`<use>`/`<symbol>`, no
  `<image>`, no filters, masks or clip paths, no `scale()`/`matrix()` transforms. The one exception is
  inside `geography`, which the app does not animate: preserved source artwork is clipped to its original canvas by a `<defs>` clip path (§11), and a shape
  drawn twice may be reused with `<use>` (Shanghai's and Singapore's land fills, Seoul's outside land
  and shoreline). Nothing in `lines` or
  `stations` may use them.
- SHOULD: split every large geography path (a few thousand points or more) into spatial tiles of plain
  paths. Browsers repaint the map a tile at a time and walk every path whose bounds overlap the tile, so
  a path spanning much of the canvas is re-walked for every tile a zoom, pan or growing track repaints:
  Seoul's single 63,000-segment shoreline made Safari zoom at about nine frames a second, and in
  WebKit the long OpenStreetMap water and land paths made up nearly all of every map's paint time.
  Since 2026-10-03 every map's straight-segment geography paths of 2,000 points or more are tiled in
  place (a quadtree of at most 1,500 vertices per tile), cutting WebKit's paint time per frame by
  30–80% (Nanjing 42 to 7 ms at a quarter-canvas view, Guangzhou 71 to 37, Beijing 26 to 7):
  - the element becomes a `<g>` with its `id` and paint; fill pieces carry `stroke="none"`, outline
    pieces `fill="none"` and the element's `vector-effect` (it is not inherited);
  - fill: each ring is clipped to the tile on its own (Sutherland–Hodgman), which keeps its direction,
    so its winding inside the tile, and so the fill under either fill rule, is unchanged; tiles with
    no vertices are kept, since they may lie wholly inside a ring; opaque fill pieces overlap their
    neighbours by 1.5 units so no anti-aliasing seam shows;
  - outline: the rings, closed ones with their closing segment, are cut at the tile edges, with round
    caps closing the cuts;
  - no `<use>` and no clip paths: Safari pays for each on every tile it paints;
  - path data is relative on the source's own decimal grid (absolute points rounded first, so the
    deltas never drift), which made every file smaller once compressed.

  Curved paths, paths under a transform, and anything in `<defs>` stay as drawn. Compare the result
  with the untiled drawing in Chromium at full zoom-out, a phone-width viewport and close up: only
  anti-aliasing should differ.

- Inkscape metadata (`sodipodi:namedview`, `<metadata>`) is harmless but unnecessary; new files SHOULD omit it.
- `id`s MUST be unique. They SHOULD be descriptive:
  - tracks: `<line-slug>--<from-slug>--<to-slug>--<YYYY-MM-DD opening>`, e.g. `line-2--guanglan-road--longyang-road--2010-02-24`;
  - markers: `station-<name-slug>[-<suffix>]`, e.g. `station-xujiahui-line-9`;
  - connectors: `walking-transfer-<name-slug>[-<suffix>]`.

  If you change a track's opening date, change the date in its `id` too.

- Marker IDs also define search identity. The part before `--` is the stable station ID;
  an optional `--<YYYY-MM-DD>` suffix identifies a replacement marker by its first appearance.
  For example, `station-quarry-bay-2` and `station-quarry-bay-2--1989-08-06` represent the same
  station before and after an interchange upgrade. Keep the stem through renames; display names
  still come only from the dated labels. A marker with no `--` uses its entire ID as its identity.
- Replacement markers for one station MUST share a stem and MUST NOT overlap in time. Separate
  stations MUST have different stems, including namesakes and out-of-station transfers (§6).
  West Nanjing Road's Line 2, 12 and 13 stations therefore have three identities; the Line 2
  marker's replacement keeps the Line 2 identity. When separate stations become one interchange marker,
  continue the earliest station's identity and retire the other separate identities. Their
  historical search results remain available. Search groups by identity **and historical name**,
  showing the first date that identity used the name, without shortening or rewriting labels.

## 4. Tracks

- A track is one `<path>` per **line segment with its own dates**: split a line wherever a stretch
  opens, closes, is rerouted or changes name on a different date from its neighbours. Each segment
  runs station-centre to station-centre along the drawn route. On every date a line's visible
  tracks form connected runs between its stations: two open pieces with a gap between them are an
  error (Seoul's Gyeongui Line lacked Digital Media City – Gajwa from 2009 to 2012 because its 2012
  track began at Digital Media City instead of at the branch point, Gajwa).
- MUST: a track has fewer than 256 straight segments (`L` commands). WebKit restarts the dash
  pattern every 256 line segments, so a longer polyline draws in as several pieces at once in Safari.
  Simplify dense polylines by dropping vertices (Douglas–Peucker at ~0.05 `W`, endpoints kept);
  Bézier curves don't count.
- MUST: a terminus segment ends exactly at its terminus platform: the circle's centre, or that
  platform's point in the interchange's `data-platforms` (§5), which is normally its own line's (Taipei's
  Xiaonanmen Line started on the Songshan–Xindian platform it shared at Ximen). Ending anywhere else
  inside an interchange marker is not enough (Seoul's 2011–2022 Shinbundang terminus at Gangnam
  reached 9.2 units past its own platform, onto Line 2's). It must not stick out beyond the marker,
  and neither may a round cap (Caps, below), which reaches half the stroke width past the end.
  `check_map.py` checks every track end, allowing the drawn tip up to 1 unit of slack: inside a marker present at
  every moment of the track's life (markers move when a station is rebuilt), or on another track of
  the same line (a branch junction, a loop closing on itself), or outside the `viewBox`, or on a line
  the legend marks `simplified` (§9), or at an end the track marks with `data-continues` (`"start"`,
  `"end"` or `"start end"`). That marks a railway that ran on past the operator's border into
  another network while no station stood at the end: the track still ends where the terminus
  station stands in other periods, and no stub is drawn on to the border, which could not show
  where the trains really went (the KCR at Lo Wu from 1911 to 1949, when trains ran through to
  Canton and Lo Wu had no station). That the end lies on its own platform point is checked by eye
  (§11 step 6).
- A segment that existed only for a period (e.g. an old alignment) gets its own path with an end
  date. Its replacement is a separate path that starts on the day the old one ends.
- Width: every metro track uses the width `W` set on the `lines` group (Shanghai `W = 5`). Trams,
  light rail and gondolas use a thinner per-path `stroke-width` of `0.4 W`: Shanghai trams use 2,
  and MTR Light Rail and Ngong Ping 360 use 0.6.
- Caps: MUST: the `lines` group sets `stroke-linecap="butt"`: every track has flat heads, so a
  terminus ends cleanly at its marker's centre and a retracting track shrinks to nothing instead of
  leaving a dot behind. A track gets `stroke-linecap="round"` on its own path **if and only if** one of
  its ends may lie away from a station marker: it belongs to a line the legend marks `simplified`
  (Light Rail, trams, people-movers, drawn without terminus markers), or it marks an end with
  `data-continues` (the KCR at Lo Wu, 1911–1949). Those ends get a rounded tip instead of a flat cut.
  A round cap reaches half the stroke width past the end, so at the ends it does check (those not
  marked `data-continues`) the checker gives such a track that much less slack. Joins are `round`. The app hides a track with a single dash as long as the track slid off its
  start (`stroke-dashoffset: L`) and draws it in by sliding the offset back to 0. The gap after the
  dash is one stroke width longer than the track (`stroke-dasharray: L L+W`), so the next dash never
  reaches the far end, where a round cap would draw a dot. Once a track has drawn in, the app drops the
  pattern (`stroke-dasharray: none`) and restores it before the track retracts: Safari re-dashes a
  dashed track along its whole length on every repaint.
- One growth per event: the stretch an event opens is one track, oriented to grow from the end that
  touches the network already open (else from the line's first station), so it draws in as one
  front; branches are one track each. Its subpath is continuous (pieces joined, not separate
  `M` commands), since each subpath would grow on its own. Where parts of that stretch later change
  differently (a section closes, is renamed or rebuilt), the track ends that day and the parts that
  carry on continue as their own tracks, each with `data-takes-over="<id>"` naming the track it
  replaces. Such a track lies exactly on the one it replaces (within 0.01 units), comes after it in
  the layer, and starts the day that one ends; when that one was shown just before, the app draws
  the new track in place instead of regrowing it, while the old one still retracts underneath (so a
  section that closes still visibly retracts). Cut as few pieces as the dates need.
- Colour: the app colours each track from the legend entry whose name matches the track's name at
  that moment (§9). Also put the same colour on the path as `stroke="#rrggbb"`. It's the fallback
  and it makes the file readable in an editor.
- MUST NOT: dashed tracks (`stroke-dasharray`). The app uses the dash pattern to draw tracks in and
  out, so a track's own dashes would be overwritten. Draw shared track as parallel tracks.
- MUST: every track carries `data-km`, its route length in kilometres to one decimal
  (`data-km="4.7"`). A line's length at any date is the sum over its tracks visible then, so the
  values of a line's tracks visible at `maxDate` MUST add up to the operator's published route
  length for that line. A branch with its own legend entry counts separately, and a track's value
  never changes when the line is renamed, nor when its geometry is redrawn (removing a jog, moving
  it onto its real course or setting a side-by-side offset changes the drawn length, not the
  published one; Nanjing's realignments changed drawn lengths by under 0.5%). Fixing a gap in the
  segmentation can move kilometres between tracks, which is intended.
  - Use the published length of a section where the operator gave one (opening notices, line pages).
  - Otherwise derive it from the drawn length, scaled so the line's present-day total matches the
    published figure. Today's figure is then exact and historical figures are within a few percent,
    because a map's scale is consistent within a line (Shanghai and Taipei within 3%, MTR within 7%).
  - A line the map deliberately simplifies (MTR Light Rail, drawn without most of
    its stops) is still calibrated to the published network length: its tracks stand in for the
    whole network.
  - A predecessor line the legend names (KCR West Rail, Ma On Shan, Shanghai's Pearl line, Taipei's
    Muzha line) SHOULD also sum to its own published length at the dates it carried that name. Give
    its tracks published section values and let the successor line's remaining tracks absorb the
    difference, so today's total stays exact.
- Path data: any valid `d` works because the app uses `getTotalLength()`. Shanghai uses absolute
  `M x,y L x,y …` with 3 decimals.

The geometry rules below follow from the station markers (§5): a dot stands at its line's real
platform, so nothing about a marker bends, widens or shortens a track any more.

**Course: a track follows its own railway**

- SHOULD: a track lies on its line's real course: the centreline of the line's own railway (the
  midpoint of its two running tracks, from its own OpenStreetMap route-relation ways, never merely
  the nearest railway), placed through the map's frame (§11). Keep it within about 0.5 W of that
  centreline (Shanghai 2.5 units, about 60 m) and redraw any stretch further off. Where the two bores
  split round an obstacle, the centreline is their average (Xi'an's Line 6 under the west moat), not
  a zigzag of nearest points.
- MUST NOT: bend a track toward a dot, round a marker, to clear a marker or to space two dots, nor jog
  it to pass through a measured platform point: the platform point is projected onto the track,
  never the other way round (§5). Tokyo's Chiyoda Line at Otemachi and Nanjing's twenty station jogs
  of about 1 W were such errors.
- The only departures from the real course are: the side-by-side convention below; rounding a real
  corner (a vertex of OSM's polyline) into a curve, normally within W; a simplified line adjusted to
  meet a heavy-rail marker (§8); and any other departure the system's source notes document with a
  reason (Hong Kong's Airport Express pair, below; Singapore's smooth artwork offsets of about 1 W;
  three OSM corners Shenzhen could not follow without a kink, up to 1.3 W).
- Smooth OSM vertex noise over a few units (a Gaussian along the arc of about 3 units moves a 300 m
  radius curve by under 0.1 W) and fit tangent-continuous Béziers. A tolerance-driven smoothing
  spline is the wrong tool: it oscillates and leaves 0.5–1-unit S-jogs. Where a track must lie
  exactly beside another, keep Bézier chords short (about 4 units at Shanghai scale): a long chord
  bulges enough to open a hairline gap.
- A historical track in the same tunnel or on the same formation as a later one uses the later
  track's geometry exactly (Hong Kong's 1979–82 Modified Initial System on the Kwun Tong and Tsuen
  Wan courses).

**Side by side**

- Lines that share a corridor are drawn side by side, **touching exactly**: centres
  `(w1 + w2) / 2` apart, which is `W` for two metro lines and `0.7 W` for a `0.4 W` tram beside a
  metro line (Nanjing 3.5 units, Tokyo 2.1), to within 0.05 units over the whole shared stretch.
  Measure the true nearest distance, not the distance along one line's normal, which undershoots on
  bends. Draw them touching where their real centrelines are less than about 1.5 W apart; where they
  are farther apart, each follows its own course and the gap between them is a clear one. Nothing in
  between: a stroke gap between 0 and about 0.5 W reads as a hairline background sliver, and any
  overlap as one line partly hiding the other.
- MUST NOT: widen a corridor so that a station clears the other line. A dot sits at its real
  platform even where another line runs beside or over it (§5, Placement), and the tooltip says which
  lines stop. The former rule of widening to `2 W` where one line has stations the other passes is
  withdrawn.
- Where the pair sits: each line may lie anywhere from the corridor's real centre to `W` out on its
  own side. Either centre the pair on the mean of their real centrelines, or keep one line on its
  real course (the one that already follows OSM, usually the earlier or through line) and offset the
  other, whichever avoids a needless S-bend in a line that runs on alone (Beijing's Line 8 ending
  beside the through line at Zhuxinzhuang).
- Order: each line runs on its real side and crosses where the real lines cross (three Guangzhou
  corridors had been drawn mirror-image). Where one line's two tracks lie outside the other's, as at
  many cross-platform stations (Hangzhou's West Railway Station, Chongqing's Shangwanlu), the
  corridor centre is the mean of all four tracks and each line goes on the side it leaves the
  corridor to, so its exit needs no extra crossing; a real crossing is kept.
- Platform points on a moved line move with it, perpendicular to the track, keeping their position
  along it (§5). A track never jogs back to its real platform (Seoul's Shinbundang had a 28° jog into
  the Bundang track at Jeongja).
- Shared track (two lines on the same rails: Shanghai's Lines 3/4, Tokyo's Yurakucho/Fukutoshin and
  Namboku/Mita) is drawn as parallel offsets 0.7–1 W apart (Shanghai 3.5–5 units), never more than
  `W`, and its stations as one pill across the offset (§5).
- Two tracks of one colour (a line and its own branch or predecessor) may overlap by about 0.2
  units instead of touching: abutting strokes of one colour show an anti-aliasing seam, an overlap
  does not (Beijing's Line 1 and Batong Line between Sihui and Sihui Dong).
- A map may keep a different standard spacing where its source notes say why. Hong Kong keeps
  `2 W` (a gap of one track width) for the Tseung Kwan O Line beside the Island Line north of North
  Point, where the real tracks are about that far apart, and for its Airport Express convention: the
  Airport Express touches the Tung Chung line (`0.95 W`) where they share one pair of tracks on
  Lantau and the Tsing Ma Bridge, runs `2 W` from it round Sunny Bay (it uses the station's centre
  tracks) and crosses to the other side there, and keeps `2 W` from Tsing Yi to Hong Kong, which
  leaves the Tung Chung line up to 1.6 W off its course. Two older spacings were brought to this
  rule on 2026-10-03: Shanghai's Lines 11/16 round Xiuyan Road (widened to `2 W`; their viaducts
  are about 1 unit apart) and Taipei's Danhai LRT north of Hongshulin (about 4 units from the
  Tamsui–Xinyi Line; the real tracks are 2–4 units apart) now touch.

**Crossings, joins and partings**

- Lines that cross are drawn crossing where the real tracks cross, once, without weaving. No
  side-by-side offset applies within about 2–3 W of a real crossing: pushing two crossing lines
  apart makes elbows. A real crossing at a shallow angle is drawn as it is, even though it shows a
  short overlap (Chengdu's Lines 1 and 18 on Tianfu Avenue, Singapore's Circle and Thomson–East
  Coast lines north of Caldecott); the no-overlap rule is for near-parallel running only.
- A line that changes sides of a corridor partner where the real tracks are stacked crosses at a
  clear angle (about 20° or more) on a short transition, then touches. A long shallow slide under the
  partner reads as a partial overlap (Hong Kong's Tuen Ma line north of Hung Hom, Chengdu's Line 5 at
  Xibei Bridge).
- A line joins or leaves a corridor in one smooth curve, tangent-continuous at both ends, at the
  angle of its real departure. Make the touching stretch an exact offset of one line, but only where
  the two are already nearly parallel (an offset across the neighbour's tight bend leaves a corner on
  its inside), and beyond each end carry the end displacement as a translation that fades out
  smoothly over about 2–7 W, with the longer lead-in where the offset moves the line to the inside
  of a bend. Do not blend between two targets (the real course and the offset): where the real
  course crosses the partner first, that makes a dip and a bump (Chengdu's Line 4 at Chengdu
  University of TCM). Where the real tracks part very slowly, keep the lines touching while the real
  separation stays within a small tolerance of `W`, then let the gap open along the real curves.
- Lines that meet in one marker shape (shared track, a full stacked crossing, or platforms under
  0.4 R apart, §5) converge within about `R` of the platform, so the overlap hides under the marker
  (Nanjing's Jinmalu). A line that ends cross-platform beside another ends on its own offset course at
  its own stop, without curving back onto the other line (Nanjing's S9 at Xiangyulunan).
- Not slivers: the short wedge where a line crosses another and then runs touching it, and the
  narrowing gap where two lines on their real courses converge on neighbouring stations (Shenzhen's
  Sea World). The slivers to fix are long near-parallel runs with a small, roughly constant gap,
  and partial overlaps where one line hides part of another.
- Checking: for every date, pool each line's visible tracks (so its own joints don't count) and
  sample every pair of lines. Where two run within about 20° of parallel for more than about 3 units,
  the stroke gap (centre distance − `(w1 + w2) / 2`) is 0 (within 0.05) or a clear gap (at least about
  0.5 W, or the map's documented spacing), and an overlap deeper than about 0.15 units is a crossing,
  shared track, a one-colour pair or a convergence under a marker. Judge what remains in the app at
  maximum zoom (§11): a residue below about a pixel there (Chengdu 0.3 units, Singapore 1 unit) is
  invisible and may be left, with a note in the source notes.

**Joints, curves and ends**

- Consecutive pieces of one line share their end point exactly and are tangent-continuous: no turn
  above about 0.5° at a joint (a few degrees hide under a dot; Seoul's dated joints turn up to 4°).
  A joint that no marker covers shows even a 4° corner. Where a redrawn piece meets an unchanged
  one, bend the redrawn piece onto the other's tangent over at least 3 W; where an end has partners
  at different dates, today's partner sets the tangent.
- Inside a path, aim for no vertex turning by more than about 1° (Hangzhou, Chengdu, Chongqing,
  Guangzhou and Tokyo meet that; Taipei holds 3°), unless the real track has that corner (Ngong Ping
  360's angle stations, a tram's street corners, a junction or reversal under a marker such as
  Beijing's Capital Airport Express at Terminal 2). Earlier passes allowed up to 12°; the 3–12°
  vertices they left (about 140 in Seoul, most on its main-line routes; five in Shenzhen, one in
  Nanjing and three on Shanghai's Line 3 at Shilong Road and Shanghai South) were rounded on
  2026-10-03, moving no line more than 0.2 units and keeping station points on the track. Six are
  left in Seoul, all under station dots: Line 1 at Geumjeong (10°, at the dot's edge) and
  Byeongjeom (3°), junctions where a branch shares the approach, and four within a unit of an
  interchange platform that rounding would move (Yeongdeungpo-gu Office, Gangnam-gu Office, Daerim,
  Bupyeong-gu Office).
- Leftover tiny pieces cause most kinks: a segment of a few hundredths of a unit, or a Bézier handle
  under about 0.4 units, has no reliable direction once rounded to 3 decimals and turns a joint into
  a 1–3° corner. Merge such a leftover into its neighbour (or make sure the joint stays tangent),
  and never leave a zero-length segment. After trimming an end, check for a hook (a first or last
  segment under 1 unit, or one whose tangent is more than 60° off its chord).
- Rounding OSM's polyline corners gives radii of a few units, which is fine; but a straight piece
  meeting a tight curve can read as a corner at full zoom even with matching tangents (Hong Kong's
  1975 Hung Hom approach). A turn of more than about 15° within 2 units outside a marker is worth a
  look.
- A terminus ends on its platform (above) and moves with it only by trimming the track or extending
  it straight along its real alignment, never by bending the last stretch sideways. Tail and siding
  tracks beyond the platform are not drawn, although OSM route relations often include them.
- Where a station is the joint of two pieces of its line, the joint is that line's platform point at
  the station that was the terminus. Moving the platform moves the joint along the combined
  geometry (split the joined path at the new point), so both pieces stay exact.
- A `data-takes-over` continuation and its parent are edited together, so their shared geometry stays
  identical; where smoothing would break that, the handover wins (Tokyo kept a 1.3° corner on its
  1939 piece).
- A faint line can appear across a track where two butt-capped paths meet, even with exact,
  tangent-continuous geometry (rsvg shows it at some joints, Chromium at others). It is a renderer
  artefact: don't overlap pieces to hide it, and don't split a track mid-run where one path would do.

**After a geometry edit**

Moving a track moves everything on it. Re-project each platform point from its real platform (not
from the old dot) onto the new track (§5), and move with it every track end and joint at that
point, the ends of bridges and pills, earlier circles of the same platform, connector ends and any
one-circle crossing (recompute the drawn crossing and check that both platforms are still within
`R` of it). Re-impose identical geometry on `data-takes-over` partners. Then re-run the composition
rules (§5 rule 3 can merge or split a pair), the side-by-side and joint checks above, and
`check_map.py`. `data-km` does not change.

## 5. Station markers and connectors

Markers follow the metro line maps on Wikimedia Commons (README): a station is a white dot with a
grey border; an interchange draws a dot on each line's real platform (one circle or pill only where
lines share track or stack at a full crossing), joined by hollow bridges along the walkways
passengers take, all inside one continuous border. Everything below is static in the SVG; the app only recolours
markers for dark mode, thins them on zoom and animates hover.

All sizes derive from the track width `W`:

| Quantity                                     | Formula   | Tokyo (`W = 3`) | Shanghai (`W = 5`) |
| -------------------------------------------- | --------- | --------------- | ------------------ |
| dot outer radius `R`                         | `1.53 W`  | `4.590`         | `7.650`            |
| border `B` (`stations` group `stroke-width`) | `0.507 W` | `1.521`         | `2.535`            |
| circle `r` (to the border's centre)          | `R − B/2` | `3.829`         | `6.383`            |
| bridge outer width `T`                       | `1.651 W` | `4.953`         | `8.255`            |
| connector stroke                             | `0.2 W`   | `0.600`         | `1.000`            |

Paint: the `stations` group carries `fill="#fff" stroke="#5b6067" stroke-linecap="round"
stroke-linejoin="round" stroke-width="B"`; circles carry none. Connectors carry their own
`stroke="#8f959c" stroke-width="0.2 W"`. In dark mode the app swaps these colours (and the interchange
layers' white) for its `--map-marker`, `--map-marker-rim` and `--map-walk` tokens.

Zooming in past the opening view by `z`, the app draws station markers `z^-0.4` as thick in map
units (tracks and walking connectors keep their width), so dots shrink around their platforms
and the bridges between them, and the connectors between separate stations, show. On hover a circle
grows (radius × 5/3); an interchange scales about its centre as a whole, by as much for a compact
one and less for a long one, while an unscaled invisible copy stays the hit area.

**Station (one line, or one platform complex on one line): `<circle>`**

```xml
<circle id="station-hengshan-road-7" inkscape:label="Hengshan_Road=1995_04_10" data-lines="1=1995_04_10" cx="2290.083" cy="1184.699" r="6.383" />
```

- MUST: the centre sits on the centreline of every line in its `data-lines` (within 0.5 units, which
  `check_map.py` checks; aim for 0.01, the tolerance the tests set for platform points), at the real
  platform centre (below). A simplified line (§8) need only pass under the circle.
- A station that becomes an interchange is **two elements**: the circle's label ends on the day the
  interchange marker's label starts. The name stays the same. Normally, unless the platform itself moved
  (a rebuilt station) or the earlier circle is staggered as half of an out-of-station pair (below), it
  sits on its line's platform point in the later marker (on the drawn crossing where that marker is
  one crossing circle), so the station doesn't jump when the marker changes.

**Interchange (lines share a paid area): `<g>` of dots and bridges, with `data-platforms`**

```xml
<g id="station-aoyama-itchome-g--2000-12-12" inkscape:label="Aoyama-itchome=2000_12_12" data-lines="e=2000_12_12,g=2000_12_12,z=2000_12_12"
   data-logos="metro,toei" data-platforms="e:782.970,983.345 g:785.159,990.350 z:784.245,987.654" fill="none">
  <path class="dots" d="M782.970,983.345 L782.970,983.345 M784.242,987.655 L785.162,990.349" stroke-width="9.180" />
  <path class="bridges" d="M782.970,983.345 L784.245,987.654" stroke-width="4.953" />
  <path class="dots" d="M782.970,983.345 L782.970,983.345 M784.242,987.655 L785.162,990.349" stroke="#fff" stroke-width="6.138" />
  <path class="bridges" d="M782.970,983.345 L784.245,987.654" stroke="#fff" stroke-width="1.911" />
</g>
```

The marker is two geometries, each drawn twice with round caps and joins, grey then white: the
grey layers' union under the white layers reads as one shape with one border of width `B`.

- `class="dots"`: one shape per group of platforms: a dot `M x,y L x,y` (a zero-length stroke,
  round-capped), a pill `M a L b`, or a blob of such segments sharing their ends; grey
  `stroke-width="2R"`, white `2(R − B)`. A pill runs through its platforms, so when a platform moves
  its pill follows it.
- `class="bridges"` (only when there are any): one polyline per bridge, `M p L … L q`, from one
  dot's centre along the walkway to another's; grey `stroke-width="T"`, white `T − 2B`.
- MUST: grey dots, [grey bridges], white dots, [white bridges], the white `d` equal to the grey,
  absolute coordinates to 3 decimals; the `<g>` carries `fill="none"` and nothing else of paint.

`data-platforms` lists one `<line-id>:x,y` per line in `data-lines`: that line's platform, on its
own drawn centreline. Take the real platform (OpenStreetMap `railway=platform` or
`public_transport=platform`, or the station plan), find its centre along the track, and project it
onto the drawn track. Circles are placed the same way.

- **The platform centre.** Use the platform way(s) beside the line's own track (search a couple of
  hundred metres along the line, not only next to the stop node) and take the midpoint of their
  extent along the track. A `public_transport=stop_position` node marks where the front of a train
  stops, often at one end of the platform: one stop alone put Beijing's Line 8 dots, 131 Seoul
  circles and 57 Guangzhou circles 3–13 units off. Use stops only where no platform is mapped, and
  then the midpoint of the two directions' stops when they are no more than a train length apart.
  At a main-line station take only the platforms the metro uses (OSM `subway=yes`). Watch for stale
  tags (Hangzhou's Pinglan Road stops still carried `proposed:railway=station`, 7 units from the
  platform). Record which source each station used.
- **How close.** A platform point lies within about 50 m (half a platform; Shanghai 2 units) along
  its track of the real platform centre, as placed through the map's frame (§11). Fit noise is
  about 0.5–1 unit, so when auditing, move a point only where two independent estimates agree, for
  example a local fit that leaves the station out and its chainage between its neighbours along
  the OSM route. A fit that includes the station itself pulls the estimate back to the drawn dot and
  hides errors of several units.
- **Offset tracks.** On a line drawn beside another (§4, Side by side), the platform point is the
  real platform centre projected onto the offset track: it moves perpendicular to the track by the
  offset (up to about `W/2` plus half the real separation) and keeps its position along it. Where
  two touching lines share a cross-platform island, project the same island centre onto each
  track, so the two points are exactly `W` apart (0.65 R): two overlapping dots under rule 2.

The shape is then built from the platforms:

1. **The reference line map decides where it has one.** For Shanghai, Tokyo, Shenzhen, Hangzhou,
   Guangzhou and Chengdu, the README's Wikimedia line map fixes each station's composition: lines it
   draws as one dot or pill are one shape, and lines it draws as separate dots (even touching or
   overlapping) are separate dots. The platform positions still come from OpenStreetMap. Lines and
   stations newer than the reference, and the other maps (Hong Kong's route map draws every
   interchange as one capsule, and Taipei follows this spec), use rule 2.
2. **Otherwise one shape only for shared track or a full stacked crossing.** Lines are one shape only
   where (a) they run on the same tracks through the station (Shanghai's Lines 3/4, Tokyo's
   Yurakucho/Fukutoshin), drawn as one pill across their offset, or (b) their platforms cross each
   other in plan, one directly over the other: one circle on the drawn crossing when both platforms
   are within `R` of it, else a short pill through the real platforms. Every other interchange is
   separate dots at the real platforms joined by a bridge, overlapping where they are close. That
   includes cross-platform pairs on their own tracks, side-by-side platforms, T and L layouts where
   one platform's end meets the other, and passages. Where the sources can't settle the layout, the
   platforms are separate dots joined by a bridge: one shape claims shared track or a crossing, which
   is not known (rule 3 may still join them). Seoul's Sinsa was a pill 1.44 R long down the
   Shinbundang track for that reason until 2026-10-03; its two platforms are about 175 m apart, now
   two dots and a bridge. A drawn crossing moves when either track is corrected, so re-check that
   both platforms are still within `R` of it.
   - A single shape never runs along a line between platforms that lie apart along it. A pill is
     either across lines drawn side by side (shared track, a cross-platform pair) or a short pill
     through a crossing; one whose axis follows a track for more than about `R` is two platforms
     strung out (Sinsa; Oido's shared-track pill, where Line 4's point sat 9 units past its real
     platform). This also limits rule 1: where a reference map's one pill joins platforms that lie
     apart along the street, draw separate dots and a bridge (Tokyo's Jimbocho, whose Shinjuku
     platform on B1 and Hanzomon platform on B3 lie end to end, about 375 m from end to end, joined
     through the gate level).
3. **Shapes closer than `0.4 R` are one shape, on every map.** After rules 1 and 2, separate shapes
   whose nearest points (dot centres, pill axes) are less than `0.4 R` apart still read as one
   lump even fully zoomed in (stations at their smallest), which looks like a drawing error, so
   they become one shape through the same real platform points: nothing moves, and the bridge
   between them goes. This overrides the reference map's separate dots too (Shanghai's Zhongshan
   Park, Madang Road). Shapes `0.4 R` or more apart read as two overlapping dots and stay separate,
   however much they overlap (Tokyo's Monzen-nakacho at 0.46 R): that "peanut" is the intended
   look. Measure the drawn shapes to 0.01 R (0.40 R stays separate: Chongqing's Zengjiayan) and
   re-run the test after every geometry edit, since moving a track moves its platforms: Shanghai's
   Middle Longhua Road went from 0.38 R to 0.56 R and is two dots again, while Guangzhou's Guicheng
   and Ruyifang merged. `check_map.py` checks it.
4. **Accuracy first, then the nicest drawing.** Every dot sits at its line's real platform centre
   and every bridge follows the real walkway. Make the drawing as nice as possible only through
   choices that move nothing (composition, bridge smoothing within the walkway). Separate dots
   whose real platforms nearly overlap are drawn overlapping: that is where they are. Never move a
   dot along or off its platform, shorten or extend a line, or straighten a bridge whose real
   walkway bends, to space or arrange a marker. (The spacing of separate stations under Placement
   below still moves some circles; it is a documented open exception.)
5. **Bridges.** Join the shapes as the walkways do: a polyline from one platform through the
   real passage (OpenStreetMap footways and corridors, station plans) to the other, one per pair of
   shapes (the shortest), also between touching dots, so it shows when zoomed in. Follow the
   reference line maps' composition (which platforms are joined, and where the passage runs, with its
   bends). Draw it straight when the walkway strays less than `W` from the straight line; leave out
   folds sharper than 120°. A bend near a dot is hidden under it at full size and shows when zoomed
   in. Bridges MUST NOT overlap each other or pass over another dot of the marker.

- MUST: every platform lies on its own line's centreline and inside the marker (`check_map.py`
  allows 0.5 units; `tests/interchanges.test.mjs` requires 0.01, so re-project after any track edit,
  §4).
- MUST: when the lines served change during a marker's life (a line arrives or leaves), the marker
  is one element per period, because its shape changes. Each element keeps the stem of the `id` and
  takes the period's start as its `--<YYYY-MM-DD>` suffix (§3); its label, `data-lines` and
  `data-logos` are clipped to the period. Periods with the same shape (a line renamed onto the same
  platform) stay one element.
- Platforms stay at their real positions, apart from the crossing point above and the sideways
  move onto an offset track. Don't move a platform, or a track, to tidy the shape; a long complex
  draws a long bridge.

**Connector (official out-of-station transfer, or an in-station link between differently named stations, §6): `<path>`**

```xml
<path id="walking-transfer-xujiahui" stroke="#8f959c" stroke-width="1.000" d="M2253.854,1243.789 L2244.438,1234.111" fill="none" inkscape:label="Xujiahui=2009_12_31-2010_04_07" />
```

- MUST: a single straight segment `M x1,y1 L x2,y2` from the centre of one marker (or one of its
  platforms) to the centre of the other. MUST have `fill="none"` and the connector stroke.
- Its label has the station name (or both names joined with `_-_`, e.g. `East_Tsim_Sha_Tsui_-_Tsim_Sha_Tsui`, read as "A - B" like the events) and
  exactly the period the transfer existed. Connectors don't get tooltips.

**Lines served: `data-lines`**

Every station marker (`<circle>` or interchange `<g>`) MUST carry `data-lines`: the lines that call at that marker,
written like a label but with the legend entry's `id` (§9) in place of the name:

```xml
<g id="station-minquan-west-road-92--2010-11-03" data-lines="r=2010_11_03,xinlu=2010_11_03-2012_09_30,o=2012_09_30" … />
```

- MUST: every `id` exists in `lines.json`, every interval lies within the marker's own dates, and the
  legend entry is active for the whole interval.
- `start` is the day that line began calling at the station, so a line that arrived later carries a
  later date. A line that stopped calling gets an `end`. A line that joins a station's interchange marker from a
  separate marker (§6) starts on the day of that change.
- Each marker lists only what applies while it is on the map: a station's circle form lists the line
  it had, and the interchange marker that replaces it lists its lines from the day it appears. Separate
  markers are separate stations even when they share a name, so each marker of a connector pair lists
  only its own lines (West Nanjing Road's three markers list one line each).
- The tooltip shows the active entries under the legend's current names, and the legend highlight
  uses them to light the stations of the chosen lines.

**Tooltip logos: `data-logos`**

Station markers name their operators in `data-logos`, using the label syntax, except that a date
on the marker's first or last day is left out: `op` covers the marker's whole lifetime, `op=-end`
runs from its opening until `end` and `op=start` from `start` until it closes. The only dates left
are handovers:

```xml
<g inkscape:label="Ningyocho=1962_09_30" data-logos="metro,toei" … >
<circle inkscape:label="Lo_Wu=1910_10_01-1911_10_05,Lo_Wu=1949_10_14" data-logos="kcr=-2007_12_02,mtr=2007_12_02" … />
<circle inkscape:label="Kkachiul=2012_10_27" data-logos="metro=-2022_01_01,incheon=2022_01_01" … />
```

Each key maps to an entry in the system's `operators` (§1). The tooltip shows the entries active
that day, in attribute order.

- A system with one operator omits the attribute; markers without it show the first operator.
- MUST: in a system with more than one operator, every station marker (circle or interchange) has
  `data-logos`, including those of the first operator.
- MUST: some entry is active on every day the marker is visible.
- MUST: every date falls strictly between the marker's first day and its final end, so the marker's
  own dates are never repeated. An operator that continues across a closure is one entry (Lo Wu),
  and adjacent intervals for the same key are merged.
- MUST: a handover is a map change. Every date on which a marker's logos change needs an
  `events.json` entry that describes it (§10), and playback stops on it like any other event.
  Handovers go in the data, not in code. Those recorded so far: KCR stations pass to MTR at the
  2007-12-02 merger (described by that day's renames); Shenzhen Line 4's first section passes to MTR
  on 2010-07-01; Seoul Line 7's Kkachiul – Bupyeong-gu Office passes to Incheon Transit on
  2022-01-01; Taipei's Circular Line passes to New Taipei Metro on 2023-05-23; Xi'an's Airport
  Intercity passes from Shaanxi Intercity Railway to Xi'an Metro on 2021-01-01. Lines that opened
  under their current operator (Shenzhen Line 13, Taipei's Sanying Line) carry it from opening.
- A key names an operator, not its corporate name at the time. A rename without a handover (Eidan
  → Tokyo Metro in 2004) is not modelled: the current symbol is shown throughout. Dated operator
  names would need a schema change.
- `check_map.py` checks the syntax, the coverage, that no marker dates are repeated and that every
  handover date has an event. The local `tests/station-logos.test.mjs` also checks that every key
  exists in `operators` and that multi-operator markers have the attribute.

Logos must be clean vector SVGs, mostly graphic, without embedded raster images or lettering-heavy
artwork. If no suitable operator symbol is available, use the system's own logo (Seoul's GTX-A
stations show Seoul Metro). Shanghai's Jinshan Railway and Airport Link use the suburban badge.
Record each logo file's source and licence in the system's section of
[timeline-sources.md](timeline-sources.md).

**Placement rules (geometry)**

- MUST: place each marker at its real position (accuracy wins over clearance). Keep it clear of the
  track of a line that doesn't stop there, at least `R + W/2` from that line's centreline
  (Shanghai: ≥ 10 units; 11–13 is comfortable), only by choosing among equally accurate positions:
  never move a marker or a track away from its real position for clearance, in either direction.
  Where the real platform sits on or beside a passing line, the marker stays there and the tooltip
  lists the lines that stop (Guangzhou's Huacheng Dadao beside Line 5, Chongqing's Nanping on Line
  10, Shenzhen's Renmin South over Line 1, Tokyo's Nijubashimae beside the Mita Line); likewise a
  track keeps its real course past another line's circle (Guangzhou's Line 10 past the Line 5
  Wuyangcun station). A marker or track moved for clearance in an earlier pass goes back to its real
  position (Chengdu's Financial City North, Beijing's Xinjie Kou, Taipei's Airport MRT past Beimen).
- Shanghai's Middle Huaihai Road (Line 13) sits in a gap between Lines 1 and 14 that is narrower than
  that clearance; it stays at its real position.
- When an interchange changes type on date `D`, end the old elements' labels at `D` and start the new
  ones at `D`. Keep marker positions stable across the change where the drawing allows.

**Separate stations close together.** These rules space the circles of nearby stations that are
not one interchange marker, so that they read as two stations. They are the one place where the
maps still move a circle off its real platform; see the open decisions at the end of this list.

- Out-of-station pairs (§6) SHOULD have centres `2R`–`3.2R` apart. At `2R` the circles just touch,
  which is used where the two tracks meet at the station; the connector is then hidden, which is
  fine. The spacing applies only to pairs whose real platforms would put the circles less than
  `2R` apart (overlapping, so the pair reads as one interchange): each circle slides along its own
  track until the pair is `2R`–`3.2R` apart. Pairs that stand further apart are real platforms like
  any other (MTR's East Tsim Sha Tsui ↔ Tsim Sha Tsui at `3.6R`; Shanghai's National Exhibition
  and Convention Center, South Pudong Road and Jinghong Road). A staggered circle keeps its offset
  from its platform centre, not its old coordinates, when its track is edited, and the track end
  moves with it.
  - Where the two lines **cross** at the station: put each circle on its own line, 11–15 units at
    Shanghai scale (1.4–2 R) from the drawn crossing, measured along the track, so neither sits on
    the other line (Hongkou Football Stadium 2007–2012, Longhua 2015–2018; Nanjing's Zhushanlu 13.6
    and 11.2 units). This applies only while the pair is out of station: before the second line
    opens, the first line's circle stands at its real platform, and a new circle element starts on
    the day the pair does (Beijing's Dazhong Si from 2024).
  - Where they run **parallel**: stagger the circles along the corridor so they read as two
    (Hongqiao Airport Terminal 2 2010–2017; Seoul's Noryangjin 2009–2015, each about 95 m from its
    platform).
  - Where one line **ends** at the other: the circles touch. Keep the terminating line's circle at its
    real terminus and stagger the through line's circle (Beijing's Sihui / Sihui Dong 2003–2007);
    staggering the terminus instead needs a stub past it or an extra track piece. If the ending track
    exists only for the out-of-station period, trim it so it ends at its own circle (Pearl Line at
    Shanghai South Railway Station 2000–2004).
- Two stations with **no** official transfer: two circles, no connector, clearly apart (a visible
  gap, ≥ `2.1R`) so they don't read as linked (People's Square / People's Park 1999–2000). Where the
  real platforms are closer, the circle slides along its own track until it is `2.1R` from the other
  (Xi'an's Mutasixi, 10 units (210 m) north of its platform, where the pair would be 1.4 R apart;
  Chongqing's Fotuguan, 6.3 units, beside Eling).
- **Open decisions (documented exceptions).** Rule 4 says a dot never moves along or off its
  platform; the two spacing rules above still move circles. The maps keep the status quo until this
  is decided, and they apply it differently:
  - Out-of-station staggers. Most maps slide circles as far as the spacing needs, up to about
    14 units: Shenzhen's Futian Checkpoint (9.5) and Hongling South (13), Guangzhou's Linhexi and
    Canton Tower (10–12), Pazhou and Wuyangcun, Chengdu's Terminal 2 of Shuangliu International
    Airport (about 14), Tokyo's Ueno-hirokoji, Awajicho and Shibuya (up to 7.7); Singapore's Newton
    moved toward its platforms until the circles just touch at `2R`, each about 0.95 W off its
    platform. Others keep each circle within its platform and accept pairs closer than `2R`:
    Chongqing slides a circle at most half its platform's length (Yangjiaping 1.56 R, Xietaizi),
    Xi'an's Epanggongnan stands on its platforms at 1.9 R, and twelve Shanghai pairs (out of station
    or with no transfer) touch slightly at their real platforms. The alternative is real positions everywhere, with the connector
    hidden under touching or overlapping circles.
  - No-transfer spacing moves Xi'an's Mutasixi and Chongqing's Fotuguan, while Chengdu's Shiyang and
    Shiyangdong (no transfer, about 250 m apart) overlap at their real platforms. The alternative is
    real positions everywhere, with the missing bridge and connector and the tooltips saying that
    there is no transfer.

## 6. Interchanges: which marker to draw

Draw each interchange the way the operator classifies it. That classification is dated, so it can
change over the station's life.

| On the ground (per the operator)                                                                                                                                          | Draw                                     | Examples                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| One station: passengers change lines **without passing a fare gate** (paid-area / in-station transfer)                                                                    | one **interchange marker**               | Mong Kok; People's Square from 2000-08-10; Loushanguan Road from 2024-12-31                                                             |
| Separate stations the operator **designates as a transfer**, but passengers must exit and re-enter (out-of-station / "virtual" transfer), with or without fare continuity | one **circle per station + a connector** | East Tsim Sha Tsui ↔ Tsim Sha Tsui; Shanghai Railway Station (Line 1 ↔ Lines 3/4) since 2008-06-01; West Nanjing Road (Lines 2, 12, 13) |
| Nearby stations with **no** designated transfer (different names, or not listed by the operator)                                                                          | circles, **nothing between**             | People's Square (Line 1) / People's Park (Line 2) 1999-09-20 → 2000-08-10                                                               |

- Inside an interchange marker, platforms are joined by bridges (§5), which stand for in-station
  walkways. A connector stands for a walk outside the station, or between differently named stations.
- The test is the operator's own classification: its list of out-of-station transfer stations, its
  station pages and signage, and dated announcements such as "passage opens on …". Physical distance
  doesn't count, and neither does how the official diagram happens to draw it.
- An operator app or station API that lists each station's transfer lines is a good test, and archived
  copies date it. Two nearby stations that list only their own lines have no designated transfer
  (Chengdu's Jincheng Plaza / Jincheng Plaza East). Operator network maps that mark exit-and-transfer
  links (出闸换乘, "non-paid area transfer") are good dated evidence too. An unpaid street passage
  between differently named stations is not a designated transfer unless the operator lists it
  (Shenzhen's Grand Theater – Hongling South and Dongmen – Laojie have no connector).
- A connector starts on the day the operator designates the transfer (its transfer list, or the start
  of through ticketing), which need not be the day both stations first exist: Tokyo's Korakuen –
  Kasuga dates from Eidan's list of 2000-12-12, not from 1972. Where that day can't be found, use the
  later opening and note the doubt (Tokyo's Asakusa).
- Separate fare systems count as out-of-station **within the primary system**. Shanghai Lines 3 and 5
  used separate tickets from Lines 1/2 until the network-wide one-ticket system on 2005-12-25, so
  Zhongshan Park, Xinzhuang and Shanghai South Railway Station are drawn as connectors until then.
- **Cross-system** interchanges are between the primary system and something with its own fare
  system and operator: KCR before the 2007 merger, Shanghai's Maglev, the Jinshan Railway and the
  Airport Link. Draw them like this (MTR precedent: Kowloon Tong and Mei Foo before 2007):
  - one interchange marker when both systems' platforms are in **one station complex** under one name, linked
    by internal passages, even though the fares are separate (Longyang Road and Pudong T1&2
    for Line 2 + Maglev);
  - separate markers + connector when they are **separate stations** and the operator designates an
    out-of-station transfer (Airport Link at Hongqiao T2 and Pudong T1&2);
  - one interchange marker from the day a paid-area link opens (Jinghong Road from 2025-07-05), or from opening if
    the transfer never leaves the paid area (Zhongchun Road, Line 9 ↔ Airport Link, from 2024-12-27).
- Two stations with **different names** linked inside the fare gates keep their own markers, joined by
  a connector, not one interchange marker: each keeps its name and real position, and one marker would merge
  distinct stations (§5). The event says `<A> - <B>: in-station interchange opens` (Tokyo's
  Akasaka-mitsuke – Nagatacho from 1979-09-21, Kokkai-gijidomae – Tameike-sanno from 1997-09-30).
- A connector appearing or disappearing, or a connector turning into an interchange marker, is a map change and needs an
  `events.json` description (§10).

Shanghai's dated classification history (from the operator's list, via the zh Wikipedia 上海地铁 and station
articles) is a worked example of what to look for:

| Station                                                                     | Out-of-station period   | In-station from |
| --------------------------------------------------------------------------- | ----------------------- | --------------- |
| Zhongshan Park (2 / 3)                                                      | 2000-12-26 → 2005-12-25 | 2005-12-25      |
| Xinzhuang (1 / 5)                                                           | 2003-11-25 → 2005-12-25 | 2005-12-25      |
| Yishan Road (3 / 4; 9 joined 3 in-station 2008-12-28)                       | 2005-12-31 → 2010-12-28 | 2010-12-28      |
| Hongkou Football Stadium (3 / 8)                                            | 2007-12-29 → 2012-10-21 | 2012-10-21      |
| Xujiahui (1 / 9)                                                            | 2009-12-31 → 2010-04-07 | 2010-04-07      |
| South Shaanxi Road (1 / 10)                                                 | 2010-04-10 → 2015-12-19 | 2015-12-19      |
| Hongqiao Airport T2 (2 / 10)                                                | 2010-11-30 → 2017-12-30 | 2017-12-30      |
| Longhua (11 / 12)                                                           | 2015-12-19 → 2018-12-30 | 2018-12-30      |
| Loushanguan Road (2 / 15)                                                   | 2021-01-23 → 2024-12-31 | 2024-12-31      |
| Jinghong Road (15 / Airport Link)                                           | 2024-12-27 → 2025-07-05 | 2025-07-05      |
| Zhongchun Road (9 / Airport Link)                                           | —                       | 2024-12-27      |
| Shanghai Railway Station (1 / 3, 4)                                         | since 2008-06-01        | —               |
| West Nanjing Road (2 / 12 / 13), Changqing Road (7 / 13), Caoyang Road (14) | since opening           | —               |
| South Pudong Road, NECC (nominal)                                           | since 2024-09-21        | —               |

## 7. Dates: what to record and when

**Openings**: a line, section or station appears on the first day the public could ride it,
whatever the service was called and however limited its days, hours, stops or riders. It is not
drawn before that day, and it stays through any pause between a preview and the regular opening
(see **The map only grows into an opening** below).

- Counts: public previews, open days and open houses with rides, free trial rides, experience weeks
  and voucher rides (试乘, 免费试乘, 体验周, including those that needed advance registration or a
  free ticket handed out to the public), sightseeing service (观光运营, 观光试运行), trial, simulated
  or initial operation (试运营, 试运行, 模拟运营, 初期运营), restricted-access service (tickets sold
  only against a work-unit letter, or only to organised groups or event-ticket holders) and regular
  service.
- Doesn't count: test running without passengers (通车调试, 不载客试运行), ceremonies and rides for
  VIPs, officials, the press or invited representatives only (通车典礼, a one-off ride for borough
  chiefs or relocated residents), small recruited inspection or monitoring panels, open days where
  stations can be visited but trains can't be ridden, completion or breakthrough (贯通, 封顶), and
  "structurally complete but not opened".
- **Record every notable event.** When a public preview came before the opening, `events.json` has
  both: the preview (`… public preview rides begin`, `… one-day open-house free rides`) and the
  opening (`… opens`), even when the opening changes nothing on the map because the preview already
  drew the line. Other recorded status changes are kept the same way (restricted access → open to all
  passengers, sightseeing → regular service). `opens` means regular service (including the 试运营 or
  初期运营 that is regular service in mainland China); anything else names its kind (§10).
- **The map only grows into an opening.** A line, section or station appears once, on the first day
  the public could ride it, and stays: the days between a preview (open house, trial rides,
  sightseeing service) and the opening are **not** drawn as a closure, however long the pause, and
  get no `… rides end` event. Markers follow the same rule (a new interchange marker stays one). The
  playback should read as construction finishing and the line opening, never as a line being
  demolished and rebuilt. Only when a preview was followed by more than a year without service
  (the section was effectively unfinished) is the preview left off the map entirely; the line then
  appears at its regular opening and the source notes mention the preview.

Examples:

- The MTR's 1979-09-30 open day ran straight into regular service, so the line appears on
  **1979-09-30** and **1979-10-01** is an `opens` event with no map change.
- Singapore's Downtown Line held a one-day open house on **2013-12-07** and opened on
  **2013-12-22**: it is drawn from 7 December onwards, and 22 December is an `opens` event with no
  map change.
- Huangpu Tram Line 2's Huangpu Library – Xiangxue Park preview ran from 2020-12-29 to 2021-01-03,
  then the line had no service until its regular opening on **2025-06-20**: the gap is over a year,
  so the preview is left off and the section appears on 2025-06-20.
- Beijing Line 1 appears on **1971-01-15** with restricted-access trial operation (tickets sold only
  against work-unit letters); the start of sale to everyone on **1972-12-27** is its own event.
- Shanghai Line 2 opened **1999-09-20** carrying organised visitor groups; regular service on
  **2000-06-11** is its own event, and the 2000-04-19 rename of its eastern terminus is another.

When the facts can't be established (for example, which stations an early sightseeing service
called at, or the first day of a preview), don't guess: show only what the sources support, keep
the date already recorded where it is disputed, and note the doubt in the system's source notes.

- A station that opened after its line (infill, or skipped at opening) gets its own date. Stations
  that have never opened are absent, even if the track passes them (Longju Road).
- A station opens when passengers could start or end a trip there. A stop where riders only stepped
  onto the platform to look around and reboarded is not an opening (Chongqing Line 2's intermediate
  stops from 2004-11-06; Nanjing's Sanshanjie from 2005-05-15).

**Closures**: `end` = the first day without service.

- Permanent closures, withdrawals and relocations are recorded. That includes planned ends of
  service that last until a later project, e.g. the Expo Line closed 2010-11-02 and reopened as part of Line 13 on 2015-12-19.
- **Temporary suspensions are omitted**: repairs, maintenance, accidents, incidents, weather,
  events, epidemics (COVID-19) and similar, after which service resumes at the same stations. The
  line didn't vanish, so the map shows it as continuous. The pause between a preview and the opening
  is treated the same way (see Openings).
- **Relocations / switchovers**: the old element ends on the day the new one opens. If the gap
  between them is under a month, collapse it (Zhangjiang High-Tech Park: elevated closed
  2010-02-14, underground opened 2010-02-24, so both change on 2010-02-24). Longer gaps where the
  service really was cut back are kept (Line 3 at Shanghai South Railway Station 2004-01-01 → 2005-10-15;
  Dongfang Road closed 2005-10-22 → reopened as Century Avenue 2006-10-28). A preview and its opening
  never have a gap at all (see Openings).

**Renames**: the date the new name took effect.

- Station renames are one element with two states. Line renames change the legend entry **and**
  every track of that line on the same date (Pearl Line → Line 3 on 2002-08-08).
- Only the English name matters. An English-only rename is a change (West Shanghai Railway Station →
  Shanghai West Railway Station, 2021-01-23). A Chinese-only rename that keeps the English name is not.

**Interchange changes**: the date the operator announced the passage opened or the transfer
rule changed (§6).

## 8. Scope: what goes on the map

A system follows **its own official network map**, so that every city is judged by the same test. A
line belongs to it if it passes either test, and is open today or is a closed line that belonged to
the network (KCR's Sha Tau Kok branch):

1. **On the official map.** The system's current official network map draws it as part of the
   network: in the legend, with its stations, in a line colour (even a lighter tint). Seoul's
   Metropolitan Subway map draws Korail's lines, AREX and GTX-A; Taipei Metro's map draws New Taipei
   Metro's lines and the Taoyuan Airport MRT; the MTR map draws the High Speed Rail.
2. **The operator's own.** The system's operator family or city runs or commissioned it, even where
   the map leaves it out: trams, people movers and gondolas (Songjiang and Nanjing trams, Bishan
   SkyShuttle, Ngong Ping 360, Toei's Toden Arakawa Line and Nippori–Toneri Liner) and outlying lines
   (Nanjing S4). The family includes predecessors (KCR, Eidan, Oji Electric Tramway), subsidiaries,
   joint ventures and contracted operators.

Not included, even if drawn:

- Lines the map shows only as connections: grey or outline lines, station icons, through-service
  bands or lines footnoted as "transfer indication only" (JR and private railways on the Tokyo
  subway map; Hangzhou's Hanghai Intercity and Shaoxing Line 1; Guangzhou's intercity railways).
- Separate insets for a physically disconnected system.
- Lines that have left the network: a line reclassified out of it, or whose transit service ended
  and never resumed, ends on the first day without regular service (Incheon Airport Maglev, 2022-07-14).

Any mode qualifies: metro, light metro, monorail, maglev, APM, tram, gondola. A system the app
presents as two cities includes both official networks (Guangfo: Guangzhou and Foshan).

Opening and closing dates follow §7.

Include:

- Every line that passes the tests above, with every station and every historical alignment.
- Temporary lines that carried the public (the Expo Line).
- Trams and light rail belonging to the system, as **tracks only, without stop markers** (MTR Light Rail,
  Songjiang Tram). Their interchange stations keep the heavy-rail markers, and MUST include the
  simplified line's id in `data-lines` from the day the interchange becomes available. This is what
  makes those stations appear in the line's tooltips, highlighting, search and station count.
  Keep the heavy-rail marker's name, identity and shape; don't add a duplicate tram stop or turn it
  into an interchange marker solely for a simplified service. This is an exception to the full interchange
  drawing rules in §6, following MTR Light Rail and Singapore LRT.
  - Start at the later of the two services' openings, or the actual transfer opening if later.
    Qinghu gains Longhua Tram on 2017-10-28; Guanlan gains it when Line 4 reaches it on 2020-10-28.
  - A differently named light-rail stop can be represented by its designated heavy-rail interchange:
    Longhua Tram's Xinlan by Guanlan, Skyshuttle's Longbei by Dongjiang Column Memorial Hall.
    Confirm the operator's transfer list; a nearby track or station alone isn't enough.
  - Membership alone does not draw the connection. Include passenger branches (Songjiang University
    Town) and shared routes in both line colours (Songjiang Trams 1/2 through Sports Center).
    Where a simplified line's real course does not already pass under the heavy-rail marker (within
    about `R` of its centre), adjust it locally, with a smooth taper, to meet the marker, including
    designated walking transfers (Pingshan Center; Longbei at Dongjiang Column Memorial Hall). Where
    it does, leave it on its real course (Seoul's U Line at Hoeryong and Sillim Line at Daebang and
    Boramae pass 5–11 units from the circle centres, inside the dots). Keep the dated membership; do
    not add a separate light-rail marker or walking connector. This is a schematic simplification,
    not a claim of an in-station transfer. Do not extend passenger branches into depots.
  - Elsewhere a simplified line follows §4 like any track: beside a metro line in one corridor it
    touches it (centres `(W + 0.4 W) / 2` apart) instead of running on top of it (Shenzhen's
    Skyshuttle leaving Pingshan, Nanjing's Hexi tram beside Line 2 and S3), and a street tram that
    crosses above a metro line at a shallow angle is drawn crossing at its real position (Chengdu
    Tram Line 2 over Lines 2 and 6).
  - Check every historical marker version covering that transfer period. Clip the membership to
    each marker's lifetime, just like any other `data-lines` entry (§5).
- Other modes that pass the tests (Shanghai Maglev, MTR Ngong Ping 360, Taipei Maokong Gondola),
  with their passenger stations. For gondolas,
  omit towers and non-passenger angle stations. Separate gondola and metro stations use
  separate markers and a walking connector (§6), as at Taipei Zoo.
- Geography: land and water fills, and nothing else.

Exclude:

- Planned, under-construction or never-opened lines and stations; depots, sidings, freight lines,
  connecting tracks.
- Lines that fail the tests above (e.g. Suzhou Metro at Huaqiao, Beijing Suburban Railway, JR).
- Small lines with no track connection, shared station or walking transfer to the rest of the network,
  which would appear only as an isolated fragment (Foshan's Gaoming Tram, Tokyo's Ueno Zoo Monorail).
  Record the exclusion in the system's source notes. The same applies to a period: a section of an
  included line that ran for a while detached from the network is drawn from the day it joins it,
  and that day's event says it had run on its own since its opening (Tokyo's Oji Electric Tramway
  Oji-yanagita – Akabane, open from 1926, drawn from 1932-12-01).
- Text, station names, line bullets, legends, compasses, scale bars, logos, inset boxes, notes,
  fare zones and district boundaries drawn in the SVG.

## 9. `lines.json` (legend)

```json
{
  "lines": [
    { "id": "1", "label": "Line_1=1993_05_28", "color": "rgb(227,0,43)" },
    {
      "id": "3",
      "label": "Pearl_Line=2000_12_26-2002_08_08,Line_3=2002_08_08",
      "color": "rgb(252,214,0)"
    }
  ]
}
```

- MUST: `lines` is an array of `{ "id", "label", "color" }`. Labels follow §2. `color`
  is any CSS colour. Shanghai uses `rgb(r,g,b)`, and `#rrggbb` also works.
- MUST: `id` is a short stable code of lowercase letters and digits (`erl`, `2`, `xinlu`), unique
  within the system. Station markers reference it in `data-lines` (§5). It never appears in labels.
- `"simplified": true` marks a line drawn without most of its stops (MTR Light Rail, Shanghai's
  Songjiang trams). Its tracks are exempt from the track-end rule of §4. The app ignores the field.
- MUST: at every moment, each visible track's name equals the name of a legend state active at that
  moment. That is how a track gets its colour, and how the legend highlight finds a line's tracks: a
  track whose name is not the legend's current name stays dimmed. A line rename therefore changes the
  legend label and every track label of that line on the same date, and a track that predates a
  rename carries the full name history clipped to its own dates
  (`KCR_British_Section=1910_10_01-1996_02_01,KCR_East_Rail=1996_02_01-2007_12_02,East_Rail_Line=2007_12_02`).
- Legend entries appear in the on-screen legend while they are active, in array order. Order them
  the way the operator does (usually by line number, then other modes).
- One entry per line with its official colour. If a line changed colour, split it into two entries
  with non-overlapping dates.

## 10. `events.json` (timeline text)

```json
[
  {
    "date": "1995-04-10",
    "descriptions": ["Line 1: Xujiahui - Shanghai Railway Station opens"]
  }
]
```

- MUST: an array of `{ "date": "YYYY-MM-DD", "descriptions": string[] }`, with dates unique and
  ascending, and at least one description each.
- MUST: **one entry for every date on which the map changes.** The only other dates allowed are
  openings and starts of regular service after a preview already drew the line (§7): every
  description on such a date says ` opens` or `regular service`.
  `check_map.py` enforces this. A map change is anything becoming visible or hidden, a rename, a
  circle becoming an interchange marker, a connector appearing or disappearing, or a station's operators
  changing (§5).
- MUST: describe only what the map shows that day, using the names the map shows **that day**.
- Descriptions within an entry are sorted naturally (so `Line 2` comes before `Line 10`). Use these templates:

| Change                                          | Template                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| section opens / closes (regular service)        | `<Line>: <A> - <B> opens` / `closes`                                         |
| first public rides are not regular service (§7) | `<Line>: <A> - <B> <kind> begins` (one day only: `<A> - <B> one-day <kind>`) |
| regular service follows a preview (§7)          | `<Line>: <A> - <B> opens`, even if the map doesn't change                    |
| another status change (§7)                      | `<Line>: <A> - <B> opens to all passengers` / `regular service begins`       |
| single station opens / closes                   | `<Line>: <Station> opens` / `closes`                                         |
| station or line rename                          | `<Old> → <New>` (`<Line>: <Old> → <New>` only if another station keeps Old)  |
| part of a line moves to another line            | `<Line>: <A> - <B> transfers to <Line2>`                                     |
| a station moves to a new site                   | `<Line>: <Station> relocates`                                                |
| paid-area interchange begins                    | `<Station>: in-station interchange opens` (two names: `<A> - <B>: …`, §6)    |
| out-of-station transfer begins / ends           | `<Station>: out-of-station interchange opens` / `closes`                     |
| a line stops serving a station                  | `<Line>: stops serving <Station>`                                            |
| operator handover (§5)                          | `<Line>: operation transfers from <A> to <B>`                                |

- `<Line>` is the legend name that day (`Line 2`, `Pearl Line`, `Maglev`, `Songjiang Tram 2`).
  `<A> - <B>` uses a spaced hyphen.
- `<kind>` names the service exactly (§7), for example `public preview rides`,
  `free trial rides`, `free experience week`, `sightseeing service` or
  `restricted service for work-unit ticket holders`. Use `rides begin` for plural
  kinds. The opening that follows is its own entry (`opens`), not a clause in the preview's.
- A short clarifier after a comma or in parentheses is allowed when the template alone would mislead:
  `Line 2: Longyang Road - Guanglan Road opens, with Zhangjiang High-Tech Park rebuilt underground`,
  `Yishan Road: in-station interchange opens between Line 3 and Line 9`,
  `… (old surface station)`. Keep it to one clause. Use these fixed forms for recurring cases:
  `…, initially bypassing <X>, <Y> and <Z>` for stations that open later (`…, with <X> unopened` if it
  has not opened); `…, completing the loop`
  for the section that closes a loop, and `<Line>: <A> - <A> opens, as a complete loop` for a line that
  opens as one; `(formerly <Old>)` for a station that reopens under a new name after a gap.
- An interchange marker that appears or grows because a new line opens there is covered by the line-opening
  description. So is a station gaining a simplified line (§8); a separate
  `<Station>: interchange with <Line> opens` may name it, with `(out of station)` for a walk-out
  transfer (no connector is drawn for a simplified line). A connector always gets its own interchange line (`out-of-station interchange opens`,
  or `<A> - <B>: in-station interchange opens` for §6's differently named pairs), even on a
  line-opening day, and so does every connector-to-interchange change.
- Never include: suspensions (§7), fares and ticketing (unless the rule changes an interchange's
  type, in which case describe the interchange, not the fare), planning or approval news,
  construction milestones, ridership records, timetable or service-pattern changes, rolling stock,
  incidents, or anything outside the map.

## 11. Sources and verification

**Source precedence** (highest first):

1. The operator: official site notices and press releases, station and line pages, official maps.
   Use web.archive.org for old notices.
2. Government transport agencies and contemporary major newspapers.
3. Local-language Wikipedia: line articles (opening tables, history), station articles (opened
   dates, former names, the `interchange` field, transfer history), and the system article's list of
   out-of-station transfers. These usually cite (1) and (2).
4. English Wikipedia (e.g. _Timeline of Shanghai Metro_). Use it for completeness and cumulative
   station counts. It's often a day off, or uses commissioning dates.
5. Fan wikis and aggregators, to find leads only.

When sources disagree, prefer the one that cites a dated primary source. Note the decision and the
losing claim in the commit message. For example, Line 3 opened 2000-12-26 (zh line article) and not
2000-12-27 (en timeline). An event date comes from the event, never from a citation's access date:
Shenzhen's line-name change had been dated 2013-10-23, the day an English Wikipedia editor accessed
the source, while the Weibo post it cites is from 2013-10-18. Weibo and Twitter post ids encode
their timestamp, which dates a post even when the page won't load.

For added geography, verify station coordinates and the route between them against mapped track
alignments or operator engineering maps. Match coordinate systems before placing them on the SVG:
OpenStreetMap uses WGS84; mainland Chinese maps commonly use GCJ-02. Check the conversion against
several existing stations across the area, then inspect riverbanks, islands and road corridors.
Smooth the verified alignment; do not invent it by joining station centres.

When the source artwork is itself geographic, fit an affine transform from projected coordinates to the
SVG on the line termini, then add a smooth local correction interpolated from every matched station
(Gaussian weights; exclude outliers). Project added lines, stations and water through the same
correction so they meet the artwork's own stations (Chengdu: 2.4 → 1.1 units median residual).

For a map drawn from scratch, project railway geometry, station coordinates and geography through
one metric projection. Historical OSM snapshots can recover retired alignments; check their actual
service dates independently, since an OSM edit timestamp is not an opening or closure date.

**One frame.** Each map has one transform from geographic coordinates to the SVG, recorded in its
source notes, and tracks, platforms and geography are placed and checked through it: the exact
projection for a map drawn from scratch (Beijing, Nanjing, Xi'an, Chongqing, Seoul), otherwise the
recorded fit. Where the artwork's geography is accurate, fit it first and use that fit for
stations and tracks too (Singapore: ICP of the OSM coastline onto the artwork's coastline strokes,
median 0.19 units). A fit to the drawn stations absorbs the drawing's own errors (it hid Singapore's
Tuas Link, drawn 10.9 W past its platform), so use one only for a schematic source, leaving out the
station being checked; the geography is then moved into that frame (Taipei, Background geography
below). Don't place or judge anything through a fresh global refit: it can differ by
about 1 W at the edges (Shanghai's Jinshanwei, 5.5 units), which then shows up as false offsets or
shifts whole branches.

**OpenStreetMap pitfalls.**

- Lines that opened recently are often still tagged `railway=construction` (Guangzhou Line 22's 2025
  extension): load a route's members whatever their tag.
- Route relations include tail and siding tracks past a terminus (Chongqing's Line 2 past
  Jiaochangkou, Singapore's Tuas depot tracks). They are not drawn, and must not steer a corridor
  offset or a terminus.
- Overpass `out tags geom` returns relations without their members; multipolygon water needs
  `out geom`.
- Layers can disagree (Tianjin's Haihe banks and its centreline differ by up to about 1 km): check
  imagery before realigning a drawn feature to one of them.

**Inspect at the app's scale.** The app's maximum zoom is 4 × the opening view, which is about
0.25 CSS px per unit on Singapore, 0.6–0.9 on Chongqing and Chengdu, 1.3 on Shanghai and 1.6 on
Shenzhen, so one gap is invisible on one map and a hairline on another. Judge slivers, corners and
seams in the app (Chromium and WebKit) at maximum zoom, and in static renders only with markers
thinned as there (`z^-0.4`, about 0.57 of full size); a render at many pixels per unit exaggerates
sub-pixel noise. Quote sizes in units and `W`.

### Background geography

The background is accurate to OpenStreetMap in the same frame as the network, includes the same
kinds of feature across the whole canvas, and has no broken or clipped rivers, specks or open seams.

**Preservation comes first.** Keep the original geography inside the original bounds of Hong Kong,
Shanghai, Shenzhen, Hangzhou, Guangfo, Taipei, Singapore and Tokyo. The baseline is the artwork
before the canvas/geography expansion (commit `c4fe500`), not an intermediate regenerated version.
Do not replace, simplify or remove those original paths for appearance. Correct them only against
mapped geometry, in these ways: paint the correction above the artwork as real geography
with its own outline (Singapore's `coast-fixes`, Taipei's `water-fixes`); remove an artwork shape
that has no mapped counterpart (Taipei's five pieces of water with no mapped water, 2026-10-03); and,
where the artwork and the network sit in different frames, move the whole geography layer with one
smooth displacement field into the network's frame (Taipei, 2026-10-03: artwork, earlier fixes,
extension and clip outline moved together, so every seam was kept). Correct administrative land shading is
required for every system and is an explicit exception to preserving paint colours. Modest, source-backed additions
are allowed, especially in sparse areas. Preserve existing water and coastline shapes at joins,
but paint added waterways above land and administrative shading so neither can hide their course.
Extend geography outside the old bounds and preserve the enlarged zoom-out canvas. Any unavoidable
join adjustment must be narrowly scoped and documented. Beijing, Chengdu, Chongqing and Nanjing
are exceptions: their newly created geography may be reworked. Reduce the first three's small-feature
clutter; give Nanjing useful river/lake context. The normalization rules below apply to **new geography
and these four exceptions**, not as permission to rebuild the eight established maps, except that
the inclusion rules apply inside the preserved artwork too, as additions above it (Shenzhen's
Yantian and Qinglinjing reservoirs, larger than lakes the artwork draws).

- Preserve accurate source artwork. Correct a coastline or border against mapped geometry, not by
  drawing a more plausible-looking outline. Government geographic data or OpenStreetMap extracts
  can supply coastlines, islands and river polygons; a regional extract is useful when individual
  queries fail or omit neighbouring territory.
- Fit geographic coordinates to the SVG using several well-distributed, verified control points.
  Check the fit locally around islands, riverbanks and coastal stations; one global fit can leave
  local errors in a schematic source map. Do not move stations or tracks to hide those errors.
- Geography and network share one frame (One frame, above). Measure that against the network, not
  against the artwork: where each line crosses each river, as a fraction of the way between its two
  stations, real against drawn; track-to-bank clearance along riverside stretches; and
  station-to-water distance. Art-to-OSM residuals can look small while the rivers sit several units
  off the network (Taipei's crossings were up to 10 units off). Taipei's correction was a
  moving-least-squares similarity fit on the station controls (Gaussian, about 650 m), tapered to zero
  away from the network; a translation-only field and a nearest-stations affine field were worse.
  Fit an addition to the adjoining drawn water before joining it (Guangfo's Tanjiang needed a
  (−1, +7) shift). Where a station dot sits on a drawn shore because the fits differ locally (Hong
  Kong's AsiaWorld-Expo, about 1 unit), report it; move neither the dot nor the shore to hide it.
- Coastlines and administrative boundaries serve different purposes: use coastlines for land/water
  and administrative boundaries to divide land colours. Administrative areas can include sea.
  Use actual river polygons for border rivers, not an invented gap or a fixed-width buffer.
  Shade land outside each system's named administrative area consistently across both the original
  canvas and expanded margins: Hong Kong SAR; Shanghai, Shenzhen, Hangzhou, Chengdu, Beijing,
  Chongqing and Xi'an city administrative areas (Xi'an's Xianyang sections run on outside land); Jiangsu province for Nanjing; Guangzhou + Foshan for Guangfo; Taipei + New Taipei +
  Taoyuan for the combined Taipei map; Tokyo Metropolis; Singapore; and Seoul Special City (not the wider metropolitan
  subway service area). Cross-boundary tracks
  remain visible on outside-coloured land. Administrative boundaries change fill only, without
  a coastline-coloured outline. Colour the existing land shapes rather than replacing their coastlines;
  sea, rivers and lakes keep their water colour. Use solid fills and boundary overlays, clipping
  to original curves where needed. Avoid full-map paint patterns: they make pan/zoom repaints
  expensive in WebKit, even when shared by only a few shapes. Check zoom performance in both
  WebKit and Chromium, at wide and close scales with the latest network visible.
  Where verified coastal wetlands/tidal flats lie inside the source coastline, distinguish them
  from opaque dry land with a subdued, unoutlined surface. Do not infer dry land from seawalls,
  low-tide imagery or a coarse coastal polygon alone; retain genuine reclaimed land.
- Use comparable shoreline detail inside and outside the administrative boundary. Coarse county
  polygons are not a substitute for physical coastlines. Dissolve adjoining land before outlining,
  snap numerical seams to output precision before simplifying, and draw each physical shoreline
  once. Tiny gaps between district/county datasets must not become outlined strips of water.
- Land of another country is outside land like any other: it keeps its coastline and bank strokes,
  and strokes are not cut at international borders (Singapore's Johor and Riau Islands, Seoul's
  North Korea). A fill-only look for foreign land was tried and rejected.
- Do not outline water-area polygons lying wholly in the sea: the sea layer already covers them.
  OSM can represent named marine areas with approximate circles whose edges are not shorelines
  (for example Rocky Harbour near Sai Kung). Check geography against the combined sea and inland
  water layers; testing inland water alone can incorrectly reward these duplicate overlays.
- Check conflicting source tags before treating an area as permanent water. In particular,
  `natural=water` with `landuse=farmland` and `intermittent=yes` can describe a flood-retention
  field, not a lake. Keep independently mapped river channels and reservoirs within it;
  do not reject all intermittent waterways or leave fragments of the removed field outline.
- Assemble complete coastline ways into closed land polygons, preserving islands and holes. When
  using OSM coastline direction to identify land, account for SVG's downward-pointing y-axis.
  Simplify with topology preserved and a tolerance appropriate to the map's scale; keep real angular
  quays and reclamation edges. Recheck for self-intersections after rounding coordinates.
- Reclamation newer than the artwork is land, painted above the artwork rather than left as sea
  (Singapore's Tuas Port, Changi East, Pulau Tekong, Forest City): take OSM land minus OSM inland
  water inside the artwork's water, drop coastline-offset slivers, grow the patch about 2.5 units into
  the old land, fill it in the land colour of its side of the border, cover the old shoreline under
  it with a non-scaling stroke in that colour (about 3 px: at the overview a 1 px stroke is wider
  than the overlap), and stroke the new shoreline as coastline. Don't let narrow or missing OSM river
  polygons erase rivers the artwork draws.
- Fix an error in the outline itself; never paint a shape over it. Chongqing had a separate fill
  over a slit in the Yangtze and a land-coloured rectangle over a spike, both now fixed in the
  outline. Over preserved artwork the correction is real geography (above); the only cover is the
  seam stroke below.
- For a geography-only edit, keep tracks, markers, connectors, labels and their coordinates unchanged.
  For an explicit canvas expansion, change the root `viewBox` and preserve the original framing in
  `initialBounds`; do not translate or rescale railway paths. Extend mapped geometry past all four
  new edges. Never stretch the old edge, leave an old rectangular clipping seam, or fill unknown
  territory with guessed land/water.
  Where the clipped original artwork leaves an anti-aliased seam along its old edge, cover it with a
  thin non-scaling stroke in the fill colour on each side (sea, outside land or own land), stopping
  short of every shoreline or bank stroke that crosses the edge (Singapore, Tokyo, Hong Kong).
  Where the expanded geography meets the clipped artwork, banks continue without a step: reshape
  the expanded water over 12–25 units outside the clip edge so it starts from the artwork's banks,
  tangent-continuous (Guangfo's `seam-joins`), and give a land patch the colour of the land beside
  it (the administrative edge often follows the old bank). The land backing matches the clip
  exactly. Seams depend on the renderer: check them in the app in Chromium and WebKit at several
  zooms (a step of 3 grey levels along a one-pixel row shows on a hi-DPI screen), and follow a river
  that crosses the edge obliquely along its bank rather than comparing fixed points either side.
  Check the final painted result on both sides of old canvas edges and administrative borders.
  A continuous source path can still be hidden by a land backing or a later land shape. Trace
  depicted rivers through name changes and confluences; expose only the missing continuation,
  without duplicating existing banks or adding unrelated tributaries. Do not mistake small
  source-to-artwork offsets for missing rivers.
  Check alternate/English names and adjoining source ways: a name filter alone can drop part
  of the same river. Include substantial side channels around river islands even when their
  names differ from the main river; otherwise an island can incorrectly become mainland.
  At confluences, check both the water fill and the painted shoreline;
  touching fills are insufficient if an old bank stroke still crosses the mouth. Draw only
  exposed banks around an added tributary, keeping the original geometry intact.
  Check contextual railway continuations too: a track previously cut at the old canvas edge
  must follow its mapped alignment beyond the new edge. Do not extend actual termini or add
  out-of-system distance to `data-km`.
  Inspect both themes, close-up shorelines and railway alignment; the map checker alone does not
  validate geographic accuracy.
- Normalize detail at the **whole-network overview**, not at the SVG's native coordinate scale.
  At a 1440 × 900 reference viewport, compute `scale = max(1440 / viewBox.width,
900 / viewBox.height)`. A starting threshold for isolated lakes/reservoirs is
  `150 / scale²` square SVG units, with important urban landmarks exempted. Measure the **whole
  source feature before clipping**, so the visible edge of a large lake is retained. Never use
  area-to-perimeter ratio to reject lakes: it wrongly removes reservoirs with long branching arms.
  Select features at overview scale, but retain bank detail for the opening view: a starting
  simplification tolerance is `0.15 / initialScale` SVG units, using the original opening bounds
  to calculate `initialScale`. Retain source bends rather than inventing extra vertices. Inspect
  at maximum zoom too. These are editorial defaults, not a substitute for checking actual features.
  Check disconnected bank fragments against adjoining source ways, including unnamed reaches;
  do not bridge real dams, gates or covered channels simply because their ends are close.
  Retain the fitted coastline and its existing simplification scale. Reassess inland-water detail
  at the current overview when explicitly reducing clutter; older detail thresholds need not be
  preserved. Omit tiny isolated offshore islets below roughly 4 overview pixels² unless relevant
  to a station or landmark. Never remove a substantial lake merely because only its edge is visible.
- Select principal river corridors explicitly, including alternate/local-language names, upstream
  connections and substantial navigable canals. Match their bank polygons spatially as well as by
  name: an unnamed bank section still belongs to the same river. Keep all those sections, union
  adjoining banks, then simplify. Preserve islands/holes and channels through confluences. Omit
  minor irrigation networks as features; do not create gaps by filtering pieces of a principal river.
  A compound bank relation may contain a whole drainage network: intersecting a selected river
  does not make every attached side branch important. Retain broad bank areas and measured banks
  along the selected main course, pruning narrow side drains without widening the river. Apply
  that pruning only to river/canal banks, not to branching lakes and reservoirs.
- Use mapped banks wherever available. A thin mapped centreline symbol is acceptable only for
  missing-bank stretches; do not buffer the entire river over existing banks and change their width.
  Document symbolic stretches separately from measured banks. Do not invent border rivers.
- Inclusion is consistent across the canvas, inside the preserved artwork as well as outside it.
  Check what the rendered map shows, not what the data holds: Hong Kong's Tai Lam Chung Reservoir
  was in the inland-water layer but hidden under the original land fills. A river of a width class
  the map draws elsewhere is drawn too (Chongqing's Qijiang, 124 m, beside the drawn Yulin, 103 m).
- No river stops abruptly. Draw a principal river along its whole mapped course, whatever the
  `waterway` tag (`stream` reaches included), through unnamed connecting ways and upstream name
  changes, to its source, a confluence, the sea or the canvas edge; stop only where the mapped course
  stops or at a real covered channel. A gap below a dam usually means channel polygons were dropped
  (Chengdu's Fu River). A piece that can't be joined to the rest along a mapped course reads as a
  broken river: drop it and record that (Xi'an's upper Zao, Chengdu's Qiuxi). Check also where the
  artwork's own water ends: Shanghai's 竖潦泾 stopped in a flat cut 240 units inside the canvas.
  Useful tests: sample every named OSM river centreline against a 1-unit raster of the drawn water
  and list rivers with an undrawn run between two drawn ones (Hangzhou's broken canals); compare how
  much of each named river is drawn (Chongqing's Fu, 74 %); list water polygons that end more than
  about 10 units wide inside the canvas, away from other water (Guangfo's Tanjiang).
- No specks or cracks. The islet threshold (about 4 overview pixels²) covers islands inside rivers
  and lakes too: under the 1 px bank stroke a sub-unit hole draws as a grey speck at every zoom
  (Xi'an dropped 126). Holes thinner than about 0.35 units (2 × area / perimeter), slivers under
  about 0.8 units wide and spikes sharper than a few degrees are simplification artefacts, unless
  they are real piers, dams or mapped tails (Tokyo's piers and Nanjing's needle-tipped lake tails
  stay); trim them with a local morphological opening rather than a global one.
- Compare retained lakes and principal banks against the projected source polygons, not just the
  finished map's appearance. Check missing area, holes, shoreline displacement and continuity at
  clipped edges. Compare duplicate relations across adjacent extracts and verify that the extracts
  cover the expanded canvas. A small visible fraction of a lake is not evidence of a misplaced lake.
- Review the opening view and whole network in both themes. Background detail must remain subordinate
  to railway lines. Check mapped station/shoreline relationships as well as overall appearance.
- Check 1280 × 720, 1280 × 800, 1366 × 768, 1440 × 900 and 1536 × 864 with Stats and Changelog
  expanded and the line legend visible. At minimum zoom, latest-date tracks and markers must fit
  in the unobstructed area, with clearance from panels, controls and the footer. Merely fitting
  inside the viewport or hiding the panels with full view is insufficient. Check constrained pan
  extremes too, without exposing canvas edges. Preserve the opening transform at these sizes and
  on mobile; verify maximum zoom, search zoom and resize behavior separately. Prefer changing
  canvas bounds to adding new runtime camera behavior when the existing zoom logic supports it.
- Record the dataset, snapshot date, attribution, coordinate fit and simplification choices in
  [timeline-sources.md](timeline-sources.md). State whether the background is present-day geography
  throughout playback; modern coastlines do not establish historical reclamation boundaries.

**Procedure**:

1. From the timeline article, list every opening, closure and rename. That's the completeness baseline.
2. Confirm each date in the local-language line article, then each station's own article (stations
   opened late, former names, relocations).
3. For every interchange, find its classification history (§6): the operator's current list of
   out-of-station transfers, the "formerly out-of-station" list, and each station's transfer
   section. Separate-ticketing eras count as out-of-station.
4. Apply the rules of §7, especially "appears on the first day the public could ride it" and "omit suspensions".
5. Edit labels, then run `npm run check-map <key>` until it prints `OK`. Update
   `events.json` until the 1:1 check passes.
6. Look at the result. Render every change date and the day before, zoomed on each interchange that
   changed. Confirm that every marker sits on its track at its real platform (beside or over a line
   that doesn't stop there, if that is where the platform is), that every platform sits on its own
   line inside its marker, that every terminus ends on its own platform, and that out-of-station
   pairs read as two stations. Check the tracks against §4 (course, side by side, joints) at the
   app's maximum zoom.
7. Where the timeline article gives cumulative station counts, spot-check the number of visible
   station markers on a few dates.
8. Run `npm run lint` and `npm run build`, then open `/<key>` and scrub the slider across the whole range.
   There must be no console errors.

## 12. Cleaning a source map

Source maps (Wikipedia SVGs, operator PDFs) need converting to this contract:

1. **Delete** all `<text>`/`<tspan>`, `<title>`, `<desc>`, legends, compasses, logos, notes, insets,
   `<image>`, filters, masks, clip paths, hidden layers, and style rules nothing uses.
2. **Inline** `<defs>`/`<use>`/`<symbol>`: every station marker becomes its own `<circle>` or interchange `<g>`
   per §5. Station symbols drawn as `<path>`, `<ellipse>` or `<polygon>` become circles or interchange markers.
3. **Bake transforms**: no transforms at all inside `lines` or `stations`.
4. **Flatten** into the three layers of §3 (`geography`, `lines`, `stations`) inside `zoom-layer`.
   Move all paint to the layer groups as §3 shows.
5. **Split tracks** at every date boundary (§4). Bring each track onto its real course, make termini
   end on their platforms, and draw shared corridors as touching parallels (§4).
   If you traced centrelines from filled outlines, look for zig-zags. Railway-style lines drawn with an
   offset box at each station leave a jog at every station, like the Jinshan Railway did. Delete the jog
   vertices: two opposite turns over a short segment, within a few units of the straight line. Then
   re-project the stations. Simplify every track to fewer than 256 straight segments (§4).
   Design artwork often draws lines as **outlined strokes**: a closed filled outline whose two sides are
   offsets of the original centreline, joined by round caps (two quarter arcs of radius `W/2`). Recover the
   centreline exactly instead of tracing it: split the outline at the two caps, take the midpoint between
   each point of one side and its nearest point on the other, and check every centre point lies `W/2` from
   the outline (Chengdu). A shared corridor drawn as two half-width stripes becomes full-width parallels
   (§4); fade the separation out where the two lines cross, because the push direction flips there.
6. **Rebuild markers** per §5 for the chosen `W`: put every circle at its real platform centre on its
   track, and build each interchange from its real platforms. The source's own marker positions and
   capsules are not evidence of where a platform is.
7. **Label everything** per §2 and §7, then build `lines.json` and `events.json`.
8. Round coordinates to 3 decimals, and check that every `id` is unique.

## 13. Checklist

- [ ] Assets in `src/assets/<key>/` (including `preview.svg`), entry in `systems.ts`, URL in `public/sitemap.xml`; Home links and date bounds are derived automatically.
- [ ] `zoom-layer` › (`geography`) › `lines` › `stations`; only labelled paths, circles and interchange groups; marker paint on the group; no text/title/defs/use outside `geography`.
- [ ] Every label matches §2. Names are the verbatim English names of that period.
- [ ] Sizes follow §5. Circles and platforms are on their tracks at their real platform centres (within about 50 m), every platform is inside its marker, and markers sit at their real positions (clearance from lines that don't stop there only where it costs no accuracy; the separate-station spacing of §5 is the documented exception).
- [ ] Interchange shapes follow §5 rules 1–3, re-run after the last geometry edit: no two shapes of one marker closer than 0.4 R.
- [ ] Tracks follow §4: on their real course; lines sharing a corridor touch exactly (or keep a documented spacing), with no hairline gaps or partial overlaps; crossings where the real lines cross; joints exact and tangent-continuous; no tiny leftover segments; every terminus ends on its own platform, with no stubs; `data-takes-over` pieces lie exactly on their parents.
- [ ] Interchanges follow the operator's dated classification (§6), with connectors for out-of-station periods and for differently named stations linked in-station.
- [ ] Lines are drawn from the first day the public could ride them, previews included (not test runs, ceremonies or station-only open days); a preview and the later opening are separate events, the line stays on the map from the preview (no gap, no `… rides end` event; a preview followed by over a year without service is left off), suspensions are omitted and only relocation gaps under a month are collapsed (§7).
- [ ] Every track's name matches a legend entry at every moment (§9).
- [ ] Every marker has `data-lines` with legend ids, inside its own dates (§5).
- [ ] In a multi-operator system every marker has `data-logos`, and every handover has an event (§5).
      Logos are clean SVGs, and their sources and licences are recorded in timeline-sources.md.
- [ ] Every simplified line's designated heavy-rail interchanges list that line in `data-lines`,
      from the correct transfer dates; selecting the line shows those stations (§8).
- [ ] Every track has `data-km`, and each line's present-day sum equals its published length (§4).
- [ ] Caps follow §4: the `lines` layer is `butt`; `stroke-linecap="round"` only on tracks of `simplified` lines and tracks with `data-continues`.
- [ ] `events.json` has one entry per change date and none otherwise, using the §10 templates.
- [ ] Geography follows §11: in the network's frame, the same kinds of feature across the canvas, no river that stops abruptly, no specks, seams joined, checked in the app.
- [ ] `npm run check-map <key>` prints `OK`. The rendered checks (§11 step 6) look right. `npm test`, `npm run lint` and `npm run build` pass.
- [ ] New sources and system-specific methods or limitations are recorded in
      [timeline-sources.md](timeline-sources.md). Reusable techniques and lessons from the work are
      added to the relevant section of this spec (or an existing applicable skill), so future systems
      benefit without repeating the investigation. Keep these notes concise; do not duplicate rules
      or turn one system's numeric choices into universal requirements.

## MTR notes

- Light Rail is drawn as a simplified network: only its four heavy-rail interchanges are markers.
  Tracks are split by opening stage, without modelling individual service routes or stop renames.

MTR's historical coverage and outstanding evidence (Sha Tau Kok, early KCR halts, Light Rail
stages, High Speed Rail) are recorded in [its source notes](timeline-sources.md#hongkong).

## Appendix: `check_map.py`

The checker is [`tests/check_map.py`](../tests/check_map.py); run it from the repository root:
`npm run check-map shanghai` (or `python3 tests/check_map.py shanghai`). It checks
structure (unique ids, connectors before markers, the interchange layers of §5), labels, station identities,
legend coverage, `data-lines`, `data-logos` intervals, `data-km` and the segment limit of §4. It
checks the caps rule of §4 (a butt `lines` layer; a round cap on a track exactly when one of its ends
may lie away from a marker) and that every track starts and ends inside a marker, as drawn fully zoomed in (or meets other
active track of its line, or runs off the `viewBox`, or belongs to a line marked `simplified`, or
is marked `data-continues`). It
compares change dates, including operator handovers, with `events.json` (an event date without a
map change must record an opening or start of regular service, §10), and prints each line's
present-day length to compare with the operator's figure. It doesn't check that `data-logos` keys
exist in `operators` (the local logo test does). Of the marker geometry it checks that every circle
lies on each non-simplified line it serves, that every interchange's platforms match its `data-lines`
and lie on their own lines inside the marker, and that no two shapes of an interchange are closer
than 0.4 R (§5 rule 3). §11 step 6 covers the rest: real platform positions, termini on their own
platforms, and the track rules of §4.
