import assert from 'node:assert/strict';
import test from 'node:test';
import { createStationOptions } from '../src/stationSearch.ts';
import { isActive, parseLabelDates, relativeCenter } from '../src/utils.ts';
import { legendLines, markers, systems } from './helpers.mjs';

const testLegend = ['a', 'b'].map(id => ({ id, color: id, states: [] }));
const station = (label, lines, id = label) => ({
    el: { localName: 'circle', id },
    states: parseLabelDates(label),
    lines: parseLabelDates(lines),
});
const options = (stations, highlight = []) => createStationOptions(stations, testLegend, highlight);

function mapOptions(system, highlight = []) {
    const stations = markers(system).map(({ localName, attrs }) => ({
        el: { localName, id: attrs.id },
        states: parseLabelDates(attrs['inkscape:label']),
        lines: parseLabelDates(attrs['data-lines']),
    }));
    return createStationOptions(stations, legendLines(system), highlight);
}
const named = (result, name) => result.filter(option => option.name === name);

test('station identity merges upgrades and keeps namesakes separate', () => {
    const interchange = station(
        'Quarry_Bay=1989_08_06',
        'a=1989_08_06,b=1989_08_06',
        'station-quarry-bay--1989-08-06',
    );
    const before = station(
        'Quarry_Bay=1985_05_31-1989_08_06',
        'a=1985_05_31-1989_08_06',
        'station-quarry-bay',
    );
    const namesake = station(
        'Quarry_Bay=1990_01_01',
        'b=1990_01_01',
        'station-quarry-bay-elsewhere',
    );

    const result = options([interchange, before, namesake]);
    assert.equal(result.length, 2);
    assert.equal(result[0].start, Date.parse('1985-05-31'));
    assert.deepEqual([...result[0].colors], ['a', 'b']);
    assert.equal(+result[0].matches[0].dateRange.appear, result[0].start);

    const highlighted = options([interchange, before], ['b']);
    assert.equal(highlighted[0].start, Date.parse('1985-05-31'));
    assert.equal(+highlighted[0].matches[0].dateRange.appear, Date.parse('1989-08-06'));
});

test('renames stay distinct across the full station history', () => {
    const result = options([
        station(
            'Old=1910_01_01-1969_01_01,Current=1969_01_01-2007_01_01,New=2007_01_01',
            'a=1910_01_01',
        ),
    ]);
    assert.deepEqual(
        result.map(option => option.name),
        ['Old', 'Current', 'New'],
    );
    assert.equal(result[0].start, Date.parse('1910-01-01'));
    assert.equal(result[1].start, Date.parse('1969-01-01'));
    assert.equal(+result[1].matches[0].dateRange.appear, result[1].start);
});

test('highlighted search uses the intersection of name and line service dates', () => {
    const marker = station(
        'Station=1985_01_01',
        'a=1985_01_01,b=2000_01_01-2010_01_01,b=2020_01_01',
    );
    const [option, ...rest] = options([marker], ['b']);
    assert.equal(rest.length, 0);
    assert.equal(option.start, Date.parse('1985-01-01'));
    assert.deepEqual(
        option.matches.map(match => +match.dateRange.appear),
        ['2000-01-01', '2020-01-01'].map(Date.parse),
    );
    for (const day of ['1999-01-01', '2015-01-01']) {
        assert.ok(!option.matches.some(match => isActive(match.dateRange, Date.parse(day))));
    }
    assert.equal(options([marker], ['unknown']).length, 0);
    assert.equal(options([marker], ['a', 'b']).length, 1);
});

test('a highlighted line cannot select a name that predates its service', () => {
    const result = options(
        [station('Old=1980_01_01-2000_01_01,New=2000_01_01', 'a=1980_01_01,b=2000_01_01')],
        ['b'],
    );
    assert.deepEqual(
        result.map(option => option.name),
        ['New'],
    );
});

test('a marker centre is measured relative to its container', () => {
    const element = { getBoundingClientRect: () => ({ left: 700, top: 350, width: 6, height: 6 }) };
    const container = { getBoundingClientRect: () => ({ left: 100, top: 50 }) };
    assert.deepEqual(relativeCenter(element, container), [603, 303]);
});

test('hongkong: upgrades keep first-name dates while namesakes stay separate', () => {
    const result = mapOptions('hongkong');
    // Quarry Bay's marker also splits when the Tseung Kwan O line arrives in 2002
    for (const [name, start, elements] of [
        ['Argyle', '1979-12-31', 2],
        ['Waterloo', '1979-12-22', 2],
        ['Quarry Bay', '1985-05-31', 3],
    ]) {
        const found = named(result, name);
        assert.equal(found.length, 1, name);
        assert.equal(found[0].start, Date.parse(start), name);
        assert.equal(found[0].matches.length, elements, name);
    }
    for (const [name, count] of [
        ['Kowloon', 3],
        ['Mong Kok', 2],
        ['Tung Chung', 2],
    ]) {
        assert.equal(named(result, name).length, count, name);
    }
});

