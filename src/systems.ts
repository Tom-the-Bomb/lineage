import { Status } from './schemas';
import mtrMap from './assets/mtr/map.svg';
import mtrLogo from './assets/mtr/mtr.svg';
import kcrLogo from './assets/mtr/kcr.svg';
import mtrLines from './assets/mtr/data/lines.json';
import shMap from './assets/sh/map.svg';
import shMetroLogo from './assets/sh/metro.svg';
import shSuburbanLogo from './assets/sh/suburban.svg';
import shLines from './assets/sh/data/lines.json';
import tpMap from './assets/tp/map.svg';
import tpLogo from './assets/tp/metro.svg';
import tpLines from './assets/tp/data/lines.json';

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
        initialView: { center: [1528, 1907], zoom: 1 }, // Taipei Main Station
        tooltipLogos() {
            return [{ src: tpLogo, alt: 'Taipei Metro' }];
        },
    },
} satisfies Record<string, SystemConfig>;

export type SystemKey = keyof typeof systems;

export const systemKeys = Object.keys(systems) as SystemKey[];
