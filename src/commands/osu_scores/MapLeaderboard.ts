import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { formatterInfo } from '../../types/tools';
import { OsuCommand } from '../command';
import { ScoreParse } from './ScoreParse';

export class MapLeaderboard extends OsuCommand {
    declare protected params: {
        mapid: number;
        mapmods: osumodcalc.types.Mod[];
        page: number;
        parseId: number;
        parseScore: boolean;
    };
    constructor() {
        super();
        this.name = 'MapLeaderboard';
        this.params = {
            mapid: undefined,
            mapmods: [],
            page: undefined,
            parseId: undefined,
            parseScore: false,
        };
    }
    async setParamsMsg() {
        this.setParamPage();

        {
            this.params.parseId = this.setParam(this.params.parseId, ['-parse'], 'number', { number_isInt: true });
            this.params.parseScore = Boolean(this.params.parseId);
        }

        const tmod = this.setParamMods();
        if (tmod.mods) {
            this.params.mapmods = tmod.mods;
        } else {
            const temp = this.setParam(this.params.mapmods, ['-mods'], 'string', {});
            const mods = osumodcalc.mod.fromString(temp.toUpperCase());
            if (mods && mods.length > 0) {
                this.params.mapmods = mods;
            }
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
        this.commanduser = interaction?.member?.user ?? interaction?.user;
        this.params.mapid = interaction.options.getInteger('id');
        this.params.page = interaction.options.getInteger('page');
        this.params.mapmods = osumodcalc.mod.fromString(interaction.options.getString('mods')) ?? null;
        this.params.parseId = interaction.options.getInteger('parse');
        if (this.params.parseId != null) {
            this.params.parseScore = true;
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
        this.params.mapid = +temp.mapId;
        this.params.mapmods = temp.modsInclude;
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
        this.setParamOverride('mapid', 'id', 'number');
        this.setParamOverride('mapmods', 'filterMods');
        this.setParamOverride('commanduser');

        this.setParamOverride('commanduser');
        if (this.input.overrides.commandAs) {
            this.input.type = this.input.overrides.commandAs;
        }
    }
    map: osuapi.types_v2.BeatmapExtended;
    scores: osuapi.types_v2.Score[];
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        this.fixMapid();
        await this.sendLoading();

        try {
            this.map = await this.getMap(this.params.mapid);
        } catch (e) {
            await this.sendError(helper.errors.map.ms(this.params.mapid));
        }

        await this.getScores();

        if (this.params.parseScore) {
            await this.parseId(this.scores.map(x => x.id), this.params.parseId, new ScoreParse(), helper.errors.score.nf + ` at index {id}`);
            return;
        }
        const obj = new formatters.ScoreFormatter({
            scores: this.scores,
            sort: 'score',
            filter: null,
            reverse: false,
            page: this.params.page,
            showOriginalIndex: true,
            preset: "map_leaderboard",
            overrideMap: this.map,
        });
        const scoresarg = await obj.execute();

        commandTools.storeButtonArgs(this.input.id + '', {
            mapId: this.params.mapid,
            page: scoresarg.curPage,
            maxPage: scoresarg.maxPage,
            sortScore: 'score',
            reverse: false,
            mode: this.map.mode,
            parse: this.params.parseScore,
            parseId: this.params.parseId,
        });

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            scoresarg.text.includes('ERROR'),
            scoresarg.curPage <= 1,
            scoresarg.curPage >= scoresarg.maxPage
        );

        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: this.params?.mapmods?.map(x => { return { acronym: x }; }) ?? []
            }
        );

        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-any-${this.input.id}-${this.params.mapid}${this.params.mapmods && this.params.mapmods.length > 0 ? '+' + this.params.mapmods.join(',') : ''}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.map)
            );

        this.ctn.embeds = [this.createEmbed(scoresarg)];
        this.ctn.components = [pgbuttons, buttons];
        this.ctn.edit = true;
        await this.send();
    }
    fixMapid() {
        if (!this.params.mapid) {
            const temp = data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
            this.params.mapid = +temp?.id;
        }
        if (this.params.mapid == 0) {
            commandTools.missingPrevID_map(this.input, this.name);
            return;
        }
    }
    async getScores() {
        let lbdataf: osuapi.types_v2.BeatmapScores<osuapi.types_v2.Score>;
        if (data.findFile(this.input.id, 'lbdata') &&
            this.input.type == 'button' &&
            !('error' in data.findFile(this.input.id, 'lbdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            lbdataf = data.findFile(this.input.id, 'lbdata');
        } else {
            lbdataf = await osuapi.v2.beatmaps.scores({
                id: this.map.id,
                ruleset: this.map.mode,
                legacy_only: 0,
                mods: this.params.mapmods,
            });
        }

        data.debug(lbdataf, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'lbDataF');

        if (helper.errors.isErrorObject(lbdataf)) {
            this.sendError(helper.errors.map.lb(this.params.mapid));
        }
        data.storeFile(lbdataf, this.input.id, 'lbdata');

        this.scores = lbdataf.scores;
    }
    protected createEmbed(data: formatterInfo<osuapi.v2.types.Score>) {
        const lbEmbed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.scorelist.dec)
            .setTitle(`Score leaderboard of \`${this.mapTitle(this.map, this.map.beatmapset)}\``)
            .setURL(`https://osu.ppy.sh/b/${this.params.mapid}`)
            .setThumbnail(osuapi.other.beatmapImages(this.map.beatmapset_id).list2x)
            .setFooter({ text: `${data.curPage}/${data.maxPage}` })
            .setDescription(data.text);
        return lbEmbed;
    }
}