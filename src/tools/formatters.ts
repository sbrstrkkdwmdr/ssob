import * as Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import { PerformanceAttributes } from 'rosu-pp-js';
import * as helper from '../helper';
import * as tooltypes from '../types/tools';
import * as calculate from './calculate';
import * as osuapi from './osuapi';
import * as other from './other';
import * as performance from './performance';

export class ScoreFormatter {
    ranks = [
        'XH',
        'X',
        'SH',
        'S',
        'A',
        'B',
        'C',
        'D',
        'F',
    ];
    private scores: osuapi.types_v2.Score[];
    private indexed: tooltypes.indexed<osuapi.types_v2.Score>[];
    public get data() {
        return this.indexed;
    }
    private sort: 'pp' | 'score' | 'recent' | 'acc' | 'combo' | 'miss' | 'rank';
    private filter: {
        mapper: string,
        title: string,
        artist: string,
        version: string,
        modsInclude: osumodcalc.types.Mod[],
        modsExact: (osumodcalc.types.Mod | 'NONE')[],
        modsExclude: osumodcalc.types.Mod[],
        rank: string,
        pp: string,
        score: string,
        acc: string,
        combo: string,
        miss: string,
        bpm: string,
        isnochoke: boolean,
    };
    private reverse: boolean;
    private overrideMap: osuapi.types_v2.Beatmap;
    private page: number = 0;
    private showOriginalIndex: boolean = true;
    private preset?: 'map_leaderboard' | 'single_map';

    constructor(
        {
            scores, sort, filter, reverse, page, showOriginalIndex, preset, overrideMap
        }: {
            scores: osuapi.types_v2.Score[],
            sort: 'pp' | 'score' | 'recent' | 'acc' | 'combo' | 'miss' | 'rank',
            filter: {
                mapper: string,
                title: string,
                artist: string,
                version: string,
                modsInclude: osumodcalc.types.Mod[],
                modsExact: (osumodcalc.types.Mod | 'NONE')[],
                modsExclude: osumodcalc.types.Mod[],
                rank: string,
                pp: string,
                score: string,
                acc: string,
                combo: string,
                miss: string,
                bpm: string,
                isnochoke: boolean,
            },
            reverse: boolean,
            page: number,
            showOriginalIndex: boolean,
            preset?: 'map_leaderboard' | 'single_map',
            overrideMap?: osuapi.types_v2.BeatmapExtended,
        }
    ) {
        this.scores = scores;
        this.sort = sort;
        this.filter = filter;
        this.reverse = reverse;
        this.page = page ?? 0;
        this.overrideMap = overrideMap;
        this.showOriginalIndex = showOriginalIndex ?? true;
        this.preset = preset;
    }
    async parseScores() {
        for (let i = 0; i < this.scores.length; i++) {
            const newScore = { ...this.scores[i], originalIndex: i };
            this.indexed.push(newScore);
        }
        await this.filterScores();
        await this.sortScores();
        if (this.reverse) {
            this.indexed.reverse();
        }
    }
    async filterScores() {
        const dict: tooltypes.Dict<(score: tooltypes.indexed<osuapi.types_v2.Score>) => boolean> = {
            mapper: (score => matchesString(score.beatmapset.user.username, this.filter.mapper) || matchesString(score.beatmapset.user_id + '', this.filter.mapper) || matchesString((this.overrideMap ?? score.beatmap).user_id + '', this.filter.mapper)),
            title: (score => matchesString(score.beatmapset.artist, this.filter.artist) || matchesString(score.beatmapset.artist_unicode, this.filter.artist)),
            artist: (score => matchesString(score.beatmapset.artist, this.filter.artist) || matchesString(score.beatmapset.artist_unicode, this.filter.artist)),
            version: (score => matchesString((this.overrideMap ?? score.beatmap).version, this.filter.version)),
        };
        const argRangeDict: tooltypes.Dict<string> = {
            pp: 'pp',
            score: 'total_score',
            acc: 'total_accuracy',
            combo: 'max_combo',
        };
        for (const key in dict) {
            if (this.filter[key]) {
                this.indexed = this.indexed.filter(dict[key]);
            }
        }
        for (const key in argRangeDict) {
            if (this.filter[key]) {
                const tempArg = argRange(this.filter[key], true);
                this.indexed = this.indexed.filter(score => {
                    filterArgRange(score[argRangeDict[key]] ?? 0, tempArg);
                });
            }
        }
        if (this.filter?.miss) {
            const tempArg = argRange(this.filter.miss, true);
            this.indexed = this.indexed.filter(score => filterArgRange(score?.statistics?.miss ?? 0, tempArg));
        }
        if (this.filter?.bpm) {
            const tempArg = argRange(this.filter.bpm, true);
            this.indexed = this.indexed.filter(score => filterArgRange((this.overrideMap ?? score.beatmap).id, tempArg));
        }
        this.filterMods();
    }
    filterMods() {
        if (this.filter?.modsInclude && this.filter?.modsInclude.length > 0) {
            this.filterIncludeMods();
        }
        if (this.filter?.modsExact && !this.filter.modsInclude) {
            this.filterExactMods();
        } else if (this.filter?.modsExclude) {
            this.filterExcludeMods();
        }
    }
    filterIncludeMods() {
        this.indexed = this.indexed.filter(score => {
            let x: boolean = true;
            score.mods.forEach(mod => {
                if (!osumodcalc.mod.fix(this.filter.modsInclude, osumodcalc.mode.toName(score.ruleset_id)).includes(mod.acronym as osumodcalc.types.Mod)) {
                    x = false;
                }
            });
            return x;
        });
    }
    filterExactMods() {
        if (this.filter.modsExact.includes('NONE')) {
            this.indexed = this.indexed.filter(score => score.mods.length == 0 || score.mods.map(x => x.acronym).join('') == 'CL' || score.mods.map(x => x.acronym).join('') == 'LZ');
        } else {
            this.indexed = this.indexed.filter(score => score.mods.map(x => x.acronym).join('') == osumodcalc.mod.fix(this.filter.modsExact as osumodcalc.types.Mod[], osumodcalc.mode.toName(score.ruleset_id)).join(''));
        }
    }
    filterExcludeMods() {
        const xlModsArr = osumodcalc.mod.fix(this.filter.modsExclude, osumodcalc.mode.toName(this.indexed?.[0]?.ruleset_id ?? 0));
        if (this.filter.modsExclude.includes('DT') && this.filter.modsExclude.includes('NC')) {
            xlModsArr.push('DT');
        }
        if (this.filter.modsExclude.includes('HT') && this.filter.modsExclude.includes('DC')) {
            xlModsArr.push('DC');
        }
        this.indexed = this.indexed.filter(score => {
            let x: boolean = true;
            score.mods.forEach(mod => {
                if (xlModsArr.includes(mod.acronym as osumodcalc.types.Mod)) {
                    x = false;
                }
            });
            return x;
        });
    }

