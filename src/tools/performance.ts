import * as fs from 'fs';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../helper';
import { Dict } from '../types/tools';
import * as api from './api';
import * as formatters from './formatters';
import * as log from './log';
import * as osuapi from './osuapi';
import * as other from './other';

/** */
export async function calcScore(input: {
    mapid: number,
    mode: rosu.GameMode,
    mods: osumodcalc.types.Mod[],
    accuracy: number,
    clockRate?: number,
    stats?: osuapi.types_v2.ScoreStatistics,
    maxcombo?: number,
    passedObjects?: number,
    mapLastUpdated: Date,
    customCS?: number,
    customAR?: number,
    customOD?: number,
    customHP?: number,
}) {
    let data = { ...input };
    if (!fs.existsSync(helper.path.main + '/files/maps/')) {
        log.stdout('creating files/maps/');
        fs.mkdirSync(helper.path.main + '/files/maps/');
    }
    const mapPath = await api.dlMap(data.mapid, 0, data.mapLastUpdated);
    const map = new rosu.Beatmap(fs.readFileSync(mapPath, 'utf-8'));
    if (data.mode != map.mode && map.mode == rosu.GameMode.Osu) {
        map.convert(data.mode);
    }
    data.accuracy = fixAcc(data.accuracy);

    const baseScore: rosu.PerformanceArgs = {
        mods: input.mods,
        accuracy: data.accuracy ?? 100,
    };
    const oldStats = other.lazerToOldStatistics(data.stats, data.mode, true);
    scoreIterateKeys(data, baseScore, {
        maxcombo: 'combo',
        passedObjects: 'passedObjects'
    });
    scoreIterateKeys(oldStats, baseScore, {
        count_300: 'n300',
        count_100: 'n100',
        count_50: 'n50',
        count_miss: 'misses',
        count_katu: 'nKatu',
    });
    scoreIterateKeys(input, baseScore, {
        'cs': 'customCS',
        'ar': 'customAR',
        'od': 'customOD',
        'hp': 'customHP',
        'clockRate': 'clockRate',
    });

    if (input.mods.includes('CL')) {
        baseScore.lazer = false;
    }

    const perf: rosu.Performance = new rosu.Performance(baseScore);

    const final = perf.calculate(map);
    perf.free();
    map.free();
    return final;
}
export async function calcFullCombo(input: {
    mapid: number,
    mode: rosu.GameMode,
    mods: osumodcalc.types.Mod[],
    accuracy: number,
    clockRate?: number,
    stats?: osuapi.types_v2.ScoreStatistics,
    mapLastUpdated: Date,
    customCS?: number,
    customAR?: number,
    customOD?: number,
    customHP?: number,
}) {
    let stats = input.stats ? { ...input.stats } : formatters.nonNullStats(input.stats);
    if (stats.great == 0 && stats.perfect == 0) {
        stats.great = NaN;
    }
    stats.miss = 0;
    if (input.accuracy == 100 || input.accuracy == 1) {
        stats.great = null;
        stats.good = null;
        stats.meh = null;
        stats.ok = null;
    }
    return await calcScore({
        mapid: input.mapid,
        mode: input.mode,
        mods: input.mods,
        accuracy: input.accuracy,
        clockRate: input.clockRate,
        stats: stats,
        mapLastUpdated: input.mapLastUpdated,
        customCS: input.customCS,
        customAR: input.customAR,
        customOD: input.customOD,
        customHP: input.customHP
    });
}
export async function calcMap(input: {
    mapid: number,
    mode: rosu.GameMode,
    mods: osumodcalc.types.Mod[],
    mapLastUpdated: Date,
    clockRate: number,
    customCS?: number,
    customAR?: number,
    customOD?: number,
    customHP?: number,
}) {
    const values: rosu.PerformanceAttributes[] = [];
    for (let i = 0; i < 11; i++) {
        const temp = {
            mapid: input.mapid,
            mode: input.mode,
            mods: input.mods,
            mapLastUpdated: input.mapLastUpdated,
            clockRate: input.clockRate,
            accuracy: (100 - i) / 100,
            stats: {
                great: NaN,
                miss: 0,
            },
            customCS: input.customCS,
            customAR: input.customAR,
            customHP: input.customHP,
            customOD: input.customOD,
        };
        const calc = await calcScore(temp);
        values.push(calc);
    }
    return values;
}
export async function calcStrains(input: {
    mapid: number,
    mode: rosu.GameMode,
    mods: osumodcalc.types.Mod[],
    mapLastUpdated: Date,
}) {
    if (!fs.existsSync(helper.path.main + '/files/maps/')) {
        log.stdout('creating files/maps/');
        fs.mkdirSync(helper.path.main + '/files/maps/');
    }
    const mapPath = await api.dlMap(input.mapid, 0, input.mapLastUpdated);
    const map = new rosu.Beatmap(fs.readFileSync(mapPath, 'utf-8'));
    if (input.mode != map.mode && map.mode == rosu.GameMode.Osu) {
        map.convert(input.mode);
    }
    const strainValues =
        new rosu.Difficulty({
            mods: input.mods
        })
            .strains(map);
    const straintimes = [];
    const totalval = [];

    for (let i = 0; i < (strainValues?.aim ?? strainValues?.color ?? strainValues?.movement ?? strainValues?.strains ?? []).length; i++) {
        const offset = i;
        let curval: number;
        switch (input.mode) {
            case rosu.GameMode.Osu: default: {
                curval = strainValues.aim[offset] + strainValues.aimNoSliders[offset] + strainValues.speed[offset] + strainValues.flashlight[offset];
            } break;
            case rosu.GameMode.Taiko: {
                curval = strainValues.color[offset] + strainValues.rhythm[offset] + strainValues.stamina[offset];
            } break;
            case rosu.GameMode.Catch: {
                curval = strainValues.movement[offset];
            } break;
            case rosu.GameMode.Mania: {
                curval = strainValues.strains[offset];
            } break;
        }
        totalval.push(curval);

        const curtime = ((strainValues.sectionLength / 1000) * (i + 1));
        const curtimestr = Math.floor(curtime / 60) + ':' + `${(curtime % 60) < 10 ? '0' + Math.floor(curtime % 60) : Math.floor(curtime % 60)}`;
        straintimes.push(curtimestr);
    }
    const strains = {
        strainTime: straintimes,
        value: totalval,
    };
    map.free();
    return strains;
}
let x: rosu.GameMode;
export function template(mapdata: osuapi.types_v2.BeatmapExtended): rosu.PerformanceAttributes {
    return {
        pp: 0,
        estimatedUnstableRate: 0,
        difficulty: {
            mode: 0,
            stars: mapdata.difficulty_rating,
            maxCombo: mapdata.max_combo ?? 0,
            aim: 0,
            speed: 0,
            flashlight: 0,
            sliderFactor: 0,
            speedNoteCount: 0,
            ar: mapdata.ar,
            // od: mapdata.accuracy,
            nCircles: mapdata.count_circles,
            nSliders: mapdata.count_sliders,
            nSpinners: mapdata.count_spinners,
            stamina: 0,
            rhythm: 0,
            color: 0,
            // peak: 0,
            hitWindow: mapdata.accuracy,
            nFruits: mapdata.count_circles,
            nDroplets: mapdata.count_sliders,
            nTinyDroplets: mapdata.count_spinners,
            toJSON() {
                return { x: 'Hello world!' };
            },
            free() {
                return;
            },
            hp: mapdata.drain,
            isConvert: mapdata.convert,
            nObjects: mapdata.count_circles + mapdata.count_sliders + mapdata.count_spinners,
            aimDifficultStrainCount: 0,
            speedDifficultStrainCount: 0,
            greatHitWindow: 0,
            nHoldNotes: 0,
            nLargeTicks: 0,
            monoStaminaFactor: 0,
            okHitWindow: 0,
            aimDifficultSliderCount: 0,
            reading: 0,
            mehHitWindow: 0,
        },
        ppAccuracy: 0,
        ppAim: 0,
        ppFlashlight: 0,
        ppSpeed: 0,
        effectiveMissCount: 0,
        ppDifficulty: 0,
        speedDeviation: 0,
        toJSON() {
            return { x: 'Hello world!' };
        },
        free() {
            return;
        },
        state: null
    } as rosu.PerformanceAttributes;
}

