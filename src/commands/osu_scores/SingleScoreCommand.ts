import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import * as performance from '../../tools/performance';
import { OsuCommand } from '../command';

export class SingleScoreCommand extends OsuCommand {
    protected type: 'recent' | 'default';
    constructor() {
        super();
        this.type = 'default';
        this.scores = [];
    }
    osudata: osuapi.types_v2.UserExtended;
    scores: osuapi.types_v2.Score[];
    score: osuapi.types_v2.Score;
    map: osuapi.types_v2.BeatmapExtended;
    mapset: osuapi.types_v2.Beatmapset;

    async renderEmbed() {
        let rspassinfo = '';
        let totalhits = this.totalHits(this.score.statistics, this.score.ruleset_id);

        const getHits = formatters.returnHits(this.score.statistics, this.score.ruleset_id);
        let hitlist: string = this.params.detailed == 2 ?
            getHits.short : getHits.long;

        const failed = other.scoreIsComplete(
            this.score.statistics,
            this.map.count_circles,
            this.map.count_sliders,
            this.map.count_spinners,
        );

        const [perfs, ppissue, fcflag] = await this.perf(failed);

        const curbmhitobj = this.map.count_circles + this.map.count_sliders + this.map.count_spinners;
        let msToFail: number, curbmpasstime: number, guesspasspercentage: number;
        if (!this.score.passed) {
            msToFail = await other.getFailPoint(totalhits, `${helper.path.files}/maps/${this.map.id}.osu`);
            curbmpasstime = Math.floor(msToFail / 1000);
            guesspasspercentage = Math.abs((totalhits / curbmhitobj) * 100);
        }

        let rsgrade = helper.emojis.grades[this.score.rank.toUpperCase()];
        if (!this.score.passed) {
            rspassinfo = `${guesspasspercentage.toFixed(2)}% completed (${calculate.secondsToTime(curbmpasstime)}/${calculate.secondsToTime(this.map.total_length)})`;
            rsgrade = helper.emojis.grades.F + `(${helper.emojis.grades[this.grade().rank.toUpperCase()]} if pass)`;
        }

        // map.max_combo;
        let modadjustments = '';
        if (this.score.mods.filter(x => x?.settings?.speed_change).length > 0) {
            modadjustments += ' (' + this.score.mods.filter(x => x?.settings?.speed_change)[0].settings.speed_change + 'x)';
        }

        let scorerank =
            (this?.score?.rank_global ? ` #${this.score.rank_global} global` : '') +
            (this?.score?.rank_country ? ` #${this.score.rank_country} ${this.osudata.country_code.toUpperCase()} :flag_${this.osudata.country_code.toLowerCase()}:` : '')
            ;
        if (scorerank != '') {
            scorerank = '| ' + scorerank;
        }

        const embed = this.setEmbed({
            trycountstr: `try #${this.getTryCount(this.scores, this.map.id)}`,
            rsgrade,
            rspassinfo,
            mxcombo: perfs[0]?.difficulty?.maxCombo,
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

    async perf(failed: {
        passed: boolean;
        objectsHit: number;
        percentage: number;
    }): Promise<[rosu.PerformanceAttributes[], string, string]> {
        let ppissue: string = '';
        let fcflag = '';
        let perfs: rosu.PerformanceAttributes[] = [];
        try {
            const overrides = calculate.modOverrides(this.score.mods);
            perfs = await performance.fullPerformance(
                this.score?.beatmap?.id ?? this.map?.id ?? 0,
                this.score?.ruleset_id ?? this.map?.mode_int ?? 0,
                this.score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
                this.score.accuracy,
                overrides.speed,
                this.score.statistics,
                this.score.max_combo,
                failed.objectsHit,
                new Date(this.score?.beatmap?.last_updated ?? this.map.last_updated),
                overrides.cs,
                overrides.ar,
                overrides.od,
                overrides.hp,
            );
            data.debug(perfs, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'ppCalcing');

            const mxCombo = perfs[0]?.difficulty?.maxCombo ?? this.map?.max_combo;

            if (this.score.accuracy < 1 && this.score.max_combo == mxCombo) {
                fcflag = `FC\n**${perfs[2].pp.toFixed(2)}**pp IF SS`;
            }
            if (this.score.max_combo != mxCombo) {
                fcflag =
                    `\n**${perfs[1].pp.toFixed(2)}**pp IF FC
                **${perfs[2].pp.toFixed(2)}**pp IF SS`;
            }
            if (this.score.max_combo == mxCombo && this.score.accuracy == 1) {
                fcflag = 'FC';
            }
        } catch (error) {
            ppissue = 'Error - ' + helper.errors.performance.crash;
        }
        return [perfs, ppissue, fcflag];
    }

    async getStrains(map: osuapi.types_v2.Beatmap, score: osuapi.types_v2.Score) {
        const strains = await performance.calcStrains({
            mapid: map.id,
            mode: score.ruleset_id,
            mods: score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
            mapLastUpdated: new Date(map.last_updated)
        });
        try {
            data.debug(strains, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
        } catch (error) {
            data.debug({ error: error }, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
            log.stdout(error);
        }
        let strainsgraph = other.graph({
            x: strains.strainTime,
            y: strains.value,
            label: 'Strains',
            other: {
                startzero: true,
                type: 'bar',
                fill: true,
                displayLegend: false,
                title: 'Strains',
                imgUrl: osuapi.other.beatmapImages(map.beatmapset_id).full,
                blurImg: true,
            }
        });
        this.ctn.files = [strainsgraph.path];
        return strainsgraph.filename + '.jpg';
    }
    getTryCount(scores: osuapi.types_v2.Score[], mapid: number) {
        let trycount = 1;
        for (let i = scores.length - 1; i > (this.params.page); i--) {
            if (mapid == scores[i].beatmap.id) {
                trycount++;
            }
        }
        return trycount;
    }
    setEmbed({
        trycountstr,
        rsgrade,
        rspassinfo,
        mxcombo,
        fcflag,
        ppissue,
        fulltitle,
        hitlist,
        scorerank,
        perfs,
        modadjustments
    }: {
        trycountstr: string,
        rsgrade: string,
        rspassinfo: string,
        mxcombo: number,
        fcflag: string,
        ppissue: string,
        fulltitle: string,
        hitlist: string,
        scorerank: string,
        perfs: rosu.PerformanceAttributes[],
        modadjustments: string,
    }) {
        let embed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.score.dec)
            .setAuthor({
                name: `${trycountstr} | #${calculate.separateNum(this.osudata?.statistics?.global_rank)} | #${calculate.separateNum(this.osudata?.statistics?.country_rank)} ${this.osudata.country_code} | ${calculate.separateNum(this.osudata?.statistics?.pp)}pp`,
                url: `https://osu.ppy.sh/users/${this.osudata.id}`,
                iconURL: `${this.osudata?.avatar_url ?? helper.defaults.images.any.url}`
            })
            .setURL(this.score.id ? `https://osu.ppy.sh/scores/${this.score.id}` : `https://osu.ppy.sh/b/${this.map.id}`)
            .setThumbnail(`${this.mapset.covers.list}`)
            .addFields([
                {
                    name: 'SCORE DETAILS',
                    value: `${calculate.separateNum(other.getTotalScore(this.score))} ${scorerank}
${(this.score.accuracy * 100).toFixed(2)}% | ${rsgrade}
${this.score.has_replay ? `[REPLAY](https://osu.ppy.sh/scores/${this.score.id}/download)\n` : ''}` +
                        `${rspassinfo.length > 1 ? rspassinfo + '\n' : ''}\`${hitlist}\`
${this.score.max_combo == mxcombo ? `**${this.score.max_combo}x**` : `${this.score.max_combo}x`}/**${mxcombo}x** combo`,
                    inline: true
                },
                {
                    name: 'PP',
                    value: `**${(this.score?.pp ?? perfs[0]?.pp ?? 0)?.toFixed(2)}**pp ${fcflag}\n${ppissue}`,
                    inline: true
                }
            ]);
        switch (this.type) {
            case 'default':
                embed.setTitle(fulltitle)
                    .setDescription(`${this.score.mods.length > 0 ? '+' + osumodcalc.mod.order(this.score.mods.map(x => x.acronym.toUpperCase()) as osumodcalc.types.Mod[]).join('') + modadjustments + ' |' : ''} ${formatters.relativeTime(this.score.ended_at)}
    ${(perfs[0]?.difficulty?.stars ?? this.map?.difficulty_rating ?? 0).toFixed(2)}⭐ | ${helper.emojis.gamemodes[this.score.ruleset_id]}
    `);
                formatters.userAuthor(this.osudata, embed, this.params.overrideAuthor);
                break;
            case 'recent':
                embed.setTitle(`#${this.params.page + 1} most recent ${this.params.showFails == 1 ? 'play' : 'pass'} for ${this.score.user.username} | ${formatters.relativeTime(this.score.ended_at)}`)
                    .setDescription(`[\`${fulltitle}\`](https://osu.ppy.sh/b/${this.map.id}) ${this.score.mods.length > 0 ? '+' + osumodcalc.mod.order(this.score.mods.map(x => x.acronym.toUpperCase()) as osumodcalc.types.Mod[]).join('') + modadjustments : ''} 
    ${(perfs[0]?.difficulty?.stars ?? this.map?.difficulty_rating ?? 0).toFixed(2)}⭐ | ${helper.emojis.gamemodes[this.score.ruleset_id]}
    ${formatters.dateToDiscordFormat(new Date(this.score.ended_at), 'F')}
    `);

                break;
        }
        return embed;
    }
    grade() {
        const stats = this.score.statistics;
        switch (this.score.ruleset_id) {
            case 0:
                return osumodcalc.accuracy.standard(stats.great, stats.ok ?? 0, stats.meh ?? 0, stats.miss ?? 0);
            case 1:
                return osumodcalc.accuracy.taiko(stats.great, stats.good ?? 0, stats.miss ?? 0);
            case 2:
                return osumodcalc.accuracy.fruits(stats.great, stats.ok ?? 0, stats.small_tick_hit ?? 0, stats.small_tick_miss ?? 0, stats.miss ?? 0);
            case 3:
                return osumodcalc.accuracy.mania(stats.perfect ?? 0, stats.great, stats.good ?? 0, stats.ok ?? 0, stats.meh ?? 0, stats.miss ?? 0);
        }
    }
}