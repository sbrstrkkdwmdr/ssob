import Discord from 'discord.js';
import * as helper from '../helper';
import * as calculate from '../tools/calculate';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as log from '../tools/log';
import * as osuapi from '../tools/osuapi';
import * as other from '../tools/other';
import { OsuCommand } from './command';

// compare, osuset, rankpp, saved, whatif
type compareType = 'profile' | 'top' | 'mapscore';

export class Compare extends OsuCommand {
    declare protected params: {
        type: compareType;
        first: string;
        second: string;
        firstsearchid: string;
        secondsearchid: string;
        mode: osuapi.types_v2.GameMode;
        page: number;
    };
    constructor() {
        super();
        this.name = 'Compare';
        this.params = {
            type: 'profile',
            first: null,
            second: null,
            firstsearchid: null,
            secondsearchid: null,
            mode: 'osu',
            page: 0,
        };
    }

    async setParamsMsg() {
        {
            this.setParamMode();
        }
        if (this.input.message.mentions.users.size > 1) {
            this.params.firstsearchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
            this.params.secondsearchid = this.input.message.mentions.users.size > 1 ? this.input.message.mentions.users.at(1).id : null;
        } else if (this.input.message.mentions.users.size == 1) {
            this.params.firstsearchid = this.input.message.author.id;
            this.params.secondsearchid = this.input.message.mentions.users.at(0).id;
        } else {
            this.params.firstsearchid = this.input.message.author.id;
        }
        {
            const parseUsers = [this.setParamUser()?.user, this.setParamUser()?.user];
            this.params.second = parseUsers[0];
            if (parseUsers[1]) {
                this.params.first = parseUsers[0];
                this.params.second = parseUsers[1];
            }
        }
        this.params.first != null && this.params.first.includes(this.params.firstsearchid) ? this.params.first = null : null;
        this.params.second != null && this.params.second.includes(this.params.secondsearchid) ? this.params.second = null : null;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.type = (interaction.options.getString('type') ?? 'profile') as compareType;
        this.params.first = interaction.options.getString('first');
        this.params.second = interaction.options.getString('second');
        this.params.firstsearchid = this.commanduser.id;
        this.params.mode = (interaction.options.getString('mode') ?? 'osu') as osuapi.types_v2.GameMode;
        if (this.params.second == null && this.params.first != null) {
            this.params.second = this.params.first;
            this.params.first = null;
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
        this.params.type = temp.type as compareType;
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
        this.params.first = temp.compareFirst;
        this.params.second = temp.compareSecond;
        this.params.firstsearchid = temp.searchIdFirst;
        this.params.secondsearchid = temp.searchIdSecond;
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('type');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff

        let embedescription: string = null;
        this.fixPage();

        let footer = '';
        let embed = new Discord.EmbedBuilder();

        if (this.params.second == null) {
            if (this.params.secondsearchid) {
                const cuser = await data.searchUser(this.params.secondsearchid, true);
                this.params.second = cuser.username;
                if (cuser.error != null && (cuser.error.includes('no user') || cuser.error.includes('type'))) {
                    if (this.input.type != 'button') {
                        await this.sendError('Second user not found');
                    }
                    return;
                }
            } else {
                if (data.getPreviousId('user', `${this.input.message?.guildId ?? this.input.interaction?.guildId}`).id == false) {
                    await this.sendError(`Could not find second user - ${helper.errors.uErr.osu.profile.user_msp}`);
                }
                this.params.second = data.getPreviousId('user', `${this.input.message?.guildId ?? this.input.interaction?.guildId}`).id as string;
            }
        }
        if (this.params.first == null) {
            if (this.params.firstsearchid) {
                const cuser = await data.searchUser(this.params.firstsearchid, true);
                this.params.first = cuser.username;
                if (this.params.mode == null) {
                    this.params.mode = cuser.gamemode;
                }
                if (cuser.error != null && (cuser.error.includes('no user') || cuser.error.includes('type'))) {
                    if (this.input.type != 'button') {
                        await this.sendError('First user not found');
                    }
                    return;
                }
            } else {
                await this.sendError('First user not found');
            }
        }
        if (!this.params.first || this.params.first.length == 0 || this.params.first == '') {
            await this.sendError('First user not found');
        }
        if (!this.params.second || this.params.second.length == 0 || this.params.second == '') {
            await this.sendError('Second user not found');
        }
        let firstuser: osuapi.types_v2.User;
        let seconduser: osuapi.types_v2.User;
        try {
            firstuser = await this.getProfile(this.params.first, this.params.mode);
            seconduser = await this.getProfile(this.params.second, this.params.mode);
        } catch (e) {
            return;
        }
        switch (this.params.type) {
            case 'profile': {
                this.profiles(firstuser, seconduser, embed);
            }
                break;
            case 'top': {
                embed = await this.plays(firstuser, seconduser, embed);
            }
                break;

            case 'mapscore': {
                this.mapscores(firstuser, seconduser, embed);
            }
                break;

        }
        data.writePreviousId('user', this.input.message?.guildId ?? this.input.interaction?.guildId, { id: `${seconduser.id}`, apiData: null, mods: null });

        if (footer.length > 0) {
            embed.setFooter({
                text: footer
            });
        }

        if (embedescription != null && embedescription.length > 0) {
            embed.setDescription(embedescription);
        }
        this.ctn.embeds = [embed];
        this.send();
    }
    async getTopData(user: number, mode: osuapi.types_v2.GameMode, n: 'first' | 'second') {
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

        if (topdata?.hasOwnProperty('error')) {
            if (this.input.type != 'button' && this.input.type != 'link') {
                await this.sendError(`could not fetch ${n} user\'s top scores`);
            }
            return;
        }
        return topdata;
    }
    profiles(firstuser: osuapi.types_v2.User, seconduser: osuapi.types_v2.User, embed: Discord.EmbedBuilder) {
        embed.setTitle('Comparing profiles')
            .setFields(
                [
                    {
                        name: `**${firstuser.username}**`,
                        value:
                            `**Rank:** ${calculate.separateNum(firstuser?.statistics.global_rank)}
**pp:** ${calculate.separateNum(firstuser?.statistics.pp)}
**Accuracy:** ${(firstuser?.statistics.hit_accuracy != null ? firstuser.statistics.hit_accuracy : 0).toFixed(2)}%
**Playcount:** ${calculate.separateNum(firstuser?.statistics.play_count)}
**Level:** ${calculate.separateNum(firstuser.statistics.level.current)}
`,
                        inline: true
                    },
                    {
                        name: `**${seconduser.username}**`,
                        value:
                            `**Rank:** ${calculate.separateNum(seconduser?.statistics.global_rank)}
**pp:** ${calculate.separateNum(seconduser?.statistics.pp)}
**Accuracy:** ${(seconduser?.statistics.hit_accuracy != null ? seconduser.statistics.hit_accuracy : 0).toFixed(2)}%
**Playcount:** ${calculate.separateNum(seconduser?.statistics.play_count)}
**Level:** ${calculate.separateNum(seconduser.statistics.level.current)}
`,
                        inline: true
                    },
                    {
                        name: `**Difference**`,
                        value:
                            `**Rank:** ${calculate.separateNum(Math.abs(firstuser.statistics.global_rank - seconduser.statistics.global_rank))}
**pp:** ${calculate.separateNum(Math.abs(firstuser?.statistics.pp - seconduser?.statistics.pp).toFixed(2))}
**Accuracy:** ${Math.abs((firstuser.statistics.hit_accuracy != null ? firstuser.statistics.hit_accuracy : 0) - (seconduser.statistics.hit_accuracy != null ? seconduser.statistics.hit_accuracy : 0)).toFixed(2)}%
**Playcount:** ${calculate.separateNum(Math.abs(firstuser.statistics.play_count - seconduser.statistics.play_count))}
**Level:** ${calculate.separateNum(Math.abs(firstuser.statistics.level.current - seconduser.statistics.level.current))}
`,
                        inline: false
                    }
                ]
            );
        return embed;
    }
    async plays(firstuser: osuapi.types_v2.User, seconduser: osuapi.types_v2.User, embed: Discord.EmbedBuilder) {
        let firsttopdata: osuapi.types_v2.Score[];
        let secondtopdata: osuapi.types_v2.Score[];
        try {
            firsttopdata = await this.getTopData(firstuser.id, this.params.mode, 'first');
            secondtopdata = await this.getTopData(seconduser.id, this.params.mode, 'second');
        } catch (e) {
            embed.setDescription('There was an error fetching scores');
            return;
        }

        const filterfirst = [];
        //filter so that scores that have a shared beatmap id with the second user are kept
        for (let i = 0; i < firsttopdata.length; i++) {
            if (secondtopdata.find(score => score.beatmap.id == firsttopdata[i].beatmap.id)) {
                filterfirst.push(firsttopdata[i]);
            }
        }
        filterfirst.sort((a, b) => b.pp - a.pp);
        const arrscore = [];

        for (let i = 0; i < filterfirst.length && i < 5; i++) {
            const firstscore: osuapi.types_v2.Score = filterfirst[i + (this.params.page * 5)];
            if (!firstscore) break;
            const secondscore: osuapi.types_v2.Score = secondtopdata.find(score => score.beatmap.id == firstscore.beatmap.id);
            if (secondscore == null) break;
            const format = (score: osuapi.types_v2.Score) =>
                `${score.pp.toFixed(2)}pp | ${(score.accuracy * 100).toFixed(2)}% ${score.mods.length > 0 ? '| +' + score.mods.map(x => x.acronym).join('') : ''}`;
            const firstscorestr = format(firstscore);
            const secondscorestr = format(secondscore);
            arrscore.push(
                `
**[\`${firstscore.beatmapset.title} [${firstscore.beatmap.version}]\`](https://osu.ppy.sh/b/${firstscore.beatmap.id})**
\`${firstuser.username.padEnd(30, ' ').substring(0, 30)} | ${seconduser.username.padEnd(30, ' ').substring(0, 30)}\`
\`${firstscorestr} || ${secondscorestr}\``
            );
        }
        let fields = [];
        for (const score of arrscore) {
            fields.push({
                name: helper.defaults.invisbleChar,
                value: score,
                inline: false
            });
        }
        commandTools.storeButtonArgs(this.input.id, {
            type: 'top',
            page: this.params.page + 1,
            maxPage: Math.ceil(filterfirst.length / 5),
            compareFirst: this.params.first,
            compareSecond: this.params.second,
            searchIdFirst: this.params.firstsearchid,
            searchIdSecond: this.params.secondsearchid
        });
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.ctn.components = [pgbuttons];
        embed.setTitle('Comparing Top Scores')
            .setDescription(`**[${firstuser.username}](https://osu.ppy.sh/users/${firstuser.id})** and **[${seconduser.username}](https://osu.ppy.sh/users/${seconduser.id})** have ${filterfirst.length} shared scores`)
            .setFields(fields)
            .setFooter({ text: `${this.params.page + 1}/${Math.ceil(filterfirst.length / 5)}` });
        return embed;

    }
    mapscores(firstuser: osuapi.types_v2.User, seconduser: osuapi.types_v2.User, embed: Discord.EmbedBuilder) {
        embed.setTitle('Comparing map scores')
            .setFields([
                {
                    name: `**${firstuser.username}**`,
                    value: '',
                    inline: true
                },
                {
                    name: `**${seconduser.username}**`,
                    value: 's',
                    inline: true
                },
                {
                    name: `**Difference**`,
                    value: 'w',
                    inline: false
                },
            ]);
        return embed;
    }
}

export class RankPP extends OsuCommand {
    declare protected params: {
        value: number;
        mode: osuapi.types_v2.GameMode;
        get: 'rank' | 'pp';
    };
    constructor() {
        super();
        this.name = 'RankPP';
        this.params = {
            value: 100,
            mode: 'osu',
            get: 'pp'
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();

        }
        this.params.value = +(this.input.args[0] ?? 100);
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.value = interaction.options.getInteger('value') ?? 100;
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode ?? 'osu';
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('get', 'type');
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        const Embed = new Discord.EmbedBuilder()
            .setTitle('null')
            .setDescription('null');

        let output: string;
        let returnval: {
            value: number;
            isEstimated: boolean;
        } = null;
        switch (this.params.get) {
            case 'pp': {
                returnval = await data.getRankPerformance('pp->rank', this.params.value, this.params.mode);
                output = 'approx. rank #' + calculate.separateNum(Math.ceil(returnval.value));
                Embed
                    .setTitle(`Approximate rank for ${this.params.value}pp`);
            }
                break;
            case 'rank': {
                returnval = await data.getRankPerformance('rank->pp', this.params.value, this.params.mode);
                output = 'approx. ' + calculate.separateNum(returnval.value.toFixed(2)) + 'pp';

                Embed
                    .setTitle(`Approximate performance for rank #${this.params.value}`);
            }
                break;
        };

        const dataSizetxt = await helper.vars.statsCache.count();

        Embed
            .setDescription(`${output}\n${helper.emojis.gamemodes[this.params.mode ?? 'osu']}\n${returnval.isEstimated ? `Estimated from ${dataSizetxt} entries.` : 'Based off matching / similar entry'}`);

        this.ctn.embeds = [Embed];

        this.send();
    }
}

export class Saved extends OsuCommand {
    declare protected params: {
        searchid: string;
        user: string;
    };
    show: {
        name: boolean,
        mode: boolean,
        skin: boolean,
    };
    overrideTitle: string;
    constructor() {
        super();
        this.name = 'Saved';
        this.params = {
            searchid: null,
            user: null,
        };
        this.show = {
            name: true,
            mode: true,
            skin: true,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        this.params.user = this.input.args.join(' ')?.replaceAll('"', '');
        if (!this.input.args[0] || this.input.args[0].includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        switch (this.input?.overrides?.type) {
            case 'username':
                this.show = {
                    name: true,
                    mode: false,
                    skin: false,
                };
                break;
            case 'mode':
                this.show = {
                    name: false,
                    mode: true,
                    skin: false,
                };
                break;
            case 'skin':
                this.show = {
                    name: false,
                    mode: false,
                    skin: true,
                };
                break;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        let cuser: any = {
            osuname: 'null',
            mode: 'osu! (Default)',
            skin: 'osu! classic'
        };

        let fr;
        if (this.params.user == null) {
            fr = helper.vars.client.users.cache.get(this.params.searchid)?.username ?? 'null';
        }

        const Embed = new Discord.EmbedBuilder()
            .setTitle(`${this.params.user != null ? this.params.user : fr}'s ${this.overrideTitle ?? 'saved settings'}`);

        if (this.params.user == null) {
            cuser = await helper.vars.userdata.findOne({ where: { userid: this.params.searchid } });
        } else {
            const allUsers: helper.tooltypes.dbUser[] = await helper.vars.userdata.findAll() as any;

            cuser = allUsers.filter(x => (`${x.osuname}`.trim().toLowerCase() == `${this.params.user}`.trim().toLowerCase()))[0];
        }

        if (cuser) {
            const fields = [];
            if (this.show.name) {
                fields.push({
                    name: 'Username',
                    value: `${cuser.osuname && cuser.mode.length > 1 ? cuser.osuname : 'undefined'}`,
                    inline: true
                });
            }
            if (this.show.mode) {
                fields.push({
                    name: 'Mode',
                    value: `${cuser.mode && cuser.mode.length > 1 ? cuser.mode : 'osu (default)'}`,
                    inline: true
                });
            }
            if (this.show.skin) {
                fields.push({
                    name: 'Skin',
                    value: `${cuser.skin && cuser.skin.length > 1 ? cuser.skin : 'None'}`,
                    inline: true
                });
            }
            Embed.addFields(fields);
        } else {
            Embed.setDescription('No saved settings found');
        }

        this.ctn.embeds = [Embed];
        this.send();
    }
}

export class ServerLeaderboard extends OsuCommand {
    declare protected params: {
        page: number;
        mode: osuapi.types_v2.GameMode;
        id: string;
    };
    constructor() {
        super();
        this.name = 'ServerLeaderboard';
        this.params = {
            page: 0,
            mode: 'osu',
            id: null,
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();
        }

        this.params.id = this.input.args[0];
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.id = interaction.options.getString('id');
        const gamemode = interaction.options.getString('mode');
        if (!gamemode || gamemode == 'osu' || gamemode == 'o' || gamemode == '0' || gamemode == 'standard' || gamemode == 'std') {
            this.params.mode = 'osu';
        }
        if (gamemode == 'taiko' || gamemode == 't' || gamemode == '1' || gamemode == 'drums') {
            this.params.mode = 'taiko';
        }
        if (gamemode == 'fruits' || gamemode == 'c' || gamemode == '2' || gamemode == 'catch' || gamemode == 'ctb') {
            this.params.mode = 'fruits';
        }
        if (gamemode == 'mania' || gamemode == 'm' || gamemode == '3' || gamemode == 'piano') {
            this.params.mode = 'mania';
        }
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.id = this.input.message.embeds[0].author.name;
        this.params.mode = this.input.message.embeds[0].footer.text.split(' | ')[0] as osuapi.types_v2.GameMode;

        this.params.page = 0;
        if (this.input.buttonType == 'BigLeftArrow') {
            this.params.page = 1;
        }
        const pageFinder = this.input.message.embeds[0].footer.text.split(' | ')[1].split('Page ')[1];
        switch (this.input.buttonType) {
            case 'LeftArrow':
                this.params.page = +pageFinder.split('/')[0] - 1;
                break;
            case 'RightArrow':
                this.params.page = +pageFinder.split('/')[0] + 1;
                break;
            case 'BigRightArrow':
                this.params.page = +pageFinder.split('/')[1];
                break;
        }

        if (this.params.page < 2) {
            this.params.page == 1;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);

        this.sendLoading();

        this.fixPage();

        let global = false;
        let guild = this.input.message.guild ?? this.input.interaction.guild;
        if (this.params.id == 'global') {
            global = true;
        }
        if (typeof + this.params.id == 'number') {
            const tempguild = helper.vars.client.guilds.cache.get(this.params.id);
            if (tempguild) {
                const isThere = tempguild.members.cache.has(this.commanduser.id);
                guild = isThere ? tempguild : guild;
            }
        }

        const name = global ? "Global SSoB leaderboard" :
            `Server leaderboard for ${guild?.name ?? "null"}`;

        const serverlb = new Discord.EmbedBuilder()
            .setAuthor({ name: `${this.params.id ?? guild.id}` })
            .setColor(helper.colours.embedColour.userlist.dec)
            .setTitle(name);
        let rtxt = `\n`;
        let cache: Discord.Collection<string, Discord.GuildMember> | Discord.Collection<string, Discord.User>;

        if (global) {
            cache = helper.vars.client.users.cache;
        } else {
            cache = guild.members.cache;
        }
        //@ts-expect-error incompatible signatures
        const checkCache: string[] = cache.map(x => x.id + '');
        const users = (await this.getUsers(this.params.mode)).filter(x => checkCache.includes(x.discord));

        const another = users.slice().sort((b, a) => b.rank - a.rank); //for some reason this doesn't sort even tho it does in testing
        rtxt = `\`Rank    Discord        osu!           Rank       Acc      pp       `;
        const pageOffset = this.params.page * 10;
        for (let i = 0; i < users.length && i < 10; i++) {
            const cur = another[i + pageOffset];
            if (!cur) break;
            const pad = i + 1 >= 10 ?
                i + 1 >= 100 ?
                    3
                    : 4
                : 5;
            const user = helper.vars.client.users.cache.get(cur.discord);
            rtxt += `\n#${i + 1 + pageOffset + ')'.padEnd(pad, ' ')} ${this.overlengthString(user.username, 14)} ${this.overlengthString(cur.name, 14)} ${(cur.rank + '').padEnd(10)} ${(cur.acc.toFixed(2) + '%').padEnd(8)} ${cur.pp}pp`;
        }

        rtxt += `\n\``;
        serverlb.setDescription(rtxt);
        serverlb.setFooter({ text: this.params.mode + ` | Page ${this.params.page + 1}/${Math.ceil(users.length / 10)}` });
        // const endofcommand = new Date().getTime();
        // const timeelapsed = endofcommand - input.currentDate.getTime();

        if (this.params.page < 1) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }
        if (this.params.page + 1 >= Math.ceil(users.length / 10)) {
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }

        this.ctn.embeds = [serverlb];
        this.ctn.components = [pgbuttons];

        this.send();
    }

    async getUsers(mode: 'osu' | 'taiko' | 'fruits' | 'mania') {
        const ret: {
            name: string,
            discord: string,
            pp: number,
            rank: number,
            acc: number,
        }[] = [];
        const temp = await helper.vars.userdata.findAll();
        for (const elem of temp) {
            const thing = {
                name: elem.getDataValue('osuname'),
                discord: elem.getDataValue('userid'),
                pp: elem.getDataValue(mode + 'pp'),
                rank: elem.getDataValue(mode + 'rank'),
                acc: elem.getDataValue(mode + 'acc'),
            };
            if (thing.pp && thing.rank && thing.acc) {
                ret.push(thing);
            }
        }
        return ret;
    }
    overlengthString(str: string, length: number) {
        let t = str.padEnd(length);
        if (str.length >= length) {
            t = str.substring(0, length - 3) + '...';
        }
        return t;
    }
}

export class Set extends OsuCommand {
    declare protected params: {
        name: string;
        mode: osuapi.types_v2.GameMode;
        skin: string;
    };

    constructor() {
        super();
        this.name = 'Set';
        this.params = {
            name: null,
            mode: 'osu',
            skin: null,
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();
        }

        this.params.skin = this.setParam(this.params.skin, ['-skin'], 'string', { string_isMultiple: true });

        this.params.name = this.argParser.getRemaining().join(' ');

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.name = interaction.options.getString('user');
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode;
        this.params.skin = interaction.options.getString('skin');
    }
    getOverrides(): void {
        if (this.input.overrides.type != null && this.input.type == 'message') {
            switch (this.input.overrides.type) {
                case 'mode':
                    [this.params.mode, this.params.name] = [this.params.name as osuapi.types_v2.GameMode, this.params.mode];
                    break;
                case 'skin':
                    [this.params.skin, this.params.name] = [this.params.name, this.params.skin];
            }
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        this.ctn.content = 'null';
        // do stuff
        if (this.params.mode) {
            const thing = other.modeValidatorAlt(this.params.mode);
            this.params.mode = thing.mode;
            if (thing.isincluded == false) {
                this.voidcontent();
                this.ctn.content = helper.errors.uErr.osu.set.mode;
                await this.send();
                return;
            }
        }

        let updateRows: {
            userid: string | number,
            osuname?: string,
            mode?: string,
            skin?: string,
        } = {
            userid: this.commanduser.id
        };
        updateRows = {
            userid: this.commanduser.id,
        };
        if (this.params.name != null) {
            updateRows['osuname'] = this.params.name;
        }
        if (this.params.mode != null) {
            updateRows['mode'] = this.params.mode;
        }
        if (this.params.skin != null) {
            updateRows['skin'] = this.params.skin;
        }
        const findname: helper.tooltypes.dbUser = await helper.vars.userdata.findOne({ where: { userid: this.commanduser.id } }) as any;
        if (findname == null) {
            try {
                await helper.vars.userdata.create({
                    userid: this.commanduser.id,
                    osuname: this.params.name ?? 'undefined',
                    mode: this.params.mode ?? 'osu',
                    skin: this.params.skin ?? 'Default - https://osu.ppy.sh/community/forums/topics/129191?n=117',
                    location: '',
                    timezone: '',
                });
                this.ctn.content = 'Added to database';
                if (this.params.name) {
                    this.ctn.content += `\nSet your username to \`${this.params.name}\``;
                }
                if (this.params.mode) {
                    this.ctn.content += `\nSet your mode to \`${this.params.mode}\``;
                }
                if (this.params.skin) {
                    this.ctn.content += `\nSet your skin to \`${this.params.skin}\``;
                }
            } catch (error) {
                this.ctn.content = 'There was an error trying to update your settings';
                log.commandErr('Database error (create) ->' + error, this.input.id, 'osuset', this.input.message, this.input.interaction);
            }
        } else {
            const affectedRows = await helper.vars.userdata.update(
                updateRows,
                { where: { userid: this.commanduser.id } }
            );

            if (affectedRows.length > 0 || affectedRows[0] > 0) {
                this.ctn.content = 'Updated your settings:';
                if (this.params.name) {
                    this.ctn.content += `\nSet your username to \`${this.params.name}\``;
                }
                if (this.params.mode) {
                    this.ctn.content += `\nSet your mode to \`${this.params.mode}\``;
                }
                if (this.params.skin) {
                    this.ctn.content += `\nSet your skin to \`${this.params.skin}\``;
                }
            } else {
                this.ctn.content = 'There was an error trying to update your settings';
                log.commandErr('Database error (update) ->' + affectedRows, this.input.id, 'osuset', this.input.message, this.input.interaction);
            }
        }

        this.send();
    }
}

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
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        {
            this.setParamMode();
        }



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
            this.send();
            return;
        }

        const pparr = osutopdata.slice().map(x => x.pp);
        pparr.push(this.params.pp);
        pparr.sort((a, b) => b - a);
        const ppindex = pparr.indexOf(this.params.pp);

        const weight = calculate.findWeight(ppindex);

        const newTotal: number[] = [];

        for (let i = 0; i < pparr.length; i++) {
            newTotal.push(pparr[i] * calculate.findWeight(i));
        }

        const total = newTotal.reduce((a, b) => a + b, 0);
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
        this.send();
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

        if (topdata?.hasOwnProperty('error')) {
            await this.sendError(helper.errors.uErr.osu.scores.best.replace('[ID]', user + ''));
        }
        data.storeFile(topdata, this.input.id, 'osutopdata');
        return topdata;

    }
}