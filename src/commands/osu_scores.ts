import Discord from 'discord.js';
import * as osuclasses from 'osu-classes';
import * as osuparsers from 'osu-parsers';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../helper';
import * as calculate from '../tools/calculate';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as log from '../tools/log';
import * as osuapi from '../tools/osuapi';
import * as other from '../tools/other';
import * as performance from '../tools/performance';
import { OsuCommand } from './command';

export class ScoreListCommand extends OsuCommand {
    declare protected params: {
        user: string;
        searchid: string;
        mode: osuapi.types_v2.GameMode,
        page: number;
        detailed: number;
        sort: "score" | "rank" | "pp" | "recent" | "acc" | "combo" | "miss";
        reverse: boolean;
        filterTitle: string;
        filterArtist: string;
        filterDifficulty: string;
        filteredMapper: string;
        filterRank: osuapi.types_v2.Rank;
        parseScore: boolean;
        parseId: string | number;
        modsInclude: osumodcalc.types.Mod[];
        modsExact: (osumodcalc.types.Mod | 'NONE')[];
        modsExclude: osumodcalc.types.Mod[];
        pp: string;
        score: string;
        acc: string;
        combo: string;
        miss: string;
        bpm: string;
        mapid: string | number | boolean;
    };
    protected type: 'osutop' | 'nochokes' | 'recent' | 'map' | 'firsts' | 'pinned';
    constructor() {
        super();
        this.params = {
            user: null,
            searchid: null,
            page: 0,
            mode: null,
            detailed: 1,
            sort: null,
            reverse: false,
            filterTitle: null,
            filterArtist: null,
            filterDifficulty: null,
            filteredMapper: null,
            filterRank: null,
            parseScore: null,
            parseId: null,
            modsInclude: [],
            modsExact: null,
            modsExclude: null,
            pp: null,
            score: null,
            acc: null,
            combo: null,
            miss: null,
            bpm: null,
            mapid: null,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        {
            this.params.parseId = this.setParam(this.params.parseId, ['-parse'], 'number', { number_isInt: true });
            this.params.parseScore = Boolean(this.params.parseId);
        }

        this.setParamPage();
        this.params.detailed =
            this.setParam(this.params.detailed, helper.argflags.details, 'bool', { bool_setValue: 2 }) ??
            this.setParam(this.params.detailed, helper.argflags.compress, 'bool', { bool_setValue: 0 });

        {
            this.setParamMode();

        }
        this.params.reverse = this.setParam(this.params.reverse, ['-reverse', '-rev'], 'bool', {});

        this.params.modsInclude = this.setParam(this.params.modsInclude, ['-mods'], 'string', {});
        this.params.modsExact = this.setParam(this.params.modsExact, ['-mx', '-modx'], 'string', {});
        this.params.modsExclude = this.setParam(this.params.modsExclude, ['-exmod', '-me'], 'string', {});

        this.params.sort = this.setParam(this.params.sort, ['-sort',], 'string', {}) ??
            this.setParamBoolList(this.params.sort,
                { set: 'recent', flags: ['-r', '-recent'] },
                { set: 'pp', flags: ['-performance', '-perf'] },
            );

        // range args
        // these are 'foo' '>foo' '<foo' 'min..max'
        this.params.pp = this.setParam(this.params.pp, ['-pp'], 'string', {});
        this.params.score = this.setParam(this.params.score, ['-score'], 'string', {});
        this.params.acc = this.setParam(this.params.acc, ['-acc'], 'string', {});
        this.params.combo = this.setParam(this.params.combo, ['-combo', '-maxcombo'], 'string', {});
        this.params.miss =
            this.setParam(this.params.miss, ['-miss', '-misses', '-x'], 'string', {}) ??
            this.setParam(this.params.miss, ['-fc', '-fullcombo'], 'bool', { bool_setValue: '0' });
        this.params.bpm = this.setParam(this.params.bpm, ['-bpm', '-maxcombo'], 'string', {});


        this.params.filterTitle = this.setParam(this.params.filterTitle, helper.argflags.filterTitle, 'string', { string_isMultiple: true });
        this.params.filteredMapper = this.setParam(this.params.filteredMapper, helper.argflags.filterCreator, 'string', { string_isMultiple: true });
        this.params.filterArtist = this.setParam(this.params.filterArtist, helper.argflags.filterArtist, 'string', { string_isMultiple: true });
        this.params.filterDifficulty = this.setParam(this.params.filterDifficulty, helper.argflags.filterVersion, 'string', { string_isMultiple: true });
        this.params.filterRank = this.setParamBoolList(this.params.filterRank,
            { set: 'xh', flags: ['-xh'] },
            { set: 'ssh', flags: ['-ssh'] },
            { set: 'x', flags: ['-x'] },
            { set: 'ss', flags: ['-ss'] },
            { set: 'sh', flags: ['-sh'] },
            { set: 's', flags: ['-s'] },
            { set: 'a', flags: ['-a'] },
            { set: 'b', flags: ['-b'] },
            { set: 'c', flags: ['-c'] },
            { set: 'd', flags: ['-d'] },
            { set: 'f', flags: ['-f'] },
        );

        const tmod = this.setParamMods();
        if (tmod) {
            this.params.modsInclude = tmod.mods;
        }

        await this.paramsMsgExtra();

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
        let interaction = this.input.interaction as Discord.ChatInputCommandInteraction;

        this.params.searchid = interaction?.member?.user?.id ?? interaction?.user.id;
        this.params.user = interaction.options.getString('user') ?? undefined;
        this.params.page = interaction.options.getInteger('page') ?? 0;
        this.params.detailed = interaction.options.getBoolean('detailed') ? 1 : 0;
        this.params.sort = interaction.options.getString('sort') as "score" | "rank" | "pp" | "recent" | "acc" | "combo" | "miss";
        this.params.reverse = interaction.options.getBoolean('reverse') ?? false;
        this.params.mode = (interaction.options.getString('mode') ?? 'osu') as osuapi.types_v2.GameMode;
        this.params.filteredMapper = interaction.options.getString('mapper') ?? null;
        this.params.filterTitle = interaction.options.getString('filter') ?? null;
        this.params.parseId = interaction.options.getInteger('parse') ?? null;
        this.params.parseScore = this.params.parseId != null ? true : false;
        this.params.modsInclude = osumodcalc.mod.fromString(interaction.options.getString('mods')) as osumodcalc.types.Mod[] ?? null;
        const tempexact = interaction.options.getString('modsExact');
        if ([].some(x => tempexact.includes(x))) {
            this.params.modsExact = ['NONE'];
        } else {
            this.params.modsExact = osumodcalc.mod.fromString(tempexact) as osumodcalc.types.Mod[] ?? null;
        }
        this.params.modsExclude = osumodcalc.mod.fromString(interaction.options.getString('modsExclude')) as osumodcalc.types.Mod[] ?? null;
        this.params.filterRank = interaction.options.getString('filterRank') as osuapi.types_v2.Rank;
        this.params.pp = interaction.options.getString('pp') ?? null;
        this.params.score = interaction.options.getString('score') ?? null;
        this.params.acc = interaction.options.getString('acc') ?? null;
        this.params.combo = interaction.options.getString('combo') ?? null;
        this.params.miss = interaction.options.getString('miss') ?? null;
        this.params.bpm = interaction.options.getString('bpm') ?? null;
        await this.paramsInteractExtra();
    }
    async setParamsBtn() {
        let interaction = (this.input.interaction as Discord.ButtonInteraction);
        if (!this.input.message.embeds[0]) return;

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

        this.params.user = temp?.user;
        this.params.searchid = temp?.searchid;
        this.params.page = temp?.page;
        this.params.mode = temp?.mode;
        this.params.filteredMapper = temp?.filterMapper;
        this.params.modsInclude = temp?.modsInclude;
        this.params.modsExact = temp?.modsExact;
        this.params.modsExclude = temp?.modsExclude;
        this.params.filterTitle = temp?.filterTitle;
        this.params.filterRank = temp?.filterRank;
        this.params.parseId = null;
        this.params.parseScore = null;
        this.params.pp = temp?.filterPp;
        this.params.score = temp?.filterScore;
        this.params.acc = temp?.filterAcc;
        this.params.combo = temp?.filterCombo;
        this.params.miss = temp?.filterMiss;
        this.params.bpm = temp?.filterBpm;
        this.params.sort = temp?.sort as any;
        this.params.reverse = temp?.reverse;

        switch (this.input.buttonType) {
            case 'BigLeftArrow':
                this.params.page = 1;
                break;
            case 'LeftArrow':
                this.params.page -= 1;
                break;
            case 'RightArrow':
                this.params.page += 1;
                break;
            case 'BigRightArrow':
                this.params.page = temp?.page;
                break;
        }

        switch (this.input.buttonType) {
            case 'Detail0':
                this.params.detailed = 0;
                break;
            case 'Detail1':
                this.params.detailed = 1;
                break;
            case 'Detail2':
                this.params.detailed = 2;
                break;
            default:
                if (this.input.message.embeds[0].footer.text.includes('LE')) {
                    this.params.detailed = 2;
                }
                if (this.input.message.embeds[0].footer.text.includes('LC')) {
                    this.params.detailed = 0;
                }
                break;
        }
        await this.paramsButtonsExtra();
    }
    paramsMsgExtra() { };
    paramsInteractExtra() { };
    paramsButtonsExtra() { };

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
        this.setParamOverride('sort');
        this.setParamOverride('reverse');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride('user');
        this.setParamOverride('mode');
    }

