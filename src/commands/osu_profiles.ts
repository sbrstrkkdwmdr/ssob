import Discord from 'discord.js';
import { bws } from 'osumodcalculator/dist/extra';
import * as helper from '../helper';
import * as calculate from '../tools/calculate';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as osuapi from '../tools/osuapi';
import * as other from '../tools/other';
import { OsuCommand } from './command';

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
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;

        

        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
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

        {
            const t = await this.validUser(this.params.user, this.params.searchid, 'osu');
            this.params.user = t.user;
        }

        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

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
        this.send();
    }
}

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
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
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

        {
            const t = await this.validUser(this.params.user, this.params.searchid, 'osu');
            this.params.user = t.user;
        }

        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

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
        this.send();
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

export class Ranking extends OsuCommand {
    declare protected params: {
        country: string;
        mode: osuapi.types_v2.GameMode;
        type: osuapi.types_v2.RankingType;
        page: number;
        spotlight: number;
        parse: boolean;
        parseId: string;
    };
    constructor() {
        super();
        this.name = 'Ranking';
        this.params = {
            country: 'ALL',
            mode: 'osu',
            type: 'performance',
            page: 0,
            spotlight: null,
            parse: false,
            parseId: null,
        };

    }
    async setParamsMsg() {
        this.setParamPage();
        {
            this.setParamMode();

        }
        {
            this.params.parseId = this.setParam(this.params.parseId, ['-parse'], 'number', { number_isInt: true });
            this.params.parse = Boolean(this.params.parseId);
        }


        

        this.input.args[0] && this.input.args[0].length == 2 ? this.params.country = this.input.args[0].toUpperCase() : this.params.country = 'ALL';
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.country = interaction.options.getString('country') ?? 'ALL';
        this.params.mode = (interaction.options.getString('mode') ?? 'osu') as osuapi.types_v2.GameMode;
        this.params.type = (interaction.options.getString('type') ?? 'performance') as osuapi.types_v2.RankingType;
        this.params.page = interaction.options.getInteger('page') ?? 0;
        this.params.spotlight = interaction.options.getInteger('spotlight') ?? undefined;
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
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
        this.params.country = temp.country;
        this.params.mode = temp.mode;
        this.params.type = temp.rankingtype;
        if (this.params.type == 'charts') {
            this.params.spotlight = +temp.spotlight;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        if (this.input.overrides.page) {
            this.params.page = this.input.overrides.page;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff
        this.params.mode = other.modeValidator(this.params.mode);
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);

        if (this.params.page < 2 || typeof this.params.page != 'number' || isNaN(this.params.page)) {
            this.params.page = 1;
        }
        this.params.page--;

        const extras = {};
        if (this.params.country != 'ALL') {
            // validate country
            if (!other.validCountryCodeA2(this.params.country)) {
                this.voidcontent();
                this.ctn.content = `Invalid country code. Must be a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes) code.`;
                this.ctn.edit = true;
                await this.send();
                return;
            }
            if (this.params.type == 'performance') {
                extras['country'] = this.params.country;
            }
        }
        if (this.params.type == 'charts' && !isNaN(+this.params.spotlight)) {
            extras['spotlight'] = this.params.spotlight;
        }

        let rankingdata: osuapi.types_v2.Rankings;
        if (data.findFile(this.input.id, 'rankingdata') &&
            this.input.type == 'button' &&
            !('error' in data.findFile(this.input.id, 'rankingdata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            rankingdata = data.findFile(this.input.id, 'rankingdata');
        } else {
            rankingdata = await osuapi.v2.rankings.ranking({
                mode: this.params.mode,
                type: this.params.type,
                ...extras
            });
        }

        data.storeFile(rankingdata, this.input.id, 'rankingdata');

        if (rankingdata?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.rankings, true);
            return;
        }


        try {
            data.debug(rankingdata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'rankingData');
        } catch (e) {
            return;
        }
        if (!(rankingdata?.ranking?.length > 0)) {
            this.voidcontent();
            this.ctn.content = `No data found`;
            this.ctn.edit = true;
            await this.send();
            return;
        }

        let ifchart = '';
        if (this.params.type == 'charts') {
            ifchart = `[${rankingdata.spotlight.name}](https://osu.ppy.sh/rankings/${this.params.mode}/charts?spotlight=${rankingdata.spotlight.id})`;
        }

        if (this.input.buttonType == null) {
            data.userStatsCache(rankingdata.ranking, other.modeValidator(this.params.mode), 'Stat');
        }

        if (this.params.parse) {
            let pid = parseInt(this.params.parseId) - 1;
            if (pid < 0) {
                pid = 0;
            }
            if (pid > rankingdata.ranking.length) {
                pid = rankingdata.ranking.length - 1;
            }

            this.input.overrides = {
                mode: this.params.mode,
                id: rankingdata?.ranking[pid]?.user.id,
                commanduser: this.commanduser,
                commandAs: this.input.type
            };
            if (this.input.overrides.id == null || typeof this.input.overrides.id == 'undefined') {
                await commandTools.errorAndAbort(this.input, 'osu', true, `${helper.errors.uErr.osu.score.nf} at index ${pid}`, true);
                return;
            }
            this.input.type = 'other';
            const cmd = new Profile();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        }

        const embed = new Discord.EmbedBuilder()
            .setFooter({
                text: `${this.params.page + 1}/${Math.ceil(rankingdata.ranking.length / 5)}`
            }).setTitle(this.params.country != 'ALL' ?
                `${this.params.mode == 'osu' ? 'osu!' : formatters.toCapital(this.params.mode)} ${formatters.toCapital(this.params.type)} Rankings for ${this.params.country}` :
                `Global ${this.params.mode == 'osu' ? 'osu!' : formatters.toCapital(this.params.mode)} ${formatters.toCapital(this.params.type)} Ranking`)
            .setColor(helper.colours.embedColour.userlist.dec)
            .setDescription(`${ifchart}\n`);
        this.params.country != 'ALL' ?
            embed.setThumbnail(`https://osuhelper.argflags.omkserver.nl${this.params.country}`)
            : '';

        this.formatUL(embed, rankingdata);

        if (this.params.page > Math.ceil(rankingdata.ranking.length / 5)) {
            this.params.page = Math.ceil(rankingdata.ranking.length / 5);
        }
        commandTools.storeButtonArgs(this.input.id, {
            page: this.params.page + 1,
            maxPage: Math.ceil(rankingdata.ranking.length / 5),
            country: this.params.country,
            mode: this.params.mode,
            rankingtype: this.params.type,
            spotlight: this.params.spotlight
        });

        if (this.params.page + 1 >= Math.ceil(rankingdata.ranking.length / 5)) {
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }
        if (this.params.page == 0) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }

        this.ctn.embeds = [embed];
        this.ctn.components = [pgbuttons];
        this.send();
    }

    formatUL(embed: Discord.EmbedBuilder, rankingdata: osuapi.types_v2.Rankings) {
        for (let i = 0; i < 5 && i + (this.params.page * 5) < rankingdata.ranking.length; i++) {
            const curuser = rankingdata.ranking[i + (this.params.page * 5)];
            if (!curuser) break;
            let num = i + 1 + (this.params.page * 5);
            let parseGlobalRank =
                num == curuser?.global_rank ?
                    '' :
                    curuser.global_rank == null ?
                        '' :
                        '(#' + calculate.separateNum(curuser.global_rank) + ' Global)';
            embed.addFields(
                [
                    {
                        name: `#${num} ${parseGlobalRank}`,
                        value:
                            `:flag_${curuser.user.country_code.toLowerCase()}: [${curuser.user.username}](https://osu.ppy.sh/users/${curuser.user.id}/${this.params.mode})
    Score: ${curuser.total_score == null ? '---' : calculate.numberShorthand(curuser.total_score)} (${curuser.ranked_score == null ? '---' : calculate.numberShorthand(curuser.ranked_score)} ranked)
    ${curuser.hit_accuracy == null ? '---' : curuser.hit_accuracy.toFixed(2)}% | ${curuser.pp == null ? '---' : calculate.separateNum(curuser.pp)}pp | ${curuser.play_count == null ? '---' : calculate.separateNum(curuser.play_count)} plays
    `
                        ,
                        inline: false
                    }
                ]
            );
        }
    }
}

export class Profile extends OsuCommand {
    declare protected params: {
        user: string;
        mode: osuapi.types_v2.GameMode;
        graphonly: boolean;
        detailed: number;
        searchid: string;
    };
    constructor() {
        super();
        this.name = 'Profile';
        this.params = {
            user: null,
            mode: null,
            graphonly: false,
            detailed: 1,
            searchid: null,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;

        this.params.detailed = this.setParam(this.params.detailed, helper.argflags.details, 'bool', { bool_setValue: 2 });
        this.params.graphonly = this.setParam(this.params.detailed, helper.argflags.details, 'bool', {});
        this.setParamMode();

        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (usertemp?.mode && !this.params.mode) {
            this.params.mode = usertemp?.mode;
        }
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = (interaction?.member?.user ?? interaction.user).id;

        this.params.user = interaction.options.getString('user');
        this.params.detailed = interaction.options.getBoolean('detailed') ? 2 : 1;
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode;
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.searchid = this.commanduser.id;

        this.params.user = this.input.message.embeds[0].url.split('users/')[1].split('/')[0];
        this.params.mode = this.input.message.embeds[0].url.split('users/')[1].split('/')[1] as osuapi.types_v2.GameMode;

        switch (this.input.buttonType) {
            case 'Detail1':
                this.params.detailed = 1;
                break;
            case 'Detail2':
                this.params.detailed = 2;
                break;
            case 'Graph':
                this.params.graphonly = true;
                break;
        }

        if (this.input.buttonType == 'Detail2') {
            this.params.detailed = 2;
        }
        if (this.input.buttonType == 'Detail1') {
            this.params.detailed = 1;
        }
        if (this.input.buttonType == 'Refresh') {
            if (this.input.message.embeds[0].fields[0]) {
                this.params.detailed = 2;
            } else {
                this.params.detailed = 1;
            }
        }

        if (!this.input.message.embeds[0].title) {
            this.params.graphonly = true;
        }
    }
    async setParamsLink() {
        this.input.args = this.input.message.content.split(' ');
        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (usertemp?.mode && !this.params.mode) {
            this.params.mode = usertemp?.mode;
        }
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        if (this.input.overrides.mode) {
            this.params.mode = this.input.overrides.mode;
        }
        if (this.input.overrides.id) {
            this.params.user = this.input.overrides.id + '';
        }
        if (this.input.overrides.commandAs) {
            this.input.type = this.input.overrides.commandAs;
        }
        if (this.input.overrides.commanduser) {
            this.commanduser = this.input.overrides.commanduser;
            // this.ctn.content = `Requested by <@${this.commanduser.id}>`;
        }
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        const buttons = new Discord.ActionRowBuilder();
        if (this.params.graphonly != true) {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Graph-${this.name}-${this.commanduser.id}-${this.input.id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.graph),
            );
            switch (this.params.detailed) {
                case 1: {
                    buttons.addComponents(
                        new Discord.ButtonBuilder()
                            .setCustomId(`${helper.versions.releaseDate}-Detail2-${this.name}-${this.commanduser.id}-${this.input.id}`)
                            .setStyle(helper.buttons.type.current)
                            .setEmoji(helper.buttons.label.main.detailMore),
                    );
                }
                    break;
                case 2: {
                    buttons.addComponents(
                        new Discord.ButtonBuilder()
                            .setCustomId(`${helper.versions.releaseDate}-Detail1-${this.name}-${this.commanduser.id}-${this.input.id}`)
                            .setStyle(helper.buttons.type.current)
                            .setEmoji(helper.buttons.label.main.detailLess),
                    );
                }
                    break;
            }
        } else {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Detail1-${this.name}-${this.commanduser.id}-${this.input.id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );
        }

        {
            const t = await this.validUser(this.params.user, this.params.searchid, this.params.mode);
            this.params.user = t.user;
            this.params.mode = t.mode;
        }

        this.params.mode = this.params.mode ? other.modeValidator(this.params.mode) : null;
        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

        let osudata: osuapi.types_v2.UserExtended;

        try {
            const t = await this.getProfile(this.params.user, this.params.mode);
            osudata = t;
        } catch (e) {
            return;
        }
        //check for player's default mode if mode is null
        if ((

            (this.input.type == 'interaction' && !(this.input.interaction as Discord.ChatInputCommandInteraction)?.options?.getString('mode'))
            || this.input.type == 'message' || this.input.type == 'link'
        ) &&
            osudata.playmode != 'osu' &&
            typeof this.params.mode != 'undefined') {
            try {
                const t = await this.getProfile(this.params.user, this.params.mode);
                osudata = t;
            } catch (e) {
                return;
            }
        } else {
            this.params.mode = this.params.mode ?? 'osu';
        }

        if (this.input.type != 'button' || this.input.buttonType == 'Refresh') {
            try {
                data.updateUserStats(osudata, osudata.playmode,);
                data.userStatsCache([osudata], other.modeValidator(this.params.mode), 'User');
            } catch (error) {
            }
        }

        const osustats = osudata.statistics;
        const grades = osustats.grade_counts;

        const playerrank =
            osudata.statistics?.global_rank ?
                calculate.separateNum(osudata.statistics.global_rank) :
                '---';

        const countryrank =
            osudata.statistics?.country_rank ?
                calculate.separateNum(osudata.statistics.country_rank) :
                '---';

        const rankglobal = ` #${playerrank} (#${countryrank} ${osudata.country_code} :flag_${osudata.country_code.toLowerCase()}:)`;

        const peakRank = osudata?.rank_highest?.rank ?
            `\n**Peak Rank**: #${calculate.separateNum(osudata.rank_highest.rank)} (<t:${new Date(osudata.rank_highest.updated_at).getTime() / 1000}:R>)` :
            '';
        const onlinestatus = osudata.is_online ?
            `**${helper.emojis.onlinestatus.online} Online**` :
            (new Date(osudata.last_visit)).getTime() != 0 ?
                `**${helper.emojis.onlinestatus.offline} Offline** | Last online <t:${(new Date(osudata.last_visit)).getTime() / 1000}:R>`
                : `**${helper.emojis.onlinestatus.offline} Offline**`;

        const prevnames = osudata.previous_usernames.length > 0 ?
            '**Previous Usernames:** ' + osudata.previous_usernames.join(', ') :
            '';

        const playcount = osustats.play_count == null ?
            '---' :
            calculate.separateNum(osustats.play_count);

        const lvl = osustats.level.current != null ?
            osustats.level.progress != null && osustats.level.progress > 0 ?
                `${osustats.level.current}.${Math.floor(osustats.level.progress)}` :
                `${osustats.level.current}` :
            '---';

        let supporter = '';
        switch (osudata.support_level) {
            case 0:
                break;
            case 1: default:
                supporter = helper.emojis.supporter.first;
                break;
            case 2:
                supporter = helper.emojis.supporter.second;
                break;
            case 3:
                supporter = helper.emojis.supporter.third;
                break;
        }

        const gradeCounts =
            `${helper.emojis.grades.XH}${grades.ssh} ${helper.emojis.grades.X}${grades.ss} ${helper.emojis.grades.SH}${grades.sh} ${helper.emojis.grades.S}${grades.s} ${helper.emojis.grades.A}${grades.a}`;
        // `XH${grades.ssh} X}{grades.ss} SH${grades.sh} S}{grades.s} A}{grades.a}`;

        const osuEmbed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.user.dec)
            .setTitle(`${osudata.username}'s ${this.params.mode ?? 'osu!'} profile`)
            .setURL(`https://osu.ppy.sh/users/${osudata.id}/${this.params.mode ?? ''}`)
            .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`);
        if (this.params.graphonly) {
            const graphembeds = await this.getGraphs(osudata);
            this.ctn.embeds = graphembeds;
        } else {
            if (this.params.detailed == 2) {
                const loading = new Discord.EmbedBuilder()
                    .setColor(helper.colours.embedColour.user.dec)
                    .setTitle(`${osudata.username}'s ${this.params.mode ?? 'osu!'} profile`)
                    .setURL(`https://osu.ppy.sh/users/${osudata.id}/${this.params.mode ?? ''}`)
                    .setThumbnail(`${osudata?.avatar_url ?? helper.defaults.images.any.url}`)
                    .setDescription(`Loading...`);