    async sortScores() {
        switch (this.sort) {
            case 'pp':
                await this.sortScores_performance();
                break;
            case 'score':
                this.indexed.sort((a, b) => b.total_score - a.total_score);
                break;
            case 'recent':
                this.indexed.sort((a, b) => (new Date(b.ended_at ?? b.started_at)).getTime() - (new Date(a.ended_at ?? a.started_at)).getTime());
                break;
            case 'acc':
                this.indexed.sort((a, b) => b.accuracy - a.accuracy);
                break;
            case 'combo':
                this.indexed.sort((a, b) => b.max_combo - a.max_combo);
                break;
            case 'miss':
                this.indexed.sort((a, b) => (a.statistics.miss ?? 0) - (b.statistics.miss ?? 0));
                break;
            case 'rank':
                this.indexed.sort((a, b) => this.ranks.indexOf(a.rank) - this.ranks.indexOf(b.rank));
                break;
        }
    }
    async sortScores_performance() {
        const sc = [];
        for (const score of this.indexed) {
            sc.push(
                !score.pp || isNaN(score.pp) ?
                    await this.calculatePerformance(score) :
                    score
            );
        }
        this.indexed = sc;
    }
    async calculatePerformance(score: osuapi.types_v2.Score) {
        let useacc = score.accuracy;
        let usestats = structuredClone(score.statistics);
        if (this.filter?.isnochoke) {
            usestats.miss = 0;
            useacc = this.scoreAccuracy(score);
            score.max_combo = null;
        }
        const perf = await performance.calcScore({
            mapid: this.overrideMap?.id ?? score.beatmap_id,
            mode: score.ruleset_id,
            mods: score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
            accuracy: useacc,
            clockRate: performance.getModSpeed(score.mods),
            stats: usestats,
            maxcombo: score.max_combo,
            passedObjects: other.scoreTotalHits(score.statistics),
            mapLastUpdated: new Date(score.ended_at),
        });
        score.pp = perf.pp;

        return score;
    }
    scoreAccuracy(score: osuapi.types_v2.Score) {
        let useacc = score.accuracy;
        switch (osumodcalc.mode.toName(score.ruleset_id)) {
            case 'osu': default:
                useacc = osumodcalc.accuracy.standard(score.statistics.great ?? 0, score.statistics.ok ?? 0, score.statistics.meh ?? 0, 0).accuracy;
                break;
            case 'taiko':
                useacc = osumodcalc.accuracy.taiko(score.statistics.great ?? 0, score.statistics.good ?? 0, score.statistics.miss ?? 0).accuracy;
                break;
            case 'fruits':
                useacc = osumodcalc.accuracy.fruits(score.statistics.great ?? 0, score.statistics.ok ?? 0, score.statistics.small_tick_hit ?? 0, score.statistics.small_tick_miss ?? 0, score.statistics.miss ?? 0).accuracy;
                break;
            case 'mania':
                useacc = osumodcalc.accuracy.mania(score.statistics.perfect ?? 0, score.statistics.great ?? 0, score.statistics.good ?? 0, score.statistics.ok ?? 0, score.statistics.meh ?? 0, score.statistics.miss ?? 0).accuracy;
                break;
        }
        return useacc;
    }