    osudata: osuapi.types_v2.UserExtended;
    scores: osuapi.types_v2.Score[];
    map: osuapi.types_v2.BeatmapExtended;

    pgbuttons: Discord.ActionRowBuilder;
    buttons: Discord.ActionRowBuilder;

    protected async getScores() {
        let req: osuapi.types_v2.Score[] | osuapi.types_v2.ScoreArrA;
        let fname = '';
        let getid = this.osudata.id + '';
        switch (this.type) {
            case 'osutop':
                fname = 'osutopdata';
                break;
            case 'nochokes':
                fname = 'nochokesdata';
                break;
            case 'recent':
                fname = 'recentscoresdata';
                getid = this.input.id + '';
                break;
            case 'map':
                fname = 'mapscoresdata';
                getid = this.input.id + '';
                break;
            case 'firsts':
                fname = 'firstsdata';
                getid = this.input.id + '';
                break;
            case 'pinned':
                fname = 'pinneddata';
                break;
        }
        if (this.type == 'map') {
            try {
                this.map = await this.getMap(+this.params.mapid);
            } catch (e) {
                return;
            }
        }
        if (data.findFile(getid, fname) &&
            this.input.type == 'button' &&
            !('error' in data.findFile(getid, fname)) &&
            this.input.buttonType != 'Refresh'
        ) {
            req = data.findFile(getid, fname);
        } else {
            switch (this.type) {
                case 'osutop': case 'nochokes':
                    req = await osuapi.v2.scores.best({ user_id: this.osudata.id, mode: this.params.mode });
                    break;
                case 'recent':
                    req = await osuapi.v2.scores.recent({ user_id: this.osudata.id, mode: this.params.mode, include_fails: 1 });
                    break;
                case 'map': {
                    req = await osuapi.v2.beatmaps.userScores({ user_id: this.osudata.id, map_id: +this.params.mapid });
                }
                    break;
                case 'firsts':
                    req = await osuapi.v2.scores.first({ user_id: this.osudata.id, mode: this.params.mode });
                    break;
                case 'pinned':
                    req = await osuapi.v2.scores.pinned({ user_id: this.osudata.id, mode: this.params.mode });
                    break;
            }
        }

        if (req?.hasOwnProperty('error')) {
            await this.commitError(this?.type);
        }

        const tempscores: osuapi.types_v2.Score[] =
            this.type == 'map' ?
                (req as osuapi.types_v2.ScoreArrA).scores :
                req as osuapi.types_v2.Score[];

        data.debug(req, 'command', this.type, this.input.message?.guildId ?? this.input.interaction?.guildId, this.type + 'data');
        data.storeFile(req, getid, fname);

        if (tempscores?.hasOwnProperty('error') || tempscores.length == 0 || !(tempscores[0]?.user?.username || tempscores[0]?.user_id)) {
            await this.commitError(this?.type);
        }

        if (this.type == 'nochokes') {
            for (let i = 0; i < tempscores.length; i++) {
                if (tempscores[i]?.statistics?.miss > 0) {
                    const curscore = tempscores[i];
                    curscore.pp = null;
                    curscore.is_perfect_combo = true;
                    curscore.legacy_perfect = true;
                    tempscores[i] = curscore;
                }
            }
        }

        this.scores = tempscores;

    };
    async commitError(type: string) {
        let err = '';
        const errList = helper.errors.uErr.osu.scores;
        switch (type) {
            case 'osutop': case 'nochokes':
                await this.sendError(errList.best);
                break;
            case 'recent':
                await this.sendError(errList.recent);
                break;
            case 'map':
                await this.sendError(errList.map.replace('[MID]', this.params.mapid + ''));
                break;
            case 'firsts':
                await this.sendError(errList.first);
                break;
            case 'pinned':
                break;
        }
        await this.sendError(err.replace('[ID]', this.params.user));
    }
    protected toName(map?: osuapi.types_v2.Beatmap) {
        switch (this.type) {
            case 'osutop':
                return 'Best scores for ' + this.osudata.username;
            case 'nochokes':
                return 'Best no-choke scores for ' + this.osudata.username;
            case 'recent':
                if (this.params.sort == 'pp') {
                    return 'Recent best scores for ' + this.osudata.username;
                }
                return 'Recent scores for ' + this.osudata.username;
            case 'map':
                return `\`${map?.beatmapset?.artist} - ${map?.beatmapset?.title} [${map?.version}]\``;
            case 'firsts':
                return '#1 scores for ' + this.osudata.username;
            case 'pinned':
                return 'Pinned scores for ' + this.osudata.username;
        }
    }
    protected async list(map?: osuapi.types_v2.BeatmapExtended) {
        let seturl = '';
        switch (this.type) {
            case 'recent':
                seturl = `https://osu.ppy.sh/users/${this.osudata.id}/${osumodcalc.mode.toName(this.scores?.[0]?.ruleset_id)}#historical`;
                break;
            case 'map':
                seturl = `https://osu.ppy.sh/b/${this.map.id}`;
                break;
            default:
                seturl = `https://osu.ppy.sh/users/${this.osudata.id}/${osumodcalc.mode.toName(this.scores?.[0]?.ruleset_id)}#top_ranks`;
                break;
        }
        const scoresEmbed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.scorelist.dec)
            .setTitle(this.toName(map))
            .setThumbnail(`${this.osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setURL(seturl);
        formatters.userAuthor(this.osudata, scoresEmbed);

        const scoresFormat = await formatters.scoreList(this.scores, this.params.sort,
            {
                mapper: this.params.filteredMapper,
                modsInclude: this.params.modsInclude,
                title: this.params.filterTitle,
                artist: this.params.filterArtist,
                version: this.params.filterDifficulty,
                rank: this.params.filterRank,
                modsExact: this.params.modsExact,
                modsExclude: this.params.modsExclude,
                pp: this.params.pp,
                score: this.params.score,
                acc: this.params.acc,
                combo: this.params.combo,
                miss: this.params.miss,
                bpm: this.params.bpm,
                isnochoke: this.type == 'nochokes'
            }, this.params.reverse, this.params.detailed, this.params.page, true,
            this.type == 'map' ? 'single_map' : undefined, map ?? undefined
        );

        commandTools.storeButtonArgs(this.input.id + '', {
            user: this.params.user,
            searchid: this.params.searchid,
            page: this.params.page,
            mode: this.params.mode,
            filterMapper: this.params.filteredMapper,
            modsInclude: this.params.modsInclude,
            modsExact: this.params.modsExact,
            modsExclude: this.params.modsExclude,
            filterTitle: this.params.filterTitle,
            filterRank: this.params.filterRank,
            filterPp: this.params.pp,
            filterScore: this.params.score,
            filterAcc: this.params.acc,
            filterCombo: this.params.combo,
            filterMiss: this.params.miss,
            filterBpm: this.params.bpm,
            sort: this.params.sort,
            reverse: this.params.reverse,
            maxPage: scoresFormat.maxPage
        });

        scoresEmbed.setFooter({
            text: `${scoresFormat.curPage}/${scoresFormat.maxPage} | ${this.params.mode ?? osumodcalc.mode.toName(this.scores?.[0]?.ruleset_id)}`
        });
        if (scoresFormat.text.includes('ERROR')) {
            scoresEmbed.setDescription('**ERROR**\nNo scores found');
            (this.pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[2].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }
        scoresEmbed.setDescription(scoresFormat.text);
        data.writePreviousId('user', this.input.message?.guildId ?? this.input.interaction?.guildId, { id: `${this.osudata.id}`, apiData: null, mods: null });
        if (this.type == 'map') {
            data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
                {
                    id: `${map.id}`,
                    apiData: null,
                    mods: null
                }
            );
        }
        if (scoresFormat.curPage <= 1) {
            (this.pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }
        if (scoresFormat.curPage >= scoresFormat.maxPage) {
            (this.pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (this.pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }

        this.ctn.embeds = [scoresEmbed];
        this.ctn.components = [this.pgbuttons, this.buttons];
    }

    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();

        await this.fixUser();

        if (this.type == 'map') {
            if (!this.params.mapid) {
                const temp = data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
                this.params.mapid = temp.id;
            }
            if (this.params.mapid == false) {
                commandTools.missingPrevID_map(this.input, this.name);
                return;
            }
        }


        this.pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.buttons = new Discord.ActionRowBuilder();

        this.sendLoading();

        if (this.params.page < 2 || typeof this.params.page != 'number' || isNaN(this.params.page)) {
            this.params.page = 1;
        }

        try {
            const u = await this.getProfile(this.params.user, this.params.mode);
            this.osudata = u;
        } catch (e) {
            return;
        }

        this.buttons.addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.osudata.id}+${this.osudata.playmode}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.extras.user),
        );
        try {
            await this.getScores();
        } catch (e) {
            console.log(e);
            return;
        }

        if (this.params.parseScore) {
            let pid = +(this.params.parseId) - 1;
            if (isNaN(pid) || pid < 0) {
                pid = 0;
            }
            if (pid > this.scores.length) {
                pid = this.scores.length - 1;
            }
            this.input.overrides = {
                id: this.scores?.[pid]?.id,
                commanduser: this.commanduser,
                commandAs: this.input.type
            };
            const user = this.osudata.username;
            switch (this.type) {
                case 'osutop':
                    this.input.overrides.ex = `${user}'s #${calculate.toOrdinal(pid + 1)} ${this.params.sort == 'pp' ? formatters.sortDescription(this.params.sort ?? 'pp', this.params.reverse) + ' ' : ''}top score`;
                    break;
                case 'nochokes':
                    this.input.overrides.ex = `${user}'s #${calculate.toOrdinal(pid + 1)} ${this.params.sort == 'pp' ? formatters.sortDescription(this.params.sort ?? 'pp', this.params.reverse) + ' ' : ''}no choke score`;
                    this.input.overrides.type = 'nochoke';
                    break;
                case 'firsts':
                    this.input.overrides.ex = `${user}'s ${calculate.toOrdinal(pid + 1)} ${this.params.sort == 'recent' ? formatters.sortDescription(this.params.sort ?? 'recent', this.params.reverse) + ' ' : ''}#1 score`;
                    break;
                case 'pinned':
                    this.input.overrides.ex = `${user}'s ${calculate.toOrdinal(pid + 1)} ${this.params.sort == 'recent' ? formatters.sortDescription(this.params.sort ?? 'recent', this.params.reverse) + ' ' : ''}pinned score`;
                    break;
            }
            if (this.input.overrides.id == null || typeof this.input.overrides.id == 'undefined') {
                await commandTools.errorAndAbort(this.input, this.name, true, `${helper.errors.uErr.osu.score.nf} at index ${pid}`, true);
                return;
            }
            this.input.type = 'other';
            const cmd = new ScoreParse();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        }

        await this.list(this?.map);
        this.ctn.edit = true;

        this.send();
    }

    fixParamMap() {
        if (this.type == 'map') {
            if (!this.params.mapid) {
                const temp = data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
                this.params.mapid = temp.id;
            }
            if (this.params.mapid == false) {
                commandTools.missingPrevID_map(this.input, this.name);
                throw new Error('');
            }
        }
    }
}