                if (this.input.type != 'button') {
                    if (this.input.type == 'interaction') {
                        setTimeout(() => {
                            (this.input.interaction as Discord.ChatInputCommandInteraction).editReply({
                                embeds: [loading],
                                allowedMentions: { repliedUser: false },
                            })
                                .catch();
                        }, 1000);
                    }
                }
                const graphembeds = await this.getGraphs(osudata);

                const mostplayeddata: osuapi.types_v2.BeatmapPlayCountArr = await osuapi.v2.users.mostPlayed({ user_id: osudata.id });
                data.debug(mostplayeddata, 'command', 'osu', this.input.message?.guildId ?? this.input.interaction?.guildId, 'mostPlayedData');

                if (mostplayeddata?.hasOwnProperty('error')) {
                    await commandTools.errorAndAbort(this.input, 'osu', true, helper.errors.uErr.osu.profile.mostplayed, true);
                    return;
                }
                const secperplay = osudata?.statistics.play_time / parseFloat(playcount.replaceAll(',', ''));

                let mostplaytxt = ``;
                for (let i2 = 0; i2 < mostplayeddata.length && i2 < 10; i2++) {
                    const bmpc = mostplayeddata[i2];
                    mostplaytxt += `\`${(bmpc.count.toString() + ' plays').padEnd(15, ' ')}\` | [${bmpc.beatmapset.title}[${bmpc.beatmap.version}]](https://osu.ppy.sh/b/${bmpc.beatmap_id})\n`;
                }

