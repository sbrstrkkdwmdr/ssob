import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as osuapi from '../../tools/osuapi';
import { OsuCommand } from '../command';

export class ServerLeaderboard extends OsuCommand {
    declare protected params: {
        page: number;
        mode: osuapi.types_v2.GameMode;
        id: string;
    };
    constructor() {
        super();
        this.name = 'ServerLeaderboard';
        this.params = {
            page: 0,
            mode: 'osu',
            id: null,
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();
        }

        this.params.id = this.input.args[0];
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.id = interaction.options.getString('id');
        const gamemode = interaction.options.getString('mode');
        if (!gamemode || gamemode == 'osu' || gamemode == 'o' || gamemode == '0' || gamemode == 'standard' || gamemode == 'std') {
            this.params.mode = 'osu';
        }
        if (gamemode == 'taiko' || gamemode == 't' || gamemode == '1' || gamemode == 'drums') {
            this.params.mode = 'taiko';
        }
        if (gamemode == 'fruits' || gamemode == 'c' || gamemode == '2' || gamemode == 'catch' || gamemode == 'ctb') {
            this.params.mode = 'fruits';
        }
        if (gamemode == 'mania' || gamemode == 'm' || gamemode == '3' || gamemode == 'piano') {
            this.params.mode = 'mania';
        }
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.id = this.input.message.embeds[0].author.name;
        this.params.mode = this.input.message.embeds[0].footer.text.split(' | ')[0] as osuapi.types_v2.GameMode;

        this.params.page = 0;
        if (this.input.buttonType == 'BigLeftArrow') {
            this.params.page = 1;
        }
        const pageFinder = this.input.message.embeds[0].footer.text.split(' | ')[1].split('Page ')[1];
        switch (this.input.buttonType) {
            case 'LeftArrow':
                this.params.page = +pageFinder.split('/')[0] - 1;
                break;
            case 'RightArrow':
                this.params.page = +pageFinder.split('/')[0] + 1;
                break;
            case 'BigRightArrow':
                this.params.page = +pageFinder.split('/')[1];
                break;
        }

        if (this.params.page < 2) {
            this.params.page == 1;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        await this.sendLoading();

        this.fixPage();

        let global = false;
        let guild = this.input.message.guild ?? this.input.interaction.guild;
        if (this.params.id == 'global') {
            global = true;
        }
        if (typeof + this.params.id == 'number') {
            const tempguild = helper.vars.client.guilds.cache.get(this.params.id);
            if (tempguild) {
                const isThere = tempguild.members.cache.has(this.commanduser.id);
                guild = isThere ? tempguild : guild;
            }
        }

        const name = global ? "Global SSoB leaderboard" :
            `Server leaderboard for ${guild?.name ?? "null"}`;

        const serverlb = new Discord.EmbedBuilder()
            .setAuthor({ name: `${this.params.id ?? guild.id}` })
            .setColor(helper.colours.embedColour.userlist.dec)
            .setTitle(name);
        let rtxt = `\n`;
        let cache: Discord.Collection<string, Discord.GuildMember> | Discord.Collection<string, Discord.User>;

        if (global) {
            cache = helper.vars.client.users.cache;
        } else {
            cache = guild.members.cache;
        }
        //@ts-expect-error incompatible signatures
        const checkCache: string[] = cache.map(x => x.id + '');
        const users = (await this.getUsers(this.params.mode)).filter(x => checkCache.includes(x.discord));

        const another = users.slice().sort((b, a) => b.rank - a.rank); //for some reason this doesn't sort even tho it does in testing
        rtxt = `\`Rank    Discord        osu!           Rank       Acc      pp       `;
        const pageOffset = this.params.page * 10;
        for (let i = 0; i < users.length && i < 10; i++) {
            const cur = another[i + pageOffset];
            if (!cur) break;
            const pad = i + 1 >= 10 ?
                i + 1 >= 100 ?
                    3
                    : 4
                : 5;
            const user = helper.vars.client.users.cache.get(cur.discord);
            rtxt += `\n#${i + 1 + pageOffset + ')'.padEnd(pad, ' ')} ${this.overlengthString(user.username, 14)} ${this.overlengthString(cur.name, 14)} ${(cur.rank + '').padEnd(10)} ${(cur.acc.toFixed(2) + '%').padEnd(8)} ${cur.pp}pp`;
        }

        rtxt += `\n\``;
        serverlb.setDescription(rtxt);
        serverlb.setFooter({ text: this.params.mode + ` | Page ${this.params.page + 1}/${Math.ceil(users.length / 10)}` });
        // const endofcommand = new Date().getTime();
        // const timeelapsed = endofcommand - input.currentDate.getTime();

        const pgbuttons = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        this.disablePageButtons_check(pgbuttons,
            users.length <= 10,
            this.params.page < 1,
            this.params.page + 1 >= Math.ceil(users.length / 10)
        );
        this.ctn.embeds = [serverlb];
        this.ctn.components = [pgbuttons];

        await this.send();
    }

    async getUsers(mode: 'osu' | 'taiko' | 'fruits' | 'mania') {
        const ret: {
            name: string,
            discord: string,
            pp: number,
            rank: number,
            acc: number,
        }[] = [];
        const temp = await helper.vars.userdata.findAll();
        for (const elem of temp) {
            const thing = {
                name: elem.getDataValue('osuname'),
                discord: elem.getDataValue('userid'),
                pp: elem.getDataValue(mode + 'pp'),
                rank: elem.getDataValue(mode + 'rank'),
                acc: elem.getDataValue(mode + 'acc'),
            };
            if (thing.pp && thing.rank && thing.acc) {
                ret.push(thing);
            }
        }
        return ret;
    }
    overlengthString(str: string, length: number) {
        let t = str.padEnd(length);
        if (str.length >= length) {
            t = str.substring(0, length - 3) + '...';
        }
        return t;
    }
}