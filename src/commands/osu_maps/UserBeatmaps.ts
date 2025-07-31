import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';
import { MapParse } from './MapParse';

export class UserBeatmaps extends OsuCommand {
    declare protected params: {
        filterType: helper.bottypes.ubmFilter;
        sort: helper.bottypes.ubmSort;
        reverse: boolean;
        user: string;
        searchid: string;
        page: number;
        parseMap: boolean;
        parseId: number;
        filterTitle: string;
        reachedMaxCount: boolean;
        mode: osuapi.types_v2.GameMode;
        detailed: number;
    };
    constructor() {
        super();
        this.name = 'UserBeatmaps';
        this.params = {
            filterType: 'favourite',
            sort: 'dateadded',
            reverse: false,
            user: undefined,
            searchid: undefined,
            page: 1,
            parseMap: false,
            parseId: undefined,
            filterTitle: null,
            reachedMaxCount: false,
            mode: 'osu',
            detailed: 1,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        this.setParamPage();

        this.params.detailed = this.setParam(this.params.detailed, helper.argflags.details, 'bool', { bool_setValue: 2 });

        this.params.filterType = this.setParamBoolList(this.params.filterType,
            { set: 'ranked', flags: helper.argflags.mapRanked },
            { set: 'favourite', flags: helper.argflags.mapFavourite },
            { set: 'graveyard', flags: helper.argflags.mapGraveyard },
            { set: 'loved', flags: helper.argflags.mapLove },
            { set: 'pending', flags: helper.argflags.mapPending },
            { set: 'nominated', flags: helper.argflags.mapNominated },
            { set: 'guest', flags: helper.argflags.mapGuest },
            { set: 'most_played', flags: helper.argflags.mapMostPlayed },
        );

        this.params.reverse = this.setParam(this.params.reverse, ['-reverse', '-rev'], 'bool', {});

        {
            this.params.parseId = this.setParam(this.params.parseId, ['-parse'], 'number', { number_isInt: true });
            this.params.parseMap = Boolean(this.params.parseId);
        }

        this.params.filterTitle = this.setParam(this.params.filterTitle, ['-?'], 'string', { string_isMultiple: true });

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

        this.params.user = interaction.options.getString('user') ?? null;
        this.params.filterType = (interaction.options.getString('type') ?? 'favourite') as helper.bottypes.ubmFilter;
        this.params.sort = (interaction.options.getString('sort') ?? 'dateadded') as helper.bottypes.ubmSort;
        this.params.reverse = interaction.options.getBoolean('reverse') ?? false;
        this.params.filterTitle = interaction.options.getString('filter');

        this.params.parseId = interaction.options.getInteger('parse');
        if (this.params.parseId != null) {
            this.params.parseMap = true;
        }

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        const temp = commandTools.getButtonArgs(this.input.id);
        if (temp.error) {
            interaction.followUp({
                content: helper.errors.paramFileMissing,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            commandTools.disableAllButtons(this.input.message);
            return;
        }
        this.params.searchid = temp.searchid;
        this.params.user = temp.user;
        this.params.filterType = temp.mapType;
        this.params.sort = temp.sortMap;
        this.params.reverse = temp.reverse;
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
        this.params.parseMap = temp.parse;
        this.params.parseId = temp.parseId;
        this.params.filterTitle = temp.filterTitle;
        // mode = temp.mode;
        this.params.detailed = commandTools.buttonDetail(temp.detailed, this.input.buttonType);

    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
        this.setParamOverride('filterType', 'ex');


    }
    mapsets: (osuapi.types_v2.Beatmapset[] | osuapi.types_v2.BeatmapPlaycount[]) = [];
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        this.fixPage();
        this.params.page++;

        await this.fixUser(false);

        await this.sendLoading();

        try {
            const u = await this.getProfile(this.params.user, this.params.mode);
            this.osudata = u;
        } catch (e) {
            return;
        }

        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.osudata.id}+${this.osudata.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        if (data.findFile(this.osudata.id, 'this.mapsets', null, this.params.filterType) &&
            !('error' in data.findFile(this.osudata.id, 'this.mapsets', null, this.params.filterType)) &&
            this.input.buttonType != 'Refresh'
        ) {
            this.mapsets = data.findFile(this.osudata.id, 'this.mapsets', null, this.params.filterType);
        } else {
            this.params = await this.getScoreCount(0);
        }

        data.debug(this.mapsets, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'mapListData');
        data.storeFile(this.mapsets, this.osudata.id, 'this.mapsets', null, this.params.filterType);

        let obj: formatters.MapSetFormatter;

        switch (this.params.filterType) {
            case 'most_played':
                obj = new formatters.MapPlayFormatter({
                    mapsets: this.mapsets as osuapi.types_v2.BeatmapPlayCountArr,
                    sort: this.params.sort as any,
                    filter: {
                        title: this.params.filterTitle
                    },
                    reverse: this.params.reverse,
                    page: this.params.page
                });
                break;
            default:
                obj = new formatters.MapSetFormatter({
                    mapsets: this.mapsets as osuapi.types_v2.BeatmapsetExtended[],
                    sort: this.params.sort as any,
                    filter: {
                        title: this.params.filterTitle
                    },
                    reverse: this.params.reverse,
                    page: this.params.page
                });
                break;
        }

        if (this.params.parseMap) {
            let ids: number[] = [];
            if (this.params.filterTitle) {
                obj.parseMaps();
                switch (this.params.filterType) {
                    case 'most_played':
                        ids = obj.data_playcounts.map(x => x.beatmap_id);
                        break;
                    default:
                        ids = obj.data.map(x => x?.beatmaps?.[0]?.id);
                        break;
                }
            }
            await this.parseId(ids, this.params.parseId, new MapParse(), helper.errors.map.m_uk + ` at index {id}`);
            return;
        }
        if (this.params.page >= Math.ceil(this.mapsets.length / 5)) {
            this.params.page = Math.ceil(this.mapsets.length / 5) - 1;
        }
        let mapsarg: {
            text: string;
            curPage: number;
            maxPage: number;
        };

        mapsarg = obj.execute();

        commandTools.storeButtonArgs(this.input.id, {
            searchid: this.params.searchid,
            user: this.params.user,
            mapType: this.params.filterType,
            sortMap: this.params.sort,
            reverse: this.params.reverse,
            page: this.params.page,
            maxPage: mapsarg.maxPage,
            parse: this.params.parseMap,
            parseId: this.params.parseId,
            filterTitle: this.params.filterTitle,
            detailed: this.params.detailed
        });
        const mapList = new Discord.EmbedBuilder()
            .setFooter({
                text: `${mapsarg.curPage}/${mapsarg.maxPage}`
            })
            .setTitle(`${this.osudata.username}'s ${formatters.toCapital(this.params.filterType)} Maps`)
            .setThumbnail(`${this.osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setURL(`https://osu.ppy.sh/users/${this.osudata.id}/${this.osudata.playmode}#beatmaps`)
            .setColor(helper.colours.embedColour.userlist.dec)
            .setDescription(this.params.reachedMaxCount ? 'Only the first 500 mapsets are shown\n\n' : '\n\n' + mapsarg.text);
        formatters.userAuthor(this.osudata, mapList);

        if (mapsarg.text.length == 0) {
            mapList.setDescription('No mapsets found');
        }
        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            mapsarg.text.length <= 5,
            mapsarg.curPage <= 1,
            mapsarg.curPage >= mapsarg.maxPage
        );
        this.ctn.embeds = [mapList];
        this.ctn.components = [pgbuttons, buttons];

        await this.send();
    }
    osudata: osuapi.types_v2.UserExtended;
    async getScoreCount(cinitnum: number) {
        if (cinitnum >= 499) {
            this.params.reachedMaxCount = true;
            return;
        }
        const fd =
            this.params.filterType == 'most_played' ?
                await osuapi.v2.users.mostPlayed({
                    user_id: this.osudata.id,
                    offset: cinitnum
                })
                :
                await osuapi.v2.users.beatmaps({
                    user_id: this.osudata.id,
                    type: this.params.filterType,
                    offset: cinitnum
                });
        if (fd?.hasOwnProperty('error')) {
            await this.sendError(helper.errors.map.group_nf(this.params.filterType));
            return;
        }
        for (let i = 0; i < fd.length; i++) {
            if (!fd[i] || typeof fd[i] == 'undefined') { break; }
            //@ts-expect-error Beatmapset missing properties from BeatmapPlaycount
            this.mapsets.push(fd[i]);
        }
        if (fd.length == 100 && this.params.filterType != 'most_played') {
            return await this.getScoreCount(cinitnum + 100);
        }
        return;
    }
}