/**
 * calculates performance, FC and SS
 */
export async function fullPerformance(
    mapid: number,
    mode: rosu.GameMode,
    mods: osumodcalc.types.Mod[],
    accuracy: number,
    clockRate?: number,
    stats?: osuapi.types_v2.ScoreStatistics,
    maxcombo?: number,
    passedObjects?: number,
    mapLastUpdated?: Date,
    customCS?: number,
    customAR?: number,
    customOD?: number,
    customHP?: number,
) {
    const perf = await calcScore({
        mods,
        mode,
        mapid,
        stats,
        accuracy,
        maxcombo,
        clockRate,
        mapLastUpdated,
        passedObjects,
        customCS,
        customAR,
        customOD,
        customHP,
    });
    const fcperf = await calcFullCombo({
        mods,
        mode,
        mapid,
        stats,
        accuracy,
        clockRate,
        mapLastUpdated,
        customCS,
        customAR,
        customOD,
        customHP,
    });
    const ssperf = await calcFullCombo({
        mods,
        mode,
        mapid,
        accuracy: 1,
        clockRate,
        mapLastUpdated,
        customCS,
        customAR,
        customOD,
        customHP,
    });
    return [perf, fcperf, ssperf];
}

export function getModSpeed(mods: osuapi.types_v2.Mod[]) {
    let rate = 1.0;
    for (const mod of mods) {
        if (mod?.settings?.speed_change) {
            rate *= mod?.settings?.speed_change;
        }
    }
    return rate;
}

function fixAcc(n: number) {
    if (isNaN(n)) {
        n = 100;
    }
    if (n <= 1) {
        n *= 100;
    }
    if (n > 100) {
        n /= 100;
    }
    return n;
}

function setBaseScoreValue(data: Dict, baseScore: rosu.PerformanceArgs, dKey: string, bKey: string = dKey) {
    if (data[dKey] != null && !isNaN(data[dKey])) {
        baseScore[bKey] = data[dKey];
    }
}

function scoreIterateKeys(data: Dict, baseScore: rosu.PerformanceArgs, keys: Dict<string>) {
    for (const key in keys) {
        setBaseScoreValue(data, baseScore, key, keys[key]);
    }
}