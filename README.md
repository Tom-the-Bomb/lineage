<div align="center">
    <img src="public/logo.svg" width="64" height="64" alt="Lineage logo" />
    <h1 align="center"><a href="https://lineage.tomthebomb.dev/">Lineage</a></h1>
    <sup align="center">A comprehensive overview of the history of several of the world's best metro systems.</sup>
</div>
<br/>

<div align="center">Powered by <a href="https://d3js.org/"><code>D3.js</code></a> for animating SVG map elements,
    <code>React</code> with <code>TS</code>, <code>Tailwind</code>, and <code>Vite</code>
</div>

## Coverage

- [Mass Transit Railway](https://www.mtr.com.hk/en/corporate/main/index.html) (MTR) Corporation (Includes relevant parts of the [Kowloon Canton Railway](https://www.kcrc.com/index.html) (KCR), the High Speed Rail's Hong Kong section, Ngong Ping 360, and LRT as tracks only)
- [Shanghai Metro](https://en.wikipedia.org/wiki/Shanghai_Metro) (Includes the [Shanghai Suburban Railway](https://en.wikipedia.org/wiki/Shanghai_Suburban_Railway) and the [Maglev](https://en.wikipedia.org/wiki/Shanghai_maglev_train), plus Songjiang trams as tracks only)
- [Taipei Metro](https://en.wikipedia.org/wiki/Taipei_Metro) (as drawn on Taipei Metro's official route map: includes New Taipei Metro's Circular line, Sanying line and Danhai/Ankeng light rail (tracks only), the [Taoyuan Airport MRT](https://en.wikipedia.org/wiki/Taoyuan_Airport_MRT), and the [Maokong Gondola](https://english.gondola.taipei/cp.aspx?n=6D76903BDB902EED))
- [Singapore MRT](<https://en.wikipedia.org/wiki/Mass_Rapid_Transit_(Singapore)>) (Includes the [LRT](<https://en.wikipedia.org/wiki/Light_Rail_Transit_(Singapore)>) lines, as tracks only)
- [Tokyo Metro](https://www.tokyometro.jp/en/) and [Toei Subway](https://www.kotsu.metro.tokyo.jp/eng/services/subway.html), including their predecessors, plus Toei's Toden Arakawa Line and Nippori-Toneri Liner as tracks only
- [Shenzhen Metro](https://www.szmc.net/), including Longhua Tram and Pingshan Skyshuttle as tracks only
- [Hangzhou Metro](https://www.hzmetro.com/)
- [Guangzhou Metro](https://www.gzmtr.com/) and [Foshan Metro](https://www.fmetro.net/), including Guangfo and APM, plus Haizhu, Huangpu and Nanhai trams as tracks only
- [Chengdu Metro](https://en.wikipedia.org/wiki/Chengdu_Metro), including Tram Line 2 as tracks only
- [Beijing Subway](https://www.bjsubway.com/), including both airport railways, S1, and Xijiao / Yizhuang T1 trams as tracks only
- [Nanjing Metro](https://www.njmetro.com.cn/), including the suburban lines and Hexi / Qilin trams as tracks only
- [Chongqing Rail Transit](https://www.cqmetro.cn/), including Jiangtiao and Bitong suburban railways, plus Bishan SkyShuttle as tracks only
- [Xi'an Metro](https://www.xianrail.com/), including its Xianyang sections, the Xihu Line and Line 14's Airport Intercity predecessor
- [Seoul Metropolitan Subway](https://www.seoulmetro.co.kr/en/): Seoul Lines 1-9, Incheon Lines 1-2, Korail's metropolitan lines, AREX, Shinbundang, Seohae and GTX-A, plus 5 LRT lines as tracks only.

## Asset Sources

### Maps

Maps are sourced from below and heavily modified according to `docs/map-data-spec.md`

**Note:** All sourced from [Wikimedia Commons](https://commons.wikimedia.org) unless specified

- [Mass Transit Railway](https://commons.wikimedia.org/wiki/File:Hong_Kong_Railway_Route_Map_en.svg)
- [Shanghai Metro](https://commons.wikimedia.org/wiki/File:Shanghai_Metro_Linemap.svg)
- [Taipei Metro](https://commons.wikimedia.org/wiki/File:Taipei_Metro_geographical_map.svg)
- [Singapore MRT](https://mrt.sg/map) (from official MRT website)
- [Tokyo Subway](https://commons.wikimedia.org/wiki/File:Tokyo_Subway_Linemap_en.svg)
- [Shenzhen Metro](https://commons.wikimedia.org/wiki/File:Shenzhen_Metro_Linemap.svg)
- [Hangzhou Metro](https://commons.wikimedia.org/wiki/File:Hangzhou_Metro_Linemap.svg)
- [Guangzhou Metro](https://commons.wikimedia.org/wiki/File:Guangzhou_Metro_Linemap.svg)
- [Chengdu Metro](https://commons.wikimedia.org/wiki/File:Chengdu_Metro_Linemap.svg)

_All above maps have been expanded using [OpenStreetMap](https://www.openstreetmap.org/)_

- Beijing, Nanjing, Chongqing, Xi'an, Seoul are drawn from scratch with OpenStreetMap

## Map Format

A quick guide to the map files. The full rules are in [`docs/map-data-spec.md`](docs/map-data-spec.md).
Check a map with `npm run check-map <key>` ([`tests/check_map.py`](tests/check_map.py)); `npm test` runs it
for every system along with the other tests.

### Files

Each system lives in `src/assets/<key>/` (e.g. `shanghai`):

```
map.svg            the map
preview.svg        home-page thumbnail (generate via `node tests/regen-previews.mjs <key>`)
data/lines.json    legend: each line's names over time and its color
data/events.json   timeline text: what changes on each date (used for changelog)
```

### Label Format

Every line, station, and legend entry carries its whole history in a label:

comma-separated `[name]=[start]-[end]` **states**,
dates as `YYYY_MM_DD` and `_` in place of spaces.

A state indicates the element is visible from `[start, end)`

`start`, `end` are both optional (non-existent => start/end of time respectively)

#### Example

```
inkscape:label="Pearl_Line=2000_12_26-2002_08_08,Line_3=2002_08_08"
data-logos="kcr=-2007_12_02,mtr=2007_12_02"
```

### Layers

```xml
<svg viewBox="...">
  <g id="zoom-layer">          <!-- zoom and pan move this group -->
    <g id="geography">...</g>    <!-- background: land, water, coastlines -->
    <g id="lines">...</g>        <!-- tracks -->
    <g id="stations">...</g>     <!-- walking connectors first, then station markers -->
  </g>
</svg>
```

### Line (track)

One `<path>` per stretch of track with its own dates:

```xml
<path
  id="line-1--xinlonghua-original--xujiahui--1997-07-01"
  inkscape:label="Line_1=1997_07_01-2004_12_04"
  data-km="4.1"
  stroke="#e3002b"
  data-takes-over="line-1--jinjiang-park-original--xujiahui--1993-05-28"
  d="M... L..."
/>
```

- `inkscape:label`: the line's name(s) over time; the color comes from the matching `lines.json` entry.
- `stroke`: (not read by the app) a fallback color for viewing the file in an editor.
- `data-km`: published route length, summed for the stats.
- `data-takes-over="<id>"`: this track replaces part of another on the day it ends, so it appears in
  place instead of growing again.
- `data-continues="start|end"`: (checker only) Marks an end that runs on past the border with no station
  (Lo Wu, 1911–1949), so `check_map.py` doesn't require a station there.
- Tracks grow in from the start of `d`, so draw them in the direction the line opened.

### Station

A non-interchange station is a `<circle>`

```xml
<circle
  id="station-hengshan-road-7"
  inkscape:label="Hengshan_Road=1995_04_10"
  data-lines="1=1995_04_10"
  data-logos="metro"
  cx="..." cy="..." r="6.383"
/>
```

An interchange is a `<g>`: a dot on each line's real platform, joined by bridges along the walkways

```xml
<g
  id="station-xujiahui-4--2010-04-07"
  inkscape:label="Xujiahui=2010_04_07-2013_08_31"
  data-lines="1=2010_04_07-2013_08_31,9=2010_04_07-2013_08_31"
  data-logos="metro"
  data-platforms="1:2253.160,1246.724 9:2245.718,1233.321"
  fill="none"
>
  <path class="dots" d="M x,y L x,y ..." stroke-width="15.300" />
  <path class="bridges" d="M x,y L ... x,y" stroke-width="8.255" />
  <path class="dots" d="..." stroke="#fff" stroke-width="10.230" />
  <path class="bridges" d="..." stroke="#fff" stroke-width="3.185" />
</g>
```

- `data-lines`: which lines go through there, and when (same date syntax as [Label Format](#label-format)).
- `data-platforms`: (checker and tooling only). Each line's platform point on its own track, as the app draws
  the marker from its paths.
- `data-logos`: operator logos shown in the tooltip (keys from the system's `operators`), in [Label Format](#label-format).
- `class="dots"` / `class="bridges"`: (checker only). The app draws the paths as they are.
- A new `<g>` (id suffix `--YYYY-MM-DD`, date not read except to keep SVG IDs unique)
  starts whenever the lines served change.

  search groups the
  versions as a singular station (search entry) by the ID before `--`.

- Walking transfers between separate stations are thin `<path id="walking-transfer-...">` lines.

### Geography

the app never animates or reads it (static), except to recolor it for dark mode.

- One palette on every map: own land is the page background `#f6f6f3`, water `#dde6ed`, other land
  `#eceeef`, coastlines `#c0cfd9`.
- Coastlines have `vector-effect="non-scaling-stroke"` so they stay one pixel wide at every zoom, and the app
  replaces it for a manual, zoom-driven width at load, as a Safari performance improvement (cheaper repaint).
- Large paths are split into tiles (a `<g>` of plain pieces) so browsers only redraw what is on screen.

### Legacy

- Revamp of the old website [MTR History](https://9808f789.mtr-history.pages.dev) @ [Git snapshot](https://github.com/Tom-the-Bomb/lineage/tree/9aa3e65174eb16cc44d46a3dbc72e0189e1e393d)

### AI

- Primarily handwritten code, LLMs were used for automating the map (SVG) setup and data compilation in these directories and associated testing:
  - `docs/*`
  - `src/assets/[system]/*`
  - `tests/`
