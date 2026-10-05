import { utcDay, utcYear } from 'd3';

import beijingMtrLogo from './assets/beijing/beijing-mtr.svg';
import beijingLogo from './assets/beijing/beijing-subway.svg';
import beijingEvents from './assets/beijing/data/events.json';
import beijingLines from './assets/beijing/data/lines.json';
import beijingMap from './assets/beijing/map.svg';
import chengduEvents from './assets/chengdu/data/events.json';
import chengduLines from './assets/chengdu/data/lines.json';
import chengduLogo from './assets/chengdu/chengdu-metro.svg';
import chengduMap from './assets/chengdu/map.svg';
import chongqingLogo from './assets/chongqing/chongqing-rail-transit.svg';
import chongqingEvents from './assets/chongqing/data/events.json';
import chongqingLines from './assets/chongqing/data/lines.json';
import chongqingMap from './assets/chongqing/map.svg';
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
import nanjingEvents from './assets/nanjing/data/events.json';
import nanjingLines from './assets/nanjing/data/lines.json';
import nanjingMap from './assets/nanjing/map.svg';
import nanjingLogo from './assets/nanjing/nanjing-metro.svg';
import seoulArexLogo from './assets/seoul/arex.svg';
import seoulEvents from './assets/seoul/data/events.json';
import seoulLines from './assets/seoul/data/lines.json';
import seoulGimpoLogo from './assets/seoul/gimpo.svg';
import seoulIncheonLogo from './assets/seoul/incheon.svg';
import seoulKorailLogo from './assets/seoul/korail.svg';
import seoulMaglevLogo from './assets/seoul/maglev.svg';
import seoulMap from './assets/seoul/map.svg';
import seoulNeoTransLogo from './assets/seoul/neotrans.svg';
import seoulLogo from './assets/seoul/seoul-metro.svg';
import singaporeEvents from './assets/singapore/data/events.json';
import singaporeLines from './assets/singapore/data/lines.json';
import singaporeMap from './assets/singapore/map.svg';
import singaporeLogo from './assets/singapore/singapore-mrt.svg';
import shanghaiEvents from './assets/shanghai/data/events.json';
import shanghaiLines from './assets/shanghai/data/lines.json';
import shanghaiMap from './assets/shanghai/map.svg';
import shanghaiMaglevLogo from './assets/shanghai/shanghai-maglev.svg';
import shanghaiMetroLogo from './assets/shanghai/shanghai-metro.svg';
import shanghaiSuburbanLogo from './assets/shanghai/shanghai-suburban.svg';
import shenzhenEvents from './assets/shenzhen/data/events.json';
import shenzhenLines from './assets/shenzhen/data/lines.json';
import shenzhenMap from './assets/shenzhen/map.svg';
import shenzhenLogo from './assets/shenzhen/shenzhen-metro.svg';
import taipeiEvents from './assets/taipei/data/events.json';
import taipeiLines from './assets/taipei/data/lines.json';
import taipeiMap from './assets/taipei/map.svg';
import newTaipeiMetroLogo from './assets/taipei/new-taipei-metro.svg';
import taipeiLogo from './assets/taipei/taipei-metro.svg';
import taoyuanMetroLogo from './assets/taipei/taoyuan-metro.svg';
import tokyoEvents from './assets/tokyo/data/events.json';
import tokyoLines from './assets/tokyo/data/lines.json';
import tokyoMap from './assets/tokyo/map.svg';
import tokyoMetroLogo from './assets/tokyo/tokyo-metro.svg';
import tokyoToeiLogo from './assets/tokyo/toei-subway.svg';
import xianEvents from './assets/xian/data/events.json';
import xianLines from './assets/xian/data/lines.json';
import xianMap from './assets/xian/map.svg';
import xianIntercityLogo from './assets/xian/shaanxi-railway.svg';
import xianXaztLogo from './assets/xian/xazt.svg';
import xianLogo from './assets/xian/xian-metro.svg';
import type { ChangelogEvent } from './schemas';

const TODAY = utcDay(new Date());

