import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { SingleScoreCommand } from './SingleScoreCommand';

export class Recent extends SingleScoreCommand {
    declare protected params: {
        user: string;
        searchid: string;
        page: number;
        mode: osuapi.types_v2.GameMode;
        showFails: 1 | 0;
        filter: string;
    };
    constructor() {
        super();
        this.name = 'Recent';
        this.type = 'recent';
        this.params = {
            user: undefined,
            searchid: undefined,
            page: 0,
            mode: null,
            showFails: 1,
            filter: null,
        };
    }

    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        this.params.showFails = this.setParam(this.params.showFails, ['-nf', '-nofail', '-pass', '-passes', 'passes=true'], 'bool', {});
        this.setParamPage();
        this.params.filter = this.setParam(this.params.filter, ['-?'], 'string', { string_isMultiple: true });
        this.setParamMode();

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
        this.params.user = interaction.options.getString('user');
        this.params.page = interaction.options.getNumber('page');
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode;
        this.params.filter = interaction.options.getString('filter');
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
        this.params.mode = temp.mode;
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
        this.params.showFails = temp.fails;
        this.params.filter = temp.filterTitle;
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page', 'number');
        this.setParamOverride('mode',);

    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        const buttons = new Discord.ActionRowBuilder();

        await this.fixUser();

        this.fixPage();

        this.sendLoading();

        try {
            const u = await this.getProfile(this.params.user, this.params.mode);
            this.osudata = u;
        } catch (e) {
            return;
        }

        buttons.addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.osudata.id}+${this.osudata.playmode}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.extras.user),
        );

        if (data.findFile(this.input.id, 'rsdata') &&
            this.input.type == 'button' &&
            !('error' in data.findFile(this.input.id, 'rsdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            this.scores = data.findFile(this.input.id, 'rsdata');
        } else {
            this.scores = await osuapi.v2.scores.recent({
                user_id: this.osudata.id,
                mode: this.params.mode,
                include_fails: this.params.showFails,
            });
        }

        data.debug(this.scores, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'rsData');
        if (this.scores?.hasOwnProperty('error')) {
            await this.sendError(helper.errors.scores.recent(this.params.user));
        }

        data.storeFile(this.scores, this.input.id, 'rsdata');

        if (this.params.filter) {
            this.scores = other.filterScoreQuery(this.scores, this.params.filter);
        }

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.ctn.components = [pgbuttons, buttons];

        this.params.page = this.scores[this.params.page] ? this.params.page : 0;

        if (this.input.buttonType == 'BigRightArrow') {
            this.params.page = this.scores.length - 1;
        }

        this.score = this.scores[this.params.page];
        if (!this.score || this.score == undefined || this.score == null) {
            let err = helper.errors.scores.recent_ms(this.params.user, helper.emojis.gamemodes[other.modeValidator(this.params.mode)]);
            if (this.params.filter) {
                err += ` matching \`${this.params.filter}\``;
            }
            await this.sendError(err);
        }
        this.map = this.score.beatmap as osuapi.types_v2.BeatmapExtended;
        this.mapset = this.score.beatmapset;

        try {
            const m = await this.getMap(this.score.beatmap_id + '');
            this.map = m;
        } catch (e) {
            return;
        }

        const e = await this.renderEmbed();
        const s = await this.getStrains(this.map, this.score);
        e.setImage(`attachment://${s}`);

        data.writePreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.score.id}`,
                apiData: this.score,
                mods: this.score.mods,
            });
        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: this.score.mods,
            }
        );
        commandTools.storeButtonArgs(this.input.id, {
            user: this.params.user,
            searchid: this.params.searchid,
            page: this.params.page + 1,
            maxPage: this.scores.length,
            mode: this.params.mode,
            fails: this.params.showFails,
            filterTitle: this.params.filter,
        });

        this.ctn.edit = true;

        this.send();
    }

}