    async formatScores() {
        let max = 5;
        const maxPage = Math.ceil(this.indexed.length / max);
        if (isNaN(this.page) || this.page < 1) this.page = 1;
        if (this.page > maxPage) this.page = maxPage;
        const offset = (this.page - 1) * max;
        let text: string[] = [];
        for (let i = 0; i < max && i < this.indexed.length - offset; i++) {
            const score = this.indexed[i + offset];
            if (!score) break;
            const scoreString = await this.formatScore(score, i + offset);
            text.push(scoreString);
        }
        if (text.length == 0) {
            switch (0) {
                case this.scores.length:
                    text = ['**ERROR**\nNo scores found'];
                    break;
                case this.indexed.length:
                    text = ['**ERROR**\nNo scores found matching the given filters'];
                    break;
            }
            text = ['**ERROR**\nNo scores found'];
        }
        return {
            text: text.join('\n\n'),
            curPage: this.page,
            maxPage
        };
    }
    async formatScore(score: tooltypes.indexed<osuapi.types_v2.Score>, index: number): Promise<string> {
        let info = this.scoreHeader(score, index);
        const perfs = await this.scorePerformance(score);

        info += '\n' + this.scoreStatsRankScoreMods(score);
        info += '\n' + this.scoreStatsHitsComboAcc(score, perfs);
        info += '\n' + this.scoreStatsPerformance(score, perfs);

        return info;
    }
    scoreHeader(score: tooltypes.indexed<osuapi.types_v2.Score>, index: number) {
        let str = `**#${(this.showOriginalIndex ? score.originalIndex : index) + 1}`;
        let modadjustments = '';
        if (score.mods.filter(x => x?.settings?.speed_change).length > 0) {
            modadjustments += ' (' + score.mods.filter(x => x?.settings?.speed_change)[0].settings.speed_change + 'x)';
        }
        switch (this.preset) {
            case 'map_leaderboard':
                str += `・[${score.user.username}](https://osu.ppy.sh/${score.id ? `scores/${score.id}` : `u/${score.user_id}`})`;
                break;
            case 'single_map': {
                let t = osumodcalc.mod.order(score.mods.map(x => x.acronym) as osumodcalc.types.Mod[]).join('') + modadjustments;
                if (t == '') {
                    t = 'NM';
                }
                str += `・[${t}](https://osu.ppy.sh/scores/${score.id})`;
            } break;
            default:
                str += `・[${score.beatmapset.title} [${(this.overrideMap ?? score.beatmap).version}]](https://osu.ppy.sh/${score.id ? `scores/${score.id}` : `b/${(this.overrideMap ?? score.beatmap).id}`})`;
                break;
        }
        return str + `** ${dateToDiscordFormat(new Date(score.ended_at))}`;
    }
    async scorePerformance(score: osuapi.types_v2.Score) {
        const overrides = calculate.modOverrides(score.mods);
        const perfs = await performance.fullPerformance(
            this.overrideMap?.id ?? score.beatmap_id,
            score.ruleset_id,
            score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
            score.accuracy,
            overrides.speed,
            score.statistics,
            score.max_combo,
            null,
            new Date((this.overrideMap ?? score.beatmap).last_updated),
            overrides.ar,
            overrides.hp,
            overrides.cs,
            overrides.od,
        );
        return perfs;
    }
    scoreStatsRankScoreMods(score: osuapi.types_v2.Score) {
        let modadjustments = '';
        if (score.mods.filter(x => x?.settings?.speed_change).length > 0) {
            modadjustments += ' (' + score.mods.filter(x => x?.settings?.speed_change)[0].settings.speed_change + 'x)';
        }
        const rank = `${score.passed ? helper.emojis.grades[score.rank] : helper.emojis.grades.F + `(${helper.emojis.grades[score.rank]} if pass)`}`;
        const scoreStat = `\`${calculate.numberShorthand(other.getTotalScore(score))}\``;
        const mods = `${score.mods.length > 0 && this.preset != 'single_map' ?
            ' **' + osumodcalc.mod.order(score.mods.map(x => x.acronym) as osumodcalc.types.Mod[]).join('') + modadjustments + '**' :
            ''}`;
        const str: string[] = [rank, scoreStat];
        if (mods != '') str.push(mods);
        return listLine(str);
    }
    scoreStatsHitsComboAcc(score: osuapi.types_v2.Score, perfs: PerformanceAttributes[]) {
        let str: string[] = [];
        if (this.filter?.isnochoke && score.statistics.miss > 0) {
            let rm = score.statistics.miss;
            const copy = structuredClone(score);
            copy.statistics.miss = 0;
            const acc = this.scoreAccuracy(copy);

            const removedMsg = `**Removed ${rm}❌**\n`;
            const hits = returnHits(score.statistics, score.ruleset_id).short;
            const combo = `**${perfs[1].difficulty.maxCombo}x**`;
            const accuracy = `${(score.accuracy * 100).toFixed(2)}% ->  **${acc.toFixed(2)}%**`;
            str = [
                removedMsg, hits, combo, accuracy
            ];
        } else {
            const hits = returnHits(score.statistics, score.ruleset_id).short;
            let combo = `${score?.max_combo}/**${perfs[1].difficulty.maxCombo}x**`;
            if (score.max_combo == perfs[1].difficulty.maxCombo || !score.max_combo) combo = `**${score.max_combo}x**`;
            const accuracy = `${(score.accuracy * 100).toFixed(2)}%`;
            str = [
                hits, combo, accuracy
            ];
        }
        return listLine(str);
    }
    scoreStatsPerformance(score: osuapi.types_v2.Score, perfs: PerformanceAttributes[]) {
        let str = `${(score?.pp ?? perfs[0].pp).toFixed(2)}pp`;
        if (!score?.is_perfect_combo) {
            str += ' (' + perfs[1].pp.toFixed(2) + 'pp if FC)';
        } else if (score?.accuracy < 1) {
            str += ' (' + perfs[2].pp.toFixed(2) + 'pp if SS)';
        }
        return str;
    }