export class Firsts extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'firsts';
        this.name = 'Firsts';
    }
}

export class OsuTop extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'osutop';
        this.name = 'OsuTop';
    }
}

export class NoChokes extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'nochokes';
        this.name = 'NoChokes';
        this.params.sort = 'pp';
    }
}

export class Pinned extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'pinned';
        this.name = 'Pinned';
    }
}
export class RecentList extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'recent';
        this.name = 'RecentList';
    }
    async argsMsgExtra(): Promise<void> {

    }
}

export class MapScores extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'map';
        this.name = 'MapScores';
    }
    async argsMsgExtra(): Promise<void> {
        const temp = this.setParamMap();
        this.params.mapid = temp.map;
        if (this.params.mapid != null) {
            this.input.args.splice(this.input.args.indexOf(this.input.args.find(arg => arg.includes('https://osu.ppy.sh/'))), 1);
        }
    }
    async argsInteractExtra(): Promise<void> {
        let interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getNumber('id');
    }
    async argsButtonsExtra(): Promise<void> {

    }

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
        this.setParamOverride('sort');
        this.setParamOverride('reverse');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride('commanduser');
        this.setParamOverride('user');
        this.setParamOverride('mode');
    }
}

export class SingleScoreCommand extends OsuCommand {
    protected type: 'recent' | 'default';
    constructor() {
        super();
        this.type = 'default';
        this.scores = [];
    }
    osudata: osuapi.types_v2.UserExtended;
    scores: osuapi.types_v2.Score[];
    score: osuapi.types_v2.Score;
    map: osuapi.types_v2.BeatmapExtended;
    mapset: osuapi.types_v2.Beatmapset;

