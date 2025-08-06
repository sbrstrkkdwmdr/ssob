import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import * as performance from '../../tools/performance';
import { OsuCommand } from '../command';

type scoretypes = 'firsts' | 'best' | 'recent' | 'pinned';

export class ScoreStats extends OsuCommand {

    declare protected params: {
        scoreTypes: scoretypes;
        user: string;
        searchid: string;
        mode: osuapi.types_v2.GameMode;
        all: boolean;
        reachedMaxCount: boolean;
    };
    constructor() {
        super();
        this.name = 'ScoreStats';
        this.params = {
            scoreTypes: 'best',
            user: null,
            searchid: undefined,
            mode: undefined,
            all: false,
            reachedMaxCount: false,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        {
            this.setParamMode();

        }
        this.params.scoreTypes = this.setParamBoolList(this.params.scoreTypes,
            { set: 'firsts', flags: ['first', 'firsts', 'globals', 'global', 'f', 'g'] },
            { set: 'best', flags: ['osutop', 'top', 'best', 't', 'b'] },
            { set: 'recent', flags: ['r', 'recent', 'rs'] },
            { set: 'pinned', flags: ['pinned', 'pins', 'pin', 'p'] },
        );
        this.params.all = this.setParam(this.params.all, ['all', 'd', 'a', 'detailed'], 'bool', {});



        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (usertemp?.mode && !this.params.mode) {
            this.params.mode = usertemp?.mode;
        }
        if (!this.params.user) {
            this.params.user = this.argParser.getRemaining().join(' ').trim();
        }
        if (this.params.user == '' || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = this.commanduser.id;
        interaction.options.getString('user') ? this.params.user = interaction.options.getString('user') : null;
        interaction.options.getString('type') ? this.params.scoreTypes = interaction.options.getString('type') as scoretypes : null;
        interaction.options.getString('mode') ? this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode : null;
        interaction.options.getBoolean('all') ? this.params.all = interaction.options.getBoolean('all') : null;

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.searchid = this.commanduser.id;
        this.params.user = this.input.message.embeds[0].author.url.split('/users/')[1].split('/')[0];
        this.params.mode = this.input.message.embeds[0].author.url.split('/users/')[1].split('/')[1] as osuapi.types_v2.GameMode;
        //user's {type} scores
        this.params.scoreTypes = this.input.message.embeds[0].title.split(' scores')[0].split(' ')[0].toLowerCase() as scoretypes;

    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        await this.fixUser();

        await this.sendLoading();

        try {
            this.user = await this.getProfile(this.params.user, this.params.mode);
        } catch (e) {
            return;
        }

        const buttons: Discord.ActionRowBuilder = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.user.id}+${this.user.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        let scoresdata: osuapi.types_v2.Score[] = [];

        const dataFilename =
            this.params.scoreTypes == 'firsts' ?
                'firstscoresdata' :
                `${this.params.scoreTypes}scoresdata`;

        if (data.findFile(this.user.id, dataFilename) &&
            !('error' in data.findFile(this.user.id, dataFilename)) &&
            this.input.buttonType != 'Refresh'
        ) {
            scoresdata = data.findFile(this.user.id, dataFilename);
        } else {
            this.params.reachedMaxCount = await this.getScoreCount(0, this.params, this.input);
        }
        data.storeFile(scoresdata, this.user.id, dataFilename);

        // let useFiles: string[] = [];

        this.ctn.embeds = [await this.setEmbed()];
        this.ctn.components = [buttons];

        await this.send();
    }

    scores: osuapi.types_v2.Score[] = [];
    user: osuapi.types_v2.UserExtended;

    async getScoreCount(cinitnum: number, args = this.params, input = this.input): Promise<boolean> {
        let fd: osuapi.types_v2.Score[];
        const defArgs = {
            user_id: this.user.id,
            mode: other.modeValidator(args.mode),
            offset: cinitnum
        };
        switch (args.scoreTypes) {
            case 'firsts':
                fd = await osuapi.v2.scores.first(defArgs);
                break;
            case 'best':
                fd = await osuapi.v2.scores.best(defArgs);
                break;
            case 'recent':
                fd = await osuapi.v2.scores.recent({ include_fails: 1, ...defArgs });
                break;
            case 'pinned':
                fd = await osuapi.v2.scores.pinned(defArgs);
                break;
        }
        if (helper.errors.isErrorObject(fd)) {
            await this.sendError(helper.errors.scores.best(args.user).replace('top', args.scoreTypes == 'best' ? 'top' : args.scoreTypes));
            return;
        }
        for (let i = 0; i < fd.length; i++) {
            if (!fd[i] || typeof fd[i] == 'undefined') { break; }
            this.scores.push(fd[i]);
        }
        if (this.scores.length == 500 && args.scoreTypes == 'firsts') {
            args.reachedMaxCount = true;
        } else if (args.scoreTypes == 'firsts') {
            return await this.getScoreCount(cinitnum + 100, args);
        }
        return args.reachedMaxCount;
    }

    async setEmbed() {
        const embed: Discord.EmbedBuilder = new Discord.EmbedBuilder()
            .setTitle(`Statistics for ${this.user.username}'s ${this.params.scoreTypes} scores`)
            .setThumbnail(`${this.user?.avatar_url ?? helper.defaults.images.any.url}`);
        if (this.scores.length == 0) {
            embed.setDescription('No scores found');
        } else {
            embed.setDescription(`${calculate.separateNum(this.scores.length)} scores found\n${this.params.reachedMaxCount ? 'Only first 100 scores are calculated' : ''}`);
            await this.embedData(embed);
        }
        formatters.userAuthor(this.user, embed);
        return embed;
    }

    async embedData(embed: Discord.EmbedBuilder) {
        const mappers = calculate.findMode(this.scores.map(x => x.beatmapset.creator));
        const mods = calculate.findMode(this.scores.map(x => {
            return x.mods.length == 0 ?
                'NM' :
                x.mods.map(x => x.acronym).join('');
        }));
        const grades = calculate.findMode(this.scores.map(x => x.rank));
        const acc = calculate.stats(this.scores.map(x => x.accuracy));
        const combo = calculate.stats(this.scores.map(x => x.max_combo));
        let pp = calculate.stats(this.scores.map(x => x.pp));
        let totpp = '';
        let weighttotpp = '';

        if (this.params.all) {
            const temp = await this.embedData_isAll();
            pp = temp.pp;
            totpp = temp.totpp;
            weighttotpp = temp.weighttotpp;
        }
        embed.setFields([
            this.embedData_statFieldStr('Mappers', mappers),
            this.embedData_statFieldStr('Mods', mods),
            this.embedData_statFieldStr('Ranks', grades),
            this.embedData_statFieldRange('Accuracy', acc, '%'),
            this.embedData_statFieldRange('Combo', combo),
        ]);
        if (this.params.all) {
            const temp = await this.embedData_isAll();
            pp = temp.pp;
            totpp = temp.totpp;
            weighttotpp = temp.weighttotpp;
            embed.addFields([
                this.embedData_statFieldRange('Performance', pp, 'pp'),
                {
                    name: 'Total PP',
                    value: totpp,
                    inline: true
                },
                {
                    name: '(Weighted)',
                    value: weighttotpp,
                    inline: true
                },
            ]);
        } else {
            embed.addFields(
                this.embedData_statFieldRange('Performance', pp, 'pp'),
            );
        }
    }
    async embedData_isAll() {
        const calculations = await this.embedData_isAll_calc();
        const pp = calculate.stats(calculations.map(x => x.pp));
        calculations.sort((a, b) => b.pp - a.pp);

        const ppcalc = {
            total: calculations.map(x => x.pp).reduce((a, b) => a + b, 0),
            acc: calculations.map(x => x.ppAccuracy).reduce((a, b) => a + b, 0),
            aim: calculations.map(x => x.ppAim).reduce((a, b) => a + b, 0),
            diff: calculations.map(x => x.ppDifficulty).reduce((a, b) => a + b, 0),
            speed: calculations.map(x => x.ppSpeed).reduce((a, b) => a + b, 0),
        };
        const weightppcalc = {
            total: calculate.weightPerformance(calculations.map(x => x.pp)).reduce((a, b) => a + b, 0),
            acc: calculate.weightPerformance(calculations.map(x => x.ppAccuracy)).reduce((a, b) => a + b, 0),
            aim: calculate.weightPerformance(calculations.map(x => x.ppAim)).reduce((a, b) => a + b, 0),
            diff: calculate.weightPerformance(calculations.map(x => x.ppDifficulty)).reduce((a, b) => a + b, 0),
            speed: calculate.weightPerformance(calculations.map(x => x.ppSpeed)).reduce((a, b) => a + b, 0),
        };
        let totpp = `Total: ${ppcalc.total.toFixed(2)}`;
        ppcalc.acc ? totpp += `\nAccuracy: ${ppcalc.acc.toFixed(2)}` : '';
        ppcalc.aim ? totpp += `\nAim: ${ppcalc.aim.toFixed(2)}` : '';
        ppcalc.diff ? totpp += `\nDifficulty: ${ppcalc.diff.toFixed(2)}` : '';
        ppcalc.speed ? totpp += `\nSpeed: ${ppcalc.speed.toFixed(2)}` : '';

        let weighttotpp = `Total: ${weightppcalc.total.toFixed(2)}`;
        ppcalc.acc ? weighttotpp += `\nAccuracy: ${weightppcalc.acc.toFixed(2)}` : '';
        ppcalc.aim ? weighttotpp += `\nAim: ${weightppcalc.aim.toFixed(2)}` : '';
        ppcalc.diff ? weighttotpp += `\nDifficulty: ${weightppcalc.diff.toFixed(2)}` : '';
        ppcalc.speed ? weighttotpp += `\nSpeed: ${weightppcalc.speed.toFixed(2)}` : '';
        return {
            pp, totpp, weighttotpp
        };
    }
    async embedData_isAll_calc() {
        const calculations: rosu.PerformanceAttributes[] = [];
        for (const score of this.scores) {
            calculations.push(
                await performance.calcScore({
                    mods: score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
                    mode: score.ruleset_id,
                    mapid: score.beatmap.id,
                    stats: score.statistics,
                    accuracy: score.accuracy,
                    maxcombo: score.max_combo,
                    mapLastUpdated: new Date(score.beatmap.last_updated)
                }));
        }
        return calculations;
    }
    embedData_statFieldStr(name: string, stats: {
        string: string;
        count: number;
        percentage: number;
    }[]): Discord.EmbedField {
        const str = this.embedData_statStr(stats);
        return {
            name,
            value: str.length == 0 ?
                'No data available' :
                str,
            inline: true
        };
    }
    embedData_statStr(stats: {
        string: string;
        count: number;
        percentage: number;
    }[]) {
        let str = '';
        for (let i = 0; i < stats.length && i < 5; i++) {
            str += `#${i + 1}. ${stats[i].string} - ${calculate.separateNum(stats[i].count)} | ${stats[i].percentage.toFixed(2)}%\n`;
        }
        return str;
    }
    embedData_statFieldRange(name: string, stat: {
        highest: number;
        mean: number;
        lowest: number;
        median: number;
        ignored: number;
        calculated: number;
        total: number;
    }, suffix: string = ''): Discord.EmbedField {
        return {
            name,
            value: `
Highest: ${(stat?.highest * 100)?.toFixed(2)}${suffix}
Lowest: ${(stat?.lowest * 100)?.toFixed(2)}${suffix}
Average: ${(stat?.mean * 100)?.toFixed(2)}${suffix}
Median: ${(stat?.median * 100)?.toFixed(2)}${suffix}
${stat?.ignored > 0 ? `Skipped: ${stat?.ignored}` : ''}
`,
            inline: true
        };
    }
}