    async execute(): Promise<tooltypes.formatterInfo> {
        await this.parseScores();
        if (this.indexed.length == 0) {
            return {
                text: 'No scores were found (check the filter options)',
                curPage: 0,
                maxPage: 0,
            };
        }
        return await this.formatScores();
    }
}

export class MapSetFormatter {
    protected mapsets: osuapi.types_v2.BeatmapsetExtended[];
    protected indexed: tooltypes.indexed<osuapi.types_v2.BeatmapsetExtended>[];
    protected playcounts: osuapi.types_v2.BeatmapPlaycount[];
    protected indexed_pc: tooltypes.indexed<osuapi.types_v2.BeatmapPlaycount>[];
    protected sort: 'combo' | 'title' | 'artist' | 'difficulty' | 'status' | 'failcount' | 'plays' | 'date' | 'favourites' | 'bpm' | 'cs' | 'ar' | 'od' | 'hp' | 'length';
    protected filter: {
        mapper?: string,
        title?: string,
        artist?: string,
        version?: string,
    };
    protected reverse: boolean;
    protected page: number;
    protected mode: 'set' | 'playcount';
    public get data() {
        return this.indexed;
    }
    public get data_playcounts() {
        return this.indexed_pc;
    }
    constructor({ mapsets, sort, filter, reverse, page }:
        {
            mapsets: osuapi.types_v2.BeatmapsetExtended[],
            sort: 'combo' | 'title' | 'artist' | 'difficulty' | 'status' | 'failcount' | 'plays' | 'date' | 'favourites' | 'bpm' | 'cs' | 'ar' | 'od' | 'hp' | 'length',
            filter: {
                mapper?: string,
                title?: string,
                artist?: string,
                version?: string,
            },
            reverse: boolean,
            page: number,
        }) {
        this.mapsets = mapsets;
        this.sort = sort;
        this.filter = filter;
        this.reverse = reverse;
        this.page = page;
        this.mode = 'set';
    }
    parseMaps() {
        for (let i = 0; i < this.mapsets.length; i++) {
            const newSet = { ...this.mapsets[i], originalIndex: i };
            this.indexed.push(newSet);
        }
        this.filterMaps();
        this.sortMaps();
        this.syncIndexed();
        if (this.reverse) {
            this.indexed.reverse();
        }
    }
    filterMaps() {
        const dict: tooltypes.Dict<(set: tooltypes.indexed<osuapi.types_v2.BeatmapsetExtended>) => boolean> = {
            mapper: (set => matchesString(set.user.username, this.filter.mapper) || matchesString(set.user_id + '', this.filter.mapper) || matchesString(set.user_id + '', this.filter.mapper)),
            title: (set => matchesString(set.artist, this.filter.artist) || matchesString(set.artist_unicode, this.filter.artist)),
            artist: (set => matchesString(set.artist, this.filter.artist) || matchesString(set.artist_unicode, this.filter.artist)),
            version: (set => {
                for (const map of set.beatmaps) {
                    return matchesString(map.version, this.filter.version);
                }
            }),
        };
        for (const key in dict) {
            if (this.filter[key]) {
                this.indexed = this.indexed.filter(dict[key]);
            }
        }
    }
    sortMaps() {
        const dict: tooltypes.Dict<
            (
                a: tooltypes.indexed<osuapi.types_v2.BeatmapsetExtended>,
                b: tooltypes.indexed<osuapi.types_v2.BeatmapsetExtended>
            ) => number
        > = {
            title: (a, b) => a.title.localeCompare(b.title),
            artist: (a, b) => a.artist.localeCompare(b.artist),
            difficulty: (a, b) =>
                b.beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating)[0].difficulty_rating -
                a.beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating)[0].difficulty_rating,
            plays: (a, b) => b.play_count - a.play_count,
            date: (a, b) => new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime(),
            favourites: (a, b) => b.favourite_count - a.favourite_count,
            bpm: (a, b) => b.bpm - a.bpm,
            cs: (a, b) =>
                b.beatmaps.sort((a, b) => b.cs - a.cs)[0].cs -
                a.beatmaps.sort((a, b) => b.cs - a.cs)[0].cs,
            ar: (a, b) =>
                b.beatmaps.sort((a, b) => b.ar - a.ar)[0].ar -
                a.beatmaps.sort((a, b) => b.ar - a.ar)[0].ar,
            od: (a, b) =>
                b.beatmaps.sort((a, b) => b.accuracy - a.accuracy)[0].accuracy -
                a.beatmaps.sort((a, b) => b.accuracy - a.accuracy)[0].accuracy,
            hp: (a, b) =>
                b.beatmaps.sort((a, b) => b.drain - a.drain)[0].drain -
                a.beatmaps.sort((a, b) => b.drain - a.drain)[0].drain,
            length: (a, b) =>
                b.beatmaps[0].total_length -
                a.beatmaps[0].total_length,
        };
        const playcountdict: tooltypes.Dict<
            (
                a: tooltypes.indexed<osuapi.types_v2.BeatmapPlaycount>,
                b: tooltypes.indexed<osuapi.types_v2.BeatmapPlaycount>
            ) => number
        > = {
            plays_pc: (a, b) => b.count - a.count
        };
        if (this.sort && dict[this.sort]) {
            this.indexed.sort(dict[this.sort]);
        }
        if (this.sort && dict[this.sort + '_pc']) {
            this.indexed_pc.sort(playcountdict[this.sort]);
        }
    }
    syncIndexed() {
        const temp: tooltypes.indexed<osuapi.types_v2.BeatmapsetExtended>[] = [];
        const temp_pc: tooltypes.indexed<osuapi.types_v2.BeatmapPlaycount>[] = [];
        const setIndexes = this.indexed.map(x => x.originalIndex);
        const pcIndexes = this.indexed_pc.map(x => x.originalIndex);
        for (const pc of this.indexed_pc) {
            if (setIndexes.includes(pc.originalIndex)) {
                temp_pc.push(pc);
            };
        }
        for (const map of this.indexed) {
            if (pcIndexes.includes(map.originalIndex)) {
                temp.push(map);
            };
        }
        this.indexed = temp;
        this.indexed_pc = temp_pc;
    }
    formatMaps() {
        const pages = this.handlePage();
        let text: string[] = [];
        for (let i = 0; i < 5 && i < this.indexed.length - pages.offset; i++) {
            const mapset = this.indexed[i + pages.offset];
            if (!mapset) break;
            text.push(this.formatMap(mapset, i + pages.offset));
        }
        if (text.length == 0) {
            text = [this.handleEmpty()];
        }
        return {
            text: text.join('\n\n'),
            curPage: this.page,
            maxPage: pages.maxPage
        };
    }
    handlePage() {
        const maxPage = Math.ceil(this.indexed.length / 5);
        if (isNaN(this.page) || this.page < 1) this.page = 1;
        if (this.page > maxPage) this.page = maxPage;
        const offset = (this.page - 1) * 5;
        return { maxPage, offset };
    }
    handleEmpty() {
        switch (0) {
            case this.playcounts.length:
                return '**ERROR**\nNo maps found';
                break;
            case this.indexed_pc.length:
                return '**ERROR**\nNo maps found matching the given filters';
                break;
        }
        return '**ERROR**\nEmpty';
    }
    formatMap(mapset: osuapi.types_v2.BeatmapsetExtended, index: number, map?: osuapi.types_v2.BeatmapExtended) {
        let info = this.mapHeader(mapset, index);
        const topmap = map ?? mapset.beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating)[0];
        if (this.mode == 'playcount') info += '\n' + `**${this.indexed_pc[index].count}x plays**`;
        info += '\n' + this.mapMeta(mapset, topmap);
        info += '\n' + this.mapCounts(mapset, topmap);
        info += '\n' + this.mapTimes(mapset, topmap);
        return info;
    }
    mapHeader(mapset: osuapi.types_v2.BeatmapsetExtended, index: number) {
        return `**#${index + 1}・[\`${mapset.artist} - ${mapset.title}\`](https://osu.ppy.sh/s/${mapset.id})**`;
    }
    mapMeta(mapset: osuapi.types_v2.BeatmapsetExtended, map: osuapi.types_v2.Beatmap) {
        const status = helper.emojis.rankedstatus[mapset.status];
        const gamemode = helper.emojis.gamemodes[map.mode];
        const length = calculate.secondsToTime(map.total_length);
        const bpm = `${mapset.bpm}${helper.emojis.mapobjs.bpm}`;
        return listLine(status, gamemode, length, bpm);
    }
    mapCounts(mapset: osuapi.types_v2.BeatmapsetExtended, map: osuapi.types_v2.BeatmapExtended) {
        const plays = `${calculate.separateNum(mapset.play_count)} plays`;
        const passes = `${calculate.separateNum(map.passcount ?? 0)} passes`;
        const favourites = `${calculate.separateNum(mapset.favourite_count)} favourites`;
        return listLine(plays, passes, favourites);
    }
    mapTimes(mapset: osuapi.types_v2.BeatmapsetExtended, map: osuapi.types_v2.Beatmap) {
        const submit = `Submitted <t:${new Date(mapset.submitted_date).getTime() / 1000}:R>`;
        let last = `Last updated <t:${new Date(mapset.last_updated).getTime() / 1000}:R>`;
        const states = ['ranked', 'approved', 'qualified', 'loved'];
        if (states.includes(map.status)) {
            last = `${toCapital(map.status)} <t:${Math.floor(new Date(mapset.ranked_date).getTime() / 1000)}:R>`;
        }
        return listLine(submit, last);
    }

    execute() {
        this.parseMaps();
        return this.formatMaps();
    }
}
export class MapPlayFormatter extends MapSetFormatter {
    constructor({ mapsets, sort, filter, reverse, page }:
        {
            mapsets: osuapi.types_v2.BeatmapPlaycount[],
            sort: 'combo' | 'title' | 'artist' | 'difficulty' | 'status' | 'failcount' | 'plays' | 'date' | 'favourites' | 'bpm' | 'cs' | 'ar' | 'od' | 'hp' | 'length',
            filter: {
                mapper?: string,
                title?: string,
                artist?: string,
                version?: string,
            },
            reverse: boolean,
            page: number,
        }) {

        super({ mapsets: mapsets.map(pc => pc.beatmapset as osuapi.types_v2.BeatmapsetExtended), sort, filter, reverse, page });
        this.playcounts = mapsets;
        this.mode = 'playcount';
    }
    parseMaps() {
        for (let i = 0; i < this.playcounts.length; i++) {
            const newPc = { ...this.playcounts[i], originalIndex: i };
            this.indexed_pc.push(newPc);
            const newSet = { ...this.mapsets[i], originalIndex: i };
            this.indexed.push(newSet);
        }
        this.filterMaps();
        this.sortMaps();
        if (this.reverse) {
            this.indexed.reverse();
        }
    }
    formatMaps() {
        const pages = this.handlePage();
        let text: string[] = [];
        for (let i = 0; i < 5 && i < this.indexed_pc.length - pages.offset; i++) {
            const pc = this.indexed_pc[i + pages.offset];
            if (!pc) break;
            text.push(this.formatMap(pc.beatmapset as osuapi.types_v2.BeatmapsetExtended, i + pages.offset, pc.beatmap as osuapi.types_v2.BeatmapExtended));
        }
        if (text.length == 0) {
            text = [this.handleEmpty()];
        }
        return {
            text: text.join('\n\n'),
            curPage: this.page,
            maxPage: pages.maxPage
        };
    }
}