    async renderEmbed() {
        const gamehits = this.score.statistics;
        let rspassinfo = '';
        let totalhits: number;

        switch (this.score.ruleset_id) {
            case osuapi.Ruleset.osu: default:
                totalhits = gamehits.great + (gamehits.ok ?? 0) + (gamehits.meh ?? 0) + (gamehits.miss ?? 0);
                break;
            case osuapi.Ruleset.taiko:
                totalhits = gamehits.great + (gamehits.good ?? 0) + (gamehits.miss ?? 0);
                break;
            case osuapi.Ruleset.fruits:
                totalhits = gamehits.great + (gamehits.ok ?? 0) + (gamehits.meh ?? 0) + gamehits.small_tick_hit + (gamehits.miss ?? 0);
                break;
            case osuapi.Ruleset.mania:
                totalhits = (gamehits.perfect ?? 0) + gamehits.great + gamehits.good + (gamehits.ok ?? 0) + (gamehits.meh ?? 0) + (gamehits.miss ?? 0);
        }
        let hitlist: string;

        const getHits = formatters.returnHits(gamehits, this.score.ruleset_id);
        const failed = other.scoreIsComplete(
            this.score.statistics,
            this.map.count_circles,
            this.map.count_sliders,
            this.map.count_spinners,
        );

        const [perfs, ppissue, fcflag] = await this.perf(failed);

        switch (this.params.detailed) {
            default: {
                hitlist = getHits.short;
            }
                break;
            case 2: {
                hitlist = getHits.long;
            }
                break;
        }

        const curbmhitobj = this.map.count_circles + this.map.count_sliders + this.map.count_spinners;
        let msToFail: number, curbmpasstime: number, guesspasspercentage: number;
        if (!this.score.passed) {
            msToFail = await other.getFailPoint(totalhits, `${helper.path.files}/maps/${this.map.id}.osu`);
            curbmpasstime = Math.floor(msToFail / 1000);
            guesspasspercentage = Math.abs((totalhits / curbmhitobj) * 100);
        }

        // let showFailGraph = false;
        // let FailGraph = '';

        let rsgrade = helper.emojis.grades[this.score.rank.toUpperCase()];
        if (!this.score.passed) {
            rspassinfo = `${guesspasspercentage.toFixed(2)}% completed (${calculate.secondsToTime(curbmpasstime)}/${calculate.secondsToTime(this.map.total_length)})`;
            rsgrade =
                helper.emojis.grades.F + `(${helper.emojis.grades[this.score.rank.toUpperCase()]} if pass)`;
        }

        const fulltitle = `${this.mapset.artist} - ${this.mapset.title} [${this.map.version}]`;
        const trycountstr = `try #${this.getTryCount(this.scores, this.map.id)}`;
        const mxcombo =
            perfs[0].difficulty.maxCombo;
        // map.max_combo;
        let modadjustments = '';
        if (this.score.mods.filter(x => x?.settings?.speed_change).length > 0) {
            modadjustments += ' (' + this.score.mods.filter(x => x?.settings?.speed_change)[0].settings.speed_change + 'x)';
        }

        let scorerank =

            (this?.score?.rank_global ? ` #${this.score.rank_global} global` : '') +
            (this?.score?.rank_country ? ` #${this.score.rank_country} ${this.osudata.country_code.toUpperCase()} :flag_${this.osudata.country_code.toLowerCase()}:` : '')
            ;
        if (scorerank != '') {
            scorerank = '| ' + scorerank;
        }

        const embed = this.setEmbed({
            trycountstr,
            rsgrade,
            rspassinfo,
            mxcombo,
            fcflag,
            ppissue,
            fulltitle,
            hitlist,
            scorerank,
            perfs,
            modadjustments
        });

        this.ctn.embeds = [embed];
        return embed;
    }

    async perf(failed: {
        passed: boolean;
        objectsHit: number;
        percentage: number;
    }): Promise<[rosu.PerformanceAttributes[], string, string]> {
        let ppissue: string = '';
        let fcflag = '';
        let perfs: rosu.PerformanceAttributes[];
        try {
            const overrides = calculate.modOverrides(this.score.mods);
            perfs = await performance.fullPerformance(
                this.score.beatmap.id,
                this.score.ruleset_id,
                this.score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
                this.score.accuracy,
                overrides.speed,
                this.score.statistics,
                this.score.max_combo,
                failed.objectsHit,
                new Date(this.score.beatmap.last_updated),
                overrides.cs,
                overrides.ar,
                overrides.od,
                overrides.hp,
            );
            data.debug(perfs, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'ppCalcing');

            const mxCombo = perfs[0].difficulty.maxCombo ?? this.map?.max_combo;

            if (this.score.accuracy < 1 && this.score.max_combo == mxCombo) {
                fcflag = `FC\n**${perfs[2].pp.toFixed(2)}**pp IF SS`;
            }
            if (this.score.max_combo != mxCombo) {
                fcflag =
                    `\n**${perfs[1].pp.toFixed(2)}**pp IF FC
                **${perfs[2].pp.toFixed(2)}**pp IF SS`;
            }
            if (this.score.max_combo == mxCombo && this.score.accuracy == 1) {
                fcflag = 'FC';
            }
        } catch (error) {
            ppissue = helper.errors.uErr.osu.performance.crash;
            log.commandErr(error, this.input.id, 'firsts', this.input.message, this.input.interaction);
        }
        return [perfs, ppissue, fcflag];
    }

