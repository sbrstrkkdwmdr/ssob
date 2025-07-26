import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { OsuCommand } from '../command';
import { Profile } from './Profile';

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
        this.params.country = this.setParam(this.params.country, ['-country'], 'string', {});
        this.params.type = this.setParamBoolList(this.params.type,
            { set: 'charts', flags: ['-charts', '-chart'] },
            { set: 'country', flags: ['-countries'] },
            { set: 'performance', flags: ['-pp', '-performance'] },
            { set: 'score', flags: ['-score'] },
        );
        this.params.spotlight = this.setParam(this.params.spotlight, ['-spotlight'], 'number', { number_isInt: true });
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
        this.setParamOverride('page');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff
        this.params.mode = other.modeValidator(this.params.mode);

        this.fixPage();

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
            await this.sendError(helper.errors.generic.rankings);
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
                await this.sendError(`${helper.errors.score.nf} at index ${pid}`);
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

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            rankingdata.ranking.length <= 5,
            this.params.page == 0,
            this.params.page + 1 >= Math.ceil(rankingdata.ranking.length / 5)
        );

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