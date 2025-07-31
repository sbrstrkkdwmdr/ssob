import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

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
                    await this.sendError(`Could not find second user - ${helper.errors.profile.user_msp}`);
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
        await this.send();
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
        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
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