function listLine(...args: string[] | string[][]) {
    if (typeof args[0] == 'string') {
        return args.join(' | ');
    }
    return args[0].join(' | ');
}

export function userList(
    users: osuapi.types_v2.User[],
    sort: 'pp' | 'score' | 'acc',
    filter: {
        country: string;
    },
    reverse: boolean,
): tooltypes.formatterInfo {
    return {
        text: 'string',
        curPage: 1,
        maxPage: 1,
    };
}


export function matchesString(first: string, second: string) {
    first = first.toLowerCase();
    second = second.toLowerCase();
    return first == second ||
        first.includes(second) ||
        second.includes(first);
}

export function argRange(arg: string, forceAboveZero: boolean) {
    let max = NaN;
    let min = NaN;
    let exact = NaN;
    let ignore = false;
    if (arg.includes('>')) {
        min = +(arg.replace('>', ''));
    }
    if (arg.includes('<')) {
        max = +(arg.replace('<', ''));
    }
    if (arg.includes('..')) {
        const arr = arg.split('..');
        const narr = arr.map(x => +x).filter(x => !isNaN(x)).sort((a, b) => +b - +a);
        if (narr.length == 2) {
            max = narr[0];
            min = narr[1];
        }
    }
    if (arg.includes('!')) {
        exact = +(arg.replace('!', ''));
        ignore = true;
    }
    if (isNaN(max) && isNaN(min) && !exact) {
        exact = +arg;
    }
    if (forceAboveZero) {
        return {
            max: max && max >= 0 ? max : Math.abs(max),
            min: min && min >= 0 ? min : Math.abs(min),
            exact: exact && exact >= 0 ? exact : Math.abs(exact),
            ignore
        };
    }
    return {
        max,
        min,
        exact,
        ignore,
    };
}

