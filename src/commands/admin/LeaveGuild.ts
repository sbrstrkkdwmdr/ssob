import Discord from 'discord.js';
import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import { Command } from '../command';

export class LeaveGuild extends Command {
    declare protected params: {
        guildId: string;
    };
    constructor() {
        super();
        this.name = 'LeaveGuild';
        this.params = {
            guildId: null
        };
    }
    async setParamsMsg() {
        this.params.guildId = this.input.args[0] ?? this.input.message?.guildId;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
    }

    async execute() {
        await this.setParams();
        this.logInput();
        let allowed = false;
        let success = false;
        // do stuff
        if (checks.isOwner(this.commanduser.id)) {
            allowed = true;
            const guild = helper.vars.client.guilds.cache.get(this.params.guildId);
            if (guild) {
                success = true;
                guild.leave();
            }
        }
        if (checks.isAdmin(this.commanduser.id, this.params.guildId) && !success) {
            allowed = true;
            const guild = helper.vars.client.guilds.cache.get(this.params.guildId);
            if (guild) {
                success = true;
                guild.leave();
            }
        }
        this.ctn.content =
            allowed ?
                success ?
                    `Successfully left guild \`${this.params.guildId}\`` :
                    `Was unable to leave guild`
                :
                'You don\'t have permissions to use this command';
        await this.send();
    }
}