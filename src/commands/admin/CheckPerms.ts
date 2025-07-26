import Discord from 'discord.js';
import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import { Command } from '../command';

export class CheckPerms extends Command {
    declare protected params: {
        searchUser: Discord.User | Discord.APIUser;
    };
    constructor() {
        super();
        this.name = 'CheckPerms';
        this.params = {
            searchUser: null,
        };
    }
    async setParamsMsg() {

        if (this.input.args[0]) {
            if (this.input.message.mentions.users.size > 0) {
                this.params.searchUser = this.input.message.mentions.users.first();
            } else {
                this.params.searchUser = helper.vars.client.users.cache.get(this.input.args.join(' '));
            }
        } else {
            this.params.searchUser = this.commanduser;
        }

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        if (this.params.searchUser == null || typeof this.params.searchUser == 'undefined') {
            this.params.searchUser = this.commanduser;
        }

        if (!(checks.isAdmin(this.commanduser.id, this.input.message?.guildId) || checks.isOwner(this.commanduser.id))) {
            this.params.searchUser = this.commanduser;
        }
        const embed = new Discord.EmbedBuilder();
        try {
            const userAsMember = this.input.message.guild.members.cache.get(this.params.searchUser.id);
            //get perms
            const perms = userAsMember.permissions.toArray().join(' **|** ');

            embed
                .setTitle(`${this.params.searchUser.username}'s Permissions`)
                .setDescription(`**${perms}**`)
                .setColor(helper.colours.embedColour.admin.dec);

        } catch (err) {
            embed.setTitle('Error')
                .setDescription('An error occured while trying to get the permissions of the user.')
                .setColor(helper.colours.embedColour.admin.dec);

        }

        this.ctn.embeds = [embed];
        this.send();
    }
}