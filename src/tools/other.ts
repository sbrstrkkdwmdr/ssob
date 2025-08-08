import * as canvas from 'canvas';
import * as chartjs from 'chart.js/auto';
import Discord from 'discord.js';
import fs from 'fs';
import * as osuclasses from 'osu-classes';
import * as osuparsers from 'osu-parsers';
import * as rosu from 'rosu-pp-js';
import * as helper from '../helper';
import * as colourcalc from './colourcalc';
import * as log from './log';
import * as osuapi from './osuapi';

export function appendUrlParamsString(url: string, params: string[]) {
    let temp = url;
    for (let i = 0; i < params.length; i++) {
        const cur = encodeURIComponent(params[i]).replace('%3D', '=');
        if (!cur) { break; }
        temp.includes('?') ?
            temp += `&${cur}` :
            `?${cur}`;
    }
    return temp;
}

export function debug(data: any, type: string, name: string, serverId: string | number, params: string) {
    const pars = params.replaceAll(',', '=');
    if (!fs.existsSync(`${helper.path.main}/cache/debug/${type}`)) {
        fs.mkdirSync(`${helper.path.main}/cache/debug/${type}`);
    }
    if (!fs.existsSync(`${helper.path.main}/cache/debug/${type}/${name}/`)) {
        fs.mkdirSync(`${helper.path.main}/cache/debug/${type}/${name}`);
    }
    try {
        if (data?.input?.config) {
            data.helper.vars.config = censorConfig();
        }
        fs.writeFileSync(`${helper.path.main}/cache/debug/${type}/${name}/${pars}_${serverId}.json`, JSON.stringify(data, null, 2));
    } catch (error) {
    }
    return;
}

export function modeValidator(mode: string | number) {
    let returnf: osuapi.types_v2.GameMode = 'osu';
    switch (mode) {
        case 0: case 'osu': default: case 'o': case 'std': case 'standard':
            returnf = 'osu';
            break;
        case 1: case 'taiko': case 't': case 'drums':
            returnf = 'taiko';
            break;
        case 2: case 'fruits': case 'f': case 'c': case 'ctb': case 'catch': case 'catch the beat': case 'catchthebeat':
            returnf = 'fruits';
            break;
        case 3: case 'mania': case 'm': case 'piano': case 'key': case 'keys':
            returnf = 'mania';
            break;
    }
    return returnf;
}

export function modeValidatorAlt(mode: string | number) {
    let returnf: osuapi.types_v2.GameMode = 'osu';

    if (typeof mode == 'number') {
        switch (mode) {
            case 0: default:
                returnf = 'osu';
                break;
            case 1:
                returnf = 'taiko';
                break;
            case 2:
                returnf = 'fruits';
                break;
            case 3:
                returnf = 'mania';
                break;
        }
    } else if (typeof mode == 'string') {
        switch (mode) {
            case 'osu': default: case 'o': case 'std': case 'standard':
                returnf = 'osu';
                break;
            case 'taiko': case 't': case 'drums':
                returnf = 'taiko';
                break;
            case 'fruits': case 'f': case 'c': case 'ctb': case 'catch': case 'catch the beat': case 'catchthebeat':
                returnf = 'fruits';
                break;
            case 'mania': case 'm': case 'piano': case 'key': case 'keys':
                returnf = 'mania';
                break;
        }
    }

    const included = [
        0, 'osu', 'o', 'std', 'standard',
        1, 'taiko', 't', 'drums',
        2, 'fruits', 'f', 'c', 'ctb', 'catch', 'catch the beat', 'catchthebeat',
        3, 'mania', 'm', 'piano', 'key', 'keys'
    ];

    let isincluded = true;
    if (!included.includes(mode)) {
        isincluded = false;
    }

    return {
        mode: returnf,
        isincluded
    };
}

