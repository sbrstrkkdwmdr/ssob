import * as Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import { gen, osu_maps, osu_other, osu_profiles, osu_scores } from './commandHelper';
import { Command, InputHandler } from './commands/command';
import * as helper from './helper';
import * as checks from './tools/checks';
import * as commandTools from './tools/commands';
import * as osuapi from './tools/osuapi';

export class ButtonHandler extends InputHandler {
    buttonWarnedUsers = new Set();
    async onMessage(message: Discord.Message) {

    }
    async onInteraction(interaction: Discord.Interaction) {
        if (!(interaction.type == Discord.InteractionType.MessageComponent || interaction.type == Discord.InteractionType.ModalSubmit)) return;
        if (interaction.applicationId != helper.vars.client?.application?.id) return;
        this.overrides = {
            commandAs: 'button',
        };
        
        let canReply = true;
        if (!checks.botHasPerms(interaction, ['ReadMessageHistory'])) {
            canReply = false;
        }
        interaction = interaction as Discord.ButtonInteraction; //| Discord.SelectMenuInteraction

        //version-buttonType-baseCommand-userId-commandId-extraValue
        //buttonVer-button-command-specid-id-???
        const buttonsplit = interaction.customId.split('-');
        const buttonVer = buttonsplit[0];
        const buttonType = buttonsplit[1] as helper.bottypes.buttonType;
        const cmd = buttonsplit[2];
        const specid = buttonsplit[3];

        if (buttonVer != helper.versions.releaseDate) {
            const findcommand = helper.versions.versions.find(x =>
                x.name == buttonVer ||
                x.releaseDate.replaceAll('-', '') == buttonVer
            ) ?? false;
            await interaction.reply({
                content: `You cannot use this command as it is outdated
    Bot version: ${helper.versions.releaseDate} (${helper.versions.current})
    Command version: ${findcommand ? `${findcommand.releaseDate} (${findcommand.name})` : 'INVALID'}
    `,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            return;
        }
        if (specid && specid != 'any' && specid != interaction.user.id) {
            if (!this.buttonWarnedUsers.has(interaction.member.user.id)) {
                await interaction.reply({
                    content: 'You cannot use this button',
                    flags: Discord.MessageFlags.Ephemeral,
                    allowedMentions: { repliedUser: false }
                });
                this.buttonWarnedUsers.add(interaction.member.user.id);
                setTimeout(() => {
                    this.buttonWarnedUsers.delete(interaction.member.user.id);
                }, 1000 * 60 * 60 * 24);
            } else {
                interaction.deferUpdate()
                    .catch(error => { });
            }
            return;
        }

        await this.handleButtons(buttonType, interaction, cmd.toLowerCase());

        if (await this.specialCommands(buttonsplit, buttonType, interaction, cmd.toLowerCase())) {
            return;
        }

        try {
            this.commandSelect(cmd.toLowerCase(), interaction);
            this.runCommand(interaction, buttonType, +buttonsplit[4], null, true);
        } catch (err) { }
    }

    async handleButtons(buttonType: helper.bottypes.buttonType, interaction: Discord.ButtonInteraction, cmd: string) {
        const PageOnlyCommands = [
            'Firsts', 'MapLeaderboard', 'NoChokes', 'OsuTop', 'Pinned', 'Ranking', 'Recent', 'RecentList', 'RecentActivity', 'MapScores', 'UserBeatmaps',
            'Changelog',
        ];
        const ScoreSortCommands = [
            'Firsts', 'MapLeaderboard', 'NoChokes', 'OsuTop', 'Pinned', 'RecentList', 'MapScores',

        ];
        if (buttonType == 'Search' && PageOnlyCommands.includes(cmd)) {
            const menu = new Discord.ModalBuilder()
                .setTitle('Page')
                .setCustomId(`${helper.versions.releaseDate}-SearchMenu-${cmd}-${interaction.user.id}-${commandTools.getCmdId()}`)
                .addComponents(
                    //@ts-expect-error - TextInputBuilder not assignable to AnyInputBuilder
                    new Discord.ActionRowBuilder()
                        .addComponents(new Discord.TextInputBuilder()
                            .setCustomId('SearchInput')
                            .setLabel("What page do you want to go to?")
                            .setStyle(Discord.TextInputStyle.Short)
                        )
                );


            interaction.showModal(menu)
                .catch(error => { });
            return;
        }
        if (buttonType.includes('Select')) {
            switch (cmd) {
                case 'map': case 'ppcalc':
                    {
                        //interaction is converted to a base interaction first because button interaction and select menu interaction don't overlap
                        this.overrides.id = ((interaction as Discord.BaseInteraction) as Discord.SelectMenuInteraction).values[0];
                        // @ts-expect-error TS2339: Property 'components' does not exist on type 'TopLevelComponent'.
                        if (interaction?.message?.components[2]?.components[0]) {
                            // @ts-expect-error TS2339: Property 'components' does not exist on type 'TopLevelComponent'.
                            overrides.overwriteModal = interaction.message.components[2].components[0] as any;
                        }
                    }
                    break;
                case 'help':
                    {
                        this.overrides.ex = ((interaction as Discord.BaseInteraction) as Discord.SelectMenuInteraction).values[0];
                    }
                    break;
            }
        }

        if (buttonType == 'Sort' && ScoreSortCommands.includes(cmd)) {
            interaction.deferUpdate();
            return;
        }
        if (buttonType == 'SearchMenu' && PageOnlyCommands.includes(cmd)) {
            //interaction is converted to a base interaction first because button interaction and modal submit interaction don't overlap
            const tst = parseInt(((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(0).value);
            if (tst.toString().length < 1) {
                return;
            } else {
                this.overrides.page = parseInt(((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(0).value);
            }
        }
        if (buttonType == 'SortMenu' && ScoreSortCommands.includes(cmd)) {
            this.overrides.sort = ((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(0).value;
            this.overrides.reverse = ((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(1).value as unknown as boolean;
        }
    }

    async specialCommands(buttonsplit: string[], buttonType: helper.bottypes.buttonType, interaction: Discord.ButtonInteraction, cmd: string) {
        if (buttonType == 'Map') {
            this.overrides.id = buttonsplit[5];
            if (buttonsplit[5].includes('+')) {
                const temp = buttonsplit[5].split('+');
                this.overrides.id = temp[0];
                const fm = temp[1];
                if (temp[1].includes(',')) {
                    this.overrides.filterMods = fm.split(',') as osumodcalc.types.Mod[];
                } else {
                    this.overrides.filterMods = [fm as osumodcalc.types.Mod];
                }
            }
            this.overrides.commandAs = 'interaction';
            this.overrides.commanduser = interaction.member.user as Discord.User;
            this.selected = new osu_maps.Map();

            await this.runCommand(interaction, buttonType, commandTools.getCmdId(), 'other', false);
            return true;
        }

        if (buttonType == 'User') {
            this.overrides.id = buttonsplit[5].split('+')[0];
            this.overrides.mode = buttonsplit[5].split('+')[1] as osuapi.types_v2.GameMode;
            this.overrides.commandAs = 'interaction';
            this.overrides.commanduser = interaction.member.user as Discord.User;

            this.selected = new osu_profiles.Profile();

            await this.runCommand(interaction, buttonType, commandTools.getCmdId(), 'other', false);
            return true;
        }
        if (buttonType == 'Leaderboard') {
            switch (cmd) {
                case 'map': {
                    const curEmbed = interaction.message.embeds[0];
                    // #<mode>/id
                    this.overrides.id = curEmbed.url.split('#')[1].split('/')[1];
                    this.overrides.mode = curEmbed.url.split('#')[1].split('/')[0] as osuapi.types_v2.GameMode;
                    const fm = curEmbed.title?.split('+')?.[1] && curEmbed.title?.split('+')?.[1] != 'NM'
                        ? curEmbed.title?.split('+')?.[1]
                        : null;
                    if (fm.includes(',')) {
                        this.overrides.filterMods = fm.split(',') as osumodcalc.types.Mod[];
                    } else if (fm != null) {
                        this.overrides.filterMods = [fm as osumodcalc.types.Mod];
                    }

                    this.overrides.commandAs = 'interaction';

                    this.overrides.commanduser = interaction.member.user as Discord.User;
                    this.selected = new osu_scores.MapLeaderboard();

                    await this.runCommand(interaction, buttonType, commandTools.getCmdId(), 'other', false);
                    return true;
                }
            }
        }

        if (buttonType == 'Scores') {
            this.overrides.id = buttonsplit[5].split('+')[0];
            this.overrides.user = buttonsplit[5].split('+')[1];
            this.overrides.commandAs = 'interaction';
            this.overrides.commanduser = interaction.member.user as Discord.User;
            this.selected = new osu_scores.MapScores();

            await this.runCommand(interaction, buttonType, commandTools.getCmdId(), 'other', false);
            return true;
        }
        return false;
    }

    commandSelect(cmd: string, interaction: Discord.ButtonInteraction) {
        switch (cmd.toLowerCase()) {
            case 'changelog':
                this.selected = new gen.Changelog();
                break;
            case 'compare':
                this.selected = new osu_other.Compare();
                break;
            case 'firsts':
                this.selected = new osu_scores.Firsts();
                break;
            case 'leaderboard':
                this.selected = new osu_other.ServerLeaderboard();
                break;
            case 'map':
                this.selected = new osu_maps.Map();
                break;
            case 'mapleaderboard':
                this.selected = new osu_scores.MapLeaderboard();
                break;
            case 'nochokes':
                this.overrides.miss = true;
                this.selected = new osu_scores.NoChokes();
                break;
            case 'profile':
                this.selected = new osu_profiles.Profile();
                break;
            case 'osutop':
                this.selected = new osu_scores.OsuTop();
                break;
            case 'pinned':
                this.selected = new osu_scores.Pinned();
                break;
            case 'ranking':
                this.selected = new osu_profiles.Ranking();
                break;
            case 'recent':
                this.selected = new osu_scores.Recent();
                break;
            case 'recentlist':
                this.selected = new osu_scores.RecentList();
                break;
            case 'recentactivity':
                this.selected = new osu_profiles.RecentActivity();
                break;
            case 'scoreparse':
                this.selected = new osu_scores.ScoreParse();
                break;
            case 'mapscores':
                this.selected = new osu_scores.MapScores();
                break;
            case 'scorestats':
                this.selected = new osu_scores.ScoreStats();
                break;
            case 'userbeatmaps':
                this.selected = new osu_maps.UserBeatmaps();
                break;
            case 'help':
                this.selected = new gen.Help();
                break;
            default:
                this.runFail(interaction);
                throw new Error('No command found');
        }
    }

    async runCommand(interaction: Discord.ButtonInteraction, buttonType: helper.bottypes.buttonType, id: number, overrideType?: "message" | "button" | "interaction" | "link" | "other", defer?: boolean) {
        if (defer) {
            await interaction.deferUpdate()
                .catch(error => { });
        }
        if (this.selected) {
            this.selected.setInput({
                message: overrideType == "other" ? null : interaction.message,
                interaction,
                args: [],
                date: new Date(),
                id,
                overrides: this.overrides,
                canReply: true,
                type: overrideType ?? "button",
                buttonType
            });
            await this.selected.execute();
        } else {
            this.runFail(interaction);
        }
        this.selected = null;
        this.overrides = null;
    }

    runFail(interaction: Discord.ButtonInteraction) {
        try {
            interaction.reply({
                content: 'There was an error trying to run this command',
                flags: Discord.MessageFlags.Ephemeral
            });
        } catch (e) {

        }
    }
}