test('shanghai: the Xintiandi upgrade merges without rewriting its names or rename date', () => {
    const result = mapOptions('shanghai');
    const [old, ...oldRest] = named(result, 'Xintiandi');
    const [renamed, ...renamedRest] = named(
        result,
        'Site of the First CPC National Congress · Xintiandi',
    );
    assert.equal(oldRest.length + renamedRest.length, 0);
    assert.equal(old.matches.length, 2);
    assert.equal(old.start, Date.parse('2010-04-10'));
    assert.equal(renamed.start, Date.parse('2021-06-20'));
    assert.equal(old.id, renamed.id);

    const line13 = named(mapOptions('shanghai', ['13']), 'Xintiandi')[0];
    assert.equal(line13.start, Date.parse('2010-04-10'));
    assert.equal(+line13.matches[0].dateRange.appear, Date.parse('2015-12-19'));
});

test('shanghai: separate stations stay separate, with upgrades within each merged', () => {
    const result = mapOptions('shanghai');
    for (const [name, count] of [
        ['West Nanjing Road', 3],
        ['Shanghai Railway Station', 2],
        ['Changqing Road', 2],
        ['Caoyang Road', 2],
        ['National Exhibition and Convention Center', 2],
        ['South Pudong Road', 2],
        ['Pudian Road', 2],
        ['Jinjiang Park', 2],
        ['Pudong Airport Terminal 1 and 2', 2],
        ['Pudong International Airport', 1],
    ]) {
        assert.equal(named(result, name).length, count, name);
    }
    for (const line of ['2', '12', '13']) {
        const found = named(mapOptions('shanghai', [line]), 'West Nanjing Road');
        assert.equal(found.length, 1, line);
        assert.equal(found[0].start, Date.parse(line === '2' ? '2006-10-28' : '2015-12-19'));
    }
    assert.deepEqual(
        named(result, 'Shanghai Railway Station')
            .map(option => option.matches.length)
            .sort(),
        [1, 2],
    );
});

test('taipei and singapore keep separate transfers and merge interchange upgrades', () => {
    for (const [system, name, count] of [
        ['taipei', 'Banqiao', 2],
        ['taipei', 'Daan', 1],
        ['taipei', 'Nanjing East Road', 1],
        ['taipei', 'Nanjing Fuxing', 1],
        ['singapore', 'Newton', 2],
        ['singapore', 'Tampines', 2],
        ['singapore', 'Dhoby Ghaut', 1],
    ]) {
        assert.equal(named(mapOptions(system), name).length, count, `${system}: ${name}`);
    }
});

test('seoul: namesakes stay separate and names carry across interchange upgrades', () => {
    const result = mapOptions('seoul');
    for (const name of ['Sinchon', 'Yangpyeong', 'Seongnam', 'Bojeong']) {
        assert.equal(named(result, name).length, 2, name);
    }
    for (const [name, start] of [
        ['Gasan Digital Complex', '2005-07-01'],
        ['Buramsan', '2024-10-31'],
        ['Seohae-gu Office', '2026-07-01'],
        ['Bokjeong', '1996-11-23'],
        ['Guseong', '2011-12-28'],
    ]) {
        const found = named(result, name);
        assert.equal(found.length, 1, name);
        assert.equal(found[0].start, Date.parse(start), name);
    }
    const [oldOffice] = named(result, 'Seo-gu Office');
    const [newOffice] = named(result, 'Seohae-gu Office');
    assert.equal(oldOffice.id, newOffice.id);
    assert.equal(oldOffice.matches.at(-1).dateRange.removed.getTime(), newOffice.start);

    const [guseong] = named(mapOptions('seoul', ['gtxa']), 'Guseong');
    assert.equal(guseong.matches[0].dateRange.appear.getTime(), Date.parse('2024-06-29'));
    const noryangjin = result.find(option => option.id === 'station-noryangjin');
    assert.equal(noryangjin.start, Date.parse('1974-08-15'));
    assert.ok(
        noryangjin.matches.some(
            ({ dateRange }) => dateRange.appear.getTime() === Date.parse('2015-10-31'),
        ),
    );
});

for (const system of systems) {
    test(`${system}: no search option merges markers shown at the same time`, () => {
        const result = mapOptions(system);
        assert.equal(
            new Set(result.map(option => `${option.id}/${option.name}`)).size,
            result.length,
        );
        for (const option of result) {
            for (let i = 1; i < option.matches.length; i++) {
                assert.ok(
                    option.matches[i - 1].dateRange.removed <= option.matches[i].dateRange.appear,
                    `${option.name} contains overlapping markers`,
                );
            }
        }
    });
}
