import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import * as tooltypes from '../../types/tools';
import { OsuCommand } from '../command';
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
        if (!this.params.user) {
            this.params.user = this.argParser.getRemaining().join(' ').trim();
        }
        if (this.params.user == '' || this.params.user.includes(this.params.searchid)) {
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
        if (!this.params.user) {
            this.params.user = this.argParser.getRemaining().join(' ').trim();
        }
        if (this.params.user == '' || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('mode');
        this.setParamOverride('user', 'id');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride('commanduser');
    }
    user: osuapi.types_v2.UserExtended;
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        await this.fixUser();

        this.sendLoading();

        await this.getUser();
        this.updateUserStats();

        const embed = await this.createEmbed();

        // const prevnames = osudata.previous_usernames.length > 0 ?
        //     '**Previous Usernames:** ' + osudata.previous_usernames.join(', ') :
        //     '';
        {
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
                    await this.sendError(helper.errors.profile.mostplayed);
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
        this.handleButtons();
        this.send();
    }

    async getUser() {
        this.user = await this.getProfile(this.params.user, this.params.mode);

        if ((
            (this.input.type == 'interaction' && !(this.input.interaction as Discord.ChatInputCommandInteraction)?.options?.getString('mode'))
            || this.input.type == 'message' || this.input.type == 'link'
        ) &&
            this.user.playmode != 'osu' &&
            typeof this.params.mode != 'undefined') {
            try {
                const t = await this.getProfile(this.params.user, this.params.mode);
                this.user = t;
            } catch (e) {
                return;
            }
        } else {
            this.params.mode = this.params.mode ?? 'osu';
        }
    }
    async updateUserStats() {
        if (this.input.type != 'button' || this.input.buttonType == 'Refresh') {
            try {
                await data.updateUserStats(this.user, this.user.playmode,);
                await data.userStatsCache([this.user], other.modeValidator(this.params.mode), 'User');
            } catch (error) {
            }
        }
    }
    async createEmbed() {
        const osuEmbed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.user.dec)
            .setTitle(`${this.user.username}'s ${this.params.mode ?? 'osu!'} profile`)
            .setURL(`https://osu.ppy.sh/users/${this.user.id}/${this.params.mode ?? ''}`)
            .setThumbnail(`${this.user?.avatar_url ?? helper.defaults.images.any.url}`);
        if (this.params.graphonly) {
            await this.embedGraph();
        } else {
            await this.embedUserData(osuEmbed);
        }
        return osuEmbed;
    }
    async embedGraph() {
        const graphembeds = await this.getGraphs();
        this.ctn.embeds = this.ctn.embeds.concat(graphembeds);
    }
    async embedUserData(embed: Discord.EmbedBuilder) {
        if (this.params.detailed == 2) {

        }
    }
    embedUserNormal(embed: Discord.EmbedBuilder) {
        embed.setDescription(`
        **Global Rank:**${this.rankCurrent()}${this.rankPeak()}
        **pp:** ${this.parseNumberStatistic(this.user?.statistics?.pp)}
        **Accuracy:** ${this.statAccuracy()}%
        **Play Count:** ${this.parseNumberStatistic(this.user?.statistics?.play_count)}
        **Level:** ${this.statLevel()}
        **Medals**: ${this.user.user_achievements.length}
        ${this.getGradeCounts()}
        **Player joined** <t:${new Date(this.user.join_date).getTime() / 1000}:R>
        **Followers:** ${this.user.follower_count}
        ${this.previousNames()}
        **Total Play Time:** ${calculate.secondsToTime(this.user?.statistics.play_time, true)}
        ${this.supporterStatus()} ${this.getOnlineStatus()}
                `);
    }
    embedUserDetailed(embed: Discord.EmbedBuilder) {

    }
    parseNumberStatistic(input?: number) {
        if (input) return calculate.separateNum(input);
        return '---';
    }
    rankCurrent() {
        const stats = this.user?.statistics;
        const playerrank = this.parseNumberStatistic(stats?.global_rank);
        const countryrank = this.parseNumberStatistic(stats?.country_rank);
        return ` #${playerrank} (#${countryrank} ${this.user.country_code} :flag_${this.user.country_code.toLowerCase()}:)`;
    }
    rankPeak() {
        if (this.user.rank_highest.rank) {
            const rank = calculate.separateNum(this.user.rank_highest.rank);
            const peakTimeEpoch = new Date(this.user.rank_highest.updated_at).getTime() / 1000;
            return `\n**Peak Rank**: #${calculate.separateNum(rank)} (<t:${peakTimeEpoch}:R>)`;
        }
        return '';
    }
    statAccuracy() {
        if (this.user.statistics.hit_accuracy) {
            return this.user.statistics.hit_accuracy.toFixed(2);
        }
        return '00.00';
    }
    statLevel() {
        if (this.user.statistics.level.current) {
            const level = this.user.statistics.level;
            let txt = level.current + '';
            if (level?.progress ?? 0 > 0) {
                txt += '.' + level.progress;
            }
            return txt;
        }
        return '---';
    }
    previousNames() {
        if (this.user.previous_usernames.length > 0) {
            return '**Previous Usernames:** ' + this.user.previous_usernames.join(', ');
        }
        return '';
    }
    getGradeCounts() {
        const grades = this.user.statistics.grade_counts;
        const emojis = helper.emojis.grades;
        const arr: [string, number][] = [
            [emojis.XH, grades.ssh],
            [emojis.X, grades.ss],
            [emojis.SH, grades.sh],
            [emojis.S, grades.s],
            [emojis.A, grades.a],
            // [emojis.XH, grades.ssh],
        ];
        let str = '';
        for (const item of arr) {
            str += item[0] + item[1] + ' ';
        }
    }
    supporterStatus() {
        const emojis = helper.emojis.supporter;
        return emojis[this.user.support_level ?? 0];
    }
    getOnlineStatus() {
        // formatters.relativeTime()
        if (this.user.is_online) {
            return `**${helper.emojis.onlinestatus.online} Online**`;
        }
        if ((new Date(this.user.last_visit)).getTime() != 0) {
            return `**${helper.emojis.onlinestatus.offline} Offline** | Last online ${formatters.relativeTime(this.user.last_visit)}`;
        }
        return `**${helper.emojis.onlinestatus.offline} Offline**`;
    }

    handleButtons() {
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
        this.ctn.components = [buttons];
    }

    async getGraphs() {
        let chartplay;
        let chartrank;

        let nulltext = helper.defaults.invisbleChar;

        if (
            (!this.user.monthly_playcounts ||
                this.user.monthly_playcounts.length == 0) ||
            (!this.user.rank_history ||
                this.user.rank_history.length == 0)) {
            nulltext = 'Error - Missing data';
            chartplay = helper.defaults.images.any.url;
            chartrank = chartplay;
        } else {
            const dataplay = ('start,' + this.user.monthly_playcounts.map(x => x.start_date).join(',')).split(',');
            const datarank = ('start,' + this.user.rank_history.data.map(x => x).join(',')).split(',');

            const play =
                await other.graph(dataplay, this.user.monthly_playcounts.map(x => x.count), 'Playcount', {
                    startzero: true,
                    fill: true,
                    displayLegend: true,
                    pointSize: 0,
                });
            const rank =
                await other.graph(datarank, this.user.rank_history.data, 'Rank', {
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
            .setTitle(`${this.user.username}`)
            .setURL(`https://osu.ppy.sh/users/${this.user.id}/${this.params.mode ?? ''}`)
            .setDescription(nulltext)
            .setImage(`${chartrank}`);

        const ChartsEmbedPlay = new Discord.EmbedBuilder()
            .setURL(`https://osu.ppy.sh/users/${this.user.id}/${this.params.mode ?? ''}`)
            .setImage(`${chartplay}`);

        return [ChartsEmbedRank, ChartsEmbedPlay];
    }
}