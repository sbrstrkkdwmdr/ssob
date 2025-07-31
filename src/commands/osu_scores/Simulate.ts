import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as osuapi from '../../tools/osuapi';
import * as performance from '../../tools/performance';
import { OsuCommand } from '../command';

export class Simulate extends OsuCommand {
    declare protected params: {
        mapid: number;
        mods: string;
        acc: number;
        combo: number;
        n300: number;
        n100: number;
        n50: number;
        nMiss: number;
        overrideSpeed: number;
        overrideBpm: number;
        customCS: number;
        customAR: number;
        customOD: number;
        customHP: number;
    };
    constructor() {
        super();
        this.name = 'Simulate';
        this.params = {
            mapid: null,
            mods: null,
            acc: null,
            combo: null,
            n300: null,
            n100: null,
            n50: null,
            nMiss: null,
            overrideSpeed: 1,
            overrideBpm: null,
            customCS: null,
            customAR: null,
            customOD: null,
            customHP: null,
        };
    }
    async setParamsMsg() {
        this.params.acc = this.setParam(this.params.acc, ['acc', 'accuracy', '%',], 'number', {});
        this.params.combo = this.setParam(this.params.combo, ['x', 'combo', 'maxcombo',], 'number', { number_isInt: true });
        this.params.n300 = this.setParam(this.params.n300, ['n300', '300s', 'great'], 'number', { number_isInt: true });
        this.params.n100 = this.setParam(this.params.n100, ['n100', '100s', 'ok'], 'number', { number_isInt: true });
        this.params.n50 = this.setParam(this.params.n50, ['n50', '50s', 'meh'], 'number', { number_isInt: true });
        this.params.nMiss = this.setParam(this.params.nMiss, ['miss', 'misses', 'n0', '0s',], 'number', { number_isInt: true });

        this.params.overrideBpm = this.setParam(this.params.overrideBpm, ['-bpm'], 'number', {});
        this.params.overrideSpeed = this.setParam(this.params.overrideSpeed, ['-speed'], 'number', {});
        this.params.customCS = this.setParam(this.params.customCS, ['-cs'], 'number', {});
        this.params.customAR = this.setParam(this.params.customAR, ['-ar'], 'number', {});
        this.params.customOD = this.setParam(this.params.customOD, ['-od', '-accuracy'], 'number', {});
        this.params.customHP = this.setParam(this.params.customHP, ['-hp', '-drain', 'health'], 'number', {});

        this.params.mods = this.setParam(this.params.mods, ['-mods'], 'string', {});

        const tmod = this.setParamMods();
        if (tmod) {
            this.params.mods = tmod.mods.join('');
        }
        {
            const mapTemp = this.setParamMap();
            this.params.mapid = mapTemp.map;

            if (!mapTemp.map && mapTemp.set) {
                try {
                    const bm = await this.getMapSet(mapTemp.set);
                    this.params.mapid = bm.beatmaps[0].id;
                } catch (e) {

                }
            }
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getInteger('id');
        this.params.mods = interaction.options.getString('mods');
        this.params.acc = interaction.options.getNumber('accuracy');
        this.params.combo = interaction.options.getInteger('combo');
        this.params.n300 = interaction.options.getInteger('n300');
        this.params.n100 = interaction.options.getInteger('n100');
        this.params.n50 = interaction.options.getInteger('n50');
        this.params.nMiss = interaction.options.getInteger('miss');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        await this.fixMapParam();

        await this.sendLoading();

        this.fixParams();

        try {
            this.map = await this.getMap(this.params.mapid);
        } catch (e) {
            await this.sendError(helper.errors.map.m(this.params.mapid));
        }
        if (!this.params.combo) {
            this.params.combo = this.map?.max_combo ?? undefined;
        }

        this.fixSpeedParams();

        const scorestat: osuapi.types_v2.ScoreStatistics = {
            great: this.params.n300,
            ok: this.params.n100,
            meh: this.params.n50,
            miss: this.params.nMiss ?? 0,
        };

        const perfs = await performance.fullPerformance(
            this.params.mapid,
            0,
            osumodcalc.mod.fromString(this.params.mods),
            this.fixAcc() / 100,
            this.params.overrideSpeed,
            scorestat,
            this.params.combo,
            null,
            new Date(this.map.last_updated),
            this.params.customCS,
            this.params.customAR,
            this.params.customOD,
            this.params.customHP,
        );
        data.debug(perfs, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'ppCalc');

        const mapPerf = await performance.calcMap({
            mods: osumodcalc.mod.fromString(this.params.mods),
            mode: 0,
            mapid: this.params.mapid,
            clockRate: this.params.overrideSpeed,
            mapLastUpdated: new Date(this.map.last_updated)
        });
        this.ctn.embeds = [this.setEmbed(
            perfs, mapPerf,
            `${this.map.beatmapset.artist} - ${this.map.beatmapset.title} [${this.map.version}]`,
            this.fixAcc()
        )];

        await this.send();
    }
    map: osuapi.types_v2.BeatmapExtended;
    async fixMapParam() {
        if (!this.params.mapid) {
            try {
                const temp = this.getLatestMap().mapid;
                if (temp == false) {
                    commandTools.missingPrevID_map(this.input, this.name);
                    return;
                }
                this.params.mapid = +temp;
            } catch (err) {
                await this.sendError(helper.errors.map.m_msp);
            }
        }
    }
    fixParams() {
        const tempscore = data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
        if (tempscore?.apiData && tempscore?.apiData.beatmap.id == this.params.mapid) {
            if (!this.params.n300 && !this.params.n100 && !this.params.n50 && !this.params.acc) {
                this.params.n300 = tempscore.apiData.statistics.great;
                this.params.n100 = tempscore.apiData.statistics.ok;
                this.params.n50 = tempscore.apiData.statistics.meh;
                this.params.acc = tempscore.apiData.accuracy * 100;
            }
            if (!this.params.nMiss) {
                this.params.nMiss = tempscore.apiData.statistics.miss;
            }
            if (!this.params.combo) {
                this.params.combo = tempscore.apiData.max_combo;
            }
            if (!this.params.mods) {
                this.params.mods = tempscore.apiData.mods.map(x => x.acronym).join('') ?? 'NM';
            }
        }
        return tempscore;
    }
    fixSpeedParams() {
        if (this.params.overrideBpm && !this.params.overrideSpeed) {
            this.params.overrideSpeed = this.params.overrideBpm / this.map.bpm;
        }
        if (this.params.overrideSpeed && !this.params.overrideBpm) {
            this.params.overrideBpm = this.params.overrideSpeed * this.map.bpm;
        }

        if (this.params.mods.includes('DT') || this.params.mods.includes('NC')) {
            this.params.overrideSpeed *= 1.5;
            this.params.overrideBpm *= 1.5;
        }
        if (this.params.mods.includes('HT')) {
            this.params.overrideSpeed *= 0.75;
            this.params.overrideBpm *= 1.5;
        }
    }

    fixAcc() {
        let use300s = (this.params.n300 ?? 0);
        const gotTot = use300s + (this.params.n100 ?? 0) + (this.params.n50 ?? 0) + (this.params.nMiss ?? 0);
        if (gotTot != this.map.count_circles + this.map.count_sliders + this.map.count_spinners) {
            use300s += (this.map.count_circles + this.map.count_sliders + this.map.count_spinners) - use300s;
        }
        const useAcc = this.params.acc ?? osumodcalc.accuracy.standard(
            use300s,
            this.params.n100 ?? 0,
            this.params.n50 ?? 0,
            this.params.nMiss ?? 0
        ).accuracy;
        return useAcc;
    }

    setEmbed(perfs: rosu.PerformanceAttributes[], mapPerf: rosu.PerformanceAttributes[], title: string, useAcc: number) {
        const scoreEmbed = new Discord.EmbedBuilder()
            .setTitle(`Simulated play on \n\`${title}\``)
            .setURL(`https://osu.ppy.sh/b/${this.params.mapid}`)
            .setThumbnail(this.map?.beatmapset_id ? osuapi.other.beatmapImages(this.map.beatmapset_id).thumbnailLarge : `https://osu.ppy.sh/images/layout/avatar-guest@2x.png`)
            .addFields([
                {
                    name: 'Score Details',
                    value:
                        `${(useAcc)?.toFixed(2)}% | ${this.params.nMiss ?? 0}x misses
    ${this.params.combo ?? this.map.max_combo}x/**${this.map.max_combo}**x
    ${this.params.mods ?? 'No mods'}
    \`${this.params.n300}/${this.params.n100}/${this.params.n50}/${this.params.nMiss}\`
    Speed: ${this.params.overrideSpeed ?? 1}x @ ${this.params.overrideBpm ?? this.map.bpm}BPM
    `,
                    inline: false
                },
                {
                    name: 'Performance',
                    value:
                        `
    ${perfs[0].pp?.toFixed(2)}pp | ${perfs[1].pp?.toFixed(2)}pp if ${(useAcc)?.toFixed(2)}% FC
    SS: ${mapPerf[0].pp?.toFixed(2)}
    99: ${mapPerf[1].pp?.toFixed(2)}
    98: ${mapPerf[2].pp?.toFixed(2)}
    97: ${mapPerf[3].pp?.toFixed(2)}
    96: ${mapPerf[4].pp?.toFixed(2)}
    95: ${mapPerf[5].pp?.toFixed(2)} 
    `
                },
                {
                    name: 'Map Details',
                    value:
                        `
    CS${this.map.cs.toString().padEnd(5, ' ')}
    AR${this.map.ar.toString().padEnd(5, ' ')}
    OD${this.map.accuracy.toString().padEnd(5, ' ')}
    HP${this.map.drain.toString().padEnd(5, ' ')}
    ${helper.emojis.mapobjs.total_length}${calculate.secondsToTime(this.map.total_length)}
                    `,
                    inline: true
                },
                {
                    name: helper.defaults.invisbleChar,
                    value:
                        `
    ${helper.emojis.mapobjs.circle}${this.map.count_circles}
    ${helper.emojis.mapobjs.slider}${this.map.count_sliders}
    ${helper.emojis.mapobjs.spinner}${this.map.count_spinners}
    ${helper.emojis.mapobjs.bpm}${this.map.bpm}
    ${helper.emojis.mapobjs.star}${(perfs[0]?.difficulty?.stars ?? this.map.difficulty_rating)?.toFixed(2)}
                    `,
                    inline: true
                },
            ]);
        return scoreEmbed;
    }
}