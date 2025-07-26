import Discord from 'discord.js';
import * as fs from 'fs';
import * as helper from '../../helper';
import { Command } from '../command';

export class Servers extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Servers';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff

        const servers = (helper.vars.client.guilds.cache.map(guild => ` **${guild.name}** => \`${guild.id}\` | <@${guild.ownerId}> \n`)).join('');
        const embed = new Discord.EmbedBuilder()
            .setTitle(`This client is in ${helper.vars.client.guilds.cache.size} guilds`)
            .setDescription(`${servers}`);
        if (servers.length > 2000) {
            fs.writeFileSync(`${helper.path.main}/debug/guilds.txt`, servers, 'utf-8');
            this.ctn.files = [`${helper.path.main}/debug/guilds.txt`];
        }
        this.ctn.embeds = [embed];
        this.send();
    }
}