import Discord from 'discord.js';
import * as fs from 'fs';
import moment from 'moment';
import pkgjson from '../../package.json';
import * as helper from '../helper';
import * as calculate from '../tools/calculate';
import * as colourcalc from '../tools/colourcalc';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as log from '../tools/log';
import { Command } from './command';

export class Changelog extends Command {
    declare protected params: {
        version: string;
        useNum: number;
        isList: boolean;
        page: number;
        foundBool: boolean;
    };
    constructor() {
        super();
        this.name = 'Changelog';
        this.params = {
            version: null,
            useNum: null,
            isList: false,
            page: null,
            foundBool: false,
        };
    }
    async setParamsMsg() {
        this.setParamPage();
        this.params.version = this.input.args[0] ?? null;

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;

        this.params.version = interaction.options.getString('version');
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.commanduser = interaction?.member?.user ?? this.input.interaction?.user;

        const curpage = parseInt(
            this.input.message.embeds[0].footer.text.split('/')[0]
        ) - 1;
        switch (this.input.buttonType) {
            case 'BigLeftArrow':
                this.params.useNum = 0;
                this.params.foundBool = true;
                break;
            case 'LeftArrow':
                this.params.useNum = curpage - 1;
                this.params.foundBool = true;
                break;
            case 'RightArrow':
                this.params.useNum = curpage + 1;
                this.params.foundBool = true;
                break;
            case 'BigRightArrow':
                this.params.useNum = parseInt(
                    this.input.message.embeds[0].footer.text.split('/')[1]
                ) - 1;
                this.params.foundBool = true;
                break;
            default:
                this.params.useNum = curpage;
                break;
        }
        if (this.input.message.embeds[0].title.toLowerCase().includes('all versions')) {
            this.params.version = 'versions';
            this.params.isList = true;
        }

        switch (this.input.buttonType) {
            case 'Detail0':
                this.params.isList = false;
                this.params.version = null;
                break;
            case 'Detail1':
                this.params.isList = true;
                this.params.version = 'versions';
                break;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        const buttons = new Discord.ActionRowBuilder();
        //get version
        let found: string | number = null;
        if (this.params.version) {
            //search for version
            if (this.params.version?.includes('.')) {
                found = helper.versions.versions.findIndex(x =>
                    this.params.version.trim() === `${x.name}`.trim() || this.params.version.includes(`${x.releaseDate}`) || this.params.version.includes(`${x.releaseDate}`)
                    || (`${x.releaseDate}`).includes(this.params.version) || `${x.releaseDate}`.includes(this.params.version)
                );
                this.params.foundBool = true;
                if (found == -1) {
                    found = null;
                }
            } else {
                switch (this.params.version.toLowerCase()) {
                    case 'wip': case 'pending': case 'next':
                        found = 0;
                        this.params.useNum = 0;
                        this.params.foundBool = true;
                        break;
                    case 'first': case 'original':
                        found = helper.versions.versions.length - 1;
                        this.params.useNum = helper.versions.versions.length - 1;
                        this.params.foundBool = true;
                        break;
                    case 'second':
                        found = helper.versions.versions.length - 2;
                        this.params.useNum = helper.versions.versions.length - 2;
                        this.params.foundBool = true;
                        break;
                    case 'third':
                        found = helper.versions.versions.length - 3;
                        this.params.useNum = helper.versions.versions.length - 3;
                        this.params.foundBool = true;
                        break;
                    case 'latest':
                        found = 1;
                        this.params.useNum = 1;
                        this.params.foundBool = true;
                        break;
                    case 'versions': case 'list': case 'all':
                        this.params.foundBool = true;
                    default:
                        found = 'string';
                        break;
                }
            }
        }
        if (((!this.params.foundBool && found != 'string') || (this.params.page && found == 'string')) && !this.input.buttonType) {
            this.params.useNum = this.params.page ? this.params.page - 1 : null;
        }
        if (this.params.useNum < 1 && !this.params.foundBool) {
            this.params.useNum = found && !isNaN(+found) ?
                +found :
                typeof found === 'string' ?
                    0 : 1;
        }
        if (!this.params.useNum && found) {
            this.params.useNum = +found;
        }
        const Embed = new Discord.EmbedBuilder();
        const exceeded = 'Exceeded character limit. Please click [here](https://github.com/sbrstrkkdwmdr/ssob/blob/main/changelog.md) to view the changelog.';
        if (isNaN(this.params.useNum) || !this.params.useNum) this.params.useNum = 0;
        if (typeof found == 'string') {
            this.params.isList = true;
            // let txt = '' helper.versions.versions.map(x => `\`${(x.name).padEnd(10)} (${x.releaseDate})\``).join('\n');
            const doc = fs.readFileSync(`${helper.path.main}/cache/changelog.md`, 'utf-8');
            let txt = '\`VERSION      |    DATE    | CHANGES\`\n';
            const list = doc.split('## [');
            list.shift();
            if (this.params.useNum + 1 >= Math.ceil(helper.versions.versions.length / 10)) {
                this.params.useNum = Math.ceil(helper.versions.versions.length / 10) - 1;
            }
            const pageOffset = this.params.useNum * 10;
            for (let i = 0; pageOffset + i < helper.versions.versions.length && i < 10; i++) {
                const sumVer = helper.versions.versions[pageOffset + i];
                const useVer = list[pageOffset + i];
                const changes = useVer?.split('</br>')[1]?.split('\n')
                    .map(x => x.trim()).filter(x => x.length > 2 && !x.includes('### ')) ?? [];
                txt += `\`${(sumVer.name).padEnd(12)} | ${sumVer.releaseDate} | ${changes.length}\`\n`;
            }
            if (txt.length > 2000) {
                txt = exceeded;
            }
            Embed.setTitle('All Versions')
                .setDescription(txt)
                .setFooter({
                    text: `${this.params.useNum + 1}/${Math.ceil(helper.versions.versions.length / 10)}`
                });
            this.params.foundBool ? null : Embed.setAuthor({ name: `\nThere was an error trying to find version \`${this.params.version}\`` });
        } else {
            const document = /* useGit ? */
                fs.readFileSync(`${helper.path.main}/cache/changelog.md`, 'utf-8');
            /*             :
                        fs.readFileSync(`${precomphelper.path.main}/changelog.txt`, 'utf-8'); */
            const list = document.split('## [');
            list.shift();
            if (this.params.useNum >= list.length) {
                this.params.useNum = list.length - 1;
            }
            const cur = list[this.params.useNum] as string;
            const verdata = helper.versions.versions[this.params.useNum];
            const commit = cur.split('[commit](')[1].split(')')[0];
            const commitURL = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/[^\s]*)?$/g.test(commit) ?
                commit :

                pkgjson['repository']['url'] +
                commit.replaceAll(/[^a-z0-9]/g, '');
            const changesTxt = cur.includes('</br>') ? cur.split('</br>')[1] :
                cur.split('\n').slice(3).join('\n');
            const changesList =
                changesTxt ?
                    changesTxt.split('\n')
                        .map(x => x.trim())
                        .filter(x => x.length > 2) : [];
            let txt = '';
            for (const change of changesList) {
                if (change.startsWith('###')) {
                    const temp = change.replaceAll('###', '').trim();
                    switch (temp) {
                        case 'Fixed':
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "yellow", "text");
                            break;
                        case 'Changed':
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "blue", "text");
                            break;
                        case 'Added':
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "green", "text");
                            break;
                        case 'Removed':
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "red", "text");
                            break;
                        case 'Deprecated':
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "pink", "text");
                            break;
                        default:
                            txt += colourcalc.codeBlockColourText(temp.toUpperCase(), "cyan", "text");
                            break;
                    }
                } else {
                    txt += change.replace('-', '`-`') + '\n';
                }
            }
            txt = txt.slice(0, 2000);
            if (txt.trim().length == 0) {
                txt = '\nNo changes recorded';
            }

            if (txt.length > 2000) {
                txt = exceeded;
            }

            Embed
                .setTitle(`${verdata.name.trim()} Changelog`)
                .setURL('https://github.com/sbrstrkkdwmdr/ssob/blob/dev/changelog.md')
                .setDescription(`commit [${commit.includes('commit/') ?
                    commitURL.split('commit/')[1].trim()?.slice(0, 7)?.trim() : 'null'}](${commitURL})
Released ${verdata.releaseDate}
Total of ${changesList.filter(x => !x.includes('### ')).length} changes.${txt}
`)
                .setFooter({
                    text: `${this.params.useNum + 1}/${helper.versions.versions.length}`
                });
        }

        if (this.params.isList) {
            buttons
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-Detail0-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailLess),
                );
        } else {
            buttons
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-Detail1-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailMore),
                );
        }

        if (this.params.useNum == 0) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }
        if ((this.params.useNum + 1 >= helper.versions.versions.length && !this.params.isList) || (this.params.useNum + 1 >= Math.ceil(helper.versions.versions.length / 10) && this.params.isList)) {
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }

        this.ctn.embeds = [Embed];
        this.ctn.components = [pgbuttons, buttons];
        this.send();
    }

}
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
        this.send();
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
export class Info extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Info';
    }
    async setParamsMsg() {
        this.commanduser = this.input.message.author;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.commanduser = interaction?.member?.user ?? interaction?.user;
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const buttons: Discord.ActionRowBuilder = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setLabel('Info')
                    .setURL('https://sbrstrkkdwmdr.github.io/projects/ssob_docs/')
                    .setStyle(Discord.ButtonStyle.Link)
            );

        const curGuildSettings = await helper.vars.guildSettings.findOne({ where: { guildid: this.input.message?.guildId } });
        const serverpfx = curGuildSettings.dataValues.prefix;

        const data = {
            deps: `Typescript: [${pkgjson.dependencies['typescript'].replace('^', '')}](https://www.typescriptlang.org/)
Discord.js: [${pkgjson.dependencies['discord.js'].replace('^', '')}](https://discord.js.org/#/docs)
rosu-pp: [${pkgjson.dependencies['rosu-pp-js'].replace('^', '')}](https://github.com/MaxOhn/rosu-pp-js)
Axios: [${pkgjson.dependencies['axios'].replace('^', '')}](https://github.com/axios/axios)
Sequelize: [${pkgjson.dependencies['sequelize'].replace('^', '')}](https://github.com/sequelize/sequelize/)
Chart.js: [${pkgjson.dependencies['chart.js'].replace('^', '')}](https://www.chartjs.org/)
sqlite3: [${pkgjson.dependencies['sqlite3'].replace('^', '')}](https://github.com/TryGhost/node-sqlite3)`,
            uptime: `${calculate.secondsToTime(helper.vars.client.uptime / 1000)}`,
            version: pkgjson.version,
            preGlobal: helper.vars.config.prefix.includes('`') ? `"${helper.vars.config.prefix}"` : `\`${helper.vars.config.prefix}\``,
            preServer: serverpfx.includes('`') ? `"${serverpfx}"` : `\`${serverpfx}\``,
            server: helper.versions.serverURL,
            website: helper.versions.website,
            creator: 'https://sbrstrkkdwmdr.github.io/',
            source: `https://github.com/sbrstrkkdwmdr/ssob/`,
            shards: helper.vars.client?.shard?.count ?? 1,
            guilds: helper.vars.client.guilds.cache.size,
            users: helper.vars.client.users.cache.size,

        };
        const Embed = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.info.dec)
            .setTitle('Bot Information');
        if (this.input.args.length > 0) {
            ['uptime', 'server', 'website', 'timezone', 'version', 'v', 'dependencies', 'deps', 'source'];
            switch (this.input.args[0]) {
                case 'uptime':
                    Embed.setTitle('Total uptime')
                        .setDescription(data.uptime);
                    break;
                case 'version': case 'v':
                    Embed.setTitle('Bot version')
                        .setDescription(data.version);
                    break;
                case 'server':
                    Embed.setTitle('Bot server')
                        .setDescription(data.server);
                    break;
                case 'website':
                    Embed.setTitle('Bot website')
                        .setDescription(data.website);
                    break;
                case 'dependencies': case 'dep': case 'deps':
                    Embed.setTitle('Dependencies')
                        .setDescription(data.deps);
                    break;
                case 'source': case 'code':
                    Embed.setTitle('Source Code')
                        .setDescription(data.source);
                    break;
                default:
                    Embed.setDescription(`\`${this.input.args[0]}\` is an invalid argument`);
                    break;
            }
        } else {
            Embed
                .setFields([
                    {
                        name: 'Dependencies',
                        value: data.deps,
                        inline: true
                    },
                    {
                        name: 'Statistics',
                        value:
                            `
Uptime: ${data.uptime}
Shards: ${data.shards}
Guilds: ${data.guilds}
Users: ${data.users}`,
                        inline: true
                    }
                ])
                .setDescription(`
[Created by SaberStrike](${data.creator})
[Commands](${data.website})
Global prefix: ${data.preGlobal}
Server prefix: ${data.preServer}
Bot Version: ${data.version}
`);
        }

        this.ctn.embeds = [Embed];
        this.ctn.components = [buttons];

        this.send();
    }
}
export class Invite extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Invite';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        this.ctn.content = helper.versions.linkInvite;
        this.send();
    }
}
export class Ping extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Ping';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const trueping = `${formatters.toCapital(this.input.type)} latency: ${Math.abs((this.input.message ?? this.input.interaction).createdAt.getTime() - new Date().getTime())}ms`;

        const pingEmbed = new Discord.EmbedBuilder()
            .setTitle('Pong!')
            .setColor(helper.colours.embedColour.info.dec)
            .setDescription(`
    Client latency: ${helper.vars.client.ws.ping}ms
    ${trueping}`);
        const preEdit = new Date();

        switch (this.input.type) {
            case 'message':
                {
                    this.input.message.reply({
                        embeds: [pingEmbed],
                        allowedMentions: { repliedUser: false },
                        failIfNotExists: true
                    }).then((msg: Discord.Message | Discord.ChatInputCommandInteraction) => {
                        const timeToEdit = new Date().getTime() - preEdit.getTime();
                        pingEmbed.setDescription(`
            Client latency: ${helper.vars.client.ws.ping}ms
            ${trueping}
            ${formatters.toCapital(this.input.type)} edit latency: ${Math.abs(timeToEdit)}ms
            `);
                        commandTools.sendMessage({
                            type: this.input.type,
                            message: msg as Discord.Message,
                            interaction: msg as Discord.ChatInputCommandInteraction,
                            args: {
                                embeds: [pingEmbed],
                                edit: true,
                                editAsMsg: true,
                            }
                        }, this.input.canReply);
                    })
                        .catch();
                }
                break;
            case 'interaction': {
                this.input.interaction.reply({
                    embeds: [pingEmbed],
                    allowedMentions: { repliedUser: false },
                }).then((intRes: Discord.InteractionResponse) => {
                    const timeToEdit = new Date().getTime() - preEdit.getTime();
                    pingEmbed.setDescription(`
        Client latency: ${helper.vars.client.ws.ping}ms
        ${trueping}
        ${formatters.toCapital(this.input.type)} edit latency: ${Math.abs(timeToEdit)}ms
        `);
                    intRes.edit({
                        embeds: [pingEmbed]
                    });
                })
                    .catch();
            }
                break;
        }
    }
}
export class Remind extends Command {
    declare protected params: {
        time: string;
        remindertxt: string;
        sendtochannel: boolean;
        list: boolean;
    };
    constructor() {
        super();
        this.name = 'Remind';
        this.params = {
            time: '1s',
            remindertxt: 'no reminder set',
            sendtochannel: false,
            list: false
        };
    }
    async setParamsMsg() {
        this.commanduser = this.input.message.author;
        this.params.time = this.input.args[0];
        this.params.remindertxt = this.input.args.join(' ').replaceAll(this.input.args[0], '');
        this.params.sendtochannel = false;

        if (!this.input.args[0] || this.input.args[0].includes('remind')) {
            this.params.list = true;
        }
        if (!this.input.args[1]) {
            this.params.remindertxt = 'null';
        }
        if (this.params.list == false && !this.input.args[0].endsWith('d') && !this.input.args[0].endsWith('h') && !this.input.args[0].endsWith('m') && !this.input.args[0].endsWith('s') && !this.params.time.includes(':') && !this.params.time.includes('.')) {
            this.ctn.content = 'Incorrect time format: please use `?d?h?m?s` or `hh:mm:ss`';
            this.send();
            return;
        }

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.commanduser = interaction?.member?.user ?? interaction?.user;
        this.params.time = interaction.options.getString('time');
        this.params.remindertxt = interaction.options.getString('reminder');
        this.params.sendtochannel = interaction.options.getBoolean('sendinchannel');

    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        const reminder = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.info.dec)
            .setTitle(this.params.list ? 'REMINDERS' : 'REMINDER')
            .setDescription(`${this.params.remindertxt}`);

