import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import * as tooltypes from '../../types/tools';
import { ArgsParser, OsuCommand } from '../command';
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
        this.argParser = new ArgsParser(this.input.args);
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

        await this.sendLoading();

        await this.getUser();
        this.updateUserStats();

        await this.setEmbeds();

        data.writePreviousId('user', this.input.message?.guildId ?? this.input.interaction?.guildId, { id: `${this.user.id}`, apiData: null, mods: null });
        this.handleButtons();
        await this.send();
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
    async setEmbeds() {
        const osuEmbed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.user.dec)
            .setTitle(`${this.user.username}'s ${this.params.mode ?? 'osu!'} profile`)
            .setURL(`https://osu.ppy.sh/users/${this.user.id}/${this.params.mode ?? ''}`)
            .setThumbnail(`${this.user?.avatar_url ?? helper.defaults.images.any.url}`);
        if (this.params.graphonly) {
            this.ctn.embeds = await this.getGraphs();
        } else {
            await this.embedUserData(osuEmbed);
        }
    }
    async embedUserData(embed: Discord.EmbedBuilder) {
        if (this.params.detailed == 2) {
            await this.embedUserDetailed(embed);
        } else {
            this.embedUserNormal(embed);
        }
    }
    embedUserNormal(embed: Discord.EmbedBuilder) {
        embed.setDescription(`
**Global Rank:** ${this.rankCurrent}${this.rankPeak}
**pp:** ${this.parseNumberStatistic(this.user?.statistics?.pp)}
**Accuracy:** ${this.statAccuracy}%
**Play Count:** ${this.parseNumberStatistic(this.user?.statistics?.play_count)}
**Level:** ${this.statLevel}
**Medals**: ${this.user.user_achievements.length}
${this.gradeCounts}
**Player joined** ${formatters.relativeTime(this.user.join_date)}
**Followers:** ${this.user.follower_count}
${this.previousNames}
**Total Play Time:** ${calculate.secondsToTime(this.user?.statistics.play_time, true)}
${this.supporterStatus} ${this.onlineStatus}`);
    }
    async embedUserDetailed(embed: Discord.EmbedBuilder) {
        this.ctn.embeds = await this.getGraphs();

        // osudata.monthly_playcounts.map(x => x.count).reduce((a, b) => b + a)
        embed.addFields([
            {
                name: 'Stats',
                value:
                    `**Global Rank:** ${this.rankCurrent}${this.rankPeak}
**pp:** ${this.parseNumberStatistic(this.user?.statistics?.pp)}
**Accuracy:** ${this.statAccuracy}%
**Play Count:** ${this.parseNumberStatistic(this.user?.statistics?.play_count)}
**Level:** ${this.statLevel}
**Total Play Time:** ${calculate.secondsToTime(this.user?.statistics.play_time)} (${calculate.secondsToTime(this.user?.statistics.play_time, true,)})`,
                inline: true
            },
            {
                name: helper.defaults.invisbleChar,
                value:
                    `**Player joined** ${formatters.relativeTime(this.user.join_date)}                      
${this.gradeCounts}
**Medals**: ${this.user.user_achievements.length}
**Followers:** ${this.user.follower_count}
${this.previousNames}
${this.supporterStatus} ${this.onlineStatus}
**Avg time per play:** ${this.timePerPlay}
**Avg daily playcount:** ${this.dailyPlaycount.toFixed(2)}
**Avg monthly playcount:** ${this.monthlyPlaycount.toFixed(2)}
`,
                inline: true
            }
        ]);
        const mostplaytxt = await this.mpText();
        embed.addFields([{
            name: 'Most Played Beatmaps',
            value: mostplaytxt != `` ? mostplaytxt : 'No data',
            inline: false
        }]
        );

        this.ctn.embeds.push(embed);
    }
    parseNumberStatistic(input?: number) {
        if (input) return calculate.separateNum(input);
        return '---';
    }
    protected get rankCurrent() {
        const stats = this.user?.statistics;
        const playerrank = this.parseNumberStatistic(stats?.global_rank);
        const countryrank = this.parseNumberStatistic(stats?.country_rank);
        return ` #${playerrank} (#${countryrank} ${this.user.country_code} :flag_${this.user.country_code.toLowerCase()}:)`;
    }
    protected get rankPeak() {
        if (this.user.rank_highest.rank) {
            const rank = calculate.separateNum(this.user.rank_highest.rank);
            const peakTimeEpoch = new Date(this.user.rank_highest.updated_at).getTime() / 1000;
            return `\n**Peak Rank**: #${calculate.separateNum(rank)} (<t:${peakTimeEpoch}:R>)`;
        }
        return '';
    }
    protected get statAccuracy() {
        if (this.user.statistics.hit_accuracy) {
            return this.user.statistics.hit_accuracy.toFixed(2);
        }
        return '00.00';
    }
    protected get statLevel() {
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
    protected get previousNames() {
        if (this.user.previous_usernames.length > 0) {
            return '**Previous Usernames:** ' + this.user.previous_usernames.join(', ');
        }
        return '';
    }
    protected get gradeCounts() {
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
        return str;
    }
    protected get supporterStatus() {
        const emojis: helper.tooltypes.Dict<string> = helper.emojis.supporter;
        return emojis[this.user.support_level ?? 0];
    }
    protected get onlineStatus() {
        // formatters.relativeTime()
        if (this.user.is_online) {
            return `**${helper.emojis.onlinestatus.online} Online**`;
        }
        if ((new Date(this.user.last_visit)).getTime() != 0) {
            return `**${helper.emojis.onlinestatus.offline} Offline** | Last online ${formatters.relativeTime(this.user.last_visit)}`;
        }
        return `**${helper.emojis.onlinestatus.offline} Offline**`;
    }
    protected get timePerPlay() {
        const n = (this.user?.statistics?.play_time ?? 0) / (this.user?.statistics?.play_count ?? 0);
        return calculate.secondsToTime(n ?? 0);
    }
    protected get dailyPlaycount() {
        return this.monthlyPlaycount / 30.4375;
    }
    protected get monthlyPlaycount() {
        return (this.user.statistics.play_count / this.user.monthly_playcounts.length);
    }
    protected async mostPlayed() {
        const mostplayeddata: osuapi.types_v2.BeatmapPlayCountArr = await osuapi.v2.users.mostPlayed({ user_id: this.user.id });
        data.debug(mostplayeddata, 'command', 'osu', this.input.message?.guildId ?? this.input.interaction?.guildId, 'mostPlayedData');
        if (helper.errors.isErrorObject(mostplayeddata)) {
            await this.sendError(helper.errors.profile.mostplayed);
            return;
        }
        return mostplayeddata;
    }
    protected async mpText() {
        const data = await this.mostPlayed();
        let text = [];
        for (const bmpc of data) {
            text.push(`\`${(bmpc.count.toString() + ' plays').padEnd(15, ' ')}\` | [${bmpc.beatmapset.title}[${bmpc.beatmap.version}]](https://osu.ppy.sh/b/${bmpc.beatmap_id})`);
        }
        return text.join('\n');
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

            const play = other.graph({
                x: dataplay,
                y: this.user.monthly_playcounts.map(x => x.count),
                label: 'Playcount',
                other: {
                    startzero: true,
                    fill: true,
                    displayLegend: true,
                    pointSize: 0,
                }
            });
            const rank = other.graph({
                x: datarank,
                y: this.user.rank_history.data,
                label: 'Rank',
                other: {
                    startzero: false,
                    fill: false,
                    displayLegend: true,
                    reverse: true,
                    pointSize: 0,
                }
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