export function hitList(
    mode: osuapi.types_v2.GameMode,
    obj: osuapi.types_v2.Statistics
) {
    let hitList: string;
    switch (mode) {
        case 'osu':
        default:
            hitList = `${calculate.separateNum(obj.count_300)}/${calculate.separateNum(obj.count_100)}/${calculate.separateNum(obj.count_50)}/${calculate.separateNum(obj.count_miss)}`;
            break;
        case 'taiko':
            hitList = `${calculate.separateNum(obj.count_300)}/${calculate.separateNum(obj.count_100)}/${calculate.separateNum(obj.count_miss)}`;
            break;
        case 'fruits':
            hitList = `${calculate.separateNum(obj.count_300)}/${calculate.separateNum(obj.count_100)}/${calculate.separateNum(obj.count_50)}/${calculate.separateNum(obj.count_miss)}`;
            break;
        case 'mania':
            hitList = `${calculate.separateNum(obj.count_geki)}/${calculate.separateNum(obj.count_300)}/${calculate.separateNum(obj.count_katu)}/${calculate.separateNum(obj.count_100)}/${calculate.separateNum(obj.count_50)}/${calculate.separateNum(obj.count_miss)}`;
            break;
    }
    return hitList;
}

export function gradeToEmoji(str: string) {
    return helper.emojis.grades[str];
}


