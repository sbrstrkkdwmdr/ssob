import * as Discord from 'discord.js';
import fs from 'fs';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../helper';
import * as log from './log';
import * as osuapi from './osuapi';
import * as other from './other';
export async function sendMessage(input: {
    type: 'message' | 'interaction' | 'link' | 'button' | "other",
    message: Discord.Message<any>,
    interaction: Discord.ChatInputCommandInteraction<any> | Discord.ButtonInteraction<any>;
    args: {
        content?: string,
        embeds?: (Discord.EmbedBuilder | Discord.Embed)[],
        files?: (string | Discord.AttachmentBuilder | Discord.Attachment)[],
        components?: Discord.ActionRowBuilder<any>[],
        ephemeral?: boolean,
        react?: boolean,
        edit?: boolean,
        editAsMsg?: boolean,
    };
},
    canReply: boolean
) {
    if (input.args.files) {
        input.args.files = checkFileLimit(input.args.files);
    }

    try {
        switch (input.type) {
            case 'message': case 'link': {
                if (!canReply) {
                    (input.message.channel as Discord.GuildTextBasedChannel).send({
                        content: `${input.args.content ?? ''}`,
                        embeds: input.args.embeds ?? [],
                        files: input.args.files ?? [],
                        components: input.args.components ?? [],
                    })
                        .catch(x => console.log(x));
                } else if (input.args.editAsMsg) {
                    try {
                        input.message.edit({
                            content: `${input.args.content ?? ''}`,
                            embeds: input.args.embeds ?? [],
                            files: input.args.files ?? [],
                            components: input.args.components ?? [],
                        });
                    } catch (err) {

                    }
                } else {
                    input.message.reply({
                        content: `${input.args.content ?? ''}`,
                        embeds: input.args.embeds ?? [],
                        files: input.args.files ?? [],
                        components: input.args.components ?? [],
                        allowedMentions: { repliedUser: false },
                        failIfNotExists: true
                    })
                        .catch(err => {
                            sendMessage(input, false);
                        });
                }
            }
                break;
            case 'interaction': {
                if (input.args.edit == true) {
                    setTimeout(() => {
                        (input.interaction as Discord.ChatInputCommandInteraction<any>).editReply({
                            content: `${input.args.content ?? ''}`,
                            embeds: input.args.embeds ?? [],
                            files: input.args.files ?? [],
                            components: input.args.components ?? [],
                            allowedMentions: { repliedUser: false },
                        })
                            .catch();
                    }, 1000);
                } else {
                    if (input.interaction.replied) {
                        input.args.edit = true;
                        sendMessage(input, canReply);
                    } else {
                        (input.interaction as Discord.ChatInputCommandInteraction<any>).reply({
                            content: `${input.args.content ?? ''}`,
                            embeds: input.args.embeds ?? [],
                            files: input.args.files ?? [],
                            components: input.args.components ?? [],
                            allowedMentions: { repliedUser: false },
                            // ephemeral: input.args.ephemeral ?? false,
                            flags: input.args.ephemeral ? Discord.MessageFlags.Ephemeral : null,
                        })
                            .catch();
                    }
                }
            }
            case 'button': {
                input.message.edit({
                    content: `${input.args.content ?? ''}`,
                    embeds: input.args.embeds ?? [],
                    files: input.args.files ?? [],
                    components: input.args.components ?? [],
                    allowedMentions: { repliedUser: false },
                })
                    .catch();
            }
                break;
        }
    } catch (error) {
        return error;
    }
    return true;
}

export function checkFileLimit(files: any[]) {
    if (files.length > 10) {
        return files.slice(0, 9);
    } else {
        return files;
    }
}

// export function parseScoreListArgs() { }
// export function parseScoreListArgs_message() { }
// export function parseScoreListArgs_interaction() { }
// export function parseScoreListArgs_button() { }