export function removeSIPrefix(str: string) {
    const SIPrefixes = [
        { prefix: 'Q', name: 'quetta', value: 1e27 },
        { prefix: 'R', name: 'ronna', value: 1e27 },
        { prefix: 'Y', name: 'yotta', value: 1e24 },
        { prefix: 'Z', name: 'zetta', value: 1e21 },
        { prefix: 'E', name: 'exa', value: 1e18 },
        { prefix: 'P', name: 'peta', value: 1e15 },
        { prefix: 'T', name: 'tera', value: 1e12 },
        { prefix: 'G', name: 'giga', value: 1e9 },
        { prefix: 'M', name: 'mega', value: 1e6 },
        { prefix: 'k', name: 'kilo', value: 1e3 },
        { prefix: 'h', name: 'hecto', value: 1e2 },
        { prefix: 'da', name: 'deca', value: 1e1 },
        { prefix: 'd', name: 'deci', value: 1e-1 },
        { prefix: 'c', name: 'centi', value: 1e-2 },
        { prefix: 'm', name: 'milli', value: 1e-3 },
        { prefix: 'µ', name: 'micro', value: 1e-6 },
        { prefix: 'n', name: 'nano', value: 1e-9 },
        { prefix: 'p', name: 'pico', value: 1e-12 },
        { prefix: 'f', name: 'femto', value: 1e-15 },
        { prefix: 'a', name: 'atto', value: 1e-18 },
        { prefix: 'z', name: 'zepto', value: 1e-21 },
        { prefix: 'y', name: 'yocto', value: 1e-24 },
        { prefix: 'r', name: 'ronto', value: 1e27 },
        { prefix: 'q', name: 'quecto', value: 1e27 },
    ];

    let removedPrefix = '';
    let value = parseFloat(str);
    let power = 1;
    let foundPrefix = { prefix: '', name: '', value: 1e0 };

    if (isNaN(value)) {
        foundPrefix = SIPrefixes.find(p => str.startsWith(p.name) || str.startsWith(p.prefix));
        if (foundPrefix) {
            power = foundPrefix.value;
            removedPrefix = str.startsWith(foundPrefix.name) ?
                foundPrefix.name : foundPrefix.prefix;
        } else {
            value = parseFloat(str);
        }
    }

    return {
        prefix: {
            removed: removedPrefix,
            short: foundPrefix?.prefix,
            long: foundPrefix?.name,
        },
        power,
        originalValue: str.replace(removedPrefix, ''),
    };
}

/**
 * sort list by closest match to input
 */
export function searchMatch(input: string, list: string[]) {
    const sort: {
        factor: number,
        text: string;
    }[] = [];
    for (const word of list) {
        let tempFactor = 0;
        //if length match add 1
        if (input.length == word.length) {
            tempFactor += 1;
        }
        //for each letter in the word that is found in the word, add 1, dont repeat
        const tempArr = word.split('');
        const tempArrIn = input.split('');
        for (let i = 0; i < tempArr.length; i++) {
            for (let j = 0; j < tempArrIn.length; j++) {
                if (tempArr[i] == tempArrIn[j]) {
                    tempFactor += 1;
                    tempArr.splice(tempArr.indexOf(tempArr[i]), 1);
                    tempArrIn.splice(tempArrIn.indexOf(tempArrIn[j]), 1);
                }
            }
        }
        //for each letter with same pos add 1, dont repeat
        for (let i = 0; i < input.length; i++) {
            if (input.trim().toLowerCase().charAt(i) == word.trim().toLowerCase().charAt(i)) {
                tempFactor += 2;
            }
        }
        if (word.trim().toLowerCase().includes(input.trim().toLowerCase()) || input.trim().toLowerCase().includes(word.trim().toLowerCase())) {
            tempFactor += 4;
        }
        const tempWordArr = word.split(' ');
        word.includes(' ') ? word.split(' ') : [word];
        const tempWordArrIn = input.split(' ');
        input.includes(' ') ? input.split(' ') : [input];
        for (const sub of tempWordArr) {
            if (tempWordArrIn.includes(sub)) {
                tempFactor += 3;
                tempWordArrIn.splice(tempWordArrIn.indexOf(sub), 1);
            }
        }

        if (word.trim().toLowerCase() == input.trim().toLowerCase()) {
            tempFactor += 1e10;
        }
        sort.push({ factor: tempFactor, text: word });
    }
    sort.sort((a, b) => b.factor - a.factor);
    return sort.map(x => x.text);
}

/**
 * remove duplicate elements from an array
 */
export function removeDupes(arr: any[]) {
    return arr.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
}

/**
 * filters array by search. 
 * 
 * returns array with items that include the search string
 */
export function filterSearchArray(arr: string[], search: string) {
    return arr.filter((el) => el.toLowerCase().includes(search.toLowerCase()));
}

