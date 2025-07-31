import Discord from 'discord.js';
import * as helper from '../../helper';
import { OsuCommand } from '../command';

export class Saved extends OsuCommand {
    declare protected params: {
        searchid: string;
        user: string;
    };
    show: {
        name: boolean,
        mode: boolean,
        skin: boolean,
    };
    overrideTitle: string;
    constructor() {
        super();
        this.name = 'Saved';
        this.params = {
            searchid: null,
            user: null,
        };
        this.show = {
            name: true,
            mode: true,
            skin: true,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        this.params.user = this.input.args.join(' ')?.replaceAll('"', '');
        if (!this.input.args[0] || this.input.args[0].includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        switch (this.input?.overrides?.type) {
            case 'username':
                this.show = {
                    name: true,
                    mode: false,
                    skin: false,
                };
                break;
            case 'mode':
                this.show = {
                    name: false,
                    mode: true,
                    skin: false,
                };
                break;
            case 'skin':
                this.show = {
                    name: false,
                    mode: false,
                    skin: true,
                };
                break;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        let cuser: any = {
            osuname: 'null',
            mode: 'osu! (Default)',
            skin: 'osu! classic'
        };

        let fr;
        if (this.params.user == null) {
            fr = helper.vars.client.users.cache.get(this.params.searchid)?.username ?? 'null';
        }

        const Embed = new Discord.EmbedBuilder()
            .setTitle(`${this.params.user != null ? this.params.user : fr}'s ${this.overrideTitle ?? 'saved settings'}`);

        if (this.params.user == null) {
            cuser = await helper.vars.userdata.findOne({ where: { userid: this.params.searchid } });
        } else {
            const allUsers: helper.tooltypes.dbUser[] = await helper.vars.userdata.findAll() as any;

            cuser = allUsers.filter(x => (`${x.osuname}`.trim().toLowerCase() == `${this.params.user}`.trim().toLowerCase()))[0];
        }

        if (cuser) {
            const fields = [];
            if (this.show.name) {
                fields.push({
                    name: 'Username',
                    value: `${cuser.osuname && cuser.mode.length > 1 ? cuser.osuname : 'undefined'}`,
                    inline: true
                });
            }
            if (this.show.mode) {
                fields.push({
                    name: 'Mode',
                    value: `${cuser.mode && cuser.mode.length > 1 ? cuser.mode : 'osu (default)'}`,
                    inline: true
                });
            }
            if (this.show.skin) {
                fields.push({
                    name: 'Skin',
                    value: `${cuser.skin && cuser.skin.length > 1 ? cuser.skin : 'None'}`,
                    inline: true
                });
            }
            Embed.addFields(fields);
        } else {
            Embed.setDescription('No saved settings found');
        }

        this.ctn.embeds = [Embed];
        await this.send();
    }
}