    async getStrains(map: osuapi.types_v2.Beatmap, score: osuapi.types_v2.Score) {
        const strains = await performance.calcStrains({
            mapid: map.id,
            mode: score.ruleset_id,
            mods: score.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
            mapLastUpdated: new Date(map.last_updated)
        });
        try {
            data.debug(strains, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
        } catch (error) {
            data.debug({ error: error }, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
            log.stdout(error);
        }
        let strainsgraph =
            await other.graph(strains.strainTime, strains.value, 'Strains', {
                startzero: true,
                type: 'bar',
                fill: true,
                displayLegend: false,
                title: 'Strains',
                imgUrl: osuapi.other.beatmapImages(map.beatmapset_id).full,
                blurImg: true,
            });
        this.ctn.files = [strainsgraph.path];
        return strainsgraph.filename + '.jpg';
    }
    getTryCount(scores: osuapi.types_v2.Score[], mapid: number) {
        let trycount = 1;
        for (let i = scores.length - 1; i > (this.params.page); i--) {
            if (mapid == scores[i].beatmap.id) {
                trycount++;
            }
        }
        return trycount;
    }
    setEmbed({
        trycountstr,
        rsgrade,
        rspassinfo,
        mxcombo,
        fcflag,
        ppissue,
        fulltitle,
        hitlist,
        scorerank,
        perfs,
        modadjustments
    }: {
        trycountstr: string,
        rsgrade: string,
        rspassinfo: string,
        mxcombo: number,
        fcflag: string,
        ppissue: string,
        fulltitle: string,
        hitlist: string,
        scorerank: string,
        perfs: rosu.PerformanceAttributes[],
        modadjustments: string,
    }) {
        let embed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.score.dec)
            .setAuthor({
                name: `${trycountstr} | #${calculate.separateNum(this.osudata?.statistics?.global_rank)} | #${calculate.separateNum(this.osudata?.statistics?.country_rank)} ${this.osudata.country_code} | ${calculate.separateNum(this.osudata?.statistics?.pp)}pp`,
                url: `https://osu.ppy.sh/users/${this.osudata.id}`,
                iconURL: `${this.osudata?.avatar_url ?? helper.defaults.images.any.url}`
            })
            .setURL(this.score.id ? `https://osu.ppy.sh/scores/${this.score.id}` : `https://osu.ppy.sh/b/${this.map.id}`)
            .setThumbnail(`${this.mapset.covers.list}`)
            .addFields([
                {
                    name: 'SCORE DETAILS',
                    value: `${calculate.separateNum(other.getTotalScore(this.score))} ${scorerank}
${(this.score.accuracy * 100).toFixed(2)}% | ${rsgrade}
${this.score.has_replay ? `[REPLAY](https://osu.ppy.sh/scores/${this.score.id}/download)\n` : ''}` +
                        `${rspassinfo.length > 1 ? rspassinfo + '\n' : ''}\`${hitlist}\`
${this.score.max_combo == mxcombo ? `**${this.score.max_combo}x**` : `${this.score.max_combo}x`}/**${mxcombo}x** combo`,
                    inline: true
                },
                {
                    name: 'PP',
                    value: `**${this.score?.pp ?? perfs[0]?.pp ?? NaN}**pp ${fcflag}\n${ppissue}`,
                    inline: true
                }
            ]);
        switch (this.type) {
            case 'default':
                embed.setTitle(fulltitle)
                    .setDescription(`${this.score.mods.length > 0 ? '+' + osumodcalc.mod.order(this.score.mods.map(x => x.acronym.toUpperCase()) as osumodcalc.types.Mod[]).join('') + modadjustments + ' |' : ''} <t:${new Date(this.score.ended_at).getTime() / 1000}:R>
    ${(perfs[0].difficulty.stars ?? 0).toFixed(2)}⭐ | ${helper.emojis.gamemodes[this.score.ruleset_id]}
    `);
                formatters.userAuthor(this.osudata, embed, this.params.overrideAuthor);
                break;
            case 'recent':
                embed.setTitle(`#${this.params.page + 1} most recent ${this.params.showFails == 1 ? 'play' : 'pass'} for ${this.score.user.username} | <t:${new Date(this.score.ended_at).getTime() / 1000}:R>`)
                    .setDescription(`[\`${fulltitle}\`](https://osu.ppy.sh/b/${this.map.id}) ${this.score.mods.length > 0 ? '+' + osumodcalc.mod.order(this.score.mods.map(x => x.acronym.toUpperCase()) as osumodcalc.types.Mod[]).join('') + modadjustments : ''} 
    ${(perfs[0].difficulty.stars ?? 0).toFixed(2)}⭐ | ${helper.emojis.gamemodes[this.score.ruleset_id]}
    ${formatters.dateToDiscordFormat(new Date(this.score.ended_at), 'F')}
    `);

                break;
        }
        return embed;
    }
}

export class ScoreParse extends SingleScoreCommand {

    declare protected params: {
        mode: osuapi.types_v2.GameMode;
        scoreid: number;
        nochoke: boolean;
        overrideAuthor: string;
    };
    constructor() {
        super();
        this.name = 'ScoreParse';
        this.type = 'default';
        this.params = {
            mode: null,
            scoreid: null,
            nochoke: false,
            overrideAuthor: null,
        };
    }
    async setParamsMsg() {
        this.params.mode = this.input.args[1] as osuapi.types_v2.GameMode;
        this.params.scoreid = +this.input.args[0];
        if (this.input.message.content.includes('osu.ppy.sh/scores/')) {
            this.input.args = this.input.message.content.split(' ');
            const temp = this.setParamScore();
            this.params.mode = temp.mode;
            this.params.scoreid = +temp.score;
        }
    }
    async setParamsLink() {
        this.input.args = this.input.message.content.split(' ');
        const temp = this.setParamScore();
        this.params.mode = temp.mode;
        this.params.scoreid = +temp.score;
    }

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('scoreid', 'id', 'number');
        this.setParamOverride('mode');
        this.setParamOverride('commanduser');
        this.setParamOverride('overrideAuthor', 'ex', 'string');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        if (this.input.overrides?.type == 'nochoke') {
            this.params.nochoke = true;
        }
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        if (!this.params.scoreid) {
            const temp = data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
            if (temp?.apiData?.best_id && typeof temp?.apiData?.best_id === 'number') {
                this.params.scoreid = temp?.apiData?.best_id;
            } else {
                this.voidcontent();
                this.ctn.content = helper.errors.uErr.osu.score.ms;
                await this.send();
                return;
            }
        }

        this.sendLoading();

        if (data.findFile(this.params.scoreid, 'scoredata') &&
            !('error' in data.findFile(this.params.scoreid, 'scoredata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            this.score = data.findFile(this.params.scoreid, 'scoredata');
        } else {
            const hasMode = this.params.mode ? { mode: this.params.mode } : {};
            this.score = await osuapi.v2.scores.single({ id: this.params.scoreid, ...hasMode });
        }

        data.debug(this.score, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'scoreData');
        if (this.score?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.score.nd
                .replace('[SID]', this.params.scoreid.toString())
                .replace('[MODE]', this.params.mode), true);
            return;
        }
        data.storeFile(this.score, this.params.scoreid, 'scoredata', other.modeValidator(this.score.ruleset_id));

        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-any-${this.input.id}-${this.score?.beatmap?.id}${this.score.mods ? '+' + this.score.mods.map(x => x.acronym).join() : ''}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.map),
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.score.user_id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        this.ctn.components = [buttons];

        try {
            this.score.rank.toUpperCase();
        } catch (error) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.score.wrong + ` - osu.ppy.sh/scores/${this.params.mode}/${this.params.scoreid}`, true);
            return;
        }
        if (data.findFile(this.score.beatmap.id, 'mapdata') &&
            !('error' in data.findFile(this.score.beatmap.id, 'mapdata')) &&
            this.input.buttonType != 'Refresh') {
            this.map = data.findFile(this.score.beatmap.id, 'mapdata');
        } else {
            this.map = await osuapi.v2.beatmaps.map({ id: this.score?.beatmap?.id ?? this.score?.beatmap_id });
        }

