import { utcDay, utcYear } from 'd3';

import guangfoEvents from './assets/guangfo/data/events.json';
import guangfoLines from './assets/guangfo/data/lines.json';
import foshanLogo from './assets/guangfo/foshan-metro.svg';
import guangfoMap from './assets/guangfo/map.svg';
import guangzhouLogo from './assets/guangfo/guangzhou-metro.svg';
import hangzhouEvents from './assets/hangzhou/data/events.json';
import hangzhouLines from './assets/hangzhou/data/lines.json';
import hangzhouMap from './assets/hangzhou/map.svg';
import hangzhouLogo from './assets/hangzhou/hangzhou-metro.svg';
import hongkongEvents from './assets/hongkong/data/events.json';
import hongkongLines from './assets/hongkong/data/lines.json';
import kcrLogo from './assets/hongkong/kcr.svg';
import hongkongMap from './assets/hongkong/map.svg';
import hongkongLogo from './assets/hongkong/mtr.svg';
import singaporeEvents from './assets/singapore/data/events.json';
import singaporeLines from './assets/singapore/data/lines.json';
import singaporeMap from './assets/singapore/map.svg';
import singaporeLogo from './assets/singapore/singapore-mrt.svg';
import shanghaiEvents from './assets/shanghai/data/events.json';
import shanghaiLines from './assets/shanghai/data/lines.json';
import shanghaiMap from './assets/shanghai/map.svg';
import shanghaiMetroLogo from './assets/shanghai/shanghai-metro.svg';
import shanghaiSuburbanLogo from './assets/shanghai/shanghai-suburban.svg';
import shenzhenEvents from './assets/shenzhen/data/events.json';
import shenzhenLines from './assets/shenzhen/data/lines.json';
import shenzhenMap from './assets/shenzhen/map.svg';
import shenzhenLogo from './assets/shenzhen/shenzhen-metro.svg';
import taipeiEvents from './assets/taipei/data/events.json';
import taipeiLines from './assets/taipei/data/lines.json';
import taipeiMap from './assets/taipei/map.svg';
import taipeiLogo from './assets/taipei/taipei-metro.svg';
import tokyoEvents from './assets/tokyo/data/events.json';
import tokyoLines from './assets/tokyo/data/lines.json';
import tokyoMap from './assets/tokyo/map.svg';
import tokyoMetroLogo from './assets/tokyo/tokyo-metro.svg';
import tokyoToeiLogo from './assets/tokyo/toei-subway.svg';
import { Status, type ChangelogEvent } from './schemas';

const KCR_MERGER_DATE = Date.UTC(2007, 11, 2);
const TODAY = utcDay(new Date());

export interface SystemConfig {
    name: string;
    localTitle: string;
    description: string;
    map: string;
    logos: string[];
    minDate: Date;
    maxDate: Date;
    lines: { id: string; label: string; color: string }[];
    events: ChangelogEvent[];
    milestoneDates: string[];
    article?: string;
    tooltipLogos?: (status: Status, time: number) => { src: string; alt: string }[];
    initialView?: { center: [number, number]; zoom: number };
}

function defineSystem(config: Omit<SystemConfig, 'minDate' | 'maxDate'>): SystemConfig {
    return {
        ...config,
        minDate: utcYear(new Date(config.events[0].date)),
        maxDate: TODAY,
    };
}

