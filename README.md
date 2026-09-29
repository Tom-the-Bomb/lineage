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

### Legacy

- Revamp of the old website [MTR History](https://9808f789.mtr-history.pages.dev) @ [Git snapshot](https://github.com/Tom-the-Bomb/lineage/tree/9aa3e65174eb16cc44d46a3dbc72e0189e1e393d)

### AI

- Primarily handwritten code, LLMs were used for automating the map (SVG) setup and data compilation in these directories:
  - `docs/*`
  - `src/assets/[system]/*`
