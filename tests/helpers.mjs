import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLabelDates } from '../src/utils.ts';

export const repo = fileURLToPath(new URL('..', import.meta.url));
export const read = path => readFileSync(join(repo, path), 'utf8');
export const readJson = path => JSON.parse(read(path));

export const systems = [...read('src/systems.ts').matchAll(/\n {4}(\w+): defineSystem\(/g)].map(
    ([, key]) => key,
);

export const date = value => Date.parse(`${value}T00:00:00Z`);
export const today = () => new Date().toISOString().slice(0, 10);

export const attrs = tag =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));

export const mapSvg = system => read(`src/assets/${system}/map.svg`);
export const legendLines = system => readJson(`src/assets/${system}/data/lines.json`).lines;
export const legend = system =>
    legendLines(system).map(line => ({ ...line, states: parseLabelDates(line.label) }));

/** Station markers (circles and interchange groups) as `{ localName, attrs }`, in file order. */
export function markers(system) {
    const svg = mapSvg(system);
    const layer = svg.slice(svg.search(/<g\b[^>]*id="stations"/));
    return [...layer.matchAll(/<(circle|g)\b[^>]*\bid="station-[^>]*>/g)].map(
        ([tag, localName]) => ({
            localName,
            attrs: attrs(tag),
        }),
    );
}

/** The tracks of `map` visible on `day` (YYYY_MM_DD), in file order, with the name they carry that day. */
export function activeTracks(map, day) {
    const layer = map.slice(map.indexOf('id="lines"'), map.indexOf('id="stations"'));
    return [...layer.matchAll(/<path\b[^>]*>/g)].flatMap(([tag]) => {
        const { d, 'inkscape:label': label } = attrs(tag);
        for (const state of label.split(',')) {
            const at = state.lastIndexOf('=');
            const [start, end] = state.slice(at + 1).split('-');
            if (start <= day && (!end || day < end)) {
                return [{ d, name: state.slice(0, at) }];
            }
        }
        return [];
    });
}

/** Legend colour by every name a line has carried. */
export function legendColors(lines) {
    const colors = new Map();
    for (const { label, color } of lines) {
        for (const state of label.split(',')) {
            colors.set(state.slice(0, state.lastIndexOf('=')), color);
        }
    }
    return colors;
}

/** `rgb(r, g, b)`, `#rgb` or `#rrggbb` → lower-case `#rrggbb`. */
export function normalizeColor(color) {
    const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(color.trim());
    if (rgb) {
        return `#${rgb
            .slice(1)
            .map(n => Number(n).toString(16).padStart(2, '0'))
            .join('')}`;
    }
    const hex = color.trim().toLowerCase();
    return hex.length === 4 ? `#${[...hex.slice(1)].map(c => c + c).join('')}` : hex;
}
