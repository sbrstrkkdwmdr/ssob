import Discord from 'discord.js';
import * as helper from '../../helper';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

export class Badges extends OsuCommand {
    declare protected params: {
        user: string;
        searchid: string;
    };
    constructor() {
        super();
        this.name = 'Badges';
        this.params = {
            user: null,
            searchid: null,
        };
    }
    async setParamsMsg() {
        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        this.setUserParams();
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

        await this.sendLoading();

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

        const badgecount = osudata?.badges?.length ?? 0;

        const embed = new Discord.EmbedBuilder()
            .setTitle(`${osudata.username}s Badges`)
            .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setDescription(
                'Current number of badges: ' + badgecount
            );
        formatters.userAuthor(osudata, embed);

        const fields: Discord.EmbedField[] = [];

        for (let i = 0; i < 10 && i < osudata.badges.length; i++) {
            const badge = osudata?.badges[i];
            if (!badge) break;
            fields.push(
                {
                    name: badge.description,
                    value:
                        `Awarded <t:${new Date(badge.awarded_at).getTime() / 1000}:R>
${badge.url.length != 0 ? `[Forum post](${badge.url})` : ''}
${badge.image_url.length != 0 ? `[Image](${badge.image_url})` : ''}`,
                    inline: true
                }
            );
        }

        if (fields.length > 0) {
            embed.addFields(fields);
        }
        this.ctn.embeds = [embed];
        this.ctn.components = [cmdbuttons];
        await this.send();
    }
}