export function censorConfig() {
    return {
        "token": "!!!",
        "osu": {
            "clientId": "!!!",
            "clientSecret": "!!!"
        },
        "prefix": "!!!",
        "owners": ["!!!"],
        "tenorKey": "!!!",
        "enableTracking": null,
        "logs": null
    };
}

/**
 * times formatted as yyyy-mm-ddThh:mm
 */
export function timeForGraph(times: string[]) {
    const reformattedTimes: string[] = [];
    for (const time of times) {
        if (time.includes('T')) {
            if (time.includes('00:00')) {
                reformattedTimes.push(time.split('T')[0]);

            } else {
                reformattedTimes.push(time.split('T')[1]);
            }
        } else {
            reformattedTimes.push(time);
        }
    }
    return reformattedTimes;
}

type graphInput = {
    x: number[] | string[];
    y: number[];
    label: string;
    other: {
        startzero?: boolean,
        fill?: boolean,
        displayLegend?: boolean,
        lineColour?: string,
        pointSize?: number;
        gradient?: boolean;
        type?: 'line' | 'bar';
        stacked?: boolean;
        title?: string;
        showAxisX?: boolean;
        showAxisY?: boolean;
        stacksSeparate?: boolean;
        reverse?: boolean;
        imgUrl?: string;
        blurImg?: boolean;
        barOutline?: true;
    };
    extra?: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }[];
};

/**
 * 
 * @param x 
 * @param y 
 * @param label name of graph
 * @param lineColour colour of graph line written as rgb(x, y, z)
 * @returns path to the graph
 */
export function graph({ x, y, label, other, extra = [] }: graphInput) {
    const builder = new GraphBuilder({ x, y, label, other, extra });
    return builder.execute();
}

