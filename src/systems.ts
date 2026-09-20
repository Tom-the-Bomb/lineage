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
import tpEvents from './assets/tp/data/events.json';
import tpLines from './assets/tp/data/lines.json';
import tpMap from './assets/tp/map.svg';
import tpLogo from './assets/tp/metro.svg';
import { Status, type ChangelogEvent } from './schemas';

const KCR_MERGER_DATE = Date.UTC(2007, 11, 2);

export interface SystemConfig {
    title: string;
    chineseTitle: string;
    description: string;
    map: string;
    logo: string;
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
        chineseTitle: '港铁历史',
        description: "Explore the historical development of Hong Kong's MTR system",
        map: mtrMap,
        logo: mtrLogo,
        minDate: new Date(Date.UTC(1972, 0, 1)),
        maxDate: new Date(Date.UTC(2023, 0, 1)),
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
        chineseTitle: '上海地铁历史',
        description: "Explore how Shanghai's metro network was built",
        map: shMap,
        logo: shMetroLogo,
        minDate: new Date(Date.UTC(1993, 0, 1)),
        maxDate: new Date(Date.UTC(2025, 11, 31)),
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
        chineseTitle: '臺北捷運歷史',
        description: "Explore how Taipei's metro network was built",
        map: tpMap,
        logo: tpLogo,
        minDate: new Date(Date.UTC(1996, 0, 1)),
        maxDate: new Date(Date.UTC(2025, 11, 31)),
        lines: tpLines.lines,
        events: tpEvents,
        initialView: { center: [1528, 1907], zoom: 1 },
        tooltipLogos() {
            return [{ src: tpLogo, alt: 'Taipei Metro' }];
        },
    },
    sg: {
        title: 'Singapore MRT History',
        chineseTitle: '新加坡地铁历史',
        description: "Explore how Singapore's MRT and LRT network was built",
        map: sgMap,
        logo: sgLogo,
        minDate: new Date(Date.UTC(1987, 0, 1)),
        maxDate: new Date(Date.UTC(2026, 11, 31)),
        lines: sgLines.lines,
        events: sgEvents,
        initialView: { center: [5831, 4383], zoom: 1 },
        tooltipLogos() {
            return [{ src: sgLogo, alt: 'MRT' }];
        },
    },
} satisfies Record<string, SystemConfig>;

export type SystemKey = keyof typeof systems;

export const systemKeys = Object.keys(systems) as SystemKey[];