                const dailies = (osustats.play_count / (osudata.monthly_playcounts.length * 30.4375)).toFixed(2);
                const monthlies =
                    (osustats.play_count / osudata.monthly_playcounts.length).toFixed(2);
                // osudata.monthly_playcounts.map(x => x.count).reduce((a, b) => b + a)
                osuEmbed.addFields([
                    {
                        name: 'Stats',
                        value:
                            `**Global Rank:**${rankglobal}${peakRank}
    **pp:** ${osustats.pp}
    **Accuracy:** ${(osustats.hit_accuracy != null ? osustats.hit_accuracy : 0).toFixed(2)}%
    **Play Count:** ${playcount}
    **Level:** ${lvl}
    **Total Play Time:** ${calculate.secondsToTime(osudata?.statistics.play_time)} (${calculate.secondsToTime(osudata?.statistics.play_time, true,)})`,
                        inline: true
                    },
                    {
                        name: helper.defaults.invisbleChar,
                        value:
                            `**Player joined** <t:${new Date(osudata.join_date).getTime() / 1000}:R>                        
    ${gradeCounts}
    **Medals**: ${osudata.user_achievements.length}
    **Followers:** ${osudata.follower_count}
    ${prevnames}
    ${supporter} ${onlinestatus}
    **Avg time per play:** ${calculate.secondsToTime(secperplay)}
    **Avg daily playcount:** ${dailies}
    **Avg monthly playcount:** ${monthlies}
    `,
                        inline: true
                    }
                ]);
                osuEmbed.addFields([{
                    name: 'Most Played Beatmaps',
                    value: mostplaytxt != `` ? mostplaytxt : 'No data',
                    inline: false
                }]
                );