        if (this.params.list) {
            const useReminders = helper.vars.reminders.filter(x => `${x.userID}` === `${this.commanduser.id}`);
            reminder.setDescription(useReminders.length > 0 ?
                useReminders.map(x => `Reminder sending <t:${x.time}:R>: ${x.text}`).join('\n').slice(0, 2000)
                : 'You have no reminders'
            );
            this.ctn.embeds = [reminder];
        } else {
            const absTime = Math.floor(((new Date().getTime()) + calculate.timeToMs(this.params.time)) / 1000);
            this.ctn.content = `Sending reminder <t:${absTime}:R> (<t:${absTime}:f>)`;
            this.sendremind(reminder, this.params.time, this.params.sendtochannel, this.params.remindertxt, absTime);
        }
        this.send();
    }

    async sendremind(reminder: Discord.Embed | Discord.EmbedBuilder, time: string, sendchannel: boolean, remindertxt: string, absTime: number) {
        helper.vars.reminders.push({
            time: absTime,
            text: remindertxt,
            userID: `${this.commanduser.id}`
        });
        try {
            if (sendchannel == true) {
                setTimeout(() => {
                    ((this.input.message ?? this.input.interaction).channel as Discord.GuildTextBasedChannel).send({ content: `Reminder for <@${this.commanduser.id}> \n${remindertxt}` });
                    this.remReminder(absTime);
                }, calculate.timeToMs(time));
            }
            else {
                setTimeout(() => {
                    (this.commanduser as Discord.User).send({ embeds: [reminder] }).catch();
                    this.remReminder(absTime);
                }, calculate.timeToMs(time));
            }
        } catch (error) {
            log.stdout('embed error' + 'time:' + time + '\ntxt:' + remindertxt);
        }
    }

    remReminder(time: number) {
        const findOne = helper.vars.reminders.findIndex(x => x.time === time);
        return helper.vars.reminders.splice(findOne, 1);
    }
}
export class Stats extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Stats';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const trueping = (this.input.message ?? this.input.interaction).createdAt.getTime() - new Date().getTime() + 'ms';

        const uptime = Math.round((new Date().getTime() - helper.vars.startTime.getTime()) / 1000);
        const uptimehours = Math.floor(uptime / 3600) >= 10 ? Math.floor(uptime / 3600) : '0' + Math.floor(uptime / 3600);
        const uptimeminutes = Math.floor((uptime % 3600) / 60) >= 10 ? Math.floor((uptime % 3600) / 60) : '0' + Math.floor((uptime % 3600) / 60);
        const uptimeseconds = Math.floor(uptime % 60) >= 10 ? Math.floor(uptime % 60) : '0' + Math.floor(uptime % 60);
        const upandtime = `Uptime: ${uptimehours}:${uptimeminutes}:${uptimeseconds}\nTimezone: ${moment(helper.vars.startTime).format('Z')}`;

        const totalusers: number = helper.vars.client.users.cache.size;
        // let totalusersnobots: Discord.Collection<any, Discord.User>;
        const totalguilds: number = helper.vars.client.guilds.cache.size;

        const Embed = new Discord.EmbedBuilder()
            .setTitle(`${helper.vars.client.user.username} stats`)
            .setDescription(
                `Client latency: ${Math.round(helper.vars.client.ws.ping)}ms
    Message Latency: ${trueping}
    ${upandtime}
    Guilds: ${totalguilds}
    Users: ${totalusers}
    Commands sent: ${helper.vars.id}
    Prefix: \`${helper.vars.config.prefix}\`
    Shards: ${helper.vars?.client?.shard?.count ?? 1}
    Current Shard:
    `
            );
        this.ctn.embeds = [Embed];
        this.send();
    }
}