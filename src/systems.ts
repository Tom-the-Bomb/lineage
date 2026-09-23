import { utcDay } from 'd3';

import hzEvents from './assets/hz/data/events.json';
import hzLines from './assets/hz/data/lines.json';
import hzMap from './assets/hz/map.svg';
import hzLogo from './assets/hz/metro.svg';
import mtrEvents from './assets/mtr/data/events.json';
import mtrLines from './assets/mtr/data/lines.json';
import kcrLogo from './assets/mtr/kcr.svg';
import mtrMap from './assets/mtr/map.svg';
import mtrLogo from './assets/mtr/mtr.svg';
import sgEvents from './assets/sg/data/events.json';
import sgLines from './assets/sg/data/lines.json';
import sgMap from './assets/sg/map.svg';
import sgLogo from './assets/sg/metro.svg';
import shEvents from './assets/sh/data/events.json';
import shLines from './assets/sh/data/lines.json';
import shMap from './assets/sh/map.svg';
import shMetroLogo from './assets/sh/metro.svg';
import shSuburbanLogo from './assets/sh/suburban.svg';
import szEvents from './assets/sz/data/events.json';
import szLines from './assets/sz/data/lines.json';
import szMap from './assets/sz/map.svg';
import szLogo from './assets/sz/metro.svg';
import tpEvents from './assets/tp/data/events.json';
import tpLines from './assets/tp/data/lines.json';
import tpMap from './assets/tp/map.svg';
import tpLogo from './assets/tp/metro.svg';
import tyEvents from './assets/ty/data/events.json';
import tyLines from './assets/ty/data/lines.json';
import tyMap from './assets/ty/map.svg';
import tyMetroLogo from './assets/ty/metro.svg';
import tyToeiLogo from './assets/ty/toei.svg';
import { Status, type ChangelogEvent } from './schemas';

const KCR_MERGER_DATE = Date.UTC(2007, 11, 2);
const TODAY = utcDay(new Date());

export interface SystemConfig {
    title: string;
    localTitle: string;
    description: string;
    map: string;
    logos: string[];
    minDate: Date;
    maxDate: Date;
    lines: { id: string; label: string; color: string }[];
    events: ChangelogEvent[];
    article?: string;
    tooltipLogos?: (status: Status, time: number) => { src: string; alt: string }[];
    initialView?: { center: [number, number]; zoom: number };
}

export const systems = {
    mtr: {
        title: 'MTR History',
        localTitle: '港鐵歷史',
        description: "Explore the historical development of Hong Kong's MTR system",
        map: mtrMap,
        logos: [mtrLogo],
        minDate: new Date(Date.UTC(1910, 0, 1)),
        maxDate: TODAY,
        lines: mtrLines.lines,
        events: mtrEvents,
        article: '/mtr/article',
        tooltipLogos(status, time) {
            const merged = time >= KCR_MERGER_DATE;
            return [
                ...(!merged && status !== Status.PrimaryOnly ? [{ src: kcrLogo, alt: 'KCR' }] : []),
                ...(merged || status !== Status.SecondaryOnly
                    ? [{ src: mtrLogo, alt: 'MTR' }]
                    : []),
            ];
        },
    },
    sh: {
        title: 'Shanghai Metro History',
        localTitle: '上海地铁历史',
        description: "Explore how Shanghai's metro network was built",
        map: shMap,
        logos: [shMetroLogo],
        minDate: new Date(Date.UTC(1993, 0, 1)),
        maxDate: TODAY,
        lines: shLines.lines,
        events: shEvents,
        initialView: { center: [2412, 1089], zoom: 1 },
        tooltipLogos(status) {
            return [
                ...(status !== Status.SecondaryOnly
                    ? [{ src: shMetroLogo, alt: 'Shanghai Metro' }]
                    : []),
                ...(status !== Status.PrimaryOnly
                    ? [{ src: shSuburbanLogo, alt: 'Shanghai Suburban Railway' }]
                    : []),
            ];
        },
    },
    tp: {
        title: 'Taipei Metro History',
        localTitle: '臺北捷運歷史',
        description: "Explore how Taipei's metro network was built",
        map: tpMap,
        logos: [tpLogo],
        minDate: new Date(Date.UTC(1996, 0, 1)),
        maxDate: TODAY,
        lines: tpLines.lines,
        events: tpEvents,
        initialView: { center: [1528, 1907], zoom: 1 },
        tooltipLogos() {
            return [{ src: tpLogo, alt: 'Taipei Metro' }];
        },
    },
    sg: {
        title: 'Singapore MRT History',
        localTitle: '新加坡地铁历史',
        description: "Explore Singapore's MRT & LRT network history",
        map: sgMap,
        logos: [sgLogo],
        minDate: new Date(Date.UTC(1987, 0, 1)),
        maxDate: TODAY,
        lines: sgLines.lines,
        events: sgEvents,
        initialView: { center: [5831, 4383], zoom: 1 },
        tooltipLogos() {
            return [{ src: sgLogo, alt: 'MRT' }];
        },
    },
    ty: {
        title: 'Tokyo Subway History',
        localTitle: '東京の地下鉄の歴史',
        description: 'Explore the history of Tokyo Metro and Toei Subway',
        map: tyMap,
        logos: [tyMetroLogo, tyToeiLogo],
        minDate: new Date(Date.UTC(1927, 0, 1)),
        maxDate: TODAY,
        lines: tyLines.lines,
        events: tyEvents,
        initialView: { center: [1050, 850], zoom: 1 },
        tooltipLogos(status) {
            return [
                ...(status !== Status.SecondaryOnly
                    ? [{ src: tyMetroLogo, alt: 'Tokyo Metro' }]
                    : []),
                ...(status !== Status.PrimaryOnly ? [{ src: tyToeiLogo, alt: 'Toei Subway' }] : []),
            ];
        },
    },
    sz: {
        title: 'Shenzhen Metro History',
        localTitle: '深圳地铁历史',
        description: "Explore how Shenzhen's metro network was built",
        map: szMap,
        logos: [szLogo],
        minDate: new Date(Date.UTC(2004, 0, 1)),
        maxDate: TODAY,
        lines: szLines.lines,
        events: szEvents,
        initialView: { center: [1640, 1130], zoom: 1 },
        tooltipLogos() {
            return [{ src: szLogo, alt: 'Shenzhen Metro' }];
        },
    },
    hz: {
        title: 'Hangzhou Metro History',
        localTitle: '杭州地铁历史',
        description: "Explore how Hangzhou's metro network was built",
        map: hzMap,
        logos: [hzLogo],
        minDate: new Date(Date.UTC(2012, 0, 1)),
        maxDate: TODAY,
        lines: hzLines.lines,
        events: hzEvents,
        initialView: { center: [2270, 1140], zoom: 1 },
        tooltipLogos() {
            return [{ src: hzLogo, alt: 'Hangzhou Metro' }];
        },
    },
} satisfies Record<string, SystemConfig>;

export type SystemKey = keyof typeof systems;

export const systemKeys = Object.keys(systems) as SystemKey[];
