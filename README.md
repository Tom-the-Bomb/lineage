<div align="center">
    <img src="public/logo.svg" width="64" height="64" alt="Lineage logo" />
    <h1 align="center">Lineage</h1>
</div>

A comprehensive overview of the history of several of the world's best metro systems.

[Explore Lineage](https://lineage.tomthebomb.dev/) · Transit through time.

Powered by [`D3.js`](https://d3js.org/) for animating SVG map elements, `React` with `TS`, `Tailwind`, and `Vite`.

## Coverage

- [Mass Transit Railway](https://www.mtr.com.hk/en/corporate/main/index.html) (MTR) Corporation (Includes relevant parts of the [Kowloon Canton Railway](https://www.kcrc.com/index.html) (KCR))
- [Shanghai Metro](https://en.wikipedia.org/wiki/Shanghai_Metro) (Includes the [Shanghai Suburban Railway](https://en.wikipedia.org/wiki/Shanghai_Suburban_Railway))
- [Taipei Metro](https://en.wikipedia.org/wiki/Taipei_Metro) (Includes the Circular line, now run by New Taipei Metro, and the [Maokong Gondola](https://english.gondola.taipei/cp.aspx?n=6D76903BDB902EED))
- [Singapore MRT](<https://en.wikipedia.org/wiki/Mass_Rapid_Transit_(Singapore)>) (Includes the [LRT](<https://en.wikipedia.org/wiki/Light_Rail_Transit_(Singapore)>) lines, as tracks only)
- [Tokyo Metro](https://www.tokyometro.jp/en/) and [Toei Subway](https://www.kotsu.metro.tokyo.jp/eng/services/subway.html), including their predecessors
- [Shenzhen Metro](https://www.szmc.net/), including Longhua Tram and Pingshan Skyshuttle as tracks only
- [Hangzhou Metro](https://www.hzmetro.com/)
- [Guangzhou Metro](https://www.gzmtr.com/) and [Foshan Metro](https://www.fmetro.net/), including Guangfo and APM, plus Haizhu, Huangpu and Nanhai trams as tracks only
- [Beijing Subway](https://www.bjsubway.com/), including both airport railways, S1, and Xijiao / Yizhuang T1 trams as tracks only
- [Nanjing Metro](https://www.njmetro.com.cn/), including the suburban lines and Hexi / Qilin trams as tracks only
- [Chongqing Rail Transit](https://www.cqmetro.cn/), including Jiangtiao and Bitong suburban railways, plus Bishan SkyShuttle as tracks only

## Asset Sources

### Maps

Maps are sourced from below and heavily modified according to `docs/map-data-spec.md`

(All sourced from [Wikimedia Commons](commons.wikimedia.org)) unless specified

- [Mass Transit Railway](https://commons.wikimedia.org/wiki/File:Hong_Kong_Railway_Route_Map_en.svg)
- [Shanghai Metro](https://commons.wikimedia.org/wiki/File:Shanghai_Metro_Linemap.svg)
- [Taipei Metro](https://commons.wikimedia.org/wiki/File:Taipei_Metro_geographical_map.svg)
- [Singapore MRT](https://mrt.sg/map) (from official MRT website)
- [Tokyo Subway](https://commons.wikimedia.org/wiki/File:Tokyo_Subway_Linemap_en.svg)
- [Shenzhen Metro](https://commons.wikimedia.org/wiki/File:Shenzhen_Metro_Linemap.svg)
- [Hangzhou Metro](https://commons.wikimedia.org/wiki/File:Hangzhou_Metro_Linemap.svg)
- [Guangzhou Metro](https://commons.wikimedia.org/wiki/File:Guangzhou_Metro_Linemap.svg)

- Beijing, Nanjing, Chongqing are drawn from scratch with [OpenStreetMap](https://www.openstreetmap.org/)

### Legacy

- Revamp of the old website [MTR History](https://9808f789.mtr-history.pages.dev) @ [Git snapshot](https://github.com/Tom-the-Bomb/lineage/tree/9aa3e65174eb16cc44d46a3dbc72e0189e1e393d)

### AI

- Primarily handwritten to prevent the dwindling of my skills, LLMs were used for automating the map (SVG) setup and data compilation in these directories:
  - `docs/*`
  - `src/assets/[system]/*`