export type params = {
    error?: boolean,
    searchid?: string,
    user?: string,
    page?: number,
    maxPage?: number,
    mode?: osuapi.types_v2.GameMode,
    userId?: string,
    mapId?: number,
    spotlight?: string | number,
    detailed?: number,
    filter?: string,
    list?: boolean, //recent
    fails?: 1 | 0, //recent
    nochokes?: boolean, //top
    rankingtype?: osuapi.types_v2.RankingType, //ranking
    country?: string, //ranking
    //scorelist AND ubm
    parse?: boolean,
    parseId?: number,
    filterTitle?: string,
    //scorelist
    sortScore?: "score" | "rank" | "pp" | "recent" | "acc" | "combo" | "miss",
    reverse?: boolean,
    filterMapper?: string,
    filterMods?: string,
    filterRank?: osuapi.types_v2.Rank,
    modsInclude?: osumodcalc.types.Mod[],
    modsExact?: (osumodcalc.types.Mod | "NONE")[],
    modsExclude?: osumodcalc.types.Mod[],
    filterPp?: string,
    filterScore?: string,
    filterAcc?: string,
    filterCombo?: string,
    filterMiss?: string,
    filterBpm?: string,

    sort?: "score" | "rank" | "pp" | "recent" | "acc" | "combo" | "miss" | helper.bottypes.ubmSort,

    //map
    overrideSpeed?: number,
    overrideBpm?: number,
    ppCalc?: boolean,
    maptitleq?: string,

    //ubm
    sortMap?: helper.bottypes.ubmSort,
    mapType?: helper.bottypes.ubmFilter,
    //compare
    searchIdFirst?: string,
    searchIdSecond?: string,
    compareFirst?: string,
    compareSecond?: string,
    type?: string,
};

export function getButtonArgs(commandId: string | number) {
    if (fs.existsSync(`${helper.path.main}/cache/params/${commandId}.json`)) {
        const x = fs.readFileSync(`${helper.path.main}/cache/params/${commandId}.json`, 'utf-8');
        return JSON.parse(x) as params;
    }
    return {
        error: true
    };
}

export function storeButtonArgs(commandId: string | number, params: params) {
    if (params?.page < 1) {
        params.page = 1;
    }
    fs.writeFileSync(`${helper.path.main}/cache/params/${commandId}.json`, JSON.stringify(params, null, 2));
}

export function buttonPage(page: number, max: number, button: helper.bottypes.buttonType) {
    switch (button) {
        case 'BigLeftArrow':
            page = 1;
            break;
        case 'LeftArrow':
            page--;
            break;
        case 'RightArrow':
            page++;
            break;
        case 'BigRightArrow':
            page = max;
            break;
    }
    return page;
}

export function buttonDetail(level: number, button: helper.bottypes.buttonType) {
    switch (button) {
        case 'Detail0':
            level = 0;
            break;
        case 'Detail1': case 'DetailDisable':
            level = 1;
            break;
        case 'Detail2': case 'DetailEnable':
            level = 2;
            break;
    }
    return level;
}

export async function pageButtons(command: string, commanduser: Discord.User | Discord.APIUser, commandId: string | number) {
    const pgbuttons= new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-BigLeftArrow-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.page.first).setDisabled(false),
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-LeftArrow-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.page.previous),
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-Search-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.page.search),
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-RightArrow-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.page.next),
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-BigRightArrow-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.page.last),
        );
    return pgbuttons as Discord.ActionRowBuilder<Discord.ButtonBuilder>;
}