export class GraphBuilder {
    x: string[];
    y: number[];
    label: string;
    other: {
        startzero?: boolean,
        fill?: boolean,
        displayLegend?: boolean,
        lineColour?: string,
        pointSize?: number;
        gradient?: boolean;
        type?: 'line' | 'bar';
        stacked?: boolean;
        title?: string;
        showAxisX?: boolean;
        showAxisY?: boolean;
        stacksSeparate?: boolean;
        reverse?: boolean;
        imgUrl?: string;
        blurImg?: boolean;
        barOutline?: true;
    };
    extra?: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }[];
    highlightPoints?: number[];
    constructor({ x, y, label, other, extra = [] }: graphInput) {
        this.x = x.map((foo: string | number) => typeof foo == 'string' ? foo : foo + '');
        this.y = y;
        this.label = label;
        this.other = other;
        this.extra = extra;
    };
    checkSettings() {
        if (this.other.startzero == null || typeof this.other.startzero == 'undefined') {
            this.other.startzero = true;
        }
        if (this.other.fill == null || typeof this.other.fill == 'undefined') {
            this.other.fill = false;
        }
        if (this.other.displayLegend == null || this.other.displayLegend == undefined || typeof this.other.displayLegend == 'undefined') {
            this.other.displayLegend = false;
        }
        if (this.other.type == null || this.other.type == undefined || typeof this.other.displayLegend == 'undefined') {
            this.other.type = 'line';
        }
    }
    checkData() {
        if (this.y.length > 200) {
            let curx: string[] = [];
            let cury: number[] = [];
            const div = this.y.length / 200;
            for (let i = 0; i < 200; i++) {
                const offset = Math.ceil(i * div);
                const curval = this.y[offset];
                const xval = this.x[offset];
                cury.push(curval);
                curx.push(xval);
            }
            this.x = curx;
            this.y = cury;
        }
        const isNumbered = this.x.filter(x => typeof x == 'number');
        if (isNumbered.length > 0) {
            let temp: string[] = [];
            for (const value of this.x) {
                temp.push(value + '');
            }
            this.x = temp;
        }
    }
    protected datasets: helper.tooltypes.dataset[];
    protected secondary = {
        axis: false,
        reverse: false,
    };
    primaryData() {
        this.datasets = [{
            label: this.label,
            data: this.y,
            fill: this.other.fill,
            borderColor: this.other.lineColour ?? 'rgb(101, 101, 135)',
            borderWidth: 1,
            pointRadius: this.other.pointSize ?? 2,
            yAxisID: '1y'
        }];
        if (this.other?.stacked == true) {
            this.datasets[0]['stack'] = 'Stack 0';
        }
    }
    extraData() {
        if (!(this.extra == null || this.extra == undefined)) {
            const diff = 360 / Math.floor(this.extra.length);
            let i = 1;
            for (const newData of this.extra) {
                i = this.extraDataItem(newData, i, diff);
            }
        }
    }
    extraDataItem(data: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }, index: number, diff: number) {
        if (data?.data?.length > 0) {
            const nHSV = colourcalc.rgbToHsv(101, 101, 135);
            const newclr = colourcalc.hsvToRgb(nHSV.h + (diff * index), nHSV.s, nHSV.v);
            const xData = {
                label: data.label,
                data: data.data,
                fill: this.other.fill,
                borderColor: this.other.lineColour ?? `rgb(${newclr})`,
                borderWidth: 1,
                pointRadius: this.other.pointSize ?? 2,
                yAxisID: data.separateAxis ? '2y' : '1y'
            };
            if (data.reverse) this.secondary.reverse = true;
            if (this.other?.type == 'bar' && this.other?.stacked == true && this.other?.stacksSeparate == true) {
                data.customStack ?
                    xData['stack'] = `Stack ${data.customStack}` :
                    xData['stack'] = 'Stack 0';
            }
            this.datasets.push(xData);
            if (data.separateAxis) this.secondary.axis = true;
            return index++;
        }
        return index;
    }
    protected get defaultConfig_old() {
        return {
            legend: {
                display: this.other.displayLegend
            },
            title: {
                display: this.other?.title ? true : false,
                title: this.other?.title ?? 'No title'
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgb(128, 128, 128)'
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgb(128, 128, 128)'
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                xAxes: [
                    {
                        display: true,
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 10
                        },
                    }
                ],
                yAxes: [
                    {
                        id: '1y',
                        type: 'linear',
                        position: 'left',
                        display: true,
                        ticks: {
                            reverse: this.other.reverse,
                            beginAtZero: this.other.startzero
                        },
                    }, {
                        id: '2y',
                        type: 'linear',
                        position: 'right',
                        display: this.secondary.axis,
                        ticks: {
                            reverse: this.secondary.reverse,
                            beginAtZero: this.other.startzero
                        },
                    }
                ]
            },
        };
    }
    protected get config_old() {
        const cfgopts = this.defaultConfig_old;
        if (this.other?.type == 'bar') {
            cfgopts['elements'] = {
                backgroundColor: this.other.lineColour ?? 'rgb(101, 101, 135)',
                borderColor: this.other?.barOutline ? 'rgb(255, 255, 255)' : this.other.lineColour ?? 'rgb(101, 101, 135)',
                borderWidth: 2
            };
        }
        if (this.other?.type == 'bar' && this.other?.stacked == true) {
            for (const elem of cfgopts['scales']['xAxes']) {
                elem['stacked'] = this.other.stacked ?? false;
            }
            for (const elem of cfgopts['scales']['yAxes']) {
                elem['stacked'] = this.other.stacked ?? false;
            }
        }
        return cfgopts;
    }
    protected get xTicks() {
        return {
            color: 'rgb(128, 128, 128)',
            backdropColor: 'rgb(128, 128, 128)',
            callback: function (value, index, values) {
                // if (highlightPoints && highlightPoints.includes(index)) {
                //     this.backgroundColor = 'rgb(128, 128, 128)';
                // }
                // this.backgroundColor = 'rgb(255, 0, 0)';
                return '';
            }
        };
    }
    protected get xGrid() {
        return {
            display: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: 'rgb(64, 64, 64)'
        };
    }
    protected get yTicksPrimary() {
        return {
            color: 'rgb(128, 128, 128)',
            // beginAtZero: other.startzero
        };
    }
    protected get yGrid() {
        return {
            display: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: 'rgb(64, 64, 64)'
        };
    }
    protected get yPrimary() {
        return {
            position: 'left' as helper.tooltypes.graphPosition,
            reverse: this.other.reverse,
            beginAtZero: this.other.startzero,
            ticks: this.yTicksPrimary,
            grid: this.yGrid,
        };
    }
    protected get ySecondary() {
        return {
            position: 'right' as helper.tooltypes.graphPosition,
            display: this.secondary.axis,
            reverse: this.secondary.reverse,
            ticks: {
                // beginAtZero: other.startzero,
            },
        };
    }
    protected get scales() {
        return {
            x: {
                ticks: this.xTicks,
                grid: this.xGrid,
            },
            y: this.yPrimary,
            y1: this.ySecondary,
        };
    }
    canvas: canvas.Canvas;
    protected createChart() {
        this.canvas = canvas.createCanvas(1500, 500);
        const ctx = this.canvas.getContext("2d");
        const chart = new chartjs.Chart(ctx, {
            type: this.other?.type ?? 'line',
            data: {
                labels: this.x,
                datasets: this.datasets
            },
            options: {
                scales: this.scales
            },
            plugins: [{
                id: 'customImage',
                beforeDraw: (chart) => {
                    // console.log(chart.chartArea);
                }
            }]
        });
        return chart;
    }
    writeToFile() {
        const filename = `${(new Date).getTime()}`;
        let curt = `${helper.path.main}/cache/graphs/${filename}.jpg`;
        try {
            const buffer = this.canvas.toBuffer();
            fs.writeFileSync(curt, buffer);
        } catch (err) {
            log.stdout(err);
            curt = `${helper.path.precomp}/files/blank_graph.png`;
        }
        return {
            path: curt,
            filename
        };
    }
    execute() {
        this.checkSettings();
        this.checkData();
        this.primaryData();
        this.extraData();
        this.createChart();
        return this.writeToFile();
    }
}

