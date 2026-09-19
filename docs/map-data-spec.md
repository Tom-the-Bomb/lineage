# Map data specification

This is the contract for every metro system in this app. Follow it exactly when adding a system,
converting a source map, or editing dates. `MUST` means the app or the checks break without it.
`SHOULD` means it's the house style, and you need a stated reason to deviate.

Reference implementations: Shanghai (`src/assets/sh/`) is the model for new systems. MTR
(`src/assets/mtr/`) is the original, and its known deviations are listed in
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

- `<key>` is a short lowercase code, e.g. `mtr` or `sh`. It is also the URL (`/sh`).
- Register the system in `src/systems.ts` by adding an entry to `systems`:

| Field                        | Type / example                            | Rule                                                                            |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| `title`                      | `'Shanghai Metro History'`                | Page and browser-tab title.                                                     |
| `chineseTitle`               | `'上海地铁历史'`                          | Subtitle.                                                                       |
| `description`                | one sentence                              | Shown under the title.                                                          |
| `map`                        | `import shMap from './assets/sh/map.svg'` | The SVG.                                                                        |
| `logo`                       | imported SVG                              | Header logo.                                                                    |
| `minDate`                    | `new Date(Date.UTC(1993, 0, 1))`          | MUST be on or before the first change date. Always `Date.UTC`.                  |
| `maxDate`                    | `new Date(Date.UTC(2025, 11, 31))`        | MUST be on or after the last change date, or later changes can never be shown.  |
| `lines`                      | `shLines.lines`                           | The imported `lines.json` array.                                                |
| `tooltipLogos(status, time)` | returns `{ src, alt }[]`                  | Which logos a station tooltip shows. `status` comes from the label prefix (§2). |
| `article` (optional)         | `'/mtr/article'`                          | Only if an article route exists.                                                |

- Add a `<Link to="/<key>">` in `src/components/Home.tsx` (the home page links are written by hand).
- `SystemKey` and the routes are derived from `systems`. Nothing else needs registering.

## 2. Label syntax

Every track, marker, connector and legend entry carries its whole history in one label. In the SVG the
label is the `inkscape:label` attribute; in `lines.json` it is `"label"`.

```
label  = [prefix] state { "," state }
prefix = "^" | "!"                      (station markers only)
state  = name "=" date [ "-" date ]
date   = YYYY "_" MM "_" DD            (zero-padded)
name   = English name, spaces written as "_"
```

Examples: `Line_1=1993_05_28`, `Jiyang_Road=2011_04_12-2011_05_07,Oriental_Sports_Center=2011_05_07-2013_08_31`,
`^Hongqiao_Airport_Terminal_2=2024_12_27`, `!Xinzhuang=2025_01_05`.

Rules:

- MUST: each state is visible for `start <= t < end`. `end` is the **first day it no longer exists**,
  not its last day of service. A state with no `end` lasts to the present.
- MUST: states are in chronological order and don't overlap. A rename is two states where the first
  one's `end` equals the second one's `start`. A gap between states means the element is hidden
  during the gap. Use gaps only for real closures (§7).
- MUST: a name MUST NOT contain `=`, `,`, whitespace or a literal underscore, and MUST NOT start with
  `_`. Hyphens, apostrophes, periods and `·` are fine (`Zhangjiang_High-Tech_Park`,
  `People's_Square`, `Shimen_No._1_Road`, `Site_of_the_First_CPC_National_Congress_·_Xintiandi`).
- MUST: the name is shown **verbatim** (underscores become spaces). Write it exactly as the operator's
  English name at that time: capitalisation, punctuation and word order. Don't add suffixes such as
  `(elevated)`, `*` or line numbers; use the element `id` for disambiguation.
- Dates are local calendar dates as the operator announced them. They are parsed as UTC midnight.
  Don't shift them for time zones.
- Prefixes (station markers only; MUST NOT appear on tracks, connectors or legend entries):
  - none: the station belongs to the **primary** system only (e.g. Shanghai Metro, MTR);
  - `^`: the **secondary** system only (e.g. Shanghai Suburban Railway, KCR);
  - `!`: one station complex serving **both** systems.

  A system with only one operator never uses prefixes. `tooltipLogos` maps these to logos.

## 3. SVG document structure

Shanghai's `map.svg`, in outline. Anything not shown here doesn't belong in the file.