export async function buttonsAddDetails(command: string, commanduser: Discord.User | Discord.APIUser, commandId: string | number, buttons: Discord.ActionRowBuilder, detailed: number,
    disabled?: {
        compact: boolean,
        compact_rem: boolean,
        detailed: boolean,
        detailed_rem: boolean,
    }
) {
    switch (detailed) {
        case 0: {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Detail1-${command}-${commanduser.id}-${commandId}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.main.detailMore),
            );
        }
            break;
        case 1: {
            const temp: Discord.RestOrArray<Discord.AnyComponentBuilder> = [];

            const set0 = new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-Detail0-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.main.detailLess);
            const set2 = new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-Detail2-${command}-${commanduser.id}-${commandId}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.main.detailMore);

            if (disabled) {
                if (disabled.compact == false) {
                    disabled.compact_rem ?
                        null :
                        temp.push(set0.setDisabled(true));
                } else {
                    temp.push(set0);
                }
                if (disabled.detailed == false) {
                    disabled.detailed_rem ?
                        null :
                        temp.push(set2.setDisabled(true));
                } else {
                    temp.push(set2);
                }
            } else {
                temp.push(set0, set2);
            }



            buttons.addComponents(temp);
        }
            break;
        case 2: {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Detail1-${command}-${commanduser.id}-${commandId}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.main.detailLess),
            );
        }
            break;
    }
    return { buttons };
}

/**
 * 
 * @param args 
 * @returns args with 0 length strings and args starting with the - prefix removed
 */
export function cleanArgs(args: string[]) {
    const newArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] != '' && !args[i].startsWith('-')) {
            newArgs.push(args[i]);
        }
    }
    return newArgs;
}

export function getCmdId() {
    helper.vars.id++;
    return helper.vars.id;
}

export function startType(object: Discord.Message | Discord.Interaction) {
    try {
        (object.channel as Discord.GuildTextBasedChannel).sendTyping();
        setTimeout(() => {
            return;
        }, 1000);
    } catch (error) {

    }
}

export async function missingPrevID_map(input: helper.bottypes.commandInput, name: string) {
    if (input.type != 'button' && input.type != 'link') {
        await sendMessage({
            type: input.type,
            message: input.message,
            interaction: input.interaction,
            args: {
                content: helper.errors.map.m_msp,
                edit: true
            }
        }, input.canReply);
    }
    log.commandErr(
        helper.errors.map.m_msp,
        input.id,
        name,
        input.message,
        input.interaction
    );
    return;
}

export function disableAllButtons(msg: Discord.Message) {
    let components: Discord.ActionRowBuilder<any>[] = [];
    for (const actionrow of msg.components) {
        let newActionRow = new Discord.ActionRowBuilder();
        // @ts-expect-error TS2339: Property 'components' does not exist on type 'FileComponent'.
        for (let button of actionrow.components) {
            let newbutton: Discord.ButtonBuilder
                | Discord.StringSelectMenuBuilder
                | Discord.UserSelectMenuBuilder
                | Discord.RoleSelectMenuBuilder
                | Discord.MentionableSelectMenuBuilder
                | Discord.ChannelSelectMenuBuilder;
            switch (button.type) {
                case Discord.ComponentType.Button: {
                    newbutton = Discord.ButtonBuilder.from(button);
                }
                    break;
                case Discord.ComponentType.StringSelect: {
                    newbutton = Discord.StringSelectMenuBuilder.from(button);
                }
                    break;
                case Discord.ComponentType.UserSelect: {
                    newbutton = Discord.UserSelectMenuBuilder.from(button);
                }
                    break;
                case Discord.ComponentType.RoleSelect: {
                    newbutton = Discord.RoleSelectMenuBuilder.from(button);
                }
                    break;
                case Discord.ComponentType.MentionableSelect: {
                    newbutton = Discord.MentionableSelectMenuBuilder.from(button);
                }
                    break;
                case Discord.ComponentType.ChannelSelect: {
                    newbutton = Discord.ChannelSelectMenuBuilder.from(button);
                }
                    break;
            }
            newbutton.setDisabled();
            newActionRow.addComponents(newbutton);
        }

        components.push(newActionRow);
    }
    msg.edit({
        components,
        allowedMentions: { repliedUser: false }
    });
}

export function getCommand(query: string): helper.bottypes.commandInfo {
    return helper.commandData.cmds.find(
        x => x.aliases.concat([x.name]).map(x => x.toLowerCase()).includes(query.toLowerCase())
    );


}

export function getCommands(query?: string): helper.bottypes.commandInfo[] {
    return helper.commandData.cmds.filter(
        x => x.category.includes(query)
    ) ?? helper.commandData.cmds;
}