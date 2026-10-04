import assert from 'node:assert/strict';
import test from 'node:test';
import { lengthAt, lengthSeries } from '../src/lengthSeries.ts';
import { parseLabelDates } from '../src/utils.ts';
import { date } from './helpers.mjs';

const track = (label, km) => ({ states: parseLabelDates(label), km });
const line = (id, label) => ({ id, color: '#000', states: parseLabelDates(label) });

// Line 1 opens in two stages and one closes; Line 2 is renamed; Line 3 opens later
const tracks = [
    track('Line_1=2000_01_01', 10),
    track('Line_1=2002_01_01-2004_01_01', 2),
    track('Old_Line_2=2001_01_01-2003_01_01,Line_2=2003_01_01', 5),
    track('Line_3=2005_01_01', 7),
];
const legend = [
    line('1', 'Line_1=2000_01_01'),
    line('2', 'Old_Line_2=2001_01_01-2003_01_01,Line_2=2003_01_01'),
    line('3', 'Line_3=2005_01_01'),
];
const dates = ['2000', '2001', '2002', '2003', '2004', '2005'].map(year => date(`${year}-01-01`));

test('total sums the km of every track visible at each date', () => {
    const series = lengthSeries(tracks, legend, [], dates);
    assert.deepEqual(
        series.map(point => point.total),
        [10, 15, 17, 17, 15, 22],
    );
    assert.ok(
        series.every(point => point.lit === null),
        'nothing highlighted: lit is null',
    );
});

test('lit counts highlighted lines by legend id, across renames', () => {
    const series = lengthSeries(tracks, legend, ['2'], dates);
    assert.deepEqual(
        series.map(point => point.lit),
        [null, 5, 5, 5, 5, 5],
    );
});

test('lit is null while no highlighted line is running, and counts several lines together', () => {
    const series = lengthSeries(tracks, legend, ['1', '3'], dates);
    assert.deepEqual(
        series.map(point => point.lit),
        [10, 10, 12, 12, 10, 17],
    );
    assert.equal(lengthSeries(tracks, legend, ['3'], dates)[0].lit, null);
});

test('lengthAt returns the last point at or before a time', () => {
    const series = lengthSeries(tracks, legend, [], dates);
    assert.equal(lengthAt(series, date('1999-12-31')), undefined);
    assert.equal(lengthAt(series, date('2000-01-01')).total, 10);
    assert.equal(lengthAt(series, date('2003-06-15')).total, 17);
    assert.equal(lengthAt(series, date('2030-01-01')).total, 22);
});