```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     viewBox="0 0 4600.74 2843.75" width="1600" height="989" version="1.1" style="background:white">
  <g id="zoom-layer" inkscape:label="zoom-layer">
    <g id="geography" pointer-events="none">            <!-- optional; water and outside land -->
      <path d="…" fill="#eee" />                          <!-- land beyond the operator's territory -->
      <path d="…" fill="#d3e5ed" />                       <!-- water -->
    </g>
    <g id="lines" fill="none" stroke-width="5" stroke-linecap="butt" stroke-linejoin="round"
       inkscape:groupmode="layer" inkscape:label="lines">
      <path id="line-1--caobao-road--xujiahui--1993-05-28" d="M… L…" inkscape:label="Line_1=1993_05_28" stroke="#e3002b" />
      …
    </g>
    <g id="stations" fill="#fff" stroke="#000" stroke-width="2"
       inkscape:groupmode="layer" inkscape:label="station_markers">
      <path id="walking-transfer-…" d="M… L…" fill="none" inkscape:label="…" />   <!-- connectors first -->
      <circle id="station-…" cx="…" cy="…" r="6.325" inkscape:label="…" />
      <rect id="station-…" x="-6.325" y="-12.325" width="12.650" height="24.650" rx="6.325"
            transform="translate(2249.088,1238.967) rotate(-44.6594)" inkscape:label="…" />
      …
    </g>
  </g>
</svg>
```

- MUST: the `xmlns:inkscape` namespace, because labels are read with `getAttribute('inkscape:label')`.
- MUST: a `viewBox`. The app reads it to scale the map so it fills the window and sets the zoom limits.
- MUST: `<g id="zoom-layer">` wraps everything. Zoom and pan transform this group.
- MUST: `<g id="lines">` contains **only** `<path>` elements, and every one has a label. The app animates
  every child and reads every label, so an unlabelled element breaks it.
- MUST: `<g id="stations">` contains **only** `<circle>` (station), `<rect>` (interchange capsule) and
  `<path>` (connector) elements, every one labelled. No nested `<g>`, no `<use>`, no `<text>`.
- MUST: paint for markers and connectors lives on the `stations` group (`fill`, `stroke`, `stroke-width`),
  not on each element. The app scales markers on hover, so per-element sizes must stay as specified.
- SHOULD: draw order is geography → lines → stations; inside `stations`, connectors first so markers sit
  on top of them.
- MUST: geography uses one palette across systems: the operator's own land is the white page background
  (`style="background:white"` on the root, no fill drawn), water is `#d3e5ed`, and land beyond the
  operator's territory is `#eee` (Shanghai's neighbouring provinces, Shenzhen). No strokes. A source that
  only outlines the land (MTR) gets a full-`viewBox` water path first and its land filled `#fff` on top.
- MUST NOT: `<title>` or `<desc>` anywhere, because browsers show them as tooltips on top of the app's.
  Also no `<text>` labels (names come from labels and tooltips), no `<defs>`/`<use>`/`<symbol>`, no
  `<image>`, no filters, masks or clip paths, no `scale()`/`matrix()` transforms.
- Inkscape metadata (`sodipodi:namedview`, `<metadata>`) is harmless but unnecessary; new files SHOULD omit it.
- `id`s MUST be unique. They SHOULD be descriptive:
  - tracks: `<line-slug>--<from-slug>--<to-slug>--<YYYY-MM-DD opening>`, e.g. `line-2--guanglan-road--longyang-road--2010-02-24`;
  - markers: `station-<name-slug>[-<suffix>]`, e.g. `station-xujiahui-line-9`;
  - connectors: `walking-transfer-<name-slug>[-<suffix>]`.

  If you change a track's opening date, change the date in its `id` too.

## 4. Tracks

- A track is one `<path>` per **line segment with its own dates**: split a line wherever a stretch
  opens, closes, is rerouted or changes name on a different date from its neighbours. Each segment
  runs station-centre to station-centre along the drawn route.
- MUST: a track has fewer than 256 straight segments (`L` commands). WebKit restarts the dash
  pattern every 256 line segments, so a longer polyline draws in as several pieces at once in Safari.
  Simplify dense polylines by dropping vertices (Douglas–Peucker at ~0.05 `W`, endpoints kept);
  Bézier curves don't count.
- MUST: a terminus segment ends exactly at the terminus marker's centre. It must not stick out beyond it.
- A segment that existed only for a period (e.g. an old alignment) gets its own path with an end
  date. Its replacement is a separate path that starts on the day the old one ends.