export const systems = {
    hongkong: defineSystem({
        name: 'MTR',
        localTitle: '港鐵歷史',
        description: "Explore the historical development of Hong Kong's MTR system",
        map: hongkongMap,
        logos: [hongkongLogo],
        lines: hongkongLines.lines,
        events: hongkongEvents,
        milestoneDates: ['1910-10-01', '1979-10-01', '1985-05-31', '1998-07-06', '2022-05-15'],
        article: '/hongkong/article',
        tooltipLogos(status, time) {
            const merged = time >= KCR_MERGER_DATE;
            return [
                ...(!merged && status !== Status.PrimaryOnly ? [{ src: kcrLogo, alt: 'KCR' }] : []),
                ...(merged || status !== Status.SecondaryOnly
                    ? [{ src: hongkongLogo, alt: 'MTR' }]
                    : []),
            ];
        },
    }),
    shanghai: defineSystem({
        name: 'Shanghai Metro',
        localTitle: '上海地铁历史',
        description: "Explore how Shanghai's metro network was built",
        map: shanghaiMap,
        logos: [shanghaiMetroLogo],
        lines: shanghaiLines.lines,
        events: shanghaiEvents,
        milestoneDates: ['1993-05-28', '1999-09-20', '2003-10-11', '2007-12-29', '2024-12-27'],
        initialView: { center: [2412, 1089], zoom: 1 },
        tooltipLogos(status) {
            return [
                ...(status !== Status.SecondaryOnly
                    ? [{ src: shanghaiMetroLogo, alt: 'Shanghai Metro' }]
                    : []),
                ...(status !== Status.PrimaryOnly
                    ? [{ src: shanghaiSuburbanLogo, alt: 'Shanghai Suburban Railway' }]
                    : []),
            ];
        },
    }),
    taipei: defineSystem({
        name: 'Taipei Metro',
        localTitle: '臺北捷運歷史',
        description: "Explore how Taipei's metro network was built",
        map: taipeiMap,
        logos: [taipeiLogo],
        lines: taipeiLines.lines,
        events: taipeiEvents,
        milestoneDates: ['1996-03-28', '1997-03-28', '1999-12-24', '2014-11-15', '2020-01-31'],
        initialView: { center: [1528, 1907], zoom: 1 },
        tooltipLogos() {
            return [{ src: taipeiLogo, alt: 'Taipei Metro' }];
        },
    }),
    singapore: defineSystem({
        name: 'Singapore MRT',
        localTitle: '新加坡地铁历史',
        description: "Explore Singapore's MRT & LRT network history",
        map: singaporeMap,
        logos: [singaporeLogo],
        lines: singaporeLines.lines,
        events: singaporeEvents,
        milestoneDates: ['1987-11-07', '1996-02-10', '2003-06-20', '2013-12-22', '2020-01-31'],
        initialView: { center: [5831, 4383], zoom: 1 },
        tooltipLogos() {
            return [{ src: singaporeLogo, alt: 'MRT' }];
        },
    }),
    tokyo: defineSystem({
        name: 'Tokyo Subway',
        localTitle: '東京の地下鉄の歴史',
        description: 'Explore the history of Tokyo Metro and Toei Subway',
        map: tokyoMap,
        logos: [tokyoMetroLogo, tokyoToeiLogo],
        lines: tokyoLines.lines,
        events: tokyoEvents,
        milestoneDates: [
            '1927-12-30',
            '1954-01-20',
            '1960-12-04',
            '1964-12-23',
            '2000-12-12',
            '2008-06-14',
        ],
        initialView: { center: [1050, 850], zoom: 1 },
        tooltipLogos(status) {
            return [
                ...(status !== Status.SecondaryOnly
                    ? [{ src: tokyoMetroLogo, alt: 'Tokyo Metro' }]
                    : []),
                ...(status !== Status.PrimaryOnly
                    ? [{ src: tokyoToeiLogo, alt: 'Toei Subway' }]
                    : []),
            ];
        },
    }),
    shenzhen: defineSystem({
        name: 'Shenzhen Metro',
        localTitle: '深圳地铁历史',
        description: "Explore how Shenzhen's metro network was built",
        map: shenzhenMap,
        logos: [shenzhenLogo],
        lines: shenzhenLines.lines,
        events: shenzhenEvents,
        milestoneDates: ['2004-12-28', '2011-06-22', '2016-06-28', '2020-08-18', '2022-10-28'],
        initialView: { center: [1640, 1130], zoom: 1 },
        tooltipLogos() {
            return [{ src: shenzhenLogo, alt: 'Shenzhen Metro' }];
        },
    }),
    hangzhou: defineSystem({
        name: 'Hangzhou Metro',
        localTitle: '杭州地铁历史',
        description: "Explore how Hangzhou's metro network was built",
        map: hangzhouMap,
        logos: [hangzhouLogo],
        lines: hangzhouLines.lines,
        events: hangzhouEvents,
        milestoneDates: ['2012-11-18', '2014-11-18', '2019-06-24', '2020-12-30', '2022-09-22'],
        initialView: { center: [2270, 1140], zoom: 1 },
        tooltipLogos() {
            return [{ src: hangzhouLogo, alt: 'Hangzhou Metro' }];
        },
    }),
    guangfo: defineSystem({
        name: 'Guangfo Metro',
        localTitle: '广佛地铁历史',
        description: "Explore how Guangzhou and Foshan's metro networks were built",
        map: guangfoMap,
        logos: [guangzhouLogo, foshanLogo],
        lines: guangfoLines.lines,
        events: guangfoEvents,
        milestoneDates: ['1997-06-28', '2002-12-29', '2010-11-03', '2021-09-28', '2024-12-28'],
        initialView: { center: [1870, 2360], zoom: 1 },
        tooltipLogos(status) {
            return [
                ...(status !== Status.SecondaryOnly
                    ? [{ src: guangzhouLogo, alt: 'Guangzhou Metro' }]
                    : []),
                ...(status !== Status.PrimaryOnly
                    ? [{ src: foshanLogo, alt: 'Foshan Metro' }]
                    : []),
            ];
        },
    }),
};

export type SystemKey = keyof typeof systems;

export const systemKeys = Object.keys(systems) as SystemKey[];