        if (this.map?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.m.replace('[ID]', this.score.beatmap.id.toString()), true);
            return;
        }

        data.storeFile(this.map, this.score.beatmap.id, 'mapdata');

        this.mapset = this.map.beatmapset;

        try {
            const u = await this.getProfile(this.score.user_id + '', other.modeValidator(this.score.ruleset_id));
            this.osudata = u;
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

        this.send();
    }


}

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

        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);

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
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.scores.recent.replace('[ID]', this.params.user), true);
            return;
        }

        data.storeFile(this.scores, this.input.id, 'rsdata');

        if (this.params.filter) {
            this.scores = other.filterScoreQuery(this.scores, this.params.filter);
        }

        this.ctn.components = [pgbuttons, buttons];

        this.params.page = this.scores[this.params.page] ? this.params.page : 0;

        if (this.input.buttonType == 'BigRightArrow') {
            this.params.page = this.scores.length - 1;
        }

        this.score = this.scores[this.params.page];
        if (!this.score || this.score == undefined || this.score == null) {
            let err = `${helper.errors.uErr.osu.scores.recent_ms
                .replace('[ID]', this.params.user)
                .replace('[MODE]', helper.emojis.gamemodes[other.modeValidator(this.params.mode)])
                }`;
            if (this.params.filter) {
                err = `${helper.errors.uErr.osu.scores.recent_ms
                    .replace('[ID]', this.params.user)
                    .replace('[MODE]', helper.emojis.gamemodes[other.modeValidator(this.params.mode)])
                    } matching \`${this.params.filter}\``;
            }

            if (this.input.buttonType == null) {
                this.voidcontent();
                this.ctn.content = err;
                this.ctn.edit = true;
                await this.send();
            }
            return;
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
        if (tmod) {
            this.params.mapmods = tmod.mods;
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
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        const buttons = new Discord.ActionRowBuilder();
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);

        if (!this.params.mapid) {
            const temp = data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
            this.params.mapid = +temp?.id;
        }
        if (this.params.mapid == 0) {
            commandTools.missingPrevID_map(this.input, this.name);
            return;
        }
        this.sendLoading();

        let mapdata: osuapi.types_v2.BeatmapExtended;

        try {
            const m = await this.getMap(this.params.mapid);
            mapdata = m;
        } catch (e) {
            return;
        }

        const fulltitle = `${mapdata.beatmapset.artist} - ${mapdata.beatmapset.title} [${mapdata.version}]`;

        let mods: string;
        if (this.params.mapmods) {
            mods = osumodcalc.mod.order(this.params.mapmods).join('');
        }
        const lbEmbed = new Discord.EmbedBuilder();

        let lbdataf: osuapi.types_v2.BeatmapScores<osuapi.types_v2.Score>;
        if (data.findFile(this.input.id, 'lbdata') &&
            this.input.type == 'button' &&
            !('error' in data.findFile(this.input.id, 'lbdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            lbdataf = data.findFile(this.input.id, 'lbdata');
        } else {
            lbdataf = await osuapi.v2.beatmaps.scores({
                id: mapdata.id,
                ruleset: mapdata.mode,
                legacy_only: 0,
                mods: this.params.mapmods,
            });
        }

        data.debug(lbdataf, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'lbDataF');

        if (lbdataf?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.lb.replace('[ID]', this.params.mapid + ''), true);
            return;
        }
        data.storeFile(lbdataf, this.input.id, 'lbdata');

        const lbdata = lbdataf.scores;

        if (this.params.parseScore) {
            let pid = +(this.params.parseId) - 1;
            if (isNaN(pid) || pid < 0) {
                pid = 0;
            }
            if (pid > lbdata.length) {
                pid = lbdata.length - 1;
            }
            this.input.overrides = {
                id: lbdata?.[pid]?.id,
                commanduser: this.commanduser,
                commandAs: this.input.type,
            };
            if (this.input.overrides.id == null || typeof this.input.overrides.id == 'undefined') {
                await commandTools.errorAndAbort(this.input, this.name, true, `${helper.errors.uErr.osu.score.nf} at index ${pid}`, true);
                return;
            }
            this.input.type = 'other';

            const cmd = new ScoreParse();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        }

        lbEmbed
            .setColor(helper.colours.embedColour.scorelist.dec)
            .setTitle(`Score leaderboard of \`${fulltitle}\``)
            .setURL(`https://osu.ppy.sh/b/${this.params.mapid}`)
            .setThumbnail(osuapi.other.beatmapImages(mapdata.beatmapset_id).list2x);

        let scoretxt: string;
        if (lbdata.length < 1) {
            scoretxt = 'Error - no scores found ';
        }
        if (mapdata.status == 'graveyard' || mapdata.status == 'pending') {
            scoretxt = 'Error - map is unranked';
        }

        if (this.params.page >= Math.ceil(lbdata.length / 5)) {
            this.params.page = Math.ceil(lbdata.length / 5) - 1;
        }

        const scoresarg = await formatters.scoreList(lbdata, 'score', null, false, 1, this.params.page, true, 'map_leaderboard', mapdata);

        commandTools.storeButtonArgs(this.input.id + '', {
            mapId: this.params.mapid,
            page: scoresarg.curPage,
            maxPage: scoresarg.maxPage,
            sortScore: 'score',
            reverse: false,
            mode: mapdata.mode,
            parse: this.params.parseScore,
            parseId: this.params.parseId,
        });
        if (scoresarg.text.includes('ERROR')) {

            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[2].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);

        }
        lbEmbed.setDescription(scoresarg.text)
            .setFooter({ text: `${scoresarg.curPage}/${scoresarg.maxPage}` });

        if (scoresarg.curPage <= 1) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }
        if (scoresarg.curPage >= scoresarg.maxPage) {
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }

        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${mapdata.id}`,
                apiData: null,
                mods: this.params?.mapmods?.map(x => { return { acronym: x }; }) ?? []
            }
        );

        buttons.addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-any-${this.input.id}-${this.params.mapid}${this.params.mapmods && this.params.mapmods.length > 0 ? '+' + this.params.mapmods.join(',') : ''}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.extras.map)
        );

        this.ctn.embeds = [lbEmbed];
        this.ctn.components = [pgbuttons, buttons];
        this.ctn.edit = true;
        this.send();
    }
}

export class ReplayParse extends SingleScoreCommand {
    constructor() {
        super();
        this.name = 'ReplayParse';
    }

    async execute() {
        this.logInput(true);
        // do stuff

        const decoder = new osuparsers.ScoreDecoder();
        const score = await decoder.decodeFromPath(`${helper.path.files}/replays/${this.input.id}.osr`);
        data.debug(score, 'fileparse', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'replayData');
        this.setScore(score);
        try {
            this.map = await this.getMap(score?.info?.beatmapHashMD5);
        } catch (e) {
            return;
        }

        if (this.map?.id) {
            typeof this.map.id == 'number' ? data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
                {
                    id: `${this.map.id}`,
                    apiData: null,
                    mods: osumodcalc.mod.intToAcronym(score.info?.mods?.bitwise ?? 0).map(x => { return { acronym: x }; })
                }
            ) : '';
        }
        this.mapset = this.map.beatmapset;

        try {
            this.osudata = await this.getProfile(score.info.username, osumodcalc.mode.toName(score.info.rulesetId));
        } catch (e) {
            return;
        }
        let userid: string | number;
        try {
            userid = this.osudata.id;
        } catch (err) {
            userid = 0;
            return;
        }


        const chartInit = await other.graph(score.replay.lifeBar.map(x => calculate.secondsToTime(x.startTime / 1000)), score.replay.lifeBar.map(x => Math.floor(x.health * 100)), 'Health', {
            fill: false,
            startzero: true,
            pointSize: 0,
            gradient: true
        });

        const chartFile = new Discord.AttachmentBuilder(chartInit.path);

        const e = await this.renderEmbed();
        e.setImage(`attachment://${chartInit.filename}.jpg`);
        this.ctn.files = [chartFile];
        this.send();
    }
    /**
     * mapid should be beatmapHash
     */
    async getMap(hash: string) {
        let mapdata: osuapi.types_v2.BeatmapExtended;
        if (data.findFile(hash, 'mapdata') &&
            !('error' in data.findFile(hash, 'mapdata')) &&
            this.input.buttonType != 'Refresh') {
            mapdata = data.findFile(hash, 'mapdata');
        } else {
            mapdata = await osuapi.v2.beatmaps.mapLookup({ checksum: hash });
        }
        if (mapdata?.hasOwnProperty('error')) {
            const err = helper.errors.uErr.osu.map.m.replace('[ID]', hash + '');
            await commandTools.errorAndAbort(this.input, this.name, true, err, true);
            throw new Error(err);
        }
        data.debug(mapdata, 'fileparse', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'mapData');
        data.storeFile(mapdata, mapdata.id, 'mapdata');
        data.storeFile(mapdata, hash, 'mapdata');
        return mapdata;
    }
    setScore(score: osuclasses.Score) {
        const tmods =
            typeof score.info.rawMods == 'string' ? osumodcalc.mod.order(osumodcalc.mod.fromString(score.info.rawMods)) :
                osumodcalc.mod.order(osumodcalc.mod.intToAcronym(score.info.rawMods));
        this.score = {
            accuracy: score.info.accuracy,
            classic_total_score: score.info.totalScore,
            ended_at: score.info.date.toISOString() as any,
            has_replay: false,
            id: score.info.id,
            is_perfect_combo: score.info.perfect,
            legacy_perfect: score.info.perfect,
            legacy_score_id: score.info.id,
            legacy_total_score: score.info.totalScore,
            max_combo: score.info.maxCombo,
            maximum_statistics: {
                perfect: score.info.countGeki, // geki/300+
                great: score.info.count300, // 300
                good: score.info.countKatu, // katu/200
                ok: score.info.count100, // 100
                meh: score.info.count50, // 50
                miss: score.info.countMiss, // miss
                small_tick_miss: 0, // katu
                small_tick_hit: 0, // count 50
                legacy_combo_increase: 0, // max stats
            },
            mods: tmods?.map(x => { return { acronym: x }; }) ?? [],
            passed: score.info.passed,
            playlist_item_id: 0,
            preserve: false,
            processed: false,
            rank: score.info.rank,
            ruleset_id: score.info.rulesetId,
            started_at: score.info.date.toISOString() as any,
            statistics: {
                perfect: score.info.countGeki, // geki/300+
                great: score.info.count300, // 300
                good: score.info.countKatu, // katu/200
                ok: score.info.count100, // 100
                meh: score.info.count50, // 50
                miss: score.info.countMiss, // miss
                small_tick_miss: 0, // katu
                small_tick_hit: 0, // count 50
                legacy_combo_increase: 0, // max stats
            },
            total_score: score.info.totalScore,
            type: 'recent',
            user_id: score.info.userId ?? 2,
        };
    }
}

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

        this.sendLoading();

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

        this.send();
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
        if (fd?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(input, this.name, true, helper.errors.uErr.osu.scores.best.replace('[ID]', args.user).replace('top', args.scoreTypes == 'best' ? 'top' : args.scoreTypes), true);
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

export class Simulate extends OsuCommand {
    declare protected params: {
        mapid: number;
        mods: string;
        acc: number;
        combo: number;
        n300: number;
        n100: number;
        n50: number;
        nMiss: number;
        overrideSpeed: number;
        overrideBpm: number;
        customCS: number;
        customAR: number;
        customOD: number;
        customHP: number;
    };
    constructor() {
        super();
        this.name = 'Simulate';
        this.params = {
            mapid: null,
            mods: null,
            acc: null,
            combo: null,
            n300: null,
            n100: null,
            n50: null,
            nMiss: null,
            overrideSpeed: 1,
            overrideBpm: null,
            customCS: null,
            customAR: null,
            customOD: null,
            customHP: null,
        };
    }
    async setParamsMsg() {
        this.params.acc = this.setParam(this.params.acc, ['acc', 'accuracy', '%',], 'number', {});
        this.params.combo = this.setParam(this.params.combo, ['x', 'combo', 'maxcombo',], 'number', { number_isInt: true });
        this.params.n300 = this.setParam(this.params.n300, ['n300', '300s', 'great'], 'number', { number_isInt: true });
        this.params.n100 = this.setParam(this.params.n100, ['n100', '100s', 'ok'], 'number', { number_isInt: true });
        this.params.n50 = this.setParam(this.params.n50, ['n50', '50s', 'meh'], 'number', { number_isInt: true });
        this.params.nMiss = this.setParam(this.params.nMiss, ['miss', 'misses', 'n0', '0s',], 'number', { number_isInt: true });

        this.params.overrideBpm = this.setParam(this.params.overrideBpm, ['-bpm'], 'number', {});
        this.params.overrideSpeed = this.setParam(this.params.overrideSpeed, ['-speed'], 'number', {});
        this.params.customCS = this.setParam(this.params.customCS, ['-cs'], 'number', {});
        this.params.customAR = this.setParam(this.params.customAR, ['-ar'], 'number', {});
        this.params.customOD = this.setParam(this.params.customOD, ['-od', '-accuracy'], 'number', {});
        this.params.customHP = this.setParam(this.params.customHP, ['-hp', '-drain', 'health'], 'number', {});

        this.params.mods = this.setParam(this.params.mods, ['-mods'], 'string', {});

        const tmod = this.setParamMods();
        if (tmod) {
            this.params.mods = tmod.mods.join('');
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
        this.params.mapid = interaction.options.getInteger('id');
        this.params.mods = interaction.options.getString('mods');
        this.params.acc = interaction.options.getNumber('accuracy');
        this.params.combo = interaction.options.getInteger('combo');
        this.params.n300 = interaction.options.getInteger('n300');
        this.params.n100 = interaction.options.getInteger('n100');
        this.params.n50 = interaction.options.getInteger('n50');
        this.params.nMiss = interaction.options.getInteger('miss');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        if (!this.params.mapid) {
            try {
                const temp = this.getLatestMap().mapid;
                if (temp == false) {
                    commandTools.missingPrevID_map(this.input, this.name);
                    return;
                }
                this.params.mapid = +temp;
            } catch (e) {
                return;
            }
        }

        this.sendLoading();

        this.fixParams();

        try {
            this.map = await this.getMap(this.params.mapid);
        } catch (e) {
            return;
        }
        if (!this.params.mods) {
            this.params.mods = 'NM';
        }
        if (!this.params.combo) {
            this.params.combo = this.map?.max_combo ?? undefined;
        }

        this.fixSpeedParams();

        const scorestat: osuapi.types_v2.ScoreStatistics = {
            great: this.params.n300,
            ok: this.params.n100,
            meh: this.params.n50,
            miss: this.params.nMiss ?? 0,
        };

        let use300s = (this.params.n300 ?? 0);
        const gotTot = use300s + (this.params.n100 ?? 0) + (this.params.n50 ?? 0) + (this.params.nMiss ?? 0);
        if (gotTot != this.map.count_circles + this.map.count_sliders + this.map.count_spinners) {
            use300s += (this.map.count_circles + this.map.count_sliders + this.map.count_spinners) - use300s;
        }
        const useAcc = this.params.acc ?? osumodcalc.accuracy.standard(
            use300s,
            this.params.n100 ?? 0,
            this.params.n50 ?? 0,
            this.params.nMiss ?? 0
        ).accuracy;

        const perfs = await performance.fullPerformance(
            this.params.mapid,
            0,
            osumodcalc.mod.fromString(this.params.mods),
            useAcc / 100,
            this.params.overrideSpeed,
            scorestat,
            this.params.combo,
            null,
            new Date(this.map.last_updated),
            this.params.customCS,
            this.params.customAR,
            this.params.customOD,
            this.params.customHP,
        );
        data.debug(perfs, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'ppCalc');

        const mapPerf = await performance.calcMap({
            mods: osumodcalc.mod.fromString(this.params.mods),
            mode: 0,
            mapid: this.params.mapid,
            clockRate: this.params.overrideSpeed,
            mapLastUpdated: new Date(this.map.last_updated)
        });
        this.ctn.embeds = [this.setEmbed(
            perfs, mapPerf,
            `${this.map.beatmapset.artist} - ${this.map.beatmapset.title} [${this.map.version}]`,
            useAcc
        )];

        this.send();
    }
    map: osuapi.types_v2.BeatmapExtended;
    fixParams() {
        const tempscore = data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
        if (tempscore?.apiData && tempscore?.apiData.beatmap.id == this.params.mapid) {
            if (!this.params.n300 && !this.params.n100 && !this.params.n50 && !this.params.acc) {
                this.params.n300 = tempscore.apiData.statistics.great;
                this.params.n100 = tempscore.apiData.statistics.ok;
                this.params.n50 = tempscore.apiData.statistics.meh;
                this.params.acc = tempscore.apiData.accuracy * 100;
            }
            if (!this.params.nMiss) {
                this.params.nMiss = tempscore.apiData.statistics.miss;
            }
            if (!this.params.combo) {
                this.params.combo = tempscore.apiData.max_combo;
            }
            if (!this.params.mods) {
                this.params.mods = tempscore.apiData.mods.map(x => x.acronym).join('');
            }
        }
        return tempscore;
    }
    fixSpeedParams() {
        if (this.params.overrideBpm && !this.params.overrideSpeed) {
            this.params.overrideSpeed = this.params.overrideBpm / this.map.bpm;
        }
        if (this.params.overrideSpeed && !this.params.overrideBpm) {
            this.params.overrideBpm = this.params.overrideSpeed * this.map.bpm;
        }

        if (this.params.mods.includes('DT') || this.params.mods.includes('NC')) {
            this.params.overrideSpeed *= 1.5;
            this.params.overrideBpm *= 1.5;
        }
        if (this.params.mods.includes('HT')) {
            this.params.overrideSpeed *= 0.75;
            this.params.overrideBpm *= 1.5;
        }
    }

    setEmbed(perfs: rosu.PerformanceAttributes[], mapPerf: rosu.PerformanceAttributes[], title: string, useAcc: number) {
        const scoreEmbed = new Discord.EmbedBuilder()
            .setTitle(`Simulated play on \n\`${title}\``)
            .setURL(`https://osu.ppy.sh/b/${this.params.mapid}`)
            .setThumbnail(this.map?.beatmapset_id ? osuapi.other.beatmapImages(this.map.beatmapset_id).thumbnailLarge : `https://osu.ppy.sh/images/layout/avatar-guest@2x.png`)
            .addFields([
                {
                    name: 'Score Details',
                    value:
                        `${(useAcc)?.toFixed(2)}% | ${this.params.nMiss ?? 0}x misses
    ${this.params.combo ?? this.map.max_combo}x/**${this.map.max_combo}**x
    ${this.params.mods ?? 'No mods'}
    \`${this.params.n300}/${this.params.n100}/${this.params.n50}/${this.params.nMiss}\`
    Speed: ${this.params.overrideSpeed ?? 1}x @ ${this.params.overrideBpm ?? this.map.bpm}BPM
    `,
                    inline: false
                },
                {
                    name: 'Performance',
                    value:
                        `
    ${perfs[0].pp?.toFixed(2)}pp | ${perfs[1].pp?.toFixed(2)}pp if ${(useAcc)?.toFixed(2)}% FC
    SS: ${mapPerf[0].pp?.toFixed(2)}
    99: ${mapPerf[1].pp?.toFixed(2)}
    98: ${mapPerf[2].pp?.toFixed(2)}
    97: ${mapPerf[3].pp?.toFixed(2)}
    96: ${mapPerf[4].pp?.toFixed(2)}
    95: ${mapPerf[5].pp?.toFixed(2)} 
    `
                },
                {
                    name: 'Map Details',
                    value:
                        `
    CS${this.map.cs.toString().padEnd(5, ' ')}
    AR${this.map.ar.toString().padEnd(5, ' ')}
    OD${this.map.accuracy.toString().padEnd(5, ' ')}
    HP${this.map.drain.toString().padEnd(5, ' ')}
    ${helper.emojis.mapobjs.total_length}${calculate.secondsToTime(this.map.total_length)}
                    `,
                    inline: true
                },
                {
                    name: helper.defaults.invisbleChar,
                    value:
                        `
    ${helper.emojis.mapobjs.circle}${this.map.count_circles}
    ${helper.emojis.mapobjs.slider}${this.map.count_sliders}
    ${helper.emojis.mapobjs.spinner}${this.map.count_spinners}
    ${helper.emojis.mapobjs.bpm}${this.map.bpm}
    ${helper.emojis.mapobjs.star}${(perfs[0]?.difficulty?.stars ?? this.map.difficulty_rating)?.toFixed(2)}
                    `,
                    inline: true
                },
            ]);
        return scoreEmbed;
    }
}