                this.ctn.embeds = [osuEmbed].concat(graphembeds);
            } else {
                osuEmbed.setDescription(`
    **Global Rank:**${rankglobal}${peakRank}
    **pp:** ${osustats.pp}
    **Accuracy:** ${(osustats.hit_accuracy != null ? osustats.hit_accuracy : 0).toFixed(2)}%
    **Play Count:** ${playcount}
    **Level:** ${lvl}
    **Medals**: ${osudata.user_achievements.length}
    ${gradeCounts}
    **Player joined** <t:${new Date(osudata.join_date).getTime() / 1000}:R>
    **Followers:** ${osudata.follower_count}
    ${prevnames}
    **Total Play Time:** ${calculate.secondsToTime(osudata?.statistics.play_time, true)}
    ${supporter} ${onlinestatus}
            `);
                this.ctn.embeds = [osuEmbed];
            }
        }
        data.writePreviousId('user', this.input.message?.guildId ?? this.input.interaction?.guildId, { id: `${osudata.id}`, apiData: null, mods: null });
        this.ctn.components = [buttons];
        this.send();
    }

    async getGraphs(osudata: osuapi.types_v2.User) {
        let chartplay;
        let chartrank;

        let nulltext = helper.defaults.invisbleChar;

        if (
            (!osudata.monthly_playcounts ||
                osudata.monthly_playcounts.length == 0) ||
            (!osudata.rank_history ||
                osudata.rank_history.length == 0)) {
            nulltext = 'Error - Missing data';
            chartplay = helper.defaults.images.any.url;
            chartrank = chartplay;
        } else {
            const dataplay = ('start,' + osudata.monthly_playcounts.map(x => x.start_date).join(',')).split(',');
            const datarank = ('start,' + osudata.rank_history.data.map(x => x).join(',')).split(',');

            const play =
                await other.graph(dataplay, osudata.monthly_playcounts.map(x => x.count), 'Playcount', {
                    startzero: true,
                    fill: true,
                    displayLegend: true,
                    pointSize: 0,
                });
            const rank =
                await other.graph(datarank, osudata.rank_history.data, 'Rank', {
                    startzero: false,
                    fill: false,
                    displayLegend: true,
                    reverse: true,
                    pointSize: 0,
                });
            const fileplay = new Discord.AttachmentBuilder(`${play.path}`);
            const filerank = new Discord.AttachmentBuilder(`${rank.path}`);

            this.ctn.files.push(fileplay, filerank);

            chartplay = `attachment://${play.filename}.jpg`;
            chartrank = `attachment://${rank.filename}.jpg`;
        }
        const ChartsEmbedRank = new Discord.EmbedBuilder()
            .setTitle(`${osudata.username}`)
            .setURL(`https://osu.ppy.sh/users/${osudata.id}/${this.params.mode ?? ''}`)
            .setDescription(nulltext)
            .setImage(`${chartrank}`);

        const ChartsEmbedPlay = new Discord.EmbedBuilder()
            .setURL(`https://osu.ppy.sh/users/${osudata.id}/${this.params.mode ?? ''}`)
            .setImage(`${chartplay}`);

        return [ChartsEmbedRank, ChartsEmbedPlay];
    }
}

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
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        this.setParamPage();

        

        const usertemp = this.setParamUser();
        this.params.user = usertemp.user;
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
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
        if (this.input.overrides.page != null) {
            this.params.page = this.input.overrides.page;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);

        const buttons: Discord.ActionRowBuilder = new Discord.ActionRowBuilder();
        {
            const t = await this.validUser(this.params.user, this.params.searchid, 'osu');
            this.params.user = t.user;
        }

        if (this.params.page < 2 || typeof this.params.page != 'number') {
            this.params.page = 1;
        }
        this.params.page--;
        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

        let osudata: osuapi.types_v2.UserExtended;

        if (data.findFile(this.params.user, 'osudata', 'osu') &&
            !('error' in data.findFile(this.params.user, 'osudata', 'osu')) &&
            this.input.buttonType != 'Refresh'
        ) {
            osudata = data.findFile(this.params.user, 'osudata', 'osu');
        } else {
            osudata = await osuapi.v2.users.profile({ name: this.params.user, mode: 'osu' });
        }

        data.debug(osudata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'osuData');

        if (osudata?.hasOwnProperty('error') || !osudata.id) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.noUser(this.params.user), true);
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

        data.debug(rsactData, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'rsactData');

        if (rsactData?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.profile.rsact, true);
            return;
        }

        data.storeFile(rsactData, this.input.id, 'rsactData', 'osu');

        const pageLength = 10;

        if (this.params.page < 1) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);

        }
        if (this.params.page >= Math.ceil(rsactData.length / pageLength) - 1) {
            this.params.page = Math.ceil(rsactData.length / pageLength) - 1;
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);

        }

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

        this.send();
    }
}