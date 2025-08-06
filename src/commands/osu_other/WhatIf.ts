import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { OsuCommand } from '../command';

export class WhatIf extends OsuCommand {
    declare protected params: {
        user: string;
        searchid: string;
        pp: number;
        mode: osuapi.types_v2.GameMode;
    };
    constructor() {
        super();
        this.name = 'WhatIf';
        this.params = {
            user: null,
            searchid: null,
            pp: null,
            mode: null,
        };
    }
    async setParamsMsg() {
        this.setParamMode();
        if (!isNaN(+this.input.args[0])) {
            this.params.pp = +this.input.args[0];
        }
        this.input.args.forEach(x => {
            if (!isNaN(+x)) {
                this.params.pp = +x;
            }
        });
        for (const x of this.input.args) {
            if (!isNaN(+x)) {
                this.params.pp = +x;
                break;
            }
        }
        if (this.params.pp && !isNaN(this.params.pp)) {
            this.input.args.splice(this.input.args.indexOf(this.params.pp + ''), 1);
        }

        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (usertemp?.mode && !this.params.mode) {
            this.params.mode = usertemp?.mode;
        }
        this.setUserParams();
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = this.commanduser.id;
        this.params.user = interaction.options.getString('user');
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode;
        this.params.pp = interaction.options.getNumber('pp');
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.searchid = this.commanduser.id;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        if (!this.params.pp || isNaN(this.params.pp) || this.params.pp > 10000) {
            this.input.message.reply("Please define a valid PP value to calculate");
        }

        await this.fixUser();

        let osudata: osuapi.types_v2.UserExtended;
        try {
            osudata = await this.getProfile(this.params.user, this.params.mode);
        } catch (e) {
            return;
        }
        if (this.params.mode == null) {
            this.params.mode = osudata.playmode;
        }

        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${osudata.id}+${osudata.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        let osutopdata: osuapi.types_v2.Score[];
        try {
            osutopdata = await this.getTopData(osudata.id, this.params.mode);
        } catch (e) {
            this.ctn.content = 'There was an error trying to fetch top scores';
            await this.send();
            return;
        }

        const pparr = osutopdata.slice().map(x => x.pp);
        pparr.push(this.params.pp);
        pparr.sort((a, b) => b - a);
        const ppindex = pparr.indexOf(this.params.pp);

        const weight = calculate.findWeight(ppindex);
        const total = calculate.totalWeightedPerformance(pparr);
        //     416.6667 * (1 - 0.9994 ** osudata.statistics.play_count);

        const newBonus = [];
        for (let i = 0; i < osutopdata.length; i++) {
            newBonus.push(osutopdata[i].weight.pp/*  ?? (osutopdata[i].pp * osufunc.findWeight(i)) */);
        }

        const bonus = osudata.statistics.pp - newBonus.reduce((a, b) => a + b, 0);

        const guessrank = await data.getRankPerformance('pp->rank', (total + bonus), `${other.modeValidator(this.params.mode)}`,);

        const embed = new Discord.EmbedBuilder()
            .setTitle(`What if ${osudata.username} gained ${this.params.pp}pp?`)
            .setColor(helper.colours.embedColour.query.dec)
            .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`);
        formatters.userAuthor(osudata, embed);
        if (ppindex + 1 > 100) {
            embed.setDescription(
                `A ${this.params.pp}pp score would be outside of their top 100 plays and be weighted at 0%.
    Their total pp and rank would not change.
    `);
        } else {
            embed.setDescription(
                `A ${this.params.pp}pp score would be their **${calculate.toOrdinal(ppindex + 1)}** top play and would be weighted at **${(weight * 100).toFixed(2)}%**.
    Their pp would change by **${Math.abs((total + bonus) - osudata.statistics.pp).toFixed(2)}pp** and their new total pp would be **${(total + bonus).toFixed(2)}pp**.
    Their new rank would be **${Math.round(guessrank.value)}** (+${Math.round(osudata?.statistics?.global_rank - guessrank.value)}).
    `
            );
        }

        this.ctn.embeds = [embed];
        this.ctn.components = [buttons];
        await this.send();
    }
    async getTopData(user: number, mode: osuapi.types_v2.GameMode) {
        let topdata: osuapi.types_v2.Score[];
        if (data.findFile(this.input.id, 'osutopdata') &&
            !('error' in data.findFile(this.input.id, 'osutopdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            topdata = data.findFile(this.input.id, 'osutopdata');
        } else {
            topdata = await osuapi.v2.scores.best({
                user_id: user,
                mode
            });
        }

        if (helper.errors.isErrorObject(topdata)) {
            await this.sendError(helper.errors.scores.best(user));
        }
        data.storeFile(topdata, this.input.id, 'osutopdata');
        return topdata;

    }
}