export function userAuthor(osudata: osuapi.types_v2.User, embed: Discord.EmbedBuilder, replaceName?: string) {
    let name = replaceName ?? osudata.username;
    if (osudata?.statistics?.global_rank) {
        name += ` | #${calculate.separateNum(osudata?.statistics?.global_rank)}`;
    }
    if (osudata?.statistics?.country_rank) {
        name += ` | #${calculate.separateNum(osudata?.statistics?.country_rank)} ${osudata.country_code}`;
    }
    if (osudata?.statistics?.pp) {
        name += ` | ${calculate.separateNum(osudata?.statistics?.pp)}pp`;
    }
    embed.setAuthor({
        name,
        url: `https://osu.ppy.sh/users/${osudata.id}`,
        iconURL: `${`https://osuflags.omkserver.nl/${osudata.country_code}.png`}`
    });
    return embed;

}

/**
 * 
 * @param str the string to convert
 * @returns string with the first letter capitalised
 */
export function toCapital(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function dateToDiscordFormat(date: Date, type?: 'R' | 'F') {
    return `<t:${Math.floor(date.getTime() / 1000)}:${type ?? 'R'}>`;
}

/**
 * parses a string that has a unicode and "romanised" version
 * @style 1 artist title (artist title). uses style 2 if only title or artist is different
 * @style 2 artist (artist) title (title)
 */
export function parseUnicodeStrings(
    input: {
        title: string,
        artist: string,
        title_unicode: string,
        artist_unicode: string,
        ignore: {
            artist: boolean,
            title: boolean,
        };
    },
    style?: 1 | 2
) {
    let fullTitle: string;
    switch (style) {
        case 1: default: {

            if (
                (input.title != input.title_unicode && input.artist == input.artist_unicode)
                ||
                (input.title == input.title_unicode && input.artist != input.artist_unicode)
                ||
                (input.title == input.title_unicode && input.artist == input.artist_unicode)
                ||
                (input.ignore.artist == true || input.ignore.title == true)
            ) {
                return parseUnicodeStrings(input, 2);
            } else {
                fullTitle =
                    `${input.artist} - ${input.title}
${input.artist_unicode} - ${input.title_unicode}`;
            }
        }
            break;
        case 2: {
            const title = input.title == input.title_unicode ? input.title : `${input.title_unicode} (${input.title})`;
            const artist = input.artist == input.artist_unicode ? input.artist : `${input.artist_unicode} (${input.artist})`;
            if (input.ignore.artist) {
                fullTitle = `${title}`;
            } else if (input.ignore.title) {
                fullTitle = `${artist}`;
            } else {
                fullTitle = `${artist} - ${title}`;
            }
        }
            break;
    }

    return fullTitle;
}

/**
 * get colour based on difficulty/sr
 */
export function difficultyColour(difficulty: number) {
    switch (true) {
        case difficulty >= 8:
            return helper.colours.diffcolour[7];
        case difficulty >= 7:
            return helper.colours.diffcolour[6];
        case difficulty >= 6:
            return helper.colours.diffcolour[5];
        case difficulty >= 4.5:
            return helper.colours.diffcolour[4];
        case difficulty >= 3.25:
            return helper.colours.diffcolour[3];
        case difficulty >= 2.5:
            return helper.colours.diffcolour[2];
        case difficulty >= 2:
            return helper.colours.diffcolour[1];
        case difficulty >= 1.5: default:
            return helper.colours.diffcolour[0];
    }
}

export function nonNullStats(hits: osuapi.types_v2.ScoreStatistics): osuapi.types_v2.ScoreStatistics {
    return {
        perfect: hits?.perfect ?? 0,
        great: hits?.great ?? 0,
        good: hits?.good ?? 0,
        ok: hits?.ok ?? 0,
        meh: hits?.meh ?? 0,
        miss: hits?.miss ?? 0,
        small_tick_hit: hits?.small_tick_hit ?? 0,
        small_tick_miss: hits?.small_tick_miss ?? 0,
        legacy_combo_increase: hits?.legacy_combo_increase ?? 0,
    };
}

export function returnHits(hits: osuapi.types_v2.ScoreStatistics, mode: osuapi.types_v2.Ruleset) {
    const object: {
        short: string,
        long: string,
        ex: { name: string, value: string | number; }[];
    } = {
        short: '',
        long: '',
        ex: []
    };
    hits = nonNullStats(hits);
    switch (mode) {
        case osuapi.Ruleset.osu:
            object.short = `${hits.great}/${hits.ok}/${hits.meh}/${hits.miss}`;
            object.long = `**300:** ${hits.great} \n **100:** ${hits.ok} \n **50:** ${hits.meh} \n **Miss:** ${hits.miss}`;
            object.ex = [
                {
                    name: '300',
                    value: hits.great
                },
                {
                    name: '100',
                    value: hits.ok
                },
                {
                    name: '50',
                    value: hits.meh
                },
                {
                    name: 'Miss',
                    value: hits.miss
                }
            ];
            break;
        case osuapi.Ruleset.taiko:
            object.short = `${hits.great}/${hits.good}/${hits.miss}`;
            object.long = `**Great:** ${hits.great} \n **Good:** ${hits.good} \n **Miss:** ${hits.miss}`;
            object.ex = [
                {
                    name: 'Great',
                    value: hits.great
                },
                {
                    name: 'Good',
                    value: hits.good
                },
                {
                    name: 'Miss',
                    value: hits.miss
                }
            ];
            break;
        case osuapi.Ruleset.fruits:
            object.short = `${hits.great}/${hits.ok}/${hits.small_tick_hit}/${hits.miss}/${hits.small_tick_miss}`;
            object.long = `**Fruits:** ${hits.great} \n **Drops:** ${hits.ok} \n **Droplets:** ${hits.small_tick_hit} \n **Miss:** ${hits.miss} \n **Miss(droplets):** ${hits.small_tick_miss}`;
            object.ex = [
                {
                    name: 'Fruits',
                    value: hits.great
                },
                {
                    name: 'Drops',
                    value: hits.ok
                },
                {
                    name: 'Droplets',
                    value: hits.small_tick_hit
                },
                {
                    name: 'Miss',
                    value: hits.miss
                },
                {
                    name: 'Miss(droplets)',
                    value: hits.small_tick_miss
                },
            ];
            break;
        case osuapi.Ruleset.mania:
            object.short = `${hits.perfect}/${hits.great}/${hits.good}/${hits.ok}/${hits.meh}/${hits.miss}`;
            object.long = `**300+:** ${hits.perfect} \n **300:** ${hits.great} \n **200:** ${hits.good} \n **100:** ${hits.ok} \n **50:** ${hits.meh} \n **Miss:** ${hits.miss}`;
            object.ex = [
                {
                    name: '300+',
                    value: hits.perfect
                },
                {
                    name: '300',
                    value: hits.great
                },
                {
                    name: '200',
                    value: hits.good
                },
                {
                    name: '100',
                    value: hits.ok
                },
                {
                    name: '50',
                    value: hits.meh
                },
                {
                    name: 'Miss',
                    value: hits.miss
                }
            ];
            break;
    }
    return object;
}

export function removeURLparams(url: string) {
    if (url.includes('?')) {
        return url.split('?')[0];
    }
    return url;
}

/**
 * converts a lazer score to legacy score (for compatibility reasons)
 */
export function CurrentToLegacyScore(score: osuapi.types_v2.Score): osuapi.types_v2.ScoreLegacy {
    return {
        accuracy: score.accuracy,
        beatmap: score.beatmap,
        beatmapset: score.beatmapset,
        best_id: score.best_id,
        created_at: score.ended_at ?? score.started_at,
        id: score.legacy_score_id,
        match: null,
        max_combo: score.max_combo,
        mode_int: score.ruleset_id,
        mode: osumodcalc.mode.toName(score.ruleset_id),
        mods: score.mods.map(x => x.acronym),
        passed: score.passed,
        perfect: score.is_perfect_combo,
        pp: score.pp,
        preserve: score.preserve,
        processed: score.processed,
        rank_country: score.rank_country,
        rank_global: score.rank_global,
        rank: score.rank,
        replay: score.has_replay,
        room_id: score.room_id,
        ruleset_id: score.ruleset_id,
        score: score.legacy_total_score,
        scores_around: score.scores_around,
        statistics: {
            count_100: score.statistics?.ok ?? 0,
            count_300: score.statistics.great,
            count_50: score.statistics?.meh ?? 0,
            count_geki: 0,
            count_katu: 0,
            count_miss: score.statistics?.miss ?? 0,
        },
        type: score.type,
        user_id: score.user_id,
        current_user_attributes: score.current_user_attributes,
        user: score.user,
        weight: score.weight
    };
}

export function sortDescription(type: "pp" | "score" | "recent" | "acc" | "combo" | "miss" | "rank", reverse: boolean) {
    let x: string;
    switch (type) {
        case 'pp':
            x = 'highest performance';
            break;
        case 'score':
            x = 'highest score';
            break;
        case 'recent':
            x = 'most recent';
            break;
        case 'acc':
            x = 'highest accuracy';
            break;
        case 'combo':
            x = 'highest combo';
            break;
        case 'miss':
            x = 'lowest miss count';
            break;
        case 'rank':
            x = 'best rank';
            break;
    }
    if (reverse) {
        switch (type) {
            case 'pp':
                x = 'lowest performance';
                break;
            case 'score':
                x = 'lowest score';
                break;
            case 'recent':
                x = 'oldest';
                break;
            case 'acc':
                x = 'lowest accuracy';
                break;
            case 'combo':
                x = 'lowest combo';
                break;
            case 'miss':
                x = 'highest miss count';
                break;
            case 'rank':
                x = 'best rank';
                break;
        }
    }
    return x;
}


const filterArgRange = (value: number, args: {
    max: number;
    min: number;
    exact: number;
    ignore: boolean;
}) => {
    let keep: boolean = true;
    if (args.max) {
        keep = keep && value <= Math.round(args.max);
    }
    if (args.min) {
        keep = keep && value >= Math.round(args.min);
    }
    if (args.exact) {
        keep = Math.round(value) == Math.round(args.exact);
    }
    if (args.exact && args.ignore) {
        keep = Math.round(value) != Math.round(args.exact);
    }
    return keep;
};

/**
 * split string by every x characters
 */
export function splitStringBy(str: string, every: number) {
    return str.replace(eval(`/(.{${every}})/g`), "$1 ").split(' ');
}