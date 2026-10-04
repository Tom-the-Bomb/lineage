import assert from 'node:assert/strict';
import test from 'node:test';
import { isActive, parseLabelDates } from '../src/utils.ts';
import { markers, read, systems } from './helpers.mjs';

const START_OF_TIME = -8.64e15;
const END_OF_TIME = 8.64e15;
const systemsSource = read('src/systems.ts');

function operatorKeys(system) {
    const config = new RegExp(
        `\\n    ${system}: defineSystem\\(\\{([\\s\\S]*?)\\n    \\}\\),`,
    ).exec(systemsSource)[1];
    const operators = /\n {8}operators: \{([\s\S]*?)\n {8}\},/.exec(config)[1];
    return [...operators.matchAll(/\n {12}(\w+):/g)].map(([, name]) => name);
}

const bounds = states =>
    states.flatMap(({ dateRange }) => [dateRange.appear.getTime(), dateRange.removed.getTime()]);

test('a logo entry without dates is valid for all time', () => {
    const [{ name, dateRange }] = parseLabelDates('metro');
    assert.equal(name, 'metro');
    assert.ok(isActive(dateRange, Date.parse('1800-01-01')));
    assert.ok(isActive(dateRange, Date.parse('2200-01-01')));
});

test('a logo entry without a start date is valid until its end', () => {
    const [{ dateRange }] = parseLabelDates('kcr=-2007_12_02');
    assert.ok(isActive(dateRange, Date.parse('1800-01-01')));
    assert.ok(!isActive(dateRange, Date.parse('2007-12-02')));
});

for (const system of systems) {
    test(`${system}: station logos name known operators, cover every open day and repeat no marker dates`, () => {
        const operators = new Set(operatorKeys(system));
        for (const { attrs } of markers(system)) {
            const { id, 'inkscape:label': label, 'data-logos': logos } = attrs;
            if (logos === undefined) {
                assert.ok(
                    operators.size === 1,
                    `${id}: ${system} has several operators, so data-logos is required`,
                );
                continue;
            }
            const states = parseLabelDates(label);
            const entries = parseLabelDates(logos);
            for (const { name } of entries)
                assert.ok(operators.has(name), `${id}: unknown operator ${name}`);

            // the marker's own first and last days are implied: write `op`, `op=-end` or `op=start`
            const first = states[0].dateRange.appear.getTime();
            const last = states.at(-1).dateRange.removed.getTime();
            for (const { name, dateRange } of entries) {
                const [appear, removed] = [dateRange.appear.getTime(), dateRange.removed.getTime()];
                assert.ok(
                    appear === START_OF_TIME || appear > first,
                    `${id}: ${name} repeats the opening date`,
                );
                assert.ok(
                    removed === END_OF_TIME || removed < last,
                    `${id}: ${name} repeats the closing date`,
                );
            }

            for (const t of bounds([...states, ...entries])) {
                if (states.some(({ dateRange }) => isActive(dateRange, t))) {
                    assert.ok(
                        entries.some(({ dateRange }) => isActive(dateRange, t)),
                        `${id}: no logo on ${new Date(t).toISOString().slice(0, 10)}`,
                    );
                }
            }
        }
    });
}
