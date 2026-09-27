# Map data specification

This is the contract for every metro system in this app. Follow it exactly when adding a system,
converting a source map, or editing dates. `MUST` means the app or the checks break without it.
`SHOULD` means it's the house style, and you need a stated reason to deviate.

Reference implementations: Shanghai (`src/assets/shanghai/`) is the model for new systems. MTR
(`src/assets/hongkong/`) is the original, and its known deviations are listed in
[Legacy MTR differences](#legacy-mtr-differences).

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
  <logo>.svg           one logo per system shown in tooltips
```

- Name logos after their operator or network, e.g. `shanghai-metro.svg`, `toei-subway.svg` or `mtr.svg`, rather than `metro.svg`.
- `<key>` is a readable lowercase place name: `hongkong`, `shanghai`, `taipei`, `singapore`, `tokyo`, `shenzhen`, `hangzhou`, `guangfo`, `chengdu`, `beijing`, `nanjing`, `chongqing`, `xian`, `seoul` or `newyork`. Use the same key for the folder, `systems` entry and URL (e.g. `/shanghai`); no separate key field.
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
[New York's three provisional transfer dates](timeline-sources.md#newyork). They don't change
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
  `(elevated)`, `*` or line numbers; use the element `id` for disambiguation.
- Dates are local calendar dates as the operator announced them. They are parsed as UTC midnight.
  Don't shift them for time zones.
- Station operators are not part of the label; they go in `data-logos` (§5).

## 3. SVG document structure

Shanghai's `map.svg`, in outline. Anything not shown here doesn't belong in the file.

```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     viewBox="-3937 -669 12175 7204" width="1600" height="989" version="1.1" style="background:#f6f6f3">
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
    <g id="stations" fill="#fff" stroke="#000" stroke-width="2"
       inkscape:groupmode="layer" inkscape:label="station_markers">
      <path id="walking-transfer-…" d="M… L…" fill="none" inkscape:label="…" />   <!-- connectors first -->
      <circle id="station-…" data-lines="…" cx="…" cy="…" r="6.325" inkscape:label="…" data-logos="…" />
      <rect id="station-…" data-lines="…" x="-6.325" y="-12.325" width="12.650" height="24.650" rx="6.325"
            transform="translate(2249.088,1238.967) rotate(-44.6594)" inkscape:label="…" data-logos="…" />
      …
    </g>
  </g>
</svg>
```

- MUST: the `xmlns:inkscape` namespace, because labels are read with `getAttribute('inkscape:label')`.
- MUST: a `viewBox` covering the complete drawing and geographic margin; its origin may be negative.
  It sets the minimum zoom and pan bounds. `initialBounds: [width, height]` in system config defines
  the original `(0, 0)` framing rectangle; `initialView` positions the opening view within it. Keep
  these separate so extending the canvas does not change the opening view or maximum zoom.
- MUST: `<g id="zoom-layer">` wraps everything. Zoom and pan transform this group.
- MUST: `<g id="lines">` contains **only** `<path>` elements, and every one has a label. The app animates
  every child and reads every label, so an unlabelled element breaks it.
- MUST: `<g id="stations">` contains **only** `<circle>` (station), `<rect>` (interchange capsule) and
  `<path>` (connector) elements, every one labelled. No nested `<g>`, no `<use>`, no `<text>`.
- MUST: paint for markers and connectors lives on the `stations` group (`fill`, `stroke`, `stroke-width`),
  not on each element. The app scales markers on hover, so per-element sizes must stay as specified.
- MUST: draw order is geography → lines → stations; inside `stations`, connectors first so markers sit
  on top of them.
- MUST: geography uses one palette across systems: the operator's own land is the off-white page
  background `#f6f6f3` (`style="background:#f6f6f3"` on the root, no fill drawn; the app's `--color-paper`
  token is the same value), water is `#dde6ed`, and land beyond the operator's territory is `#eceeef`
  (Shanghai's neighbouring provinces, Shenzhen). Water shapes carry a one-pixel coastline,
  `stroke="#c0cfd9" stroke-width="1" vector-effect="non-scaling-stroke"`, which stays hairline at every
  zoom. A source that only outlines the land (MTR) gets a full-`viewBox` water path first (no stroke) and
  its land filled `#f6f6f3` on top, with the coastline on the land shapes instead.
- MUST NOT: `<title>` or `<desc>` anywhere, because browsers show them as tooltips on top of the app's.
  Also no `<text>` labels (names come from labels and tooltips), no `<defs>`/`<use>`/`<symbol>`, no
  `<image>`, no filters, masks or clip paths, no `scale()`/`matrix()` transforms. The one exception is
  inside `geography`, which the app neither animates nor reads: preserved source artwork keeps its
  nested transforms and is clipped to its original canvas by a `<defs>` clip path (§11), and a shape
  drawn twice may be reused with `<use>` (New York's shared land and shoreline). Nothing in `lines` or
  `stations` may use them.
- Inkscape metadata (`sodipodi:namedview`, `<metadata>`) is harmless but unnecessary; new files SHOULD omit it.
- `id`s MUST be unique. They SHOULD be descriptive:
  - tracks: `<line-slug>--<from-slug>--<to-slug>--<YYYY-MM-DD opening>`, e.g. `line-2--guanglan-road--longyang-road--2010-02-24`;
  - markers: `station-<name-slug>[-<suffix>]`, e.g. `station-xujiahui-line-9`;
  - connectors: `walking-transfer-<name-slug>[-<suffix>]`.

  If you change a track's opening date, change the date in its `id` too.

- Marker IDs also define search identity. The part before `--` is the stable station ID;
  an optional `--<YYYY-MM-DD>` suffix identifies a replacement marker by its first appearance.
  For example, `station-quarry-bay` and `station-quarry-bay--1989-08-06` represent the same
  station before and after an interchange upgrade. Keep the stem through renames; display names
  still come only from the dated labels. A marker with no `--` uses its entire ID as its identity.
- Replacement markers for one station MUST share a stem and MUST NOT overlap in time. Separate
  stations MUST have different stems, including namesakes and out-of-station transfers (§6).
  West Nanjing Road's Line 2, 12 and 13 stations therefore have three identities; the Line 2
  marker's replacement keeps the Line 2 identity. When separate stations become one capsule,
  continue the earliest station's identity and retire the other separate identities. Their
  historical search results remain available. Search groups by identity **and historical name**,
  showing the first date that identity used the name, without shortening or rewriting labels.

## 4. Tracks

- A track is one `<path>` per **line segment with its own dates**: split a line wherever a stretch
  opens, closes, is rerouted or changes name on a different date from its neighbours. Each segment
  runs station-centre to station-centre along the drawn route.
- MUST: a track has fewer than 256 straight segments (`L` commands). WebKit restarts the dash
  pattern every 256 line segments, so a longer polyline draws in as several pieces at once in Safari.
  Simplify dense polylines by dropping vertices (Douglas–Peucker at ~0.05 `W`, endpoints kept);
  Bézier curves don't count.
- MUST: a terminus segment ends exactly at the terminus marker's centre. It must not stick out beyond it.
  `check_map.py` enforces it on butt-capped systems for every track end: inside a marker present at
  every moment of the track's life (markers move when a station is rebuilt), or on another track of
  the same line (a branch junction, a loop closing on itself), or outside the `viewBox`, or on a line
  the legend marks `simplified` (§9). MTR's round caps let a
  track overshoot its terminus marker on purpose; the cap makes the end look deliberate.
- A segment that existed only for a period (e.g. an old alignment) gets its own path with an end
  date. Its replacement is a separate path that starts on the day the old one ends.
- Shared track (two lines running through the same stations) SHOULD be drawn as parallel offset
  paths, one per line, 3.5–5 units apart at Shanghai scale.
- SHOULD: use smooth, tangent-continuous Bézier bends rather than chains of angular corners.
  Round bends locally, keeping the route close to its source geography (normally within one track
  width `W`). Preserve station alignment, historical segment endpoints, branch junctions and spacing
  between parallel routes; check the resulting curves at historical dates as well as the present.
- Width: every metro track uses the width `W` set on the `lines` group (Shanghai `W = 5`). Trams and
  light rail use a thinner per-path `stroke-width`: Shanghai trams use 2 (`0.4 W`).
- Caps: set `stroke-linecap` once per system on the `lines` group. Shanghai uses `butt` and MTR
  uses `round`. Joins are `round`.
- Colour: the app colours each track from the legend entry whose name matches the track's name at
  that moment (§9). Also put the same colour on the path as `stroke="#rrggbb"`. It's the fallback
  and it makes the file readable in an editor.
- Dashes: set `stroke-dasharray` on the path itself (e.g. MTR's shared Airport Express section).
  The app reads it at load and restores it after the draw-in animation.
- MUST: every track carries `data-km`, its route length in kilometres to one decimal
  (`data-km="4.7"`). A line's length at any date is the sum over its tracks visible then, so the
  values of a line's tracks visible at `maxDate` MUST add up to the operator's published route
  length for that line. A branch with its own legend entry counts separately, and a track's value
  never changes when the line is renamed.
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

## 5. Station markers and connectors

All sizes derive from the track width `W`:

| Quantity                                  | Formula                       | Shanghai (`W = 5`) | MTR (`W = 1.5`) |
| ----------------------------------------- | ----------------------------- | ------------------ | --------------- |
| marker radius `r`                         | `1.265 W`                     | `6.325`            | `1.897`         |
| outline (`stations` group `stroke-width`) | `0.4 W`                       | `2`                | `0.6`           |
| capsule width                             | `2r`                          | `12.650`           | `3.795`         |
| connector stroke                          | the outline width (inherited) | `2`                | `0.6`           |

**Station (one line or one platform complex on one line): `<circle>`**

```xml
<circle id="station-hengshan-road-7" data-lines="1=1995_04_10" cx="2290.083" cy="1184.699" r="6.325" inkscape:label="Hengshan_Road=1995_04_10" data-logos="metro" />
```

- MUST: the centre sits on the track centreline (within 0.5 units).
- A station that becomes an interchange is **two elements**: the circle's label ends on the day the
  capsule's label starts. The name stays the same.

**Interchange (lines share a paid area): `<rect>` capsule**

```xml
<rect id="station-xujiahui-4--2010-04-07" data-lines="1=2010_04_07-2013_08_31,9=2010_04_07-2013_08_31"
      x="-6.325" y="-12.325" width="12.650" height="24.650" rx="6.325"
      transform="translate(2249.088,1238.967) rotate(-44.6594)" inkscape:label="Xujiahui=2010_04_07-2013_08_31" data-logos="metro" />
```

To build it, take `P` and `Q`, the two outermost points on the lines' centrelines that it must
cover (each line's station point):

```
span   = |PQ|
height = span + 2r
x = -r,  y = -height / 2,  width = 2r,  rx = r   (no ry)
transform = "translate(cx,cy) rotate(θ)"
  (cx, cy) = midpoint of P and Q
  θ = degrees(atan2(-(Qx - Px), Qy - Py))   // rotates the rect's local +y axis onto P→Q
```

- MUST: `transform` is exactly `translate(x,y) rotate(deg)` and nothing else.
- MUST: every line serving the interchange passes under the capsule: its centreline is within
  `r - W/2` of the segment `PQ`. If a line would be missed, lengthen `PQ` (or reposition it) until
  it isn't.
- If `span` would be 0, it's one line: use a circle.
- SHOULD: keep capsules compact. A small shift along the serving tracks and a slight rotation may
  shorten the span without rerouting the lines. Preserve station order, cover every serving line,
  avoid unrelated tracks, and move any attached connector endpoints with the marker.
- Where services share the same centreline, align the capsule with that line rather than leaving
  a default vertical pill. Use simple horizontal/vertical/diagonal orientations when they cover
  all served tracks; follow the local street/track grid where that is clearer (e.g. Manhattan).
- Aim for a capsule no more than about three marker widths long. Longer physical complexes may
  need exceptions: do not hide a served line, create overlaps, merge distinct stations or remove
  historical transfer gaps just to meet this target. Local track spacing adjustments must move
  related historical markers and connectors consistently, with geography unchanged.
- Coordinates use 3 decimals and angles 4.

**Connector (official out-of-station transfer): `<path>`**

```xml
<path id="walking-transfer-xujiahui" d="M2253.854,1243.789 L2244.438,1234.111" fill="none" inkscape:label="Xujiahui=2009_12_31-2010_04_07" />
```

- MUST: a single straight segment `M x1,y1 L x2,y2` from the centre of one marker to the centre of the
  other. MUST have `fill="none"`, and inherits its stroke from the group.
- Its label has the station name (or both names joined, e.g. `East_Tsim_Sha_Tsui_Tsim_Sha_Tsui`) and
  exactly the period the out-of-station transfer existed. Connectors don't get tooltips.

**Lines served: `data-lines`**

Every `<circle>` and `<rect>` marker MUST carry `data-lines`: the lines that call at that marker,
written like a label but with the legend entry's `id` (§9) in place of the name:

```xml
<rect id="station-minquan-west-road-92--2010-11-03" data-lines="r=2010_11_03,xinlu=2010_11_03-2012_09_30,o=2012_09_30" … />
```

- MUST: every `id` exists in `lines.json`, every interval lies within the marker's own dates, and the
  legend entry is active for the whole interval.
- `start` is the day that line began calling at the station, so a line that arrived later carries a
  later date. A line that stopped calling gets an `end`. A line that joins a station's capsule from a
  separate marker (§6) starts on the day of that change.
- Each marker lists only what applies while it is on the map: a station's circle form lists the line
  it had, and the capsule that replaces it lists its lines from the day the capsule appears. Separate
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
<rect inkscape:label="Asakusa=1960_12_04" data-logos="metro,toei" … />
<circle inkscape:label="Lo_Wu=1910_10_01-1911_10_05,Lo_Wu=1949_10_14" data-logos="kcr=-2007_12_02,mtr=2007_12_02" … />
<circle inkscape:label="Kkachiul=2012_10_27" data-logos="metro=-2022_01_01,incheon=2022_01_01" … />
```

Each key maps to an entry in the system's `operators` (§1). The tooltip shows the entries active
that day, in attribute order.

- A system with one operator omits the attribute; markers without it show the first operator.
- MUST: in a system with more than one operator, every station marker (circle or rect) has
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
  2022-01-01; Taipei's Circular Line passes to New Taipei Metro on 2023-05-23. Lines that opened
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

- MUST NOT place a marker on the track of a line that doesn't stop there. Every other visible line's
  centreline must be at least `r + outline/2 + W/2` from the marker centre (Shanghai: ≥ 10 units;
  11–13 is comfortable). The one tolerated exception is a shared corridor drawn with parallel tracks
  closer than that, where both lines really do pass.
- Out-of-station pairs (§6) SHOULD have centres 2.1 r–3.8 r apart. MTR's East Tsim Sha Tsui ↔ Tsim Sha Tsui is
  3.8 r. At Shanghai scale 13.5 units makes the circles just touch, which is used where the two
  tracks meet at the station; the connector is then hidden, which is fine.
- Where the two lines **cross** at the station: put each circle on its own line, 11–15 units from
  the crossing, so neither sits on the other line (Hongkou Football Stadium 2007–2012, Longhua 2015–2018).
- Where they run **parallel**: stagger the circles along the corridor so they read as two
  (Hongqiao Airport Terminal 2 2010–2017).
- Where a new line runs straight **through** an existing station marker, put the new line's station point
  about one marker width (`2r`) along the new line, so the capsule has an orientation; leave the older line's
  point where it was (Chengdu's Xinnanmen, Dongpo Road).
- Where one line **ends** at the other: the circles touch. If the ending track exists only for the
  out-of-station period, trim it so it ends at its own circle (Pearl Line at Shanghai South Railway
  Station 2000–2004).
- Two stations with **no** official transfer: two circles, no connector, clearly apart (≥ 2.5 r)
  so they don't read as linked (People's Square / People's Park 1999–2000).
- When an interchange changes type on date `D`, end the old elements' labels at `D` and start the new
  ones at `D`. Keep marker positions stable across the change where the drawing allows.
- Known exception: Shanghai's Middle Huaihai Road (Line 13) sits in a gap between Lines 1 and 14 that
  is narrower than the clearance allows, and no shift along Line 13 fixes it. Fixing it means
  redrawing those tracks further apart.

## 6. Interchanges: which marker to draw

Draw each interchange the way the operator classifies it. That classification is dated, so it can
change over the station's life.

| On the ground (per the operator)                                                                                                                                          | Draw                                     | Examples                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| One station: passengers change lines **without passing a fare gate** (paid-area / in-station transfer)                                                                    | one **capsule**                          | Mong Kok; People's Square from 2000-08-10; Loushanguan Road from 2024-12-31                                                             |
| Separate stations the operator **designates as a transfer**, but passengers must exit and re-enter (out-of-station / "virtual" transfer), with or without fare continuity | one **circle per station + a connector** | East Tsim Sha Tsui ↔ Tsim Sha Tsui; Shanghai Railway Station (Line 1 ↔ Lines 3/4) since 2008-06-01; West Nanjing Road (Lines 2, 12, 13) |
| Nearby stations with **no** designated transfer (different names, or not listed by the operator)                                                                          | circles, **nothing between**             | People's Square (Line 1) / People's Park (Line 2) 1999-09-20 → 2000-08-10                                                               |

- The test is the operator's own classification: its list of out-of-station transfer stations, its
  station pages and signage, and dated announcements such as "passage opens on …". Physical distance
  doesn't count, and neither does how the official diagram happens to draw it.
- An operator app or station API that lists each station's transfer lines is a good test, and archived
  copies date it. Two nearby stations that list only their own lines have no designated transfer
  (Chengdu's Jincheng Plaza / Jincheng Plaza East).
- Separate fare systems count as out-of-station **within the primary system**. Shanghai Lines 3 and 5
  used separate tickets from Lines 1/2 until the network-wide one-ticket system on 2005-12-25, so
  Zhongshan Park, Xinzhuang and Shanghai South Railway Station are drawn as connectors until then.
- **Cross-system** interchanges are between the primary system and something with its own fare
  system and operator: KCR before the 2007 merger, Shanghai's Maglev, the Jinshan Railway and the
  Airport Link. Draw them like this (MTR precedent: Kowloon Tong and Mei Foo before 2007):
  - one capsule when both systems' platforms are in **one station complex** under one name, linked
    by internal passages, even though the fares are separate (Longyang Road and Pudong T1&2
    for Line 2 + Maglev);
  - separate markers + connector when they are **separate stations** and the operator designates an
    out-of-station transfer (Airport Link at Hongqiao T2 and Pudong T1&2);
  - one capsule from the day a paid-area link opens (Jinghong Road from 2025-07-05), or from opening if
    the transfer never leaves the paid area (Zhongchun Road, Line 9 ↔ Airport Link, from 2024-12-27).
- A connector appearing or disappearing, or a connector turning into a capsule, is a map change and needs an
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

**Openings**: a line, section or station is on the map exactly when the public could ride it,
whatever the service was called and however limited its days, hours, stops or riders, and not on
days when nobody could.

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
  get no `… rides end` event. Markers follow the same rule (a new capsule stays a capsule). The
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
the network (KCR's Sha Tau Kok branch, New York's demolished elevated lines):

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
- Separate insets for a physically disconnected system (the Staten Island Railway on the MTA map).
- Lines that have left the network: a line reclassified out of it, or whose transit service ended
  and never resumed, ends on its last day of regular service (Incheon Airport Maglev, 2022-07-14).

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
  into a capsule solely for a simplified service. This is an exception to the full interchange
  drawing rules in §6, following MTR Light Rail and Singapore LRT.
  - Start at the later of the two services' openings, or the actual transfer opening if later.
    Qinghu gains Longhua Tram on 2017-10-28; Guanlan gains it when Line 4 reaches it on 2020-10-28.
  - A differently named light-rail stop can be represented by its designated heavy-rail interchange:
    Longhua Tram's Xinlan by Guanlan, Skyshuttle's Longbei by Dongjiang Column Memorial Hall.
    Confirm the operator's transfer list; a nearby track or station alone isn't enough.
  - Membership alone does not draw the connection. Include passenger branches (Songjiang University
    Town) and shared routes in both line colours (Songjiang Trams 1/2 through Sports Center).
    For simplified services, locally adjust the track to meet the existing heavy-rail marker,
    including designated walking transfers (Pingshan Center; Longbei at Dongjiang Column Memorial
    Hall). Keep the dated membership; do not add a separate light-rail marker or walking connector.
    This is a schematic simplification, not a claim of an in-station transfer. Do not extend
    passenger branches into depots.
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
      "color": "rgb(255,212,0)"
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
  circle becoming a capsule, a connector appearing or disappearing, or a station's operators
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
| station or line rename                          | `<Old> → <New>`                                                              |
| paid-area interchange begins                    | `<Station>: in-station interchange opens`                                    |
| out-of-station transfer begins                  | `<Station>: out-of-station interchange opens`                                |
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
  `… (old surface station)`. Keep it to one clause.
- A capsule that appears or grows because a new line opens there is covered by the line-opening
  description. A connector always gets its own `out-of-station interchange opens` line, even on a
  line-opening day, and so does every connector-to-capsule change.
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
2000-12-27 (en timeline).

For added geography, verify station coordinates and the route between them against mapped track
alignments or operator engineering maps. Match coordinate systems before placing them on the SVG:
OpenStreetMap uses WGS84; mainland Chinese maps commonly use GCJ-02. Check the conversion against
several existing stations across the area, then inspect riverbanks, islands and road corridors.
Smooth the verified alignment; do not invent it by joining station centres. Keep any small offsets
needed for readable interchanges local.

When the source artwork is itself geographic, fit an affine transform from projected coordinates to the
SVG on the line termini, then add a smooth local correction interpolated from every matched station
(Gaussian weights; exclude outliers). Project added lines, stations and water through the same
correction so they meet the artwork's own stations (Chengdu: 2.4 → 1.1 units median residual).

For a map drawn from scratch, project railway geometry, station coordinates and geography through
one metric projection. Historical OSM snapshots can recover retired alignments; check their actual
service dates independently, since an OSM edit timestamp is not an opening or closure date.

### Background geography

**Preservation comes first.** Keep the original geography inside the original bounds of Hong Kong,
Shanghai, Shenzhen, Hangzhou, Guangfo, Taipei, Singapore and Tokyo. The baseline is the artwork
before the canvas/geography expansion (commit `c4fe500`), not an intermediate regenerated version.
Do not replace, simplify or remove those original paths. Correct administrative land shading is
required for every system and is an explicit exception to preserving paint colours. Modest, source-backed additions
are allowed, especially in sparse areas. Preserve existing water and coastline shapes at joins,
but paint added waterways above land and administrative shading so neither can hide their course.
Extend geography outside the old bounds and preserve the enlarged zoom-out canvas. Any unavoidable
join adjustment must be narrowly scoped and documented. Beijing, Chengdu, Chongqing and Nanjing
are exceptions: their newly created geography may be reworked. Reduce the first three's small-feature
clutter; give Nanjing useful river/lake context. The normalization rules below apply to **new geography
and these four exceptions**, not as permission to rebuild the eight established maps.

- Preserve accurate source artwork. Correct a coastline or border against mapped geometry, not by
  drawing a more plausible-looking outline. Government geographic data or OpenStreetMap extracts
  can supply coastlines, islands and river polygons; a regional extract is useful when individual
  queries fail or omit neighbouring territory.
- Fit geographic coordinates to the SVG using several well-distributed, verified control points.
  Check the fit locally around islands, riverbanks and coastal stations; one global fit can leave
  local errors in a schematic source map. Do not move stations or tracks to hide those errors.
- Coastlines and administrative boundaries serve different purposes: use coastlines for land/water
  and administrative boundaries to divide land colours. Administrative areas can include sea.
  Use actual river polygons for border rivers, not an invented gap or a fixed-width buffer.
  Shade land outside each system's named administrative area consistently across both the original
  canvas and expanded margins: Hong Kong SAR; Shanghai, Shenzhen, Hangzhou, Chengdu, Beijing,
  Chongqing and Xi'an municipalities (Xi'an's Xianyang sections run on outside land); Jiangsu province for Nanjing; Guangzhou + Foshan for Guangfo; Taipei + New Taipei +
  Taoyuan for the combined Taipei map; Tokyo Metropolis; Singapore; New York City's five
  boroughs (not the wider MTA service area); and Seoul Special City (not the wider metropolitan
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
  once. Tiny gaps between borough/county datasets must not become outlined strips of water.
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
- For a geography-only edit, keep tracks, markers, connectors, labels and their coordinates unchanged.
  For an explicit canvas expansion, change the root `viewBox` and preserve the original framing in
  `initialBounds`; do not translate or rescale railway paths. Extend mapped geometry past all four
  new edges. Never stretch the old edge, leave an old rectangular clipping seam, or fill unknown
  territory with guessed land/water.
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
4. Apply the rules of §7, especially "on the map exactly when the public could ride it" and "omit suspensions".
5. Edit labels, then run `python3 check_map.py <key>` (appendix) until it prints `OK`. Update
   `events.json` until the 1:1 check passes.
6. Look at the result. Render every change date and the day before, zoomed on each interchange that
   changed. Confirm that every marker sits on its track, that no marker sits on a line that doesn't
   stop there, that capsules cover all their lines, and that out-of-station pairs read as two stations.
7. Where the timeline article gives cumulative station counts, spot-check the number of visible
   station markers on a few dates.
8. Run `npm run lint` and `npm run build`, then open `/<key>` and scrub the slider across the whole range.
   There must be no console errors.

## 12. Cleaning a source map

Source maps (Wikipedia SVGs, operator PDFs) need converting to this contract:

1. **Delete** all `<text>`/`<tspan>`, `<title>`, `<desc>`, legends, compasses, logos, notes, insets,
   `<image>`, filters, masks, clip paths, hidden layers, and style rules nothing uses.
2. **Inline** `<defs>`/`<use>`/`<symbol>`: every station marker becomes its own `<circle>` or `<rect>`
   per §5. Station symbols drawn as `<path>`, `<ellipse>` or `<polygon>` become circles or capsules.
3. **Bake transforms**: no `scale()`/`matrix()`, and no transforms on groups inside `lines` or `stations`.
   Only a capsule's own `translate() rotate()` remains.
4. **Flatten** into the three layers of §3 (`geography`, `lines`, `stations`) inside `zoom-layer`.
   Move all paint to the layer groups as §3 shows.
5. **Split tracks** at every date boundary (§4). Make termini end at marker centres, and draw shared
   corridors as parallel offsets.
   If you traced centrelines from filled outlines, look for zig-zags. Railway-style lines drawn with an
   offset box at each station leave a jog at every station, like the Jinshan Railway did. Delete the jog
   vertices: two opposite turns over a short segment, within a few units of the straight line. Then
   re-snap the stations. Simplify every track to fewer than 256 straight segments (§4).
   Design artwork often draws lines as **outlined strokes**: a closed filled outline whose two sides are
   offsets of the original centreline, joined by round caps (two quarter arcs of radius `W/2`). Recover the
   centreline exactly instead of tracing it: split the outline at the two caps, take the midpoint between
   each point of one side and its nearest point on the other, and check every centre point lies `W/2` from
   the outline (Chengdu). A shared corridor drawn as two half-width stripes becomes full-width parallels
   (§4); fade the separation out where the two lines cross, because the push direction flips there.
6. **Resize markers** to the formulas in §5 for the chosen `W`, and snap every circle centre onto its track.
7. **Label everything** per §2 and §7, then build `lines.json` and `events.json`.
8. Round coordinates to 3 decimals, and check that every `id` is unique.

## 13. Checklist

- [ ] Assets in `src/assets/<key>/`, entry in `systems.ts`, URL in `public/sitemap.xml`; Home links and date bounds are derived automatically.
- [ ] `zoom-layer` › (`geography`) › `lines` › `stations`; only labelled path/circle/rect; paint on groups; no text/title/defs/use.
- [ ] Every label matches §2. Names are the verbatim English names of that period.
- [ ] Sizes follow §5. Circles are on their tracks, capsules cover all their lines, and no marker sits on a line that doesn't stop there.
- [ ] Interchanges follow the operator's dated classification (§6), with connectors for out-of-station periods.
- [ ] Lines are drawn exactly when the public could ride them, previews included (not test runs, ceremonies or station-only open days); a preview and the later opening are separate events, the line stays on the map from the preview (no gap, no `… rides end` event; a preview followed by over a year without service is left off), suspensions are omitted and only relocation gaps under a month are collapsed (§7).
- [ ] Every track's name matches a legend entry at every moment (§9).
- [ ] Every marker has `data-lines` with legend ids, inside its own dates (§5).
- [ ] In a multi-operator system every marker has `data-logos`, and every handover has an event (§5).
      Logos are clean SVGs, and their sources and licences are recorded in timeline-sources.md.
- [ ] Every simplified line's designated heavy-rail interchanges list that line in `data-lines`,
      from the correct transfer dates; selecting the line shows those stations (§8).
- [ ] Every track has `data-km`, and each line's present-day sum equals its published length (§4).
- [ ] `events.json` has one entry per change date and none otherwise, using the §10 templates.
- [ ] `check_map.py` prints `OK`. The rendered checks (§11 step 6) look right. `npm run lint` and `npm run build` pass.
- [ ] New sources and system-specific methods or limitations are recorded in
      [timeline-sources.md](timeline-sources.md). Reusable techniques and lessons from the work are
      added to the relevant section of this spec (or an existing applicable skill), so future systems
      benefit without repeating the investigation. Keep these notes concise; do not duplicate rules
      or turn one system's numeric choices into universal requirements.

## Legacy MTR differences

MTR predates this spec. Don't copy these patterns into new systems:

- Track colours are also set by per-path CSS classes (`.er`, `.kt`, …), which the legend colour overrides.
- Track width is set inline per path (`stroke-width:1.5`) instead of on the `lines` group. Caps are round.
- Light Rail is drawn as a simplified network: only its four heavy-rail interchanges are markers.
  Tracks are split by opening stage, without modelling individual service routes or stop renames.

MTR's historical coverage and outstanding evidence (Sha Tau Kok, early KCR halts, Light Rail
stages, High Speed Rail) are recorded in [its source notes](timeline-sources.md#hongkong).

## Appendix: `check_map.py`

Save it anywhere and run it from the repository root: `python3 check_map.py shanghai`. It checks
structure (unique ids, connectors before markers, capsule transforms), labels, station identities,
legend coverage, `data-lines`, `data-logos` intervals, `data-km` and the segment limit of §4. On
butt-capped systems it checks that every track starts and ends inside a marker (or meets other
active track of its line, or runs off the `viewBox`, or belongs to a line marked `simplified`). It
compares change dates, including operator handovers, with `events.json` (an event date without a
map change must record an opening or start of regular service, §10), and prints each line's
present-day length to compare with the operator's figure. It doesn't check that `data-logos` keys
exist in `operators` (the local logo test does), and it doesn't check geometry otherwise; §11 step 6
covers that.

```python
# python3 check_map.py <system-key>   (run from the repo root)
import json, math, re, sys
from collections import defaultdict

key = sys.argv[1]
svg = open(f'src/assets/{key}/map.svg', encoding='utf-8').read()
legend = json.load(open(f'src/assets/{key}/data/lines.json', encoding='utf-8'))['lines']
try:
    events = json.load(open(f'src/assets/{key}/data/events.json', encoding='utf-8'))
except FileNotFoundError:
    events = None

DATE = r'\d{4}_\d{2}_\d{2}'
STATE = rf'[^=,_\s][^=,\s]*={DATE}(?:-{DATE})?'
LABEL = re.compile(rf'^{STATE}(?:,{STATE})*$')
LINES = re.compile(rf'^[a-z0-9]+={DATE}(?:-{DATE})?(?:,[a-z0-9]+={DATE}(?:-{DATE})?)*$')
LOGO = rf'[a-z0-9]+(?:=(?:{DATE}(?:-{DATE})?|-{DATE}))?'
LOGOS = re.compile(rf'^{LOGO}(?:,{LOGO})*$')
errors = []
ids = re.findall(r'\bid="([^"]+)"', svg)
if len(ids) != len(set(ids)):
    errors.append('SVG ids must be unique (§3)')

def vertices(d):  # every vertex of a path's d, absolute; a curve contributes its end point
    toks = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    args = {'M': 2, 'L': 2, 'T': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'A': 7, 'Z': 0}
    out, cur, start, cmd, i = [], [0.0, 0.0], None, None, 0
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1
            if cmd in 'Zz' and start:
                cur = list(start); out.append(tuple(cur))
            continue
        n = args[cmd.upper()]; v = [float(t) for t in toks[i:i + n]]; i += n
        rel = cmd.islower(); c = cmd.upper()
        if c == 'H': cur = [cur[0] + v[0] if rel else v[0], cur[1]]
        elif c == 'V': cur = [cur[0], cur[1] + v[0] if rel else v[0]]
        else: cur = [cur[0] + v[-2], cur[1] + v[-1]] if rel else [v[-2], v[-1]]
        out.append(tuple(cur))
        if c == 'M': start = list(cur); cmd = 'l' if rel else 'L'
    return out

def seg_dist(p, a, b):  # distance from point p to segment ab
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
    return ((x1 + t * dx - x) ** 2 + (y1 + t * dy - y) ** 2) ** 0.5

def states(label):
    out = []
    for part in label.split(','):
        name, interval = part.split('=')
        start, _, end = interval.partition('-')
        out.append((name, start.replace('_', '-'), end.replace('_', '-') if end else None))
    return out

def children(layer_id):
    body = re.search(rf'<g\b[^>]*\bid="{layer_id}"[^>]*>([\s\S]*?)</g>', svg)
    if not body:
        errors.append(f'missing <g id="{layer_id}">')
        return []
    return re.findall(r'<(\w+)\b([\s\S]*?)/?>', body.group(1))

def check_label(where, label):
    if not LABEL.match(label):
        errors.append(f'{where}: bad label {label!r}')
        return []
    st = states(label)
    for i, (_, start, end) in enumerate(st):
        if end is not None and end <= start:
            errors.append(f'{where}: state ends before it starts in {label!r}')
        if i + 1 < len(st) and (end is None or end > st[i + 1][1]):
            errors.append(f'{where}: states overlap or are out of order in {label!r}')
    return st

log = defaultdict(set)  # date -> what changes on the map that day
def record(kind, st):
    for i, (name, start, end) in enumerate(st):
        prev_end = st[i - 1][2] if i else None
        log[start].add(f'{kind} {name}' if prev_end != start else f'{kind} renamed {st[i - 1][0]} -> {name}')
        if end and (i + 1 == len(st) or st[i + 1][1] != end):
            log[end].add(f'{kind} {name} ends')

if not re.search(r'<g\b[^>]*\bid="zoom-layer"', svg):
    errors.append('missing <g id="zoom-layer">')
track_names = []  # (name, start, end)
track_km = []     # (states, km)
track_pts = []    # (label, states, vertices)
track_widths = [] # per-path stroke widths, the fallback for W
for tag, attrs in children('lines'):
    label = re.search(r'inkscape:label="([^"]*)"', attrs)
    if tag != 'path' or not label:
        errors.append(f'lines layer: only labelled <path> allowed, found <{tag}>')
        continue
    st = check_label('track', label.group(1))
    record('track', st)
    d = re.search(r'\bd="([^"]*)"', attrs)
    if d:
        track_pts.append((label.group(1), st, vertices(d.group(1))))
    width = re.search(r'stroke-width[:="]+\s*([\d.]+)', attrs)
    if width:
        track_widths.append(float(width.group(1)))
    if d and len(re.findall(r'[Ll]', d.group(1))) >= 256:
        errors.append(f'track {label.group(1)!r} has 256+ straight segments: Safari draws it in pieces (§4)')
    km = re.search(r'data-km="([^"]*)"', attrs)
    if not km or not re.fullmatch(r'\d+\.\d', km.group(1)) or float(km.group(1)) <= 0:
        errors.append(f'track {label.group(1)!r}: missing or malformed data-km (§4)')
    else:
        track_km.append((st, float(km.group(1))))
    track_names += st
markers = []  # (label, states, data-lines match, data-logos match)
identities = defaultdict(list)  # stable station id -> (element id, states)
reach = []    # (label, states, x, y, deg, half, r): a marker's dates, centre, axis angle, half axis length and radius
seen_marker = False
for tag, attrs in children('stations'):
    label = re.search(r'inkscape:label="([^"]*)"', attrs)
    if tag not in ('circle', 'rect', 'path') or not label:
        errors.append(f'stations layer: only labelled <circle>/<rect>/<path> allowed, found <{tag}>')
        continue
    if tag == 'path' and seen_marker:
        errors.append(f'connector {label.group(1)!r} must precede station markers (§3)')
    seen_marker |= tag in ('circle', 'rect')
    if tag == 'path' and 'fill="none"' not in attrs:
        errors.append(f'connector {label.group(1)!r} needs fill="none"')
    transform = re.search(r'transform="([^"]*)"', attrs)
    if tag == 'rect' and not (transform and re.fullmatch(r'translate\([-\d.]+,[-\d.]+\) rotate\([-\d.]+\)', transform.group(1))):
        errors.append(f'capsule {label.group(1)!r}: transform must be exactly "translate(x,y) rotate(deg)"')
    st = check_label(tag, label.group(1))
    record({'circle': 'station', 'rect': 'interchange', 'path': 'connector'}[tag], st)
    if tag != 'path':
        marker_id = re.search(r'\bid="([^"]+)"', attrs)
        if not marker_id:
            errors.append(f'marker {label.group(1)!r}: missing search identity id (§3)')
        else:
            identity, _, version = marker_id.group(1).partition('--')
            if version and (not st or version != st[0][1]):
                errors.append(f'marker {marker_id.group(1)!r}: version must match first appearance (§3)')
            identities[identity].append((marker_id.group(1), st))
        markers.append((label.group(1), st, re.search(r'data-lines="([^"]*)"', attrs),
                        re.search(r'data-logos="([^"]*)"', attrs)))
        num = lambda name: float(re.search(rf'\b{name}="([^"]+)"', attrs).group(1))
        if tag == 'circle':
            reach.append((label.group(1), st, num('cx'), num('cy'), 0.0, 0.0, num('r')))
        elif transform:
            x, y, deg = map(float, re.match(r'translate\(([-\d.]+),([-\d.]+)\) rotate\(([-\d.]+)\)', transform.group(1)).groups())
            w, h = num('width'), num('height')   # a capsule: a segment of length h - w along its axis, thickened by w / 2
            reach.append((label.group(1), st, x, y, deg, (h - w) / 2, w / 2))
for identity, versions in identities.items():
    for i, (aid, a) in enumerate(versions):
        for bid, b in versions[:i]:
            if any(s < (e2 or '9999') and s2 < (e or '9999') for _, s, e in a for _, s2, e2 in b):
                errors.append(f'station identity {identity!r}: {aid} and {bid} overlap; separate stations need separate ids (§3)')

# every track starts and ends inside a station marker present at every moment of the track's life
# (markers move when a station is rebuilt), except where it meets other track of the same line away
# from any station (a branch junction, a loop closing on itself), runs off the drawn area, or belongs
# to a line the legend marks "simplified" (drawn without most of its stops). Only for butt-capped
# systems: with round caps a track may overshoot its terminus (§4, §9)
def marker_gap(p, m):  # how far p lies outside marker m (negative inside)
    _, _, x, y, deg, half, r = m
    a = math.radians(deg); dx, dy = p[0] - x, p[1] - y
    along = max(-half, min(half, -dx * math.sin(a) + dy * math.cos(a)))   # nearest point on the capsule's axis
    ax, ay = x - along * math.sin(a), y + along * math.cos(a)
    return math.hypot(p[0] - ax, p[1] - ay) - r
W = float((re.search(r'<g\b[^>]*\bid="lines"[^>]*stroke-width[:="]+\s*([\d.]+)', svg)
           or [None, max(track_widths, key=track_widths.count) if track_widths else 1])[1])
caps = re.search(r'<g\b[^>]*\bid="lines"[^>]*stroke-linecap[:="]+\s*(\w+)', svg)
vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', svg).group(1).split()]
simplified = {n for entry in legend if entry.get('simplified') for n, _, _ in states(entry['label'])}
for label, st, pts in track_pts if caps and caps.group(1) == 'butt' else []:
    names = {n for n, _, _ in st}
    if names & simplified:
        continue
    born, gone = st[0][1], st[-1][2]
    moments = [born] + sorted({d for states_ in [m[1] for m in reach] + [s2 for _, s2, _ in track_pts] for _, s_, e_ in states_ for d in (s_, e_) if d and born < d and (gone is None or d < gone)})
    for which, p in (('starts', pts[0]), ('ends', pts[-1])):
        if not (vb[0] < p[0] < vb[0] + vb[2] and vb[1] < p[1] < vb[1] + vb[3]):
            continue
        own = pts[2:-1] if which == 'starts' else pts[:-2]   # its own path, minus the segments touching this end
        for t in moments:
            active_names = {n for n, s_, e_ in st if s_ <= t and (e_ is None or t < e_)}
            if not active_names:
                continue
            present = [m for m in reach if any(s_ <= t and (e_ is None or t < e_) for _, s_, e_ in m[1])]
            name, gap = min(((m[0], marker_gap(p, m)) for m in present), key=lambda x: x[1], default=('nothing', float('inf')))
            if gap <= 1:
                continue
            others = [q for l, s2, q in track_pts if l != label and any(
                n in active_names and s_ <= t and (e_ is None or t < e_) for n, s_, e_ in s2)]
            if any(seg_dist(p, q[i], q[i + 1]) <= min(1, W / 2) for q in others + [own] for i in range(len(q) - 1)):
                continue
            errors.append(f'track {label!r} {which} {gap:.0f} units outside the nearest marker ({name}) on {t} '
                          'and not on another track of the line (§4)')
            break

legend_states, legend_ids = [], {}
for entry in legend:
    if not re.fullmatch(r'[a-z0-9]+', str(entry.get('id', ''))) or entry['id'] in legend_ids:
        errors.append(f'legend {entry["label"]!r}: needs a unique lowercase id (§9)')
    st = check_label('legend', entry['label'])
    record('legend', st)
    legend_states += st
    legend_ids[entry['id']] = st
# a track is coloured and highlighted by the legend entry whose name matches its name at that moment
boundaries = sorted({d for _, s, e in legend_states for d in (s, e) if d})
for name, start, end in track_names:
    moments = [start] + [d for d in boundaries if start < d and (end is None or d < end)]
    uncovered = [t for t in moments if not any(n == name and s <= t and (e is None or t < e) for n, s, e in legend_states)]
    if uncovered:
        errors.append(f'track {name!r} ({start}..{end or "now"}) has no legend entry of that name from {uncovered[0]}: '
                      'it gets no colour and never highlights (§9)')
# every marker lists the lines that call there, within its own dates, with the legend entry active throughout
def within(start, end, spans):
    return any(s <= start and (e is None or (end is not None and end <= e)) for s, e in spans)
def spans(st):  # an element's states, with renames (end == next start) merged into one span
    out = []
    for _, s, e in st:
        if out and out[-1][1] == s:
            out[-1][1] = e
        else:
            out.append([s, e])
    return out
for label, st, data_lines, data_logos in markers:
    if not data_lines or not LINES.match(data_lines.group(1)):
        errors.append(f'marker {label!r}: missing or malformed data-lines (§5)')
        continue
    presence = spans(st)
    for lid, start, end in states(data_lines.group(1)):
        if lid not in legend_ids:
            errors.append(f'marker {label!r}: data-lines id {lid!r} is not in lines.json')
        elif not within(start, end, spans(legend_ids[lid])):
            errors.append(f'marker {label!r}: line {lid!r} is not on the legend for all of {start}..{end or "now"}')
        if not within(start, end, presence):
            errors.append(f'marker {label!r}: line {lid!r} {start}..{end or "now"} is outside the marker\'s own dates')

    if data_logos:
        if not LOGOS.fullmatch(data_logos.group(1)):
            errors.append(f'marker {label!r}: malformed data-logos (§5)')
            continue
        first, last = st[0][1], st[-1][2]
        inside = lambda d: first < d and (last is None or d < last)
        entries, previous = [], {}
        for part in data_logos.group(1).split(','):
            logo, _, interval = part.partition('=')
            start, _, end = interval.partition('-')   # a missing date is the marker's own first or last day
            start, end = start.replace('_', '-') or None, end.replace('_', '-') or None
            if not all(inside(d) for d in (start, end) if d):
                errors.append(f'marker {label!r}: logo {logo!r} repeats or exceeds the marker dates; '
                              'leave out a date on its first or last day (§5)')
            if start and end and end <= start:
                errors.append(f'marker {label!r}: logo {logo!r} ends before it starts')
            if logo in previous and (previous[logo] is None or start is None or start <= previous[logo]):
                errors.append(f'marker {label!r}: logo {logo!r} intervals overlap or need merging')
            previous[logo] = end
            entries.append((start, end))
            for d in (start, end):   # an operator handover is a map change: it needs an event (§5, §7)
                if d:
                    log[d].add(f'operator {logo} {"starts" if d == start else "ends"} at {label.split("=")[0]}')
        for t in sorted({s for _, s, _ in st} | {d for e in entries for d in e if d}):
            if any(s <= t and (e is None or t < e) for _, s, e in st) and not any(
                    (s is None or s <= t) and (e is None or t < e) for s, e in entries):
                errors.append(f'marker {label!r}: no logo on {t} (§5)')
                break

if events is not None:
    dates = [e['date'] for e in events]
    if dates != sorted(set(dates)):
        errors.append('events.json: dates must be unique and ascending')
    for e in events:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', e['date']) or not e['descriptions']:
            errors.append(f'events.json: bad entry {e}')
    for d in sorted(set(log) - set(dates)):
        errors.append(f'map changes on {d} but events.json has no entry: {sorted(log[d])}')
    # a date without a map change may only record an opening or a start of regular service that
    # follows a preview already on the map (§7): every description says " opens" or "regular service"
    text = {e['date']: e['descriptions'] for e in events}
    for d in sorted(set(dates) - set(log)):
        if not all(' opens' in t or 'regular service' in t for t in text[d]):
            errors.append(f'events.json has {d} but nothing changes on the map that day, '
                          'and it records no opening or start of regular service (§7, §10)')

if not errors:  # each line's length on the last change date, to compare with the operator's figure
    today = max(log)
    for name, start, end in legend_states:
        if start <= today and (end is None or today < end):
            total = sum(km for st, km in track_km if any(n == name and s <= today and (e is None or today < e) for n, s, e in st))
            print(f'  {name}: {total:.1f} km')
print('\n'.join(errors) or f'{key}: OK ({len(log)} change dates)')
sys.exit(1 if errors else 0)
```
