import assert from 'node:assert/strict';
import test from 'node:test';
import { attrs, legendLines, mapSvg, systems } from './helpers.mjs';

const names = label => label.split(',').map(state => state.split('=')[0]);

/** Points along an absolute M/L/C/Q path, a fraction of a unit apart. */
function flatten(d) {
    const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    const points = [];
    let [x, y] = [0, 0];
    let command = '';
    let i = 0;
    const next = () => Number(tokens[i++]);
    const sample = (at, n) => {
        for (let k = 1; k <= n; k++) points.push(at(k / n));
    };
    while (i < tokens.length) {
        if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
        const [x0, y0] = [x, y];
        if (command === 'M') {
            [x, y] = [next(), next()];
            points.push([x, y]);
            command = 'L';
        } else if (command === 'L') {
            const [x1, y1] = [next(), next()];
            sample(t => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], 200);
            [x, y] = [x1, y1];
        } else if (command === 'C') {
            const [x1, y1, x2, y2, x3, y3] = [next(), next(), next(), next(), next(), next()];
            sample(t => {
                const u = 1 - t;
                return [
                    u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                    u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
                ];
            }, 400);
            [x, y] = [x3, y3];
        } else if (command === 'Q') {
            const [x1, y1, x2, y2] = [next(), next(), next(), next()];
            sample(t => {
                const u = 1 - t;
                return [
                    u * u * x0 + 2 * u * t * x1 + t * t * x2,
                    u * u * y0 + 2 * u * t * y1 + t * t * y2,
                ];
            }, 200);
            [x, y] = [x2, y2];
        } else {
            throw new Error(`unsupported path command ${command}`);
        }
    }
    return points;
}

function distance([px, py], points) {
    let best = Infinity;
    for (let k = 1; k < points.length; k++) {
        const [ax, ay] = points[k - 1];
        const [bx, by] = points[k];
        const [dx, dy] = [bx - ax, by - ay];
        const t = Math.max(
            0,
            Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)),
        );
        best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy));
    }
    return best;
}

for (const system of systems) {
    test(`${system}: each line an interchange serves has one platform, on its line`, () => {
        const svg = mapSvg(system);
        const ids = new Map(
            legendLines(system).flatMap(line => names(line.label).map(name => [name, line.id])),
        );
        const layer = /<g\b[^>]*id="lines"[^>]*>([\s\S]*?)<\/g>/.exec(svg)[1];
        const tracks = [...layer.matchAll(/<path\b[^>]*>/g)].map(([tag]) => {
            const { d, 'inkscape:label': label } = attrs(tag);
            return { lines: new Set(names(label).map(name => ids.get(name))), points: flatten(d) };
        });

        const problems = [];
        for (const [tag] of svg.matchAll(/<g\b[^>]*data-platforms="[^"]*"[^>]*>/g)) {
            const { id, 'data-lines': lines, 'data-platforms': entries } = attrs(tag);
            const served = [...new Set(names(lines))].sort();
            const platforms = new Map(
                entries
                    .trim()
                    .split(/\s+/)
                    .map(entry => {
                        const [line, xy] = entry.split(':');
                        return [line, xy.split(',').map(Number)];
                    }),
            );
            if (served.join() !== [...platforms.keys()].sort().join()) {
                problems.push(
                    `${id}: platforms ${[...platforms.keys()]} don't match data-lines ${served}`,
                );
            }
            for (const [line, point] of platforms) {
                const own = tracks.filter(track => track.lines.has(line));
                const off = Math.min(...own.map(track => distance(point, track.points)));
                if (!(off <= 0.01))
                    problems.push(`${id}: ${line} platform is ${off.toFixed(3)} off its line`);
            }
        }
        assert.deepEqual(problems, []);
    });
}
