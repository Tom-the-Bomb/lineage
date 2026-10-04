import { utcMonth } from 'd3';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { parseLabelDates } from '../src/utils.ts';
import { DEFAULT_SETTINGS, STEP_UNITS } from '../src/utils_d3.ts';
import { date, legendLines, mapSvg, read, readJson, systems, today } from './helpers.mjs';

// run Map's real playback effect, extracted from its source, against a controlled timer
const source = ts.createSourceFile(
    'Map.tsx',
    read('src/components/Map.tsx'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
);
let effect;
(function visit(node) {
    if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === 'useEffect' &&
        node.arguments[0].getText(source).includes('d3.interval(')
    ) {
        effect = node.arguments[0].getText(source);
    }
    ts.forEachChild(node, visit);
})(source);
assert.ok(effect, 'Map must keep its interval playback effect');

const runEffect = new Function(
    'd3',
    'setTime',
    'setPlaying',
    'eventDates',
    'maxDate',
    'playing',
    'time',
    'svgDoc',
    'settings',
    'STEP_UNITS',
    'findNextEventDate',
    `return (${effect})();`,
);

function step(time, max, events, playing = true, loaded = true) {
    let tick;
    let delay;
    let stopped = false;
    const timer = {
        utcMonth,
        interval(callback, milliseconds) {
            tick = callback;
            delay = milliseconds;
            return { stop: () => (stopped = true) };
        },
    };
    const cleanup = runEffect(
        timer,
        value => (time = value),
        value => (playing = value),
        events,
        new Date(max),
        playing,
        time,
        loaded,
        DEFAULT_SETTINGS,
        STEP_UNITS,
        prev => events.find(event => event > prev) ?? max,
    );
    tick?.();
    cleanup?.();
    if (tick) assert.equal(stopped, true, 'cleanup stops the pending timer');
    return { time, delay, playing };
}

test('playback visits nearby events once, then resumes monthly steps', () => {
    const events = ['2024-09-16', '2024-09-21', '2024-09-28'].map(date);
    const max = date('2024-12-31');
    let time = date('2024-09-01');
    for (const expected of [...events, date('2024-10-01'), date('2024-11-01')]) {
        time = step(time, max, events).time;
        assert.equal(time, expected);
    }
});

test('month-end scrubbing cannot overflow February or skip its events', () => {
    const events = ['2024-02-01', '2024-02-29'].map(date);
    const max = date('2024-03-31');
    assert.equal(step(date('2024-01-31'), max, events).time, events[0]);
    assert.equal(step(events[0], max, events).time, events[1]);
    assert.equal(step(events[1], max, events).time, date('2024-03-01'));
});

test('playback stops at the cutoff even with no remaining events', () => {
    const max = date('2025-12-31');
    assert.equal(step(date('2025-12-01'), max, []).time, max);
    assert.equal(step(max, max, []).time, max);
});

test('the interval pauses at events and does not run while paused or loading', () => {
    const time = date('2024-02-01');
    const max = date('2024-12-31');
    assert.equal(step(time, max, [time]).delay, DEFAULT_SETTINGS.pauseMs);
    assert.equal(step(time, max, []).delay, 40);
    assert.equal(step(time, max, [], false).delay, undefined);
    assert.equal(step(time, max, [], true, false).delay, undefined);
    assert.equal(step(date('2024-12-01'), max, []).playing, false);
});

for (const system of systems) {
    test(`${system}: playback reaches every map and legend change in order`, () => {
        const svg = mapSvg(system);
        const labels = [
            ...[...svg.matchAll(/inkscape:label="([^"]*=[^"]*)"/g)].map(([, label]) => label),
            ...[...svg.matchAll(/data-logos="([^"]*=[^"]*)"/g)].map(([, logos]) => logos),
            ...legendLines(system).map(line => line.label),
        ];
        const history = readJson(`src/assets/${system}/data/events.json`);
        const start = date(`${history[0].date.slice(0, 4)}-01-01`);
        const max = date(today());
        const events = history.map(event => date(event.date));
        assert.ok(events.length > 0);

        const changes = labels.flatMap(label =>
            parseLabelDates(label).flatMap(({ dateRange }) => [
                dateRange.appear.getTime(),
                dateRange.removed.getTime(),
            ]),
        );
        for (const time of changes.filter(time => time >= start && time <= max)) {
            assert.ok(
                events.includes(time),
                `${new Date(time).toISOString().slice(0, 10)} changes the map but has no event`,
            );
        }

        const visited = [start];
        while (visited.at(-1) < max) {
            const next = step(visited.at(-1), max, events).time;
            assert.ok(next > visited.at(-1), 'playback must not get stuck on an event');
            visited.push(next);
        }
        assert.deepEqual(
            visited.filter(time => events.includes(time)),
            events.filter(time => time >= start && time <= max),
        );
        assert.equal(visited.at(-1), max);
    });
}
