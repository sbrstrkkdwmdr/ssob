import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

export class RankPP extends OsuCommand {
    declare protected params: {
        value: number;
        mode: osuapi.types_v2.GameMode;
        get: 'rank' | 'pp';
    };
    constructor() {
        super();
        this.name = 'RankPP';
        this.params = {
            value: 100,
            mode: 'osu',
            get: 'pp'
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();

        }
        this.params.value = +(this.input.args[0] ?? 100);
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.value = interaction.options.getInteger('value') ?? 100;
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode ?? 'osu';
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('get', 'type');
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        const Embed = new Discord.EmbedBuilder()
            .setTitle('null')
            .setDescription('null');

        let output: string;
        let returnval: {
            value: number;
            isEstimated: boolean;
        } = null;
        switch (this.params.get) {
            case 'pp': {
                returnval = await data.getRankPerformance('pp->rank', this.params.value, this.params.mode);
                output = 'approx. rank #' + calculate.separateNum(Math.ceil(returnval.value));
                Embed
                    .setTitle(`Approximate rank for ${this.params.value}pp`);
            }
                break;
            case 'rank': {
                returnval = await data.getRankPerformance('rank->pp', this.params.value, this.params.mode);
                output = 'approx. ' + calculate.separateNum(returnval.value.toFixed(2)) + 'pp';

                Embed
                    .setTitle(`Approximate performance for rank #${this.params.value}`);
            }
                break;
        };

        const dataSizetxt = await helper.vars.statsCache.count();

        Embed
            .setDescription(`${output}\n${helper.emojis.gamemodes[this.params.mode ?? 'osu']}\n${returnval.isEstimated ? `Estimated from ${dataSizetxt} entries.` : 'Based off matching / similar entry'}`);

        this.ctn.embeds = [Embed];

        await this.send();
    }
}