export function formatHours(arr: string[]) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return "";
    }

    arr = arr.map(time => time.trim()).sort();
    const formattedHours = [];
    let startHour = arr[0];
    let endHour = arr[0];

    for (let i = 1; i < arr.length; i++) {
        const currentHour = arr[i];
        const previousHour = arr[i - 1];

        const currentTimestamp = new Date(`2000-01-01T${currentHour}:00`).getTime();
        const previousTimestamp = new Date(`2000-01-01T${previousHour}:00`).getTime();

        if (currentTimestamp - previousTimestamp === 3600000) {
            endHour = currentHour;
        } else {
            formattedHours.push(startHour === endHour ? startHour : `${startHour} - ${endHour}`);
            startHour = endHour = currentHour;
        }
    }

    formattedHours.push(startHour === endHour ? startHour : `${startHour} - ${endHour}`);

    return formattedHours.join(", ");
}

export function ubitflagsAsName(flags: Discord.UserFlagsBitField) {
    log.stdout(flags);
    const fl = flags.toArray();
    log.stdout(fl);
    return 'aa';
}

export function userbitflagsToEmoji(flags: Discord.UserFlagsBitField) {
    const temp = flags.toArray();
    const tempMap = temp.map(x => helper.emojis.discord.flags[x]);
    const newArr: string[] = [];
    for (let i = 0; i < temp.length; i++) {
        let a = '';
        if (!tempMap[i] || tempMap[i].length == 0) {
            a = temp[i];
        } else {
            a = tempMap[i];
        }
        newArr.push(a);
    }
    return newArr;
}

export function scoreTotalHits(stats: osuapi.types_v2.ScoreStatistics) {
    let total = 0;
    for (const value in stats) {
        total += stats[value];
    }
    return total;
}

export function scoreIsComplete(
    stats: osuapi.types_v2.ScoreStatistics,
    circles: number,
    sliders: number,
    spinners: number,
) {
    let total = scoreTotalHits(stats);
    return {
        passed: total == circles + sliders + spinners,
        objectsHit: total,
        percentage: Math.abs(total / (circles + sliders + spinners)) * 100
    };
}

export function filterScoreQuery(scores: osuapi.types_v2.Score[], search: string) {
    return scores.filter((score) =>
        (
            score.beatmapset.title.toLowerCase().replaceAll(' ', '')
            +
            score.beatmapset.artist.toLowerCase().replaceAll(' ', '')
            +
            score.beatmap.version.toLowerCase().replaceAll(' ', '')
        ).includes(search.toLowerCase().replaceAll(' ', ''))
        ||
        score.beatmapset.title.toLowerCase().replaceAll(' ', '').includes(search.toLowerCase().replaceAll(' ', ''))
        ||
        score.beatmapset.artist.toLowerCase().replaceAll(' ', '').includes(search.toLowerCase().replaceAll(' ', ''))
        ||
        score.beatmap.version.toLowerCase().replaceAll(' ', '').includes(search.toLowerCase().replaceAll(' ', ''))
        ||
        search.toLowerCase().replaceAll(' ', '').includes(score.beatmapset.title.toLowerCase().replaceAll(' ', ''))
        ||
        search.toLowerCase().replaceAll(' ', '').includes(score.beatmapset.artist.toLowerCase().replaceAll(' ', ''))
        ||
        search.toLowerCase().replaceAll(' ', '').includes(score.beatmap.version.toLowerCase().replaceAll(' ', ''))
    );
}

