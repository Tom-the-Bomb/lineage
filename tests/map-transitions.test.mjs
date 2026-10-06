import { timerFlush } from 'd3';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { parseLabelDates } from '../src/utils.ts';
import { update } from '../src/utils_d3.ts';
import { attrs, date, legend, mapSvg } from './helpers.mjs';

// the parts of an element's style the renderer touches; transitions run on the real d3 scheduler
class Style {
    strokeDashoffset = '';
    strokeDasharray = '';
    visibility = '';
    opacity = '';
    getPropertyValue(name) {
        return this[camel(name)] ?? '';
    }
    setProperty(name, value) {
        this[camel(name)] = String(value);
    }
    removeProperty(name) {
        this.setProperty(name, '');
    }
}
const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '0.35' });

const duration = 100;

const hongkong = { svg: mapSvg('hongkong'), legend: legend('hongkong') };
const shanghai = { svg: mapSvg('shanghai'), legend: legend('shanghai') };

function track(id, { svg } = hongkong) {
    const tag = [...svg.matchAll(/<path\b[^>]*>/g)].find(([tag]) => tag.includes(`id="${id}"`))[0];
    const { 'inkscape:label': label, 'data-km': km } = attrs(tag);
    const line = {
        el: { id, style: Object.assign(new Style(), { visibility: 'hidden' }), dataset: {} },
        states: parseLabelDates(label),
        length: 100,
        km: Number(km ?? 0),
        span: [0, 100],
    };
    line.family = { tracks: [line], joins: [], cuts: [0, 100] };
    return line;
}

function continuing(track, line, [from, to]) {
    Object.assign(line, { family: track.family, span: [from, to], length: Math.abs(to - from) });
    track.family.tracks.push(line);
    track.family.cuts = [...new Set([...track.family.cuts, from, to])].sort((a, b) => a - b);
    return line;
}

function join(track, at, other, to) {
    track.family.joins.push({ at, family: other.family, to });
    other.family.joins.push({ at: to, family: track.family, to: at });
}

function drawn({ el: { style }, length }) {
    if (style.visibility === 'hidden') {
        return [];
    }
    if (style.strokeDasharray === 'none') {
        return [[0, length]];
    }
    const dashes = style.strokeDasharray.split(' ').map(Number);
    const spans = [];
    for (let i = 0, at = -Number(style.strokeDashoffset); i < dashes.length; i += 2) {
        spans.push([at, at + dashes[i]]);
        at += dashes[i] + (dashes[i + 1] ?? 0);
    }
    return spans;
}

async function settle(ms = duration + 50) {
    timerFlush();
    await setTimeout(ms);
    timerFlush();
}

test('a track grows from its start and retracts back to it, then drops its dash pattern', async () => {
    const airportExpress = track('airport-express--airport--hong-kong--1998-07-06');
    const tungChung = track('tung-chung-line--hong-kong--tung-chung--1998-06-22');
    const lines = [tungChung, airportExpress];

    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    await settle();
    assert.equal(tungChung.el.style.strokeDasharray, 'none', 'a drawn track drops its dashes');
    assert.equal(airportExpress.el.style.visibility, 'hidden');

    update(date('1998-07-06'), lines, [], hongkong.legend, duration);
    await settle(40);
    const [[from, to]] = drawn(airportExpress);
    assert.ok(from === 0 && to > 0 && to < 100, 'grows from its start');
    await settle();
    assert.deepEqual(drawn(airportExpress), [[0, 100]]);

    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    await settle(40);
    const [[start, end]] = drawn(airportExpress);
    assert.ok(start === 0 && end > 0 && end < 100, 'retracts toward its start');
    await settle();
    assert.equal(airportExpress.el.style.visibility, 'hidden');
    assert.deepEqual(drawn(tungChung), [[0, 100]]);
});