- Shared track (two lines running through the same stations) SHOULD be drawn as parallel offset
  paths, one per line, 3.5–5 units apart at Shanghai scale.
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
  - A line the map deliberately simplifies (MTR Light Rail, drawn without most of its stops) keeps
    derived values and won't match the published network length. Say so in the commit.
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
<circle id="station-hengshan-road" cx="2270.123" cy="1215.456" r="6.325" inkscape:label="Hengshan_Road=1995_04_10" />
```

- MUST: the centre sits on the track centreline (within 0.5 units).
- A station that becomes an interchange is **two elements**: the circle's label ends on the day the
  capsule's label starts. The name stays the same.

**Interchange (lines share a paid area): `<rect>` capsule**

```xml
<rect id="station-xujiahui" x="-6.325" y="-12.325" width="12.650" height="24.650" rx="6.325"
      transform="translate(2249.088,1238.967) rotate(-44.6594)" inkscape:label="Xujiahui=2010_04_07-2013_08_31" />
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
- Coordinates use 3 decimals and angles 4.

**Connector (official out-of-station transfer): `<path>`**

```xml
<path id="walking-transfer-xujiahui" d="M2253.854,1243.789 L2242.101,1250.357" fill="none" inkscape:label="Xujiahui=2009_12_31-2010_04_07" />
```

- MUST: a single straight segment `M x1,y1 L x2,y2` from the centre of one marker to the centre of the
  other. MUST have `fill="none"`, and inherits its stroke from the group.
- Its label has the station name (or both names joined, e.g. `East_Tsim_Sha_Tsui_Tsim_Sha_Tsui`) and
  exactly the period the out-of-station transfer existed. Connectors don't get tooltips.

**Lines served: `data-lines`**

Every `<circle>` and `<rect>` marker MUST carry `data-lines`: the lines that call at that marker,
written like a label but with the legend entry's `id` (§9) in place of the name:

```xml
<rect id="station-minquan-west-road-93" data-lines="r=1997_03_28,xinlu=2010_11_03-2012_09_30,o=2012_09_30" … />
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
- Separate fare systems count as out-of-station **within the primary system**. Shanghai Lines 3 and 5
  used separate tickets from Lines 1/2 until the network-wide one-ticket system on 2005-12-25, so
  Zhongshan Park, Xinzhuang and Shanghai South Railway Station are drawn as connectors until then.
- **Cross-system** interchanges are between the primary system and something with its own fare
  system and operator: KCR before the 2007 merger, Shanghai's Maglev, the Jinshan Railway and the
  Airport Link. Draw them like this (MTR precedent: Kowloon Tong and Mei Foo before 2007):
  - one capsule when both systems' platforms are in **one station complex** under one name, linked
    by internal passages, even though the fares are separate (`!` prefix if it is the secondary
    system; Longyang Road and Pudong T1&2 for Line 2 + Maglev);
  - separate markers + connector when they are **separate stations** and the operator designates an
    out-of-station transfer (Airport Link at Hongqiao T2 and Pudong T1&2);
  - one `!` capsule from the day a paid-area link opens (Jinghong Road from 2025-07-05), or from opening if
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

**Openings**: the first day the **public** could ride.

- Counts: regular service, trial operation (试运营), public sightseeing/trial runs (观光试运行), soft openings.
- Doesn't count: commissioning or test running (通车调试, 不载客试运行), ceremonial or VIP rides
  (通车典礼), completion or tunnel breakthrough (贯通, 封顶), "structurally complete but not opened".
  Examples: Shanghai Line 1 Xujiahui–Shanghai Railway Station opened **1995-04-10**, not on the
  1994-12-12 commissioning date. The Maglev opened **2003-10-11**, not at the 2002-12-31
  inauguration ride.
- A station that opened after its line (infill, or skipped at opening) gets its own date. Stations
  that have never opened are absent, even if the track passes them (Longju Road).

**Closures**: `end` = the first day without service.

- Permanent closures, withdrawals and relocations are recorded. That includes planned ends of
  service that last until a later project, e.g. the Expo Line closed 2010-11-02 and reopened as Line 13 2012-12-30.
- **Temporary suspensions are omitted**: repairs, maintenance, accidents, incidents, weather,
  events, epidemics (COVID-19) and similar, after which service resumes at the same stations. The
  line didn't vanish, so the map shows it as continuous.
- **Relocations / switchovers**: the old element ends on the day the new one opens. If the gap
  between them is under a month, collapse it (Zhangjiang High-Tech Park: elevated closed
  2010-02-14, underground opened 2010-02-24, so both change on 2010-02-24). Longer gaps where the
  service really was cut back are kept (Line 3 at Shanghai South Railway Station 2004-01-01 → 2005-10-15;
  Dongfang Road closed 2005-10-22 → reopened as Century Avenue 2006-10-28).

**Renames**: the date the new name took effect.

- Station renames are one element with two states. Line renames change the legend entry **and**
  every track of that line on the same date (Pearl Line → Line 3 on 2002-08-08).
- Only the English name matters. An English-only rename is a change (West Shanghai Railway Station →
  Shanghai West Railway Station, 2021-01-23). A Chinese-only rename that keeps the English name is not.

**Interchange changes**: the date the operator announced the passage opened or the transfer
rule changed (§6).

## 8. Scope: what goes on the map

Include:

- Every line of the primary system, and of the secondary system if the app shows one (KCR for MTR;
  the Suburban Railway lines for Shanghai), with every station and every historical alignment.
- Temporary lines that carried the public (the Expo Line).
- Trams and light rail belonging to the system, as **tracks only, without stop markers** (MTR Light Rail,
  Songjiang Tram). Their interchange stations keep the heavy-rail markers.
- Other rail modes the operator's own map treats as part of the network (Shanghai Maglev,
  MTR Ngong Ping 360), with markers only where they meet the network.
- Geography: land and water fills, and nothing else.

Exclude:

- Planned, under-construction or never-opened lines and stations; depots, sidings, freight lines,
  connecting tracks.
- National rail or other cities' systems that aren't part of the secondary system (e.g. Suzhou Metro
  at Huaqiao).
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

- MUST: `lines` is an array of `{ "id", "label", "color" }`. Labels follow §2 without a prefix. `color`
  is any CSS colour. Shanghai uses `rgb(r,g,b)`, and `#rrggbb` also works.
