import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
    activeTracks,
    legendColors,
    legendLines,
    mapSvg,
    normalizeColor,
    read,
    readJson,
    repo,
    systems,
    today,
} from './helpers.mjs';

test('systems.ts defines systems', () => {
    assert.ok(systems.length > 0);
});

const docs = read('docs/timeline-sources.md');
const sections = [...docs.matchAll(/^## .*\(`(\w+)`\)\s*$/gm)].map((match, i, all) => ({
    key: match[1],
    text: docs.slice(match.index, all[i + 1]?.index ?? docs.length),
}));

for (const system of systems) {
    test(`${system}: check_map.py passes`, () => {
        const run = spawnSync('python3', ['tests/check_map.py', system], {
            cwd: repo,
            encoding: 'utf8',
        });
        assert.equal(run.error, undefined, `could not run python3: ${run.error}`);
        assert.equal(run.status, 0, run.stdout + run.stderr);
    });

    test(`${system}: preview.svg draws the present-day tracks in legend colours`, () => {
        const colors = legendColors(legendLines(system));
        const expected = activeTracks(mapSvg(system), today().replaceAll('-', '_')).map(
            ({ d, name }) => `${normalizeColor(colors.get(name))} ${d}`,
        );
        const actual = [...read(`src/assets/${system}/preview.svg`).matchAll(/<path\b[^>]*>/g)].map(
            ([tag]) => {
                const d = /\bd="([^"]*)"/.exec(tag)[1];
                return `${normalizeColor(/\bstroke="([^"]*)"/.exec(tag)[1])} ${d}`;
            },
        );
        assert.deepEqual(
            actual.sort(),
            expected.sort(),
            `preview.svg is out of date: run node tests/regen-previews.mjs ${system}`,
        );
    });

    test(`${system}: the timeline-sources.md event table quotes events.json`, () => {
        const section = sections.find(({ key }) => key === system);
        assert.ok(section, `timeline-sources.md has no "## … (\`${system}\`)" section`);
        const rows = new Map(
            [...section.text.matchAll(/^\| (\d{4}-\d\d-\d\d) \| ([^|]*?)\s*\|/gm)].map(
                ([, day, text]) => [day, text],
            ),
        );
        const events = readJson(`src/assets/${system}/data/events.json`);
        for (const { date, descriptions } of events) {
            assert.equal(rows.get(date), descriptions.join('; '), `${system} ${date}`);
        }
        assert.equal(rows.size, events.length, 'the table has dates that events.json does not');
    });
}
