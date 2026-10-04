// Rewrites src/assets/<key>/preview.svg from the map's present-day tracks, keeping each preview's own
// <svg> header and path style. Usage: node tests/regen-previews.mjs [key ...] (default: every system)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    activeTracks,
    legendColors,
    legendLines,
    mapSvg,
    normalizeColor,
    read,
    repo,
    systems,
    today,
} from './helpers.mjs';

const keys = process.argv.length > 2 ? process.argv.slice(2) : systems;
const day = today().replaceAll('-', '_');

for (const key of keys) {
    const preview = read(`src/assets/${key}/preview.svg`);
    const colors = legendColors(legendLines(key));

    const header = /<svg\b[^>]*>/.exec(preview)[0];
    const sample =
        /<path\b[^>]*>/.exec(preview)?.[0] ??
        '<path stroke="#000000" vector-effect="non-scaling-stroke"/>';
    const rgbStyle = sample.includes('stroke="rgb(');
    const upper =
        /stroke="#[0-9A-F]{6}"/.test(preview) && !/stroke="#[0-9a-f]*[a-f][0-9a-f]*"/.test(preview);
    const effect = sample.includes('vector-effect') ? ' vector-effect="non-scaling-stroke"' : '';
    const effectFirst =
        effect !== '' && sample.indexOf('vector-effect') < sample.indexOf('stroke=');
    const format = color => {
        const hex = normalizeColor(color);
        if (rgbStyle) {
            const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return upper ? hex.toUpperCase() : hex;
    };

    const paths = activeTracks(mapSvg(key), day).map(({ d, name }) => {
        const stroke = `stroke="${format(colors.get(name))}"`;
        return effectFirst
            ? `  <path${effect} d="${d}" ${stroke}/>`
            : `  <path d="${d}" ${stroke}${effect}/>`;
    });
    writeFileSync(
        join(repo, 'src/assets', key, 'preview.svg'),
        `${header}\n${paths.join('\n')}\n</svg>\n`,
    );
    console.log(`${key}: ${paths.length} tracks`);
}