- MUST: `id` is a short stable code of lowercase letters and digits (`erl`, `2`, `xinlu`), unique
  within the system. Station markers reference it in `data-lines` (§5). It never appears in labels.
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
- MUST: **one entry for every date on which the map changes, and no entry on any other date.**
  `check_map.py` enforces this. A map change is anything becoming visible or hidden, a rename, a
  circle becoming a capsule, or a connector appearing or disappearing.
- MUST: describe only what the map shows that day, using the names the map shows **that day**.
- Descriptions within an entry are sorted naturally (so `Line 2` comes before `Line 10`). Use these templates:

| Change                         | Template                                      |
| ------------------------------ | --------------------------------------------- |
| section opens / closes         | `<Line>: <A> - <B> opens` / `closes`          |
| single station opens / closes  | `<Line>: <Station> opens` / `closes`          |
| station or line rename         | `<Old> → <New>`                               |
| paid-area interchange begins   | `<Station>: in-station interchange opens`     |
| out-of-station transfer begins | `<Station>: out-of-station interchange opens` |
| a line stops serving a station | `<Line>: stops serving <Station>`             |

- `<Line>` is the legend name that day (`Line 2`, `Pearl Line`, `Maglev`, `Songjiang Tram 2`).
  `<A> - <B>` uses a spaced hyphen.
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

**Procedure**:

1. From the timeline article, list every opening, closure and rename. That's the completeness baseline.
2. Confirm each date in the local-language line article, then each station's own article (stations
   opened late, former names, relocations).
3. For every interchange, find its classification history (§6): the operator's current list of
   out-of-station transfers, the "formerly out-of-station" list, and each station's transfer
   section. Separate-ticketing eras count as out-of-station.
4. Apply the rules of §7, especially "first public day" and "omit suspensions".
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
6. **Resize markers** to the formulas in §5 for the chosen `W`, and snap every circle centre onto its track.
7. **Label everything** per §2 and §7, then build `lines.json` and `events.json`.
8. Round coordinates to 3 decimals, and check that every `id` is unique.

## 13. Checklist

- [ ] Assets in `src/assets/<key>/`, entry in `systems.ts`, link in `Home.tsx`; `minDate` ≤ first change, `maxDate` ≥ last change.
- [ ] `zoom-layer` › (`geography`) › `lines` › `stations`; only labelled path/circle/rect; paint on groups; no text/title/defs/use.
- [ ] Every label matches §2. Names are the verbatim English names of that period, and prefixes appear on markers only.
- [ ] Sizes follow §5. Circles are on their tracks, capsules cover all their lines, and no marker sits on a line that doesn't stop there.
- [ ] Interchanges follow the operator's dated classification (§6), with connectors for out-of-station periods.
- [ ] Openings are first public days, suspensions are omitted, and switchover gaps under a month are collapsed (§7).
- [ ] Every track's name matches a legend entry at every moment (§9).
- [ ] Every marker has `data-lines` with legend ids, inside its own dates (§5).
- [ ] Every track has `data-km`, and each line's present-day sum equals its published length (§4).
- [ ] `events.json` has one entry per change date and none otherwise, using the §10 templates.
- [ ] `check_map.py` prints `OK`. The rendered checks (§11 step 6) look right. `npm run lint` and `npm run build` pass.