export interface SystemConfig {
    name: string;
    localTitle: string;
    description: string;
    map: string;
    logos: string[];
    logoSize?: number;
    tooltipLogoSize?: number;
    minDate: Date;
    maxDate: Date;
    lines: { id: string; label: string; color: string }[];
    events: ChangelogEvent[];
    milestoneDates: string[];
    operators: Record<string, { src: string; alt: string }>;
    initialBounds: [number, number];
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
        name: 'Hong Kong MTR',
        localTitle: '港鐵歷史',
        description: "Explore the growth of Hong Kong's rail network",
        map: hongkongMap,
        initialBounds: [1038, 950],
        initialView: { center: [745, 667], zoom: 1 },
        logos: [hongkongLogo],
        lines: hongkongLines.lines,
        events: hongkongEvents,
        milestoneDates: ['1910-10-01', '1979-10-01', '1985-05-31', '1998-07-06', '2022-05-15'],
        operators: {
            mtr: { src: hongkongLogo, alt: 'MTR' },
            kcr: { src: kcrLogo, alt: 'KCR' },
        },
    }),
    shanghai: defineSystem({
        name: 'Shanghai Metro',
        localTitle: '上海地铁历史',
        description: "Explore the growth of Shanghai's rail network",
        map: shanghaiMap,
        initialBounds: [4600.74, 2843.75],
        logos: [shanghaiMetroLogo],
        lines: shanghaiLines.lines,
        events: shanghaiEvents,
        milestoneDates: ['1993-05-28', '1999-09-20', '2003-10-11', '2007-12-29', '2024-12-27'],
        initialView: { center: [2412, 1089], zoom: 1 },
        operators: {
            metro: { src: shanghaiMetroLogo, alt: 'Shanghai Metro' },
            suburban: { src: shanghaiSuburbanLogo, alt: 'Shanghai Suburban Railway' },
            maglev: { src: shanghaiMaglevLogo, alt: 'Shanghai Maglev' },
        },
    }),
    taipei: defineSystem({
        name: 'Taipei Metro',
        localTitle: '臺北捷運歷史',
        description: "Explore the growth of Taipei's rail network",
        map: taipeiMap,
        initialBounds: [3012.8, 3321.3],
        logos: [taipeiLogo],
        lines: taipeiLines.lines,
        events: taipeiEvents,
        milestoneDates: ['1996-03-28', '1997-03-28', '1999-12-24', '2014-11-15', '2020-01-31'],
        initialView: { center: [1528, 1907], zoom: 1 },
        operators: {
            metro: { src: taipeiLogo, alt: 'Taipei Metro' },
            newtaipei: { src: newTaipeiMetroLogo, alt: 'New Taipei Metro' },
            taoyuan: { src: taoyuanMetroLogo, alt: 'Taoyuan Metro' },
        },
    }),
    singapore: defineSystem({
        name: 'Singapore MRT',
        localTitle: '新加坡地铁历史',
        description: "Explore the growth of Singapore's rail network",
        map: singaporeMap,
        initialBounds: [11662, 6527],
        logos: [singaporeLogo],
        lines: singaporeLines.lines,
        events: singaporeEvents,
        milestoneDates: ['1987-11-07', '1996-02-10', '2003-06-20', '2013-12-22', '2020-01-31'],
        initialView: { center: [5831, 4383], zoom: 1 },
        operators: {
            mrt: { src: singaporeLogo, alt: 'MRT' },
        },
    }),
    tokyo: defineSystem({
        name: 'Tokyo Subway',
        localTitle: '東京の地下鉄の歴史',
        description: "Explore the growth of Tokyo's rail network",
        map: tokyoMap,
        initialBounds: [2361.4, 1718.54],
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
        operators: {
            metro: { src: tokyoMetroLogo, alt: 'Tokyo Metro' },
            toei: { src: tokyoToeiLogo, alt: 'Toei' },
        },
    }),
    shenzhen: defineSystem({
        name: 'Shenzhen Metro',
        localTitle: '深圳地铁历史',
        description: "Explore the growth of Shenzhen's rail network",
        map: shenzhenMap,
        initialBounds: [3364.88, 2022.88],
        logos: [shenzhenLogo],
        lines: shenzhenLines.lines,
        events: shenzhenEvents,
        milestoneDates: ['2004-12-28', '2011-06-22', '2016-06-28', '2020-08-18', '2022-10-28'],
        initialView: { center: [1640, 1130], zoom: 1 },
        operators: {
            metro: { src: shenzhenLogo, alt: 'Shenzhen Metro' },
            mtr: { src: hongkongLogo, alt: 'MTR Shenzhen' },
        },
    }),
    hangzhou: defineSystem({
        name: 'Hangzhou Metro',
        localTitle: '杭州地铁历史',
        description: "Explore the growth of Hangzhou's rail network",
        map: hangzhouMap,
        initialBounds: [4030.08, 2319.29],
        logos: [hangzhouLogo],
        lines: hangzhouLines.lines,
        events: hangzhouEvents,
        milestoneDates: ['2012-11-24', '2014-11-24', '2019-06-24', '2020-12-30', '2022-09-22'],
        initialView: { center: [2270, 1140], zoom: 1 },
        operators: {
            metro: { src: hangzhouLogo, alt: 'Hangzhou Metro' },
        },
    }),
    guangfo: defineSystem({
        name: 'Guangfo Metro',
        localTitle: '广佛地铁历史',
        description: "Explore Guangzhou and Foshan's rail history",
        map: guangfoMap,
        initialBounds: [4046.5, 4485.133],
        logos: [guangzhouLogo, foshanLogo],
        lines: guangfoLines.lines,
        events: guangfoEvents,
        milestoneDates: ['1997-06-28', '2002-12-29', '2010-11-03', '2021-09-28', '2024-12-28'],
        initialView: { center: [1870, 2360], zoom: 1 },
        operators: {
            guangzhou: { src: guangzhouLogo, alt: 'Guangzhou Metro' },
            foshan: { src: foshanLogo, alt: 'Foshan Metro' },
        },
    }),
    chengdu: defineSystem({
        name: 'Chengdu Metro',
        localTitle: '成都地铁历史',
        description: "Explore the growth of Chengdu's rail network",
        map: chengduMap,
        initialBounds: [5848.204, 4008.07],
        logos: [chengduLogo],
        logoSize: 32,
        tooltipLogoSize: 8,
        lines: chengduLines.lines,
        events: chengduEvents,
        milestoneDates: ['2010-09-27', '2017-12-06', '2020-12-18', '2023-11-28', '2025-12-16'],
        initialView: { center: [2924, 1200], zoom: 1 },
        operators: {
            metro: { src: chengduLogo, alt: 'Chengdu Metro' },
        },
    }),
    beijing: defineSystem({
        name: 'Beijing Subway',
        localTitle: '北京地铁历史',
        description: "Explore the growth of Beijing's rail network",
        map: beijingMap,
        initialBounds: [4400, 5300],
        logos: [beijingLogo],
        lines: beijingLines.lines,
        events: beijingEvents,
        milestoneDates: ['1971-01-15', '1987-12-28', '2008-07-19', '2010-12-30', '2025-12-27'],
        initialView: { center: [2000, 2380], zoom: 1 },
        operators: {
            subway: { src: beijingLogo, alt: 'Beijing Subway' },
            mtr: { src: beijingMtrLogo, alt: 'Beijing MTR' },
        },
    }),
    nanjing: defineSystem({
        name: 'Nanjing Metro',
        localTitle: '南京地铁历史',
        description: "Explore the growth of Nanjing's rail network",
        map: nanjingMap,
        initialBounds: [6200, 8300],
        logos: [nanjingLogo],
        lines: nanjingLines.lines,
        events: nanjingEvents,
        milestoneDates: ['2005-05-15', '2010-05-28', '2014-07-01', '2017-12-06', '2026-04-22'],
        initialView: { center: [3000, 3400], zoom: 1.6 },
        operators: {
            metro: { src: nanjingLogo, alt: 'Nanjing Metro' },
        },
    }),
    chongqing: defineSystem({
        name: 'Chongqing Rail Transit',
        localTitle: '重庆轨道交通历史',
        description: "Explore the growth of Chongqing's rail network",
        map: chongqingMap,
        initialBounds: [5800, 4800],
        logos: [chongqingLogo],
        logoSize: 36,
        tooltipLogoSize: 12,
        lines: chongqingLines.lines,
        events: chongqingEvents,
        milestoneDates: ['2004-11-06', '2011-09-29', '2018-12-28', '2025-01-02', '2026-02-10'],
        initialView: { center: [3290, 2460], zoom: 1.7 },
        operators: {
            rail: { src: chongqingLogo, alt: 'Chongqing Rail Transit' },
        },
    }),
    xian: defineSystem({
        name: "Xi'an Metro",
        localTitle: '西安地铁历史',
        description: "Explore the growth of Xi'an's rail network",
        map: xianMap,
        initialBounds: [3400, 2800],
        logos: [xianLogo],
        lines: xianLines.lines,
        events: xianEvents,
        milestoneDates: ['2011-09-16', '2013-09-15', '2020-12-28', '2021-06-29', '2024-12-26'],
        initialView: { center: [1780, 1600], zoom: 1.2 },
        operators: {
            metro: { src: xianLogo, alt: "Xi'an Metro" },
            xazt: { src: xianXaztLogo, alt: "Xi'an China Railway Rail Transit" },
            intercity: { src: xianIntercityLogo, alt: 'Shaanxi Intercity Railway' },
        },
    }),
    seoul: defineSystem({
        name: 'Seoul Metropolitan Subway',
        localTitle: '수도권 전철 역사',
        description: "Explore the growth of Seoul's rail network",
        map: seoulMap,
        initialBounds: [7500, 5500],
        initialView: { center: [4300, 3200], zoom: 1.6 },
        logos: [seoulLogo],
        lines: seoulLines.lines,
        events: seoulEvents,
        milestoneDates: ['1974-08-15', '1984-05-22', '1999-10-06', '2014-12-27', '2024-12-28'],
        operators: {
            metro: { src: seoulLogo, alt: 'Seoul Metro' },
            korail: { src: seoulKorailLogo, alt: 'Korail' },
            incheon: { src: seoulIncheonLogo, alt: 'Incheon Transit Corporation' },
            gimpo: { src: seoulGimpoLogo, alt: 'Gimpo Goldline' },
            arex: { src: seoulArexLogo, alt: 'AREX' },
            neotrans: { src: seoulNeoTransLogo, alt: 'NeoTrans' },
            maglev: { src: seoulMaglevLogo, alt: 'Incheon Airport Maglev' },
        },
    }),
};

export type SystemKey = keyof typeof systems;

export const systemKeys = Object.keys(systems) as SystemKey[];
