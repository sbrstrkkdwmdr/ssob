import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as formatters from '../../tools/formatters';
import { Command } from '../command';

export class Help extends Command {
    declare protected params: {
        rdm: boolean;
        commandfound: boolean;
        commandCategory: string;
        command: string;
    };
    constructor() {
        super();
        this.name = 'Help';
        this.params = {
            rdm: false,
            commandfound: false,
            commandCategory: 'default',
            command: undefined,
        };
    }
    async setParamsMsg() {
        this.commanduser = this.input.message.author;
        this.params.command = this.input.args[0];
        if (!this.input.args[0]) {
            this.params.command = null;
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.commanduser = interaction?.member?.user ?? interaction?.user;
        this.params.command = interaction.options.getString('command');
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.commanduser = interaction?.member?.user ?? this.input.interaction?.user;
        if (this.input.buttonType == 'Random') {
            this.params.rdm = true;
        }
        switch (this.input.buttonType) {
            case 'Random':
                this.params.rdm = true;
                break;
            case 'Detailed':
                this.params.command = null;
                break;
        }
        const curembed: Discord.Embed = this.input.message.embeds[0];
        if (this.input.buttonType == 'Detailed' && curembed.description.includes('Prefix is')) {
            this.params.command = 'list';
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('command', 'ex');
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff
        if (this.params.rdm == true) {
            this.params.command = this.rdmp('cmds');
        }
        const buttons = new Discord.ActionRowBuilder()
            .setComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Random-${this.name}-${this.commanduser.id}-${this.input.id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.random),
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Detailed-${this.name}-${this.commanduser.id}-${this.input.id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.main.detailed)
            );

        this.getemb();

        const inputMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-SelectMenu1-help-${this.commanduser.id}-${this.input.id}`)
            .setPlaceholder('Select a command');

        const selectCategoryMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-SelectMenu2-help-${this.commanduser.id}-${this.input.id}`)
            .setPlaceholder('Select a command category')
            .setOptions(
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji('📜' as Discord.APIMessageComponentEmoji)
                    .setLabel('General')
                    .setValue('categorygen'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(helper.emojis.gamemodes.standard as Discord.APIMessageComponentEmoji)
                    .setLabel('osu! (profiles)')
                    .setValue('categoryosu_profile'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(helper.emojis.gamemodes.standard as Discord.APIMessageComponentEmoji)
                    .setLabel('osu! (scores)')
                    .setValue('categoryosu_scores'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(helper.emojis.gamemodes.standard as Discord.APIMessageComponentEmoji)
                    .setLabel('osu! (maps)')
                    .setValue('categoryosu_map'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(helper.emojis.gamemodes.standard as Discord.APIMessageComponentEmoji)
                    .setLabel('osu! (track)')
                    .setValue('categoryosu_track'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(helper.emojis.gamemodes.standard as Discord.APIMessageComponentEmoji)
                    .setLabel('osu! (other)')
                    .setValue('categoryosu_other'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji('🤖' as Discord.APIMessageComponentEmoji)
                    .setLabel('Admin')
                    .setValue('categoryadmin'),
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji('❓' as Discord.APIMessageComponentEmoji)
                    .setLabel('Misc')
                    .setValue('categorymisc'),
            );
        this.ctn.components.push(
            new Discord.ActionRowBuilder()
                .setComponents(selectCategoryMenu)
        );
        let curpick: helper.bottypes.commandInfo[] = commandTools.getCommands(this.params.commandCategory);

        if (curpick.length == 0) {
            curpick = commandTools.getCommands('general');
        }
        if (this.params.commandfound == true) {
            for (let i = 0; i < curpick.length && i < 25; i++) {
                inputMenu.addOptions(
                    new Discord.StringSelectMenuOptionBuilder()
                        .setEmoji('📜')
                        .setLabel(`#${i + 1}`)
                        .setDescription(curpick[i]?.name ?? '_')
                        .setValue(curpick[i].name)
                );

            }
            this.ctn.components.push(
                new Discord.ActionRowBuilder()
                    .setComponents(inputMenu));
        }
        await this.send();
    }
    commandEmb(command: helper.bottypes.commandInfo, embed) {
        let usetxt = '';
        if (command.usage) {
            usetxt += `\`${helper.vars.config.prefix}${command.usage}\``;
        }
        if (command.linkUsage) {
            usetxt += `### Link Usage\n${command.linkUsage.map(x => `\`${x}\``).join('\n')}`;
        }

        // let exceedTxt = '';
        // let exceeds = false;

        const commandaliases = command.aliases && command.aliases.length > 0 ? command.aliases.join(', ') : 'none';
        // let commandexamples = command.examples && command.examples.length > 0 ? command.examples.join('\n').replaceAll('PREFIXMSG', helper.vars.config.prefix) : 'none'
        const commandexamples = command.examples && command.examples.length > 0 ? command.examples.slice(0, 5).map(x => x.text).join('\n').replaceAll('PREFIXMSG', helper.vars.config.prefix) : 'none';

        embed.setTitle("Command info for: " + command.name)
            .setURL(`https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands.html`)
            .setDescription("To see full details about this command, visit [here](https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands.html)\n\n" + command.description + "\n")
            .addFields([
                {
                    name: 'Usage',
                    value: usetxt,
                    inline: false,
                },
                {
                    name: 'Aliases',
                    value: commandaliases,
                    inline: false
                },
                {
                    name: 'Examples',
                    value: commandexamples,
                    inline: false
                },
            ]);
    }
    /**
     *  TDL - fix this
     *  too long and complex
     *  make into smaller separate functions
     * */
    getemb() {
        if (this.params.command == 'list') {
            const commandlist: {
                category: string;
                cmds: string[];
            }[] = [];

            for (const cmd of helper.commandData.cmds) {
                if (commandlist.map(x => x.category).includes(cmd.category)) {
                    const idx = commandlist.map(x => x.category).indexOf(cmd.category);
                    commandlist[idx].cmds.push(cmd.name);
                } else {
                    commandlist.push({
                        category: cmd.category,
                        cmds: [cmd.name],
                    });
                }
            }

            const clembed = new Discord.EmbedBuilder()
                .setColor(helper.colours.embedColour.info.dec)
                .setTitle('Command List')
                .setURL('https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands')
                .setDescription('use `/help <command>` to get more info on a command')
                .addFields(
                    commandlist.map(x => {
                        return {
                            name: x.category.replace('_', ' '),
                            value: x.cmds.map(x => '`' + x + '`').join(', ')
                        };
                    })
                )
                .setFooter({
                    text: 'Website: https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands | Github: https://github.com/sbrstrkkdwmdr/ssob/tree/ts'
                });
            this.ctn.embeds = [clembed];
            this.params.commandCategory = 'default';
        } else if (this.params.command != null) {
            const fetchcmd = this.params.command;
            const commandInfo = new Discord.EmbedBuilder()
                .setColor(helper.colours.embedColour.info.dec);
            if (this.params.command.includes('button')) {
                this.params.commandfound = false;
                this.params.commandCategory = 'default';
                let desc = 'List of all buttons available';
                let buttonstxt = '\n';
                for (let i = 0; i < helper.commandData.buttons.length; i++) {
                    const curbtn = helper.commandData.buttons[i];
                    buttonstxt += `${curbtn.emoji}\`${curbtn.name}\`: ${curbtn.description}\n`;
                }
                desc += buttonstxt;
                commandInfo.setTitle('Buttons')
                    .setDescription(desc);
            } else if (commandTools.getCommand(fetchcmd)) {
                const res = commandTools.getCommand(fetchcmd);
                this.params.commandfound = true;
                this.params.commandCategory = res.category;
                this.commandEmb(res, commandInfo);
            } else if (this.params.command.toLowerCase().includes('category')) {
                let sp = this.params.command.toLowerCase().split('category')[1];
                if (sp == 'all') {
                    this.params.command = 'list';
                    this.getemb();
                } else {
                    let c = this.categorise(sp);
                    if (c != '') {
                        commandInfo
                            .setTitle(formatters.toCapital(sp) + " Commands")
                            .setDescription(c);
                        this.params.commandCategory = sp;
                    } else {
                        this.params.command = null;
                        this.getemb();
                        return;
                    }
                }
            }
            else {
                this.params.command = null;
                this.getemb();
                return;
            }

            this.ctn.embeds = [commandInfo];
        } else {
            this.ctn.embeds = [new Discord.EmbedBuilder()
                .setColor(helper.colours.embedColour.info.dec)
                .setTitle('Help')
                .setURL('https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands')
                .setDescription(`Prefix is: MSGPREFIX
- Use \`MSGPREFIXhelp <command>\` to get more info on a command or \`/help list\` to get a list of commands
- \`MSGPREFIXhelp category<category>\` will list only commands from that category
- Arguments are shown as either <arg> or [arg]. Angled brackets "<arg>" are required and square brackets "[arg]" are optional.
- Argument values can be specified with \`-key value\` (eg. \`-page 3\`)
- Argument values with spaces (such as names) can be specified with quotes eg. "saber strike"
- You can use \`MSGPREFIXosuset\` to automatically set your osu! username and gamemode for commands such as \`recent\` (rs)
- Mods are specified with +[mods] (include), -mx [mods] (match exact) or -me [mods] (exclude). -mx overrides +[mods]
- Gamemode can be specified by using -(mode) in commands that support it (eg. -taiko)
`.replaceAll('MSGPREFIX', helper.vars.config.prefix))
                .setFooter({
                    text: 'Website: https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands | Github: https://github.com/sbrstrkkdwmdr/ssob/tree/ts'
                })];
            this.params.commandCategory = 'default';
        }
    }
    rdmp(w: string) {
        const fullyrando = Math.floor(Math.random() * helper.commandData[w].length);
        return helper.commandData.cmds[fullyrando].name;
    }
    categorise(type: string) {
        let desctxt = '';
        const cmds = commandTools.getCommands(type);
        for (let i = 0; i < cmds.length; i++) {
            desctxt += `\n\`${cmds[i].name}\`: ${cmds[i].description.split('.')[0]}`;
        }
        this.params.commandfound = true;
        if (desctxt.length > 4000) {
            desctxt = desctxt.slice(0, 3900);
            desctxt += "\n\nThe text has reached maximum length. See [here](https://sbrstrkkdwmdr.github.io/projects/ssob_docs/commands) for the rest of the commands";
        }
        return desctxt;
    }
}