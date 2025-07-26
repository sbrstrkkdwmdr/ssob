import Discord from 'discord.js';
import pkgjson from '../../../package.json';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as data from '../../tools/data';
import { Command } from '../command';

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