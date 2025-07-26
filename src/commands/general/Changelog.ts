import Discord from 'discord.js';
import * as fs from 'fs';
import pkgjson from '../../../package.json';
import * as helper from '../../helper';
import * as colourcalc from '../../tools/colourcalc';
import * as commandTools from '../../tools/commands';
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

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            false,
            this.params.useNum == 0,
            (this.params.useNum + 1 >= helper.versions.versions.length && !this.params.isList) || (this.params.useNum + 1 >= Math.ceil(helper.versions.versions.length / 10) && this.params.isList)
        );
        this.ctn.embeds = [Embed];
        this.ctn.components = [pgbuttons, buttons];
        this.send();
    }

}