import Discord from 'discord.js';
import * as fs from 'fs';
import pkgjson from '../../../package.json';
import * as helper from '../../helper';
import * as colourcalc from '../../tools/colourcalc';
import * as commandTools from '../../tools/commands';
import * as tooltypes from '../../types/tools';
import { Command } from '../command';

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
        //get version
        if (this.params.version) {
            this.found = this.findVersion();
        }
        this.fixFound();

        this.ctn.embeds = [this.createEmbed()];
        await this.handleButtons();
        this.send();
    }
    found: string | number;
    findVersion() {
        if (this.params.version?.includes('.')) {
            this.found = this.findVersion_exact();
        } else {
            this.found = this.findVersion_alias();
        }
        return this.found;
    }
    findVersion_exact() {
        this.found = helper.versions.versions.findIndex(x =>
            this.params.version.trim() === `${x.name}`.trim() || this.params.version.includes(`${x.releaseDate}`) || this.params.version.includes(`${x.releaseDate}`)
            || (`${x.releaseDate}`).includes(this.params.version) || `${x.releaseDate}`.includes(this.params.version)
        );
        this.params.foundBool = true;
        if (this.found == -1) {
            this.found = null;
        }
        return this.found;
    }
    findVersion_alias() {
        switch (this.params.version.toLowerCase()) {
            case 'wip': case 'pending': case 'next':
                this.found = 0;
                this.params.useNum = 0;
                this.params.foundBool = true;
                break;
            case 'first': case 'original':
                this.found = helper.versions.versions.length - 1;
                this.params.useNum = helper.versions.versions.length - 1;
                this.params.foundBool = true;
                break;
            case 'second':
                this.found = helper.versions.versions.length - 2;
                this.params.useNum = helper.versions.versions.length - 2;
                this.params.foundBool = true;
                break;
            case 'third':
                this.found = helper.versions.versions.length - 3;
                this.params.useNum = helper.versions.versions.length - 3;
                this.params.foundBool = true;
                break;
            case 'latest':
                this.found = 1;
                this.params.useNum = 1;
                this.params.foundBool = true;
                break;
            case 'versions': case 'list': case 'all':
                this.params.foundBool = true;
            default:
                this.found = 'string';
                break;
        }
        return this.found;
    }
    fixFound() {
        if (((!this.params.foundBool && this.found != 'string') || (this.params.page && this.found == 'string')) && !this.input.buttonType) {
            this.params.useNum = this.params.page ? this.params.page - 1 : null;
        }
        if (this.params.useNum < 1 && !this.params.foundBool) {
            this.params.useNum = this.found && !isNaN(+this.found) ?
                +this.found :
                typeof this.found === 'string' ?
                    0 : 1;
        }
        if (!this.params.useNum && this.found) {
            this.params.useNum = +this.found;
        }
        if (isNaN(this.params.useNum) || !this.params.useNum) this.params.useNum = 0;
        if (this.params.useNum + 1 >= Math.ceil(helper.versions.versions.length / 10)) {
            this.params.useNum = Math.ceil(helper.versions.versions.length / 10) - 1;
        }
    }
    createEmbed() {
        const embed = new Discord.EmbedBuilder();
        const doc = fs.readFileSync(`${helper.path.main}/cache/changelog.md`, 'utf-8');
        const list = doc.split('## [');
        list.shift();
        if (typeof this.found == 'string') {
            this.params.isList = true;
            this.embedList(embed, list);
        } else {
            this.embedVersion(embed, list);
        }
        return embed;
    }
    embedList(embed: Discord.EmbedBuilder, input: string[]) {
        const pageOffset = this.params.useNum * 10;
        let txt = this.embedListVersions(input, pageOffset);
        embed.setTitle('All Versions')
            .setDescription(txt)
            .setFooter({
                text: `${this.params.useNum + 1}/${Math.ceil(helper.versions.versions.length / 10)}`
            });
        if (this.params.foundBool) {
            embed.setAuthor({ name: `\nThere was an error trying to find version \`${this.params.version}\`` });
        };
    }
    embedListVersions(input: string[], offset: number) {
        let txt = '\`VERSION      |    DATE    | CHANGES\`\n';
        for (let i = 0; offset + i < helper.versions.versions.length && i < 10; i++) {
            const sumVer = helper.versions.versions[offset + i];
            const useVer = input[offset + i];
            const changes = useVer?.split('</br>')[1]?.split('\n')
                .map(x => x.trim()).filter(x => x.length > 2 && !x.includes('### ')) ?? [];
            txt += `\`${(sumVer.name).padEnd(12)} | ${sumVer.releaseDate} | ${changes.length}\`\n`;
        }
        if (txt.length > 2000) {
            txt = exceeded();
        }
        return txt;
    }
    embedVersion(embed: Discord.EmbedBuilder, input: string[]) {
        const currentVersion = input[this.params.useNum] as string;
        const versionMeta = helper.versions.versions[this.params.useNum];
        const commit = currentVersion.split('[commit](')[1].split(')')[0];
        const commitURL = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/[^\s]*)?$/g.test(commit) ?
            commit :

            pkgjson['repository']['url'] +
            commit.replaceAll(/[^a-z0-9]/g, '');

        const changesList = this.versionChangeStringArray(currentVersion);
        let txt = this.versionChangesToString(changesList);
        embed
            .setTitle(`${versionMeta.name.trim()} Changelog`)
            .setURL('https://github.com/sbrstrkkdwmdr/ssob/blob/dev/changelog.md')
            .setDescription(`commit [${commit.includes('commit/') ?
                commitURL.split('commit/')[1].trim()?.slice(0, 7)?.trim() : 'null'}](${commitURL})
Released ${versionMeta.releaseDate}
Total of ${this.versionChangeCount(changesList)} changes.${txt}
`)
            .setFooter({
                text: `${this.params.useNum + 1}/${helper.versions.versions.length}`
            });
    }
    versionChangeStringArray(version: string) {
        const changesTxt = version.includes('</br>') ? version.split('</br>')[1] :
            version.split('\n').slice(3).join('\n');
        return changesTxt ?
            changesTxt.split('\n')
                .map(x => x.trim())
                .filter(x => x.length > 2) : [];
    }
    versionChangeCount(changeList: string[]) {
        return changeList.filter(x => !x.includes('### ')).length;
    }
    versionChangesToString(changes: string[]) {
        let txt = '';
        for (const change of changes) {
            if (change.startsWith('###')) {
                txt += this.changeCategory(change);
            } else {
                txt += change.replace('-', '`-`') + '\n';
            }
        }
        txt = txt.slice(0, 2000);
        if (txt.trim().length == 0) {
            txt = '\nNo changes recorded';
        }

        if (txt.length > 2000) {
            txt = exceeded();
        }
        return txt;
    }
    changeCategory(change: string) {
        const clrs: tooltypes.Dict<string> = {
            'Fixed': 'yellow',
            'Changed': 'blue',
            'Added': 'green',
            'Removed': 'red',
            'Deprecated': 'pink',
        };
        const temp = change.replaceAll('###', '').trim();
        if (clrs[temp]) {
            return colourcalc.codeBlockColourText(temp.toUpperCase(), clrs[temp], "text");
        }
        return colourcalc.codeBlockColourText(temp.toUpperCase(), "cyan", "text");
    }
    async handleButtons() {
        const buttons = this.buttonSwitcher();
        const pgButtons = await this.buttonPages();
        this.ctn.components = [pgButtons, buttons];
    }
    buttonSwitcher() {
        const buttons = new Discord.ActionRowBuilder();
        if (this.params.isList) {
            buttons
                .setComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-Detail0-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailLess),
                );
        } else {
            buttons
                .setComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-Detail1-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailMore),
                );
        }
        return buttons;
    }
    async buttonPages() {
        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            false,
            this.params.useNum == 0,
            (this.params.useNum + 1 >= helper.versions.versions.length && !this.params.isList) || (this.params.useNum + 1 >= Math.ceil(helper.versions.versions.length / 10) && this.params.isList)
        );
        return pgbuttons;
    }
}

function exceeded() {
    return 'Exceeded character limit. Please click [here](https://github.com/sbrstrkkdwmdr/ssob/blob/main/changelog.md) to view the changelog.';
}