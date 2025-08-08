import Discord from 'discord.js';
import * as osuclasses from 'osu-classes';
import * as osuparsers from 'osu-parsers';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { OsuCommand } from '../command';
import { SingleScoreCommand } from './SingleScoreCommand';

export class ReplayParse extends SingleScoreCommand {
    declare protected params: {
        detailed: 1;
    };
    constructor() {
        super();
        this.name = 'ReplayParse';
        this.params = {
            detailed: 1
        };
    }

    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const decoder = new osuparsers.ScoreDecoder();
        const score = await decoder.decodeFromPath(`${helper.path.files}/replays/${this.input.id}.osr`);
        data.debug(score, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'replayData');
        this.setScore(score);
        try {
            this.map = await this.getMap(score?.info?.beatmapHashMD5);
        } catch (e) {
            console.log(e);
            return;
        }

        if (this.map?.id) {
            typeof this.map.id == 'number' ? data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
                {
                    id: `${this.map.id}`,
                    apiData: null,
                    mods: osumodcalc.mod.intToAcronym(score.info?.mods?.bitwise ?? 0).map(x => { return { acronym: x }; })
                }
            ) : '';
        }
        this.mapset = this.map.beatmapset;

        try {
            this.osudata = await this.getProfile(score.info.username, osumodcalc.mode.toName(score.info.rulesetId));
        } catch (e) {
            return;
        }
        let userid: string | number;
        try {
            userid = this.osudata.id;
        } catch (err) {
            userid = 0;
            return;
        }

        const chartInit = other.graph({
            x: score.replay.lifeBar.map(x => calculate.secondsToTime(x.startTime / 1000)),
            y: score.replay.lifeBar.map(x => Math.floor(x.health * 100)),
            label: 'Health',
            other: {
                fill: false,
                startzero: true,
                pointSize: 0,
                gradient: true
            }
        });

        const chartFile = new Discord.AttachmentBuilder(chartInit.path);

        const e = await this.renderEmbed();
        e.setImage(`attachment://${chartInit.filename}.jpg`);
        this.ctn.embeds = [e];
        this.ctn.files = [chartFile];
        await this.send();
    }

    async renderEmbed() {
        let hitlist = formatters.returnHits(this.score.statistics, this.score.ruleset_id).short;

        const [perfs, ppissue, fcflag] = await this.perf({
            passed: true,
            percentage: 100,
            objectsHit: null
        });

        let modadjustments = '';
        if (this.score.mods.filter(x => x?.settings?.speed_change).length > 0) {
            modadjustments += ' (' + this.score.mods.filter(x => x?.settings?.speed_change)[0].settings.speed_change + 'x)';
        }

        let scorerank = (this?.score?.rank_global ? ` #${this.score.rank_global} global` : '') +
            (this?.score?.rank_country ? ` #${this.score.rank_country} ${this.osudata.country_code.toUpperCase()} :flag_${this.osudata.country_code.toLowerCase()}:` : '')
            ;
        if (scorerank != '') {
            scorerank = '| ' + scorerank;
        }

        const embed = this.setEmbed({
            trycountstr: `try #${this.getTryCount(this.scores, this.map.id)}`,
            rsgrade: helper.emojis.grades[this.grade().rank.toUpperCase()],
            rspassinfo: '',
            mxcombo: perfs?.[0]?.difficulty.maxCombo ?? this?.score?.max_combo,
            fcflag,
            ppissue,
            fulltitle: `${this.mapset.artist} - ${this.mapset.title} [${this.map.version}]`,
            hitlist,
            scorerank,
            perfs,
            modadjustments
        });

        this.ctn.embeds = [embed];
        return embed;
    }

    map: osuapi.types_v2.BeatmapExtended;
    /**
     * mapid should be beatmapHash
     */
    async getMap(hash: string) {
        if (data.findFile(hash, 'this.map') &&
            !('error' in data.findFile(hash, 'this.map')) &&
            this.input.buttonType != 'Refresh') {
            this.map = data.findFile(hash, 'this.map');
        } else {
            this.map = await osuapi.v2.beatmaps.mapLookup({ checksum: hash });
        }
        if (helper.errors.isErrorObject(this.map)) {
            await this.sendError(helper.errors.map.m(hash));
        }
        data.debug(this.map, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'this.map');
        data.storeFile(this.map, this.map.id, 'this.map');
        data.storeFile(this.map, hash, 'this.map');
        return this.map;
    }
    setScore(score: osuclasses.Score) {
        const tmods =
            typeof score.info.rawMods == 'string' ? osumodcalc.mod.order(osumodcalc.mod.fromString(score.info.rawMods)) :
                osumodcalc.mod.order(osumodcalc.mod.intToAcronym(score.info.rawMods));
        this.score = {
            accuracy: score.info.accuracy,
            classic_total_score: score.info.totalScore,
            ended_at: score.info.date.toISOString() as any,
            has_replay: false,
            id: score.info.id,
            is_perfect_combo: score.info.perfect,
            legacy_perfect: score.info.perfect,
            legacy_score_id: score.info.id,
            legacy_total_score: score.info.totalScore,
            max_combo: score.info.maxCombo,
            maximum_statistics: {
                perfect: score.info.countGeki, // geki/300+
                great: score.info.count300, // 300
                good: score.info.countKatu, // katu/200
                ok: score.info.count100, // 100
                meh: score.info.count50, // 50
                miss: score.info.countMiss, // miss
                small_tick_miss: 0, // katu
                small_tick_hit: 0, // count 50
                legacy_combo_increase: 0, // max stats
            },
            mods: tmods?.map(x => { return { acronym: x }; }) ?? [],
            passed: score.info.passed,
            playlist_item_id: 0,
            preserve: false,
            processed: false,
            rank: score.info.rank,
            ruleset_id: score.info.rulesetId,
            started_at: score.info.date.toISOString() as any,
            statistics: {
                perfect: score.info.countGeki, // geki/300+
                great: score.info.count300, // 300
                good: score.info.countKatu, // katu/200
                ok: score.info.count100, // 100
                meh: score.info.count50, // 50
                miss: score.info.countMiss, // miss
                small_tick_miss: 0, // katu
                small_tick_hit: 0, // count 50
                legacy_combo_increase: 0, // max stats
            },
            total_score: score.info.totalScore,
            type: 'recent',
            user_id: score.info.userId ?? 2,
        };
    }
}