export async function getFailPoint(
    objectsPassed: number,
    mapPath: string,
) {
    let time = 1000;
    if (fs.existsSync(mapPath)) {
        try {
            const decoder = new osuparsers.BeatmapDecoder();
            const beatmap = await decoder.decodeFromPath(mapPath, false) as any as osuclasses.Beatmap;
            if (objectsPassed == null || objectsPassed < 1) {
                objectsPassed = 1;
            }
            const objectOfFail = beatmap.hitObjects[objectsPassed - 1];
            time = objectOfFail.startTime;
        } catch (error) {

        }
    } else {
        log.stdout("Path does not exist: " + mapPath);
    }
    return time;
}

// checks if code is a valid iso 3166-1 alpha-2 code
export function validCountryCodeA2(code: string) {
    return helper.iso._3166_1_alpha2.some(x => x == code.toUpperCase());
}

/**
 * 
 * @param defaultToNan - if the stat isnt found, return NaN instead of 0 
 * @returns 
 */
export function lazerToOldStatistics(stats: osuapi.types_v2.ScoreStatistics, mode: rosu.GameMode, defaultToNan?: boolean): osuapi.types_v2.Statistics {
    let foo: osuapi.types_v2.Statistics;
    let dv = defaultToNan ? NaN : 0;
    switch (mode) {
        case 0:
            foo = {
                count_300: stats?.great ?? dv,
                count_100: stats?.ok ?? dv,
                count_50: stats?.meh ?? dv,
                count_miss: stats?.miss ?? dv,
                count_geki: NaN,
                count_katu: NaN
            };
            break;
        case 1:
            foo = {
                count_300: stats.great,
                count_100: stats?.good ?? dv,
                count_50: NaN,
                count_miss: stats?.miss ?? dv,
                count_geki: NaN,
                count_katu: NaN
            };
            break;
        case 2:
            foo = {
                count_300: stats.great, // fruits
                count_100: stats?.ok ?? dv, // drops
                count_50: stats?.small_tick_hit ?? dv, // droplets 
                count_miss: stats?.miss ?? dv, //
                count_geki: NaN,
                count_katu: stats?.small_tick_miss ?? dv, // droplets miss
            };
            break;
        case 3:
            foo = {
                count_geki: stats?.perfect ?? dv,
                count_300: stats.great,
                count_katu: stats?.good ?? dv,
                count_100: stats?.ok ?? dv,
                count_50: stats?.meh ?? dv,
                count_miss: stats?.miss ?? dv,
            };
            break;
    }
    return foo;
}

export function getTotalScore(score: osuapi.types_v2.Score): number {
    return score.mods.map(x => x.acronym).includes('CL') ?
        scoreIsStable(score) ?
            score?.legacy_total_score :
            score.classic_total_score :
        score.total_score;

}

/**
 * true for stable, false for lazer
 */
export function scoreIsStable(score: osuapi.types_v2.Score): boolean {
    /**
 * check score is on stable or lazer
 * stable ->
 * mods always include classic (CL)
 * score build id is null
 * lazer ->
 * legacy total score is 0 or null
 * legacy score id is null (NOT 0)
 */

    if (score.legacy_total_score == 0) return false;
    if (score.legacy_score_id == null) return false;
    if (!score.mods.map(x => x.acronym).includes('CL')) return false;
    if (score.build_id) return false;
    return true;
}

export function listItems(list: string[]) {
    let string = '';
    if (list.length > 1) {

        for (let i = 0; i < list.length - 2; i++) {
            string += list[i] + ', ';
        }
        string += list[list.length - 2] + ' and ' + list[list.length - 1];
    } else {
        return list[0];
    }
    return string;
}