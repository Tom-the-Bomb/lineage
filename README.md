<div align="center">
    <img src="public/logo.svg" width="64" height="64" alt="Lineage logo" />
    <h1 align="center"><a href="https://lineage.tomthebomb.dev/">Lineage</a></h1>
    <sup align="center">The history of 14 metro networks, drawn day by day.</sup>
</div>
<br/>

<div align="center">Built with <code>React</code>, <code>TS</code>, <code>Tailwind</code> and <code>Vite</code>.
    <a href="https://d3js.org/"><code>D3.js</code></a> animates the SVG maps.
</div>

## Coverage

Trams, light rail, the Nippori-Toneri Liner and the Pingshan and Bishan SkyShuttles are drawn as tracks only, without stations.

- [MTR](https://www.mtr.com.hk/en/corporate/main/index.html), with the [KCR](https://www.kcrc.com/index.html), the High Speed Rail's Hong Kong section, Ngong Ping 360 and the LRT
- [Shanghai Metro](https://en.wikipedia.org/wiki/Shanghai_Metro), with the [Suburban Railway](https://en.wikipedia.org/wiki/Shanghai_Suburban_Railway), the [Maglev](https://en.wikipedia.org/wiki/Shanghai_maglev_train) and Songjiang trams
- [Taipei Metro](https://en.wikipedia.org/wiki/Taipei_Metro) as on its official map: New Taipei Metro's Circular, Sanying, Danhai and Ankeng lines, the [Taoyuan Airport MRT](https://en.wikipedia.org/wiki/Taoyuan_Airport_MRT) and the [Maokong Gondola](https://english.gondola.taipei/cp.aspx?n=6D76903BDB902EED)
- [Singapore MRT](<https://en.wikipedia.org/wiki/Mass_Rapid_Transit_(Singapore)>) and [LRT](<https://en.wikipedia.org/wiki/Light_Rail_Transit_(Singapore)>)
- [Tokyo Metro](https://www.tokyometro.jp/en/) and [Toei Subway](https://www.kotsu.metro.tokyo.jp/eng/services/subway.html) with their predecessors, the Toden Arakawa Line and Nippori-Toneri Liner
- [Shenzhen Metro](https://www.szmc.net/), Longhua Tram and Pingshan Skyshuttle
- [Hangzhou Metro](https://www.hzmetro.com/)
- [Guangzhou Metro](https://www.gzmtr.com/) and [Foshan Metro](https://www.fmetro.net/), with Guangfo, APM and the Haizhu, Huangpu and Nanhai trams
- [Chengdu Metro](https://en.wikipedia.org/wiki/Chengdu_Metro) and Tram Line 2
- [Beijing Subway](https://www.bjsubway.com/), with both airport railways, S1 and the Xijiao and Yizhuang T1 trams
- [Nanjing Metro](https://www.njmetro.com.cn/), with the suburban lines and Hexi and Qilin trams
- [Chongqing Rail Transit](https://www.cqmetro.cn/), with the Jiangtiao and Bitong railways and Bishan SkyShuttle
- [Xi'an Metro](https://www.xianrail.com/), with its Xianyang sections, the Xihu Line and Line 14's Airport Intercity predecessor
- [Seoul Metropolitan Subway](https://www.seoulmetro.co.kr/en/): Seoul Lines 1-9, Incheon Lines 1-2, Korail, AREX, Shinbundang, Seohae, GTX-A and 5 LRT lines

## Map sources

These maps started from a Wikimedia Commons SVG, except Singapore's from mrt.sg. I extended them with [OpenStreetMap](https://www.openstreetmap.org/) and reworked them to follow [`docs/map-data-spec.md`](docs/map-data-spec.md).

[Hong Kong](https://commons.wikimedia.org/wiki/File:Hong_Kong_Railway_Route_Map_en.svg),
[Shanghai](https://commons.wikimedia.org/wiki/File:Shanghai_Metro_Linemap.svg),
[Taipei](https://commons.wikimedia.org/wiki/File:Taipei_Metro_geographical_map.svg),
[Singapore](https://mrt.sg/map),
[Tokyo](https://commons.wikimedia.org/wiki/File:Tokyo_Subway_Linemap_en.svg),
[Shenzhen](https://commons.wikimedia.org/wiki/File:Shenzhen_Metro_Linemap.svg),
[Hangzhou](https://commons.wikimedia.org/wiki/File:Hangzhou_Metro_Linemap.svg),
[Guangzhou](https://commons.wikimedia.org/wiki/File:Guangzhou_Metro_Linemap.svg),
[Chengdu](https://commons.wikimedia.org/wiki/File:Chengdu_Metro_Linemap.svg).

Beijing, Nanjing, Chongqing, Xi'an and Seoul are drawn from scratch using OpenStreetMap.

## Map format

The full rules are in [`docs/map-data-spec.md`](docs/map-data-spec.md). Check a map with `npm run check-map <key>`, and run `npm test` for everything.

Each system lives in `src/assets/<key>/`:

```
map.svg            the map
preview.svg        home-page thumbnail (node tests/regen-previews.mjs <key>)
data/lines.json    legend: line names and colors over time
data/events.json   changelog text for each date
```

### Labels

History is stored as comma-separated `name=start-end` states. Dates are `YYYY_MM_DD`, either can be left out (open-ended), and `_` in a name shows as a space.

```
inkscape:label="Pearl_Line=2000_12_26-2002_08_08,Line_3=2002_08_08"
data-logos="kcr=-2007_12_02,mtr=2007_12_02"
```

### Layers

```xml
<g id="zoom-layer">          <!-- zoom and pan move this group -->
  <g id="geography">...</g>  <!-- land, water, coastlines -->
  <g id="lines">...</g>      <!-- tracks -->
  <g id="stations">...</g>   <!-- walking connectors, then station markers -->
</g>
```

### Lines

One `<path>` per stretch of track with its own dates:

```xml
<path
  id="line-1--xinlonghua-original--xujiahui--1997-07-01"
  inkscape:label="Line_1=1997_07_01-2004_12_04"
  data-km="4.1"
  data-takes-over="line-1--jinjiang-park-original--xujiahui--1993-05-28"
  d="M... L..."
/>
```

- IDs are `<line>--<from>--<to>--<YYYY-MM-DD>`. Colors come from `lines.json`; `stroke` is only a fallback for editors.
- `data-km` is the published route length, used for statistics.
- `data-takes-over` replaces part of that track on the day it ends, so their shared geometry doesn't animate.
- `data-continues="start|end"` marks an end that runs past the border with no station, like Lo Wu 1911-1949 (checker only).
- New track grows out of the part of its line that stays. A line with nothing staying grows from the start of its earliest `d`, so draw tracks in the direction the line opened.

### Stations

A single-line station is a `<circle>`. An interchange is a `<g>` with a dot on each line's platform, joined by bridges along the walkways:

```xml
<g
  id="station-xujiahui-4--2010-04-07"
  inkscape:label="Xujiahui=2010_04_07-2013_08_31"
  data-lines="1=2010_04_07-2013_08_31,9=2010_04_07-2013_08_31"
  data-logos="metro"
  data-platforms="1:2253.160,1246.724 9:2245.718,1233.321"
>
  <path class="dots" ... />
  <path class="bridges" ... />
</g>
```

- IDs are `station-<name>[-<suffix>][--<YYYY-MM-DD>]`. The suffix splits out-of-station interchanges into separate search entries; the date only keeps SVG IDs unique.
- `data-lines` and `data-logos` use the label format. `data-platforms` and the `dots` / `bridges` classes are for the checker only.
- Walking transfers between separate stations are thin `<path id="walking-transfer-...">` lines.

### Geography

Geography is a static background, and every map uses the same colors: land `#f6f6f3` (the page background), water `#dde6ed`, foreign land `#eceeef`, coastlines `#c0cfd9`. The app recolors it for dark mode and swaps the coastlines' `non-scaling-stroke` for a zoom-driven width, which is faster in Safari. Large paths are split into tiles so browsers only redraw what's on screen.

## Legacy

A revamp of [MTR History](https://9808f789.mtr-history.pages.dev) ([last snapshot](https://github.com/Tom-the-Bomb/lineage/tree/9aa3e65174eb16cc44d46a3dbc72e0189e1e393d)).

## AI

I mostly used LLMs to automate the map setup, data compilation and tests in `docs/`, `src/assets/<key>/` and `tests/`.
