import Discord from 'discord.js';
import * as fs from 'fs';
import moment from 'moment';
import pkgjson from '../../../package.json';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as colourcalc from '../../tools/colourcalc';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as log from '../../tools/log';
import { Command } from '../command';

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