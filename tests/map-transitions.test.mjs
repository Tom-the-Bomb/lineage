import { timerFlush } from 'd3';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { parseLabelDates } from '../src/utils.ts';
import { update } from '../src/utils_d3.ts';
import { attrs, date, legend, mapSvg } from './helpers.mjs';

// the parts of an element's style the renderer touches; transitions run on the real d3 scheduler
class Style {
    strokeDashoffset = '100';
    strokeDasharray = '100';
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
    return {
        el: { id, style: new Style(), dataset: {}, getTotalLength: () => 100 },
        states: parseLabelDates(label),
        length: 100,
        km: Number(km ?? 0),
        partners: [],
    };
}

async function settle(ms = duration + 50) {
    timerFlush();
    await setTimeout(ms);
    timerFlush();
}

test('a track draws in and retracts through its hidden dash pattern', async () => {
    const airportExpress = track('airport-express--airport--hong-kong--1998-07-06');
    const tungChung = track('tung-chung-line--hong-kong--tung-chung--1998-06-22');
    const lines = [tungChung, airportExpress];

    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    await settle();
    assert.equal(tungChung.el.style.strokeDashoffset, '0');
    assert.equal(airportExpress.el.style.strokeDashoffset, '100');

    update(date('1998-07-06'), lines, [], hongkong.legend, duration);
    await settle(40);
    const offset = Number(airportExpress.el.style.strokeDashoffset);
    assert.ok(offset > 0 && offset < 100);
    assert.equal(airportExpress.el.style.strokeDasharray, '100');
    assert.equal(airportExpress.el.style.opacity, '', 'tracks animate the stroke, not the opacity');
    await settle();
    assert.equal(airportExpress.el.style.strokeDashoffset, '0');
    assert.equal(
        airportExpress.el.style.strokeDasharray,
        'none',
        'a drawn track drops its dash pattern',
    );

    update(date('1998-06-22'), lines, [], hongkong.legend, duration);
    await settle();
    assert.equal(airportExpress.el.style.strokeDashoffset, '100');
    assert.equal(airportExpress.el.style.strokeDasharray, '100');
    assert.equal(tungChung.el.style.strokeDashoffset, '0');
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
    const offset = Number(lines[0].el.style.strokeDashoffset);
    assert.ok(offset > 0 && offset < 100);
    assert.equal(lines[1].el.style.strokeDashoffset, lines[0].el.style.strokeDashoffset);
    const opacity = Number(station.el.style.opacity);
    assert.ok(opacity > 0 && opacity < 1);

    await settle();
    for (const line of lines) assert.equal(line.el.style.strokeDashoffset, '0');
    assert.equal(station.el.style.opacity, '1');
});

test('a track taking over from one just shown appears in place; a new track still grows', async () => {
    const opened = track('line-1--jinjiang-park-original--xujiahui--1993-05-28', shanghai);
    const continued = track('line-1--xinlonghua-original--xujiahui--1997-07-01', shanghai);
    const extension = track('line-1--xinzhuang--jinjiang-park--1996-12-28', shanghai);
    assert.match(
        shanghai.svg,
        /id="line-1--xinlonghua-original--xujiahui--1997-07-01"[^>]*data-takes-over="line-1--jinjiang-park-original--xujiahui--1993-05-28"/,
    );
    opened.partners.push(continued);
    continued.partners.push(opened);
    const lines = [opened, continued, extension];

    update(date('1996-01-01'), lines, [], shanghai.legend, duration);
    await settle();
    assert.equal(opened.el.style.strokeDashoffset, '0');

    update(date('1998-01-01'), lines, [], shanghai.legend, duration);
    await settle(10);
    assert.equal(continued.el.style.strokeDashoffset, '0');
    assert.ok(Number(extension.el.style.strokeDashoffset) > 0);
    await settle();
    assert.equal(opened.el.style.strokeDashoffset, '100');
});
