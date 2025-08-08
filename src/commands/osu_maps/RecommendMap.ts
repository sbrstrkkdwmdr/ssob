import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../../helper';
import * as data from '../../tools/data';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';
import { MapParse } from './MapParse';

export class RecommendMap extends OsuCommand {
    declare protected params: {
        searchid: string;
        user: string;
        maxRange: number;
        useType: 'closest' | 'random';
        mode: osuapi.types_v2.GameMode;
    };
    constructor() {
        super();
        this.name = 'RecommendMap';
        this.params = {
            searchid: null,
            user: null,
            maxRange: 1,
            useType: 'random',
            mode: null,
        };
    }
    async setParamsMsg() {
        this.params.maxRange = this.setParam(this.params.maxRange, ['r', 'random', 'f2', 'rdm', 'range', 'diff'], 'number', {});
        this.params.useType = this.setParam(this.params.useType, ['closest'], 'bool', { bool_setValue: 'closest' }) as "random" | "closest";

        this.setParamMode('');
        if (this.params.mode == '' as unknown) {
            this.params.mode = null;
        }
        this.setUserParams();
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = interaction?.member?.user.id ?? interaction?.user.id;

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.searchid = interaction?.member?.user.id ?? interaction?.user.id;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        await this.fixUser();

        if (this.params.maxRange < 0.5 || !this.params.maxRange) {
            this.params.maxRange = 0.5;
        }

        let osudata: osuapi.types_v2.User;

        if (this.params.useType == 'closest') {
            try {
                const t = await this.getProfile(this.params.user, this.params.mode ?? 'osu');
                osudata = t;
            } catch (e) {
                await this.sendError(helper.errors.profile.user(this.params.user));
                return;
            }
        }

        const randomMap = data.recommendMap(+(osumodcalc.extra.recdiff(osudata.statistics.pp)).toFixed(2), this.params.useType, this.params.mode, this.params.maxRange ?? 1);
        const exTxt =
            this.params.useType == 'closest' ? '' :
                `Random map within ${this.params.maxRange}⭐ of ${(osumodcalc.extra.recdiff(osudata.statistics.pp))?.toFixed(2)}
    Pool of ${randomMap.poolSize}
    `;

        const embed = new Discord.EmbedBuilder();
        if (!isNaN(randomMap.mapid)) {
            this.input.overrides = {
                id: randomMap.mapid,
                commanduser: this.commanduser,
                commandAs: this.input.type,
                ex: exTxt
            };

            const cmd = new MapParse();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        } else {
            embed
                .setTitle('Error')
                .setDescription(`${randomMap.err}`);
        }

        this.ctn.embeds = [embed];

        await this.send();
    }
}