test('tracks and markers from different systems share the requested duration', async () => {
    const lines = [
        track('tung-chung-line--hong-kong--tung-chung--1998-06-22'),
        track('line-1--xinlonghua-original--xujiahui--1997-07-01', shanghai),
    ];
    const station = {
        el: { style: Object.assign(new Style(), { opacity: '0' }), dataset: {} },
        states: parseLabelDates('Tung_Chung=1998_06_22'),
        lines: [],
    };

    update(
        date('1998-06-22'),
        lines,
        [station],
        [...hongkong.legend, ...shanghai.legend],
        duration,
    );
    await settle(40);
    const [[, reached]] = drawn(lines[0]);
    assert.ok(reached > 0 && reached < 100);
    assert.deepEqual(drawn(lines[1]), drawn(lines[0]));
    const opacity = Number(station.el.style.opacity);
    assert.ok(opacity > 0 && opacity < 1);

    await settle();
    for (const line of lines) assert.deepEqual(drawn(line), [[0, 100]]);
    assert.equal(station.el.style.opacity, '1');
});

test('a continuation takes over at once; what closes retracts toward it, and grows back out from it', async () => {
    const opened = track('line-1--jinjiang-park-original--xujiahui--1993-05-28', shanghai);
    const continued = continuing(
        opened,
        track('line-1--xinlonghua-original--xujiahui--1997-07-01', shanghai),
        [60, 100],
    );
    const lines = [opened, continued];

    update(date('1996-01-01'), lines, [], shanghai.legend, duration);
    await settle();
    assert.deepEqual(drawn(opened), [[0, 100]]);

    update(date('1998-01-01'), lines, [], shanghai.legend, duration);
    await settle(25);
    assert.deepEqual(drawn(continued), [[0, 40]], 'the shared part changes track at once');
    const [[closing, junction]] = drawn(opened);
    assert.ok(closing > 0 && junction === 60, 'the closed part retracts toward the junction');
    await settle();
    assert.equal(opened.el.style.visibility, 'hidden');

    update(date('1996-01-01'), lines, [], shanghai.legend, duration);
    await settle(25);
    const [[front, end]] = drawn(opened);
    assert.ok(front > 0 && front < 60 && end === 100, 'it grows back out from the junction');
    assert.equal(continued.el.style.visibility, 'hidden');
    await settle();
    assert.deepEqual(drawn(opened), [[0, 100]]);
});

test('tracks that close together retract as one front, the farthest first', async () => {
    const first = track('tung-chung-line--hong-kong--tung-chung--1998-06-22');
    const extension = track('airport-express--airport--hong-kong--1998-07-06');
    join(first, 100, extension, 0);
    const lines = [first, extension];

    update(date('1999-01-01'), lines, [], hongkong.legend, duration);
    await settle();
    update(date('1990-01-01'), lines, [], hongkong.legend, duration);
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
        await settle(4);
        const [far, near] = [drawn(extension), drawn(first)];
        if (far.length > 0 && far[0][1] < 100) {
            assert.deepEqual(near, [[0, 100]], 'the nearer track waits for the front');
            seen.add('far');
        }
        if (near.length > 0 && near[0][1] < 100) {
            assert.deepEqual(
                far,
                [],
                'the front reaches the nearer track once the farther is gone',
            );
            seen.add('near');
        }
    }
    assert.deepEqual([...seen], ['far', 'near']);
    assert.equal(first.el.style.visibility, 'hidden');
});

test('a move reversed before it draws anything still ends where the date says', async () => {
    const airportExpress = track('airport-express--airport--hong-kong--1998-07-06');
    const lines = [airportExpress];

    update(date('1998-07-06'), lines, [], hongkong.legend, duration);
    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    await settle();
    assert.equal(airportExpress.el.style.visibility, 'hidden', 'a growth undone at once');

    update(date('1998-07-06'), lines, [], hongkong.legend, duration);
    await settle();
    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    update(date('1998-07-06'), lines, [], hongkong.legend, duration);
    await settle();
    assert.deepEqual(drawn(airportExpress), [[0, 100]], 'a retraction undone at once');
});
