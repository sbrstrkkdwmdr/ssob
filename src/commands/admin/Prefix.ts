import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import { Command } from '../command';

export class Prefix extends Command {
    declare protected params: {
        newPrefix: string;
    };
    constructor() {
        super();
        this.name = 'Prefix';
        this.params = {
            newPrefix: null
        };
    }
    async setParamsMsg() {
        this.params.newPrefix = this.input.args.join(' ');
    }

    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        const curGuildSettings = await helper.vars.guildSettings.findOne({ where: { guildid: this.input.message?.guildId } }) as any;
        if (curGuildSettings == null) {
            this.ctn.content = 'Error: Guild settings not found';
        } else {
            if (typeof this.params.newPrefix != 'string' || this.params.newPrefix.length < 1 || !(checks.isAdmin(this.commanduser.id, this.input.message?.guildId,) || checks.isOwner(this.commanduser.id))) {
                this.ctn.content = `The current prefix is \`${curGuildSettings?.prefix}\``;
            } else {
                curGuildSettings.update({
                    prefix: this.params.newPrefix
                }, {
                    where: { guildid: this.input.message?.guildId }
                });
                this.ctn.content = `Prefix set to \`${this.params.newPrefix}\``;
            }
        }

        this.send();
    }
}