import * as Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import { Command } from './commands/command';
import * as helper from './helper';
// message = interaction.message
const buttonWarnedUsers = new Set();
let command: Command;
let foundCommand = true;
let mainId: number;
export async function onInteraction(interaction: Discord.Interaction) {
    if (!(interaction.type == Discord.InteractionType.MessageComponent || interaction.type == Discord.InteractionType.ModalSubmit)) return;
    if (interaction.applicationId != helper.vars.client?.application?.id) return;
    let overrides: helper.bottypes.overrides = {
        commandAs: 'button',
    };
    let canReply = true;
    if (!helper.checks.botHasPerms(interaction, ['ReadMessageHistory'])) {
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
    mainId = +buttonsplit[4];

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
    const commandType = 'button';
    if (specid && specid != 'any' && specid != interaction.user.id) {
        if (!buttonWarnedUsers.has(interaction.member.user.id)) {
            await interaction.reply({
                content: 'You cannot use this button',
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            buttonWarnedUsers.add(interaction.member.user.id);
            setTimeout(() => {
                buttonWarnedUsers.delete(interaction.member.user.id);
            }, 1000 * 60 * 60 * 24);
        } else {
            interaction.deferUpdate()
                .catch(error => { });
        }
        return;
    }
    const errorEmbed = new Discord.EmbedBuilder()
        .setTitle('Error - Button does not work')
        .setDescription('Feature not yet implemented/supported');

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
            .setCustomId(`${helper.versions.releaseDate}-SearchMenu-${cmd}-${interaction.user.id}-${mainId}`)
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
                    overrides.id = ((interaction as Discord.BaseInteraction) as Discord.SelectMenuInteraction).values[0];
                    // @ts-expect-error TS2339: Property 'components' does not exist on type 'TopLevelComponent'.
                    if (interaction?.message?.components[2]?.components[0]) {
                        // @ts-expect-error TS2339: Property 'components' does not exist on type 'TopLevelComponent'.
                        overrides.overwriteModal = interaction.message.components[2].components[0] as any;
                    }
                }
                break;
            case 'help':
                {
                    overrides.ex = ((interaction as Discord.BaseInteraction) as Discord.SelectMenuInteraction).values[0];
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
            overrides.page = parseInt(((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(0).value);
        }
    }
    if (buttonType == 'SortMenu' && ScoreSortCommands.includes(cmd)) {
        overrides.sort = ((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(0).value;
        overrides.reverse = ((interaction as Discord.BaseInteraction) as Discord.ModalSubmitInteraction).fields.fields.at(1).value as unknown as boolean;
    }

    if (buttonType == 'Map') {
        overrides.id = buttonsplit[5];
        if (buttonsplit[5].includes('+')) {
            const temp = buttonsplit[5].split('+');
            overrides.id = temp[0];
            const fm = temp[1];
            if (temp[1].includes(',')) {
                overrides.filterMods = fm.split(',') as osumodcalc.types.Mod[];
            } else {
                overrides.filterMods = [fm as osumodcalc.types.Mod];
            }
        }
        overrides.commandAs = 'interaction';
        overrides.commanduser = interaction.member.user as Discord.User;
        mainId = helper.commandTools.getCmdId();
        command = new helper.cmd_osu_maps.Map();
        foundCommand = true;
        await runCommand(interaction, buttonType, overrides, 'other', false);
        return;
    }

    if (buttonType == 'User') {
        overrides.id = buttonsplit[5].split('+')[0];
        overrides.mode = buttonsplit[5].split('+')[1] as helper.osuapi.types_v2.GameMode;
        overrides.commandAs = 'interaction';
        overrides.commanduser = interaction.member.user as Discord.User;

        mainId = helper.commandTools.getCmdId();
        command = new helper.cmd_osu_profiles.Profile();
        foundCommand = true;
        await runCommand(interaction, buttonType, overrides, 'other', false);
        return;
    }
    if (buttonType == 'Leaderboard') {
        switch (cmd) {
            case 'map': {
                const curEmbed = interaction.message.embeds[0];
                // #<mode>/id
                overrides.id = curEmbed.url.split('#')[1].split('/')[1];
                overrides.mode = curEmbed.url.split('#')[1].split('/')[0] as helper.osuapi.types_v2.GameMode;
                const fm = curEmbed.title?.split('+')?.[1] && curEmbed.title?.split('+')?.[1] != 'NM'
                    ? curEmbed.title?.split('+')?.[1]
                    : null;
                if (fm.includes(',')) {
                    overrides.filterMods = fm.split(',') as osumodcalc.types.Mod[];
                } else if (fm != null) {
                    overrides.filterMods = [fm as osumodcalc.types.Mod];
                }

                overrides.commandAs = 'interaction';

                overrides.commanduser = interaction.member.user as Discord.User;
                mainId = helper.commandTools.getCmdId();
                command = new helper.cmd_osu_scores.MapLeaderboard();
                foundCommand = true;
                await runCommand(interaction, buttonType, overrides, 'other', false);
                return;
            }
        }
    }

    if (buttonType == 'Scores') {
        overrides.id = buttonsplit[5].split('+')[0];
        overrides.user = buttonsplit[5].split('+')[1];
        overrides.commandAs = 'interaction';
        overrides.commanduser = interaction.member.user as Discord.User;
        command = new helper.cmd_osu_scores.MapScores();
        foundCommand = true;
        await runCommand(interaction, buttonType, overrides, 'other', false);
        return;
    }

    const nopingcommands = ['scorestats'];

    switch (cmd.toLowerCase()) {
        case 'changelog':
            command = new helper.cmd_gen.Changelog();
            foundCommand = true;
            break;
        case 'compare':
            command = new helper.cmd_osu_other.Compare();
            foundCommand = true;
            break;
        case 'firsts':
            command = new helper.cmd_osu_scores.Firsts();
            foundCommand = true;
            break;
        case 'leaderboard':
            command = new helper.cmd_osu_other.ServerLeaderboard();
            foundCommand = true;
            break;
        case 'map':
            command = new helper.cmd_osu_maps.Map();
            foundCommand = true;
            break;
        case 'mapleaderboard':
            command = new helper.cmd_osu_scores.MapLeaderboard();
            foundCommand = true;
            break;
        case 'nochokes':
            overrides.miss = true;
            command = new helper.cmd_osu_scores.NoChokes();
            foundCommand = true;
            break;
        case 'profile':
            command = new helper.cmd_osu_profiles.Profile();
            foundCommand = true;
            break;
        case 'osutop':
            command = new helper.cmd_osu_scores.OsuTop();
            foundCommand = true;
            break;
        case 'pinned':
            command = new helper.cmd_osu_scores.Pinned();
            foundCommand = true;
            break;
        case 'ranking':
            command = new helper.cmd_osu_profiles.Ranking();
            foundCommand = true;
            break;
        case 'recent':
            command = new helper.cmd_osu_scores.Recent();
            foundCommand = true;
            break;
        case 'recentlist':
            command = new helper.cmd_osu_scores.RecentList();
            foundCommand = true;
            break;
        case 'recentactivity':
            command = new helper.cmd_osu_profiles.RecentActivity();
            foundCommand = true;
            break;
        case 'scoreparse':
            command = new helper.cmd_osu_scores.ScoreParse();
            foundCommand = true;
            break;
        case 'mapscores':
            command = new helper.cmd_osu_scores.MapScores();
            foundCommand = true;
            break;
        case 'scorestats':
            command = new helper.cmd_osu_scores.ScoreStats();
            foundCommand = true;
            break;
        case 'userbeatmaps':
            command = new helper.cmd_osu_maps.UserBeatmaps();
            foundCommand = true;
            break;
        case 'help':
            command = new helper.cmd_gen.Help();
            foundCommand = true;
            break;
        default:
            runFail(interaction);
            return;
    }
    runCommand(interaction, buttonType, overrides, null, true);
}

async function runCommand(interaction: Discord.ButtonInteraction, buttonType: helper.bottypes.buttonType, overrides: helper.bottypes.overrides, overrideType?: "message" | "button" | "interaction" | "link" | "other", defer?: boolean) {
    if (defer) {
        await interaction.deferUpdate()
            .catch(error => { });
    }
    if (foundCommand && command) {
        command.setInput({
            message: overrideType == "other" ? null : interaction.message,
            interaction,
            args: [],
            date: new Date(),
            id: mainId,
            overrides,
            canReply: true,
            type: overrideType ?? "button",
            buttonType
        });
        await command.execute();
    } else {
        runFail(interaction);
    }
}

function runFail(interaction: Discord.ButtonInteraction) {
    try {
        interaction.reply({
            content: 'There was an error trying to run this command',
            flags: Discord.MessageFlags.Ephemeral
        });
    } catch (e) {

    }
}