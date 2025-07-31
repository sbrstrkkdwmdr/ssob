import Discord from 'discord.js';
import { bws } from 'osumodcalculator/dist/extra';
import * as helper from '../../helper';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

export class BadgeWeightSeed extends OsuCommand {
    declare protected params: {
        user: string;
        searchid: string;
    };
    constructor() {
        super();
        this.name = 'BadgeWeightSeed';
        this.params = {
            user: null,
            searchid: null,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;

        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
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
        this.params.user = interaction.options.getString('user');
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        this.params.searchid = this.commanduser.id;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        this.fixUser(false);

        this.sendLoading();

        let osudata: osuapi.types_v2.UserExtended;

        try {
            const t = await this.getProfile(this.params.user, 'osu');
            osudata = t;
        } catch (e) {
            return;
        }

        const cmdbuttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${osudata.id}+${osudata.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        let res = 'User\'s weighted rank cannot be calculated';
        if (osudata?.statistics?.global_rank) {
            res = this.response(osudata?.statistics?.global_rank, osudata?.badges?.length ?? 0);
        } else if (osudata?.statistics?.pp) {
            const estRank = await data.getRankPerformance('pp->rank', osudata?.statistics?.pp ?? 0, 'osu');
            res = '***Using an estimated rank***\n\n' + this.response(estRank.value, osudata?.badges?.length ?? 0);
        }

        const embed = new Discord.EmbedBuilder()
            .setTitle(`Badge weighting for ${osudata.username}`)
            .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setDescription(res)
            .setFooter({ text: 'Values are rounded' });

        formatters.userAuthor(osudata, embed);

        this.ctn.embeds = [embed];
        this.ctn.components = [cmdbuttons];
        await this.send();
    }

    response(rank: number, badgecount: number = 0) {
        let n = rank ?? 1;
        let bd = 0;
        while (Math.round(n) > 1) {
            bd++;
            n = bws(bd, rank);
        }
        let extraFields = '\n\n---Rank estimates---';
        let i = 0;
        let br = badgecount;
        while (i < 10) {
            let temp = Math.round(bws(br, rank));
            extraFields += '\n' + br + ' badges: ' + temp;
            if (temp == 1) break;
            br++;
            i++;
        }
        if (extraFields == '\n\n---Rank estimates---') extraFields = '';

        return 'Current rank: ' + rank +
            '\nCurrent number of badges: ' + badgecount +
            '\nCurrent weighted rank: ' + Math.round(bws(badgecount, rank)) +
            '\nBadges needed for #1: ' + bd + extraFields;
    }
}