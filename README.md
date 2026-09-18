# Metro History

A comprehensive overview of the history of several of the world's best metro systems.

Powered by [`D3.js`](https://d3js.org/) for animating SVG map elements, `React` with `TS`, `Tailwind`, and `Vite`.

## Coverage
- [Mass Transit Railway](https://www.mtr.com.hk/en/corporate/main/index.html) (MTR) Corporation (Includes relevant parts of the [Kowloon Canton Railway](https://www.kcrc.com/index.html) (KCR))
- [Shanghai Metro](https://en.wikipedia.org/wiki/Shanghai_Metro) (Includes the [Shanghai Suburban Railway](https://en.wikipedia.org/wiki/Shanghai_Suburban_Railway))


## Labels

Since the `SVG` for the map was processed in [`inkscape`](https://inkscape.org/)
This app uses a special syntax within the inkscape labels
for the website to process the station and line names, dates and other relevant information:

The label processing code can be found at `parseLabelDates()` in [`utils.ts`](https://github.com/Tom-the-Bomb/mtr-history/blob/main/src/utils.ts)

```txt
(!|^)?<name>=<start-date>-<end-date>,...
```

`<name>` is displayed exactly as written, with underscores in place of spaces.
A line whose current name matches a legend entry in `lines.json` is drawn in that entry's colour.
If there is no end-date, it is assumed it exists **present day**

### Indicators

Helps indicate which system each line segment is part of:

#### Example

In the MTR system:

- `^` indicates that this station was once part of the [KCR](https://en.wikipedia.org/wiki/Kowloon%E2%80%93Canton_Railway)
- `!` indicates that this station was once part of **both** the MTR and KCR.