## Legacy MTR differences

MTR predates this spec. Don't copy these patterns into new systems:

- Track colours are also set by per-path CSS classes (`.er`, `.kt`, …), which the legend colour overrides.
- Track width is set inline per path (`stroke-width:1.5`) instead of on the `lines` group. Caps are round.
- Light Rail is drawn as a simplified network: only its four interchange stops are markers, the 1988
  trunk and the 1993 Tin Shui Wai branch are dated, and later extensions are not.

## Appendix: `check_map.py`

Save it anywhere and run it from the repository root: `python3 check_map.py sh`. It checks
structure, labels, legend coverage, `data-lines`, `data-km` and the segment limit of §4, and compares
change dates with `events.json`. It also prints each line's present-day length to compare with the
operator's figure. It doesn't check geometry otherwise; §11 step 6 covers that.

```python
# python3 check_map.py <system-key>   (run from the repo root)
import json, re, sys
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
LABEL = re.compile(rf'^[!^]?{STATE}(?:,{STATE})*$')
LINES = re.compile(rf'^[a-z0-9]+={DATE}(?:-{DATE})?(?:,[a-z0-9]+={DATE}(?:-{DATE})?)*$')
errors = []

def states(label):
    out = []
    for part in label.lstrip('!^').split(','):
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
for tag, attrs in children('lines'):
    label = re.search(r'inkscape:label="([^"]*)"', attrs)
    if tag != 'path' or not label:
        errors.append(f'lines layer: only labelled <path> allowed, found <{tag}>')
        continue
    if label.group(1)[0] in '!^':
        errors.append(f'track {label.group(1)!r}: prefixes belong on station markers only')
    st = check_label('track', label.group(1))
    record('track', st)
    d = re.search(r'\bd="([^"]*)"', attrs)
    if d and len(re.findall(r'[Ll]', d.group(1))) >= 256:
        errors.append(f'track {label.group(1)!r} has 256+ straight segments: Safari draws it in pieces (§4)')
    km = re.search(r'data-km="([^"]*)"', attrs)
    if not km or not re.fullmatch(r'\d+\.\d', km.group(1)) or float(km.group(1)) <= 0:
        errors.append(f'track {label.group(1)!r}: missing or malformed data-km (§4)')
    else:
        track_km.append((st, float(km.group(1))))
    track_names += st
markers = []  # (label, states, data-lines match)
for tag, attrs in children('stations'):
    label = re.search(r'inkscape:label="([^"]*)"', attrs)
    if tag not in ('circle', 'rect', 'path') or not label:
        errors.append(f'stations layer: only labelled <circle>/<rect>/<path> allowed, found <{tag}>')
        continue
    if tag == 'path' and 'fill="none"' not in attrs:
        errors.append(f'connector {label.group(1)!r} needs fill="none"')
    transform = re.search(r'transform="([^"]*)"', attrs)
    if tag == 'rect' and not (transform and re.fullmatch(r'translate\([-\d.]+,[-\d.]+\) rotate\([-\d.]+\)', transform.group(1))):
        errors.append(f'capsule {label.group(1)!r}: transform must be exactly "translate(x,y) rotate(deg)"')
    st = check_label(tag, label.group(1))
    record({'circle': 'station', 'rect': 'interchange', 'path': 'connector'}[tag], st)
    if tag != 'path':
        markers.append((label.group(1), st, re.search(r'data-lines="([^"]*)"', attrs)))

legend_states, legend_ids = [], {}
for entry in legend:
    if entry['label'][0] in '!^':
        errors.append(f'legend {entry["label"]!r}: no prefixes in lines.json')
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
for label, st, data_lines in markers:
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

if events is not None:
    dates = [e['date'] for e in events]
    if dates != sorted(set(dates)):
        errors.append('events.json: dates must be unique and ascending')
    for e in events:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', e['date']) or not e['descriptions']:
            errors.append(f'events.json: bad entry {e}')
    for d in sorted(set(log) - set(dates)):
        errors.append(f'map changes on {d} but events.json has no entry: {sorted(log[d])}')
    for d in sorted(set(dates) - set(log)):
        errors.append(f'events.json has {d} but nothing changes on the map that day')

if not errors:  # each line's length on the last change date, to compare with the operator's figure
    today = max(log)
    for name, start, end in legend_states:
        if start <= today and (end is None or today < end):
            total = sum(km for st, km in track_km if any(n == name and s <= today and (e is None or today < e) for n, s, e in st))
            print(f'  {name}: {total:.1f} km')
print('\n'.join(errors) or f'{key}: OK ({len(log)} change dates)')
sys.exit(1 if errors else 0)
```
