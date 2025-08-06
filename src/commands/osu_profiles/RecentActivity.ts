import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

export class RecentActivity extends OsuCommand {
    declare protected params: {
        user: string;
        searchid: string;
        page: number;
    };
    constructor() {
        super();
        this.name = 'RecentActivity';
        this.params = {
            user: null,
            searchid: null,
            page: 1,
        };
    }
    async setParamsMsg() {
        this.setParamPage();
        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        this.setUserParams();
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = this.commanduser.id;
        this.params.user = interaction.options.getString('user');
        this.params.page = interaction.options.getInteger('page');
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.user = this.input.message.embeds[0].url.split('users/')[1].split('/')[0];
        this.params.page = parseInt((this.input.message.embeds[0].description).split('Page: ')[1].split('/')[0]);

        switch (this.input.buttonType) {
            case 'BigLeftArrow':
                this.params.page = 1;
                break;
            case 'LeftArrow':
                this.params.page = parseInt((this.input.message.embeds[0].description).split('Page: ')[1].split('/')[0]) - 1;
                break;
            case 'RightArrow':
                this.params.page = parseInt((this.input.message.embeds[0].description).split('Page: ')[1].split('/')[0]) + 1;
                break;
            case 'BigRightArrow':
                this.params.page = parseInt((this.input.message.embeds[0].description).split('Page: ')[1].split('/')[1].split('\n')[0]);
                break;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff

        const buttons: Discord.ActionRowBuilder = new Discord.ActionRowBuilder();
        this.fixUser(false);

        this.fixPage();
        await this.sendLoading();

        let osudata: osuapi.types_v2.UserExtended;

        if (data.findFile(this.params.user, 'osudata', 'osu') &&
            !('error' in data.findFile(this.params.user, 'osudata', 'osu')) &&
            this.input.buttonType != 'Refresh'
        ) {
            osudata = data.findFile(this.params.user, 'osudata', 'osu');
        } else {
            osudata = await osuapi.v2.users.profile({ name: this.params.user, mode: 'osu' });
        }

        data.debug(osudata, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'osuData');

        if (helper.errors.isErrorObject(osudata) || !osudata.id) {
            await this.sendError(helper.errors.profile.user(this.params.user));
            return;
        }

        data.storeFile(osudata, osudata.id, 'osudata', 'osu');
        data.storeFile(osudata, this.params.user, 'osudata', 'osu');

        if (this.input.type != 'button' || this.input.buttonType == 'Refresh') {
            try {
                data.updateUserStats(osudata, osudata.playmode);
                data.userStatsCache([osudata], 'osu', 'User');
            } catch (error) {
            }
        }
        buttons
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${osudata.id}+${osudata.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        let rsactData: osuapi.types_v2.Event[];

        if (data.findFile(this.input.id, 'rsactdata') &&
            !('error' in data.findFile(this.input.id, 'rsactdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            rsactData = data.findFile(this.input.id, 'rsactdata');
        } else {
            rsactData = await osuapi.v2.users.recentActivity({ user_id: osudata.id });
        }

        data.debug(rsactData, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'rsactData');

        if (helper.errors.isErrorObject(rsactData)) {
            await this.sendError(helper.errors.profile.rsact);
            return;
        }

        data.storeFile(rsactData, this.input.id, 'rsactData', 'osu');

        const pageLength = 10;

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            rsactData.length <= 5,
            this.params.page >= Math.ceil(rsactData.length / pageLength) - 1,
            this.params.page >= Math.ceil(rsactData.length / pageLength) - 1
        );

        const curEmbed = new Discord.EmbedBuilder()
            .setTitle(`Recent Activity for ${osudata.username}`)
            .setURL(`https://osu.ppy.sh/users/${osudata.id}/${osudata.playmode}#recent`)
            .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setDescription(`Page: ${this.params.page + 1}/${Math.ceil(rsactData.length / pageLength)}`);

        formatters.userAuthor(osudata, curEmbed);

        let actText = '';

        for (let i = 0; i < rsactData.length && i < pageLength; i++) {
            const curEv = rsactData[i + (this.params.page * pageLength)];
            if (!curEv) break;
            const obj = {
                number: `${i + (this.params.page * pageLength) + 1}`,
                desc: 'null',
            };
            switch (curEv.type) {
                case 'achievement': {
                    const temp = curEv as osuapi.types_v2.EventAchievement;
                    obj.desc = `Unlocked the **${temp.achievement.name}** medal! <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapsetApprove': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapsetApprove;
                    obj.desc = `Approved **[\`${temp.beatmapset.title}\`](https://osu.ppy.sh${temp.beatmapset.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapPlaycount': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapPlaycount;
                    obj.desc =
                        `Achieved ${temp.count} plays on [\`${temp.beatmap.title}\`](https://osu.ppy.sh${temp.beatmap.url}) <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapsetDelete': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapsetDelete;
                    obj.desc = `Deleted **[\`${temp.beatmapset.title}\`](https://osu.ppy.sh${temp.beatmapset.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapsetRevive': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapsetRevive;
                    obj.desc = `Revived **[\`${temp.beatmapset.title}\`](https://osu.ppy.sh${temp.beatmapset.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapsetUpdate': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapsetUpdate;
                    obj.desc = `Updated **[\`${temp.beatmapset.title}\`](https://osu.ppy.sh${temp.beatmapset.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'beatmapsetUpload': {
                    const temp = curEv as osuapi.types_v2.EventBeatmapsetUpload;
                    obj.desc = `Submitted **[\`${temp.beatmapset.title}\`](https://osu.ppy.sh${temp.beatmapset.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'rank': {
                    const temp = (curEv as osuapi.types_v2.EventRank);
                    obj.desc =
                        `Achieved rank **#${temp.rank}** on [\`${temp.beatmap.title}\`](https://osu.ppy.sh${temp.beatmap.url}) (${helper.emojis.gamemodes[temp.mode]}) <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                }
                    break;
                case 'rankLost': {
                    const temp = curEv as osuapi.types_v2.EventRankLost;
                    obj.desc = `Lost #1 on **[\`${temp.beatmap.title}\`](https://osu.ppy.sh${temp.beatmap.url})** <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'userSupportAgain': {
                    const temp = curEv as osuapi.types_v2.EventUserSupportAgain;
                    obj.desc = `Purchased supporter <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'userSupportFirst': {
                    const temp = curEv as osuapi.types_v2.EventUserSupportFirst;
                    obj.desc = `Purchased supporter for the first time <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'userSupportGift': {
                    const temp = curEv as osuapi.types_v2.EventUserSupportGift;
                    obj.desc = `Was gifted supporter <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
                case 'usernameChange': {
                    const temp = curEv as osuapi.types_v2.EventUsernameChange;
                    obj.desc = `Changed their username from ${temp.user.previousUsername} to ${temp.user.username} <t:${(new Date(temp.created_at).getTime()) / 1000}:R>`;
                } break;
            }
            actText += `**${obj.number})** ${obj.desc}\n\n`;
        }
        if (actText.length == 0) {
            actText = 'No recent activity found';
        }
        curEmbed.setDescription(`Page: ${this.params.page + 1}/${Math.ceil(rsactData.length / pageLength)}


${actText}`);
        this.ctn.embeds = [curEmbed];
        this.ctn.components = [pgbuttons, buttons];

        await this.send();
    }
}