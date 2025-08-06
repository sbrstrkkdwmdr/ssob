import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';
import { ScoreParse } from './ScoreParse';

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

    pgbuttons: Discord.ActionRowBuilder<Discord.ButtonBuilder>;
    buttons: Discord.ActionRowBuilder<Discord.ButtonBuilder>;

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

        if (helper.errors.isErrorObject(req)) {
            await this.commitError(this?.type);
        }

        const tempscores: osuapi.types_v2.Score[] =
            this.type == 'map' ?
                (req as osuapi.types_v2.ScoreArrA).scores :
                req as osuapi.types_v2.Score[];

        data.debug(req, 'command', this.type, this.input.message?.guildId ?? this.input.interaction?.guildId, this.type + 'data');
        data.storeFile(req, getid, fname);

        if (helper.errors.isErrorObject(tempscores) || tempscores.length == 0 || !(tempscores[0]?.user?.username || tempscores[0]?.user_id)) {
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
        const errList = helper.errors.scores;
        switch (type) {
            case 'osutop': case 'nochokes':
                await this.sendError(errList.best(this.params.user));
                break;
            case 'recent':
                await this.sendError(errList.recent(this.params.user));
                break;
            case 'map':
                await this.sendError(errList.map(this.params.user, this.params.mapid));
                break;
            case 'firsts':
                await this.sendError(errList.first(this.params.user));
                break;
            case 'pinned':
                break;
        }
        await this.sendError(helper.errors.genError);
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
        const obj = new formatters.ScoreFormatter({
            scores: this.scores,
            sort: this.params.sort,
            filter: {
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
            },
            reverse: this.params.reverse,
            page: this.params.page,
            showOriginalIndex: true,
            preset: this.type == 'map' ? 'single_map' : undefined,
            overrideMap: this.map ?? undefined,
        });
        const scoresFormat = await obj.execute();
        if (this.type == 'nochokes') {
            this.userPerf(scoresEmbed, scoresFormat.used);
        }
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
        if (scoresFormat.text.includes('ERROR')) {
            scoresEmbed.setDescription('**ERROR**\nNo scores found');
        }
        this.pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(this.pgbuttons,
            scoresFormat.text.includes('ERROR'),
            scoresFormat.curPage <= 1,
            scoresFormat.curPage >= scoresFormat.maxPage
        );

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


        this.buttons = new Discord.ActionRowBuilder();

        await this.sendLoading();

        if (this.params.page < 2 || typeof this.params.page != 'number' || isNaN(this.params.page)) {
            this.params.page = 1;
        }

        try {
            const u = await this.getProfile(this.params.user, this.params.mode);
            this.osudata = u;
        } catch (e) {
            await this.sendError(helper.errors.profile.user(this.params.user));
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
            await this.sendError(helper.errors.scores.generic(this.params.user));
        }

        if (this.params.parseScore) {
            const user = this.osudata.username;
            let tempEx = '';
            switch (this.type) {
                case 'osutop':
                    tempEx = `${user}'s #{idOrd} ${this.params.sort == 'pp' ? formatters.sortDescription(this.params.sort ?? 'pp', this.params.reverse) + ' ' : ''}top score`;
                    break;
                case 'nochokes':
                    tempEx = `${user}'s #{idOrd} ${this.params.sort == 'pp' ? formatters.sortDescription(this.params.sort ?? 'pp', this.params.reverse) + ' ' : ''}no choke score`;
                    this.input.overrides.type = 'nochoke';
                    break;
                case 'firsts':
                    tempEx = `${user}'s {idOrd} ${this.params.sort == 'recent' ? formatters.sortDescription(this.params.sort ?? 'recent', this.params.reverse) + ' ' : ''}#1 score`;
                    break;
                case 'pinned':
                    tempEx = `${user}'s {idOrd} ${this.params.sort == 'recent' ? formatters.sortDescription(this.params.sort ?? 'recent', this.params.reverse) + ' ' : ''}pinned score`;
                    break;
            }
            await this.parseId(this.scores.map(x => x.id), +this.params.parseId, new ScoreParse(), helper.errors.score.nf + ` at index {id}`, tempEx);
            return;
        }

        await this.list(this?.map);
        this.ctn.edit = true;

        await this.send();
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
    userPerf(embed: Discord.EmbedBuilder, scores: osuapi.types_v2.Score[]) {
        const pp = calculate.totalWeightedPerformance(scores.map(x => x.pp));
        // return;
        const json = embed.toJSON();
        const temp = json.author!.name.split('|');
        temp.pop();
        temp.push(` est. ${pp.toFixed(2)}pp (excl. bonus)`);
        embed.setAuthor({
            url: json.author.url,
            iconURL: json.author.icon_url,
            name: temp.join('|')
        });
    }
}