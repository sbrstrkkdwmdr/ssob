import Discord from 'discord.js';
import * as fs from 'fs';
import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { Command } from '../command';

type debugtype =
    'commandfile' | 'commandfiletype' |
    'servers' | 'channels' | 'users' | 'maps' |
    'forcetrack' | 'curcmdid' |
    'logs' | 'ls' |
    'clear' |
    'ip' | 'tcp' | 'location' |
    'memory';

export class Debug extends Command {
    declare protected params: {
        type: debugtype;
        inputstr: string;
    };
    constructor() {
        super();
        this.name = 'Debug';
        this.params = {
            type: null,
            inputstr: null,
        };
    }
    async setParamsMsg() {
        if (!this.input.args[0]) {
            await commandTools.sendMessage({
                type: this.input.type,
                message: this.input.message,
                interaction: this.input.interaction,
                args: {
                    content: 'Error: missing first argument (type)'
                },
                canReply: this.input.canReply
            });
            return;

        }
        this.params.type = this.input.args?.[0] as debugtype;

        this.input.args.shift();
        this.params.inputstr = this.input.args?.join(' ');
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
    }

    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        switch (this.params.type) {
            //return api files for []
            case 'commandfile': this.commandFileById();
                break;
            case 'commandfiletype': {
                this.ctn.content = 'txt';
            };
                await this.commandFileByType();
                break;
            //list all servers
            case 'servers': this.serverList();
                break;
            //list all channels of server x
            case 'channels':
                break;
            //list all users of server x
            case 'users':
                break;
            case 'maps': this.mapList();
                break;
            //force osutrack to update
            case 'forcetrack': {
                track.trackUsers(60 * 1000);
                this.ctn.content = `Running osu!track (total time: 60s)...`;
            }
                break;
            //get id of current cmd
            case 'curcmdid': {
                this.ctn.content = 'Last command\'s ID is ' + `${helper.vars.id - 1}`;
            }
                break;
            //returns command logs for server
            case 'logs': this.getLogs()
                break;
            case 'ls': this.listData();
                break;
            case 'ip': case 'tcp': case 'location':
                this.ctn.content = helper.responses.decline[Math.floor(Math.random() * helper.responses.decline.length)];
                break;
            case 'memory': this.memoryUsage();
                break;
            default: {
                const expectArgs = ['commandfile', 'commandfiletype', 'servers', 'channels', 'users', 'forcetrack', 'curcmdid', 'logs', 'clear', 'maps', 'ls', 'ip', 'memory'];
                this.ctn.content = `Valid types are: ${expectArgs.map(x => `\`${x}\``).join(', ')}`;
            }
        }
        await this.send();
    }
    async findAndReturn(inpath: string, find: string, serverId: string) {
        const sFiles = fs.readdirSync(`${inpath}`);
        const found = sFiles.find(x => x == find);
        const inFiles = fs.readdirSync(`${inpath}/${found}`);
        this.ctn.content = `Files found for command \`${this.params.inputstr}\``;
        this.ctn.files = inFiles.map(x => `${inpath}/${found}/${x}`);
        if (!isNaN(+serverId)) {
            const tfiles = inFiles.map(x => `${inpath}/${found}/${x}`).filter(x => x.includes(serverId));
            this.ctn.content = `Files found for command \`${this.params.inputstr}\`, matching server ID ${serverId}`;
            this.ctn.files = tfiles;
            if (tfiles.length == 0) {
                this.ctn.files = inFiles.map(x => `${inpath}/${found}/${x}`);
                this.ctn.content = `Files found for command \`${this.params.inputstr}\`. None found matching ${serverId}`;
            }
        }
    }

    debugForm(s: string[], variant?: number) {
        return variant == 1 ?
            s.map(x => `\`${x}\`\n`).join('')
            :
            s.map(x => `\`${x}\`, `).join('');
    }
    debugIntoField(name: string, cache: string[], temppath: string, files: string[], alt?: boolean) {
        let value = `${alt ? 'Folders' : 'Files'}: ${cache.length}`;
        if (cache.length > 25) {
            fs.writeFileSync(temppath, this.debugForm(cache, 1), 'utf-8');
            files.push(temppath);
        } else {
            value += `\n${this.debugForm(cache)}`;
        }
        return {
            name, value
        } as Discord.APIEmbedField;
    }

    commandFileById() {
        let cmdidcur = `${(+this.input.id) - 1}`;
        if (!this.params.inputstr || isNaN(+this.params.inputstr)) {
            cmdidcur = fs.readFileSync(`${helper.path.main}/id.txt`, 'utf-8');
        } else {
            cmdidcur = this.params.inputstr;
        }
        const files = fs.readdirSync(`${helper.path.cache}/commandData/`);
        if (files.length < 1) {
            this.ctn.content = 'Cache folder is currently empty';
        } else {
            const searchfiles = files.filter(x => {
                return (`${x}`.includes(`${cmdidcur}-`))
                    &&
                    `${x}`.indexOf(`${cmdidcur}-`) == 0;
            }
            );
            if (searchfiles.length < 1) {
                this.ctn.content = `No files found with the id ${cmdidcur}`;
            } else {
                this.ctn.content = `Files found matching ${cmdidcur}: `;
                this.ctn.files = searchfiles.map(x => `${helper.path.cache}/commandData/` + x);
            };
        }
    }
    async commandFileByType() {
        if (!this.params.inputstr) {
            this.ctn.content = `No search query given`;
        }
        const files = fs.readdirSync(`${helper.path.cache}/debug/command`);
        if (files.length < 1) {
            this.ctn.content = 'Cache folder is currently empty';
        } else {
            //convert to search term
            let resString: string;
            let tempId = null;
            if (this.params.inputstr.includes(' ')) {
                const temp = this.params.inputstr.split(' ');
                this.params.inputstr = temp[0];
                tempId = temp[1];
            }
            const cmdftypes = [
                'Badges',
                'BadgeWeightSeed',
                'Compare',
                'Firsts',
                'Map',
                'MapLeaderboard',
                'MapScores',
                'OsuTop',
                'Pinned',
                'Profile',
                'Ranking',
                'Recent',
                'RecentList',
                'RecentActivty',
                'ScoreParse',
                'ScoreStats',
                'Simulate',
                'UserBeatmaps',
                'WhatIf',
            ];
            switch (this.params.inputstr.toLowerCase()) {
                case 'badgeweightsystem': case 'badgeweight': case 'badgeweightseed': case 'badgerank': case 'bws':
                    resString = 'BadgeWeightSeed';
                    break;
                case 'firstplaceranks': case 'fpr': case 'fp': case '#1s': case 'first': case '#1': case '1s':
                    resString = 'Firsts';
                    break;
                case 'osc': case 'osustatscount':
                    resString = 'globals';
                    break;
                case 'm':
                    resString = 'Map';
                    break;
                case 'maplb': case 'mapleaderboard': case 'leaderboard':
                    resString = 'MapLeaderboard';
                    break;
                case 'profile': case 'o': case 'user': case 'osu':
                case 'taiko': case 'drums':
                case 'fruits': case 'ctb': case 'catch':
                case 'mania':
                    resString = 'Profile';
                    break;
                case 'top': case 't': case 'ot': case 'toposu': case 'topo':
                case 'taikotop': case 'toptaiko': case 'tt': case 'topt':
                case 'ctbtop': case 'fruitstop': case 'catchtop': case 'topctb': case 'topfruits': case 'topcatch': case 'tctb': case 'tf': case 'topf': case 'topc':
                case 'maniatop': case 'topmania': case 'tm': case 'topm':
                case 'sotarks': case 'sotarksosu':
                case 'sotarkstaiko': case 'taikosotarks': case 'sotarkst': case 'tsotarks':
                case 'sotarksfruits': case 'fruitssotarks': case 'fruitsotarks': case 'sotarksfruit': case 'sotarkscatch': case 'catchsotarks':
                case 'sotarksctb': case 'ctbsotarks': case 'fsotarks': case 'sotarksf': case 'csotarks': case 'sotarksc':
                case 'sotarksmania': case 'maniasottarks': case 'sotarksm': case 'msotarks':
                    resString = 'OsuTop';
                    break;
                case 'rs': case 'r':
                case 'recenttaiko': case 'rt':
                case 'recentfruits': case 'rf': case 'rctb':
                case 'recentmania': case 'rm':
                    resString = 'Recent';
                    break;
                case 'rs best': case 'recent best':
                case 'rsbest': case 'recentbest': case 'rb':
                case 'recentlist': case 'rl':
                case 'recentlisttaiko': case 'rlt':
                case 'recentlistfruits': case 'rlf': case 'rlctb': case 'rlc':
                case 'recentlistmania': case 'rlm':
                    resString = 'RecentList';
                case 'recentactivity': case 'recentact': case 'rsact':
                    resString = 'RecentActivty';
                    break;
                case 'score': case 'sp':
                    resString = 'ScoreParse';
                    break;
                case 'c': case 'scores':
                    resString = 'MapScores';
                    break;
                case 'ss':
                    resString = 'ScoreStats';
                    break;
                case 'simulate': case 'sim': case 'simplay':
                    resString = 'Simulate';
                    break;
                case 'ub': case 'userb': case 'ubm': case 'um': case 'usermaps':
                    resString = 'UserBeatmaps';
                    break;
                case 'wi':
                    resString = 'WhatIf';
                    break;
                case 'mapfile': case 'mf':
                    resString = 'map (file)';
                    break;
                default:
                    resString = this.params.inputstr;
                    break;
            }
            switch (resString) {
                case 'badges':
                case 'bws':
                case 'firsts':
                case 'globals':
                case 'map':
                case 'maplb':
                case 'osu':
                case 'osutop':
                case 'pinned':
                case 'recent':
                case 'recent_activity':
                case 'scoreparse':
                case 'scores':
                case 'scorestats':
                case 'simplay':
                case 'userbeatmaps':
                case 'whatif':
                case 'weather':
                case 'tropicalweather':
                    {
                        await this.findAndReturn(`${helper.path.cache}/debug/command`, resString, tempId);
                    }
                    break;
                case 'map (file)':
                case 'replay':
                    {
                        await this.findAndReturn(`${helper.path.cache}/debug/fileparse`, resString, tempId);
                    }
                    break;
                default:
                    this.ctn.content = `${this.params.inputstr && this.params.inputstr?.length > 0 ? `No files found for command "${this.params.inputstr}"\n` : ''}Valid options are: ${cmdftypes.map(x => '`' + x + '`').join(', ')}`;
                    break;
            }
        }
    }
    serverList() {
        {
            const servers = ((helper.vars.client.guilds.cache.map((guild) => {
                return `
----------------------------------------------------
Name:     ${guild.name}
ID:       ${guild.id}
Owner ID: ${guild.ownerId}
----------------------------------------------------
`;
            }
            )))
                .join('\n');
            fs.writeFileSync(`${helper.path.files}/servers.txt`, servers, 'utf-8');
        }

        this.ctn.content = `${helper.vars.client.guilds.cache.size} servers connected to the client`;
        this.ctn.files = [`${helper.path.files}/servers.txt`];
    }
    channelList() {
        let serverId: string;
        if (!this.params.inputstr || isNaN(+this.params.inputstr)) {
            serverId = this.input.message?.guildId;
        } else {
            serverId = this.params.inputstr;
        }
        const curServer = helper.vars.client.guilds.cache.get(serverId);
        if (!curServer) {
            this.ctn.
                content = `Server ${serverId} not found - does not exist or bot is not in the guild`;

        } else {
            const channels = curServer.channels.cache.map(channel =>
                `
----------------------------------------------------
Name:      ${channel.name}
ID:        ${channel.id}
Type:      ${channel.type}
Parent:    ${channel.parent}
Parent ID: ${channel.parentId}
Created:   ${channel.createdAt}
----------------------------------------------------
`
            ).join('\n');
            fs.writeFileSync(`${helper.path.files}/channels${serverId}.txt`, channels, 'utf-8');

            this.ctn.content = `${curServer.channels.cache.size} channels in guild ${serverId}`;
            this.ctn.files = [`${helper.path.files}/channels${serverId}.txt`];
        }
    }
    userList() {
        let serverId: string;
        if (!this.params.inputstr || isNaN(+this.params.inputstr)) {
            serverId = this.input.message?.guildId;
        } else {
            serverId = this.params.inputstr;
        }
        const curServer = helper.vars.client.guilds.cache.get(serverId);
        if (!curServer) {
            this.ctn.content = `Server ${serverId} not found - does not exist or bot is not in the guild`;
        } else {
            const users = curServer.members.cache.map(member =>
                `
----------------------------------------------------
Username:       ${member.user.username}
ID:             ${member.id}
Tag:            ${member.user.tag}
Discriminator:  ${member.user.discriminator}
Nickname:       ${member.displayName}
AvatarURL:      ${member.avatarURL()}
Created:        ${member.user.createdAt}
Created(EPOCH): ${member.user.createdTimestamp}
Joined:         ${member.joinedAt}
Joined(EPOCH):  ${member.joinedTimestamp}
----------------------------------------------------
`
            ).join('\n');
            fs.writeFileSync(`${helper.path.files}/users${serverId}.txt`, users, 'utf-8');
            this.ctn.content = `${curServer.memberCount} users in guild ${serverId}`;
            this.ctn.files = [`${helper.path.files}/users${serverId}.txt`];
        }
    }
    mapList() {
        let type;
        if (!this.params.inputstr) {
            type = 'id';
        } else {
            type = this.params.inputstr;
        }
        const directory = `${helper.path.cache}/commandData`;
        const dirFiles = fs.readdirSync(directory);
        const acceptFiles: string[] = [];
        for (const file of dirFiles) {
            if (file.includes('mapdata')) {
                const data = (JSON.parse(fs.readFileSync(directory + '/' + file, 'utf-8'))) as osuapi.types_v2.Beatmap;
                if (type.includes('name')) {
                    acceptFiles.push(`[\`${(data.beatmapset.title)} [${data.version}]\`](https://osu.ppy.sh/b/${data.id}) (${data.status})`);
                } else {
                    acceptFiles.push(`[${data.id}](https://osu.ppy.sh/b/${data.id}) (${data.status})`);
                }
            }
        }
        const temppath = `${helper.path.files}/maps.md`;
        fs.writeFileSync(temppath, acceptFiles.join('\n').replaceAll('[\`', '[').replaceAll('\`]', ']'), 'utf-8');
        if (acceptFiles.join('\n').length < 4000) {
            this.ctn.embeds.push(
                new Discord.EmbedBuilder()
                    .setTitle(`${acceptFiles.length} maps stored in cache.`)
                    .setDescription(acceptFiles.join('\n'))
            );
        } else {
            this.ctn.content = `${acceptFiles.length} maps stored in cache.`;
            this.ctn.files = [`${temppath}`];
        }
    }
    getLogs() {
        let serverId: string;
        if (!this.params.inputstr || isNaN(+this.params.inputstr)) {
            serverId = this.input.message?.guildId;
        } else {
            serverId = this.params.inputstr;
        }
        const curServer = fs.existsSync(`${helper.path.main}/logs/cmd/${serverId}.log`);
        if (!curServer) {
            this.ctn.content = `Server ${serverId} not found - does not exist or bot is not in the guild`;
        } else {
            this.ctn.content = `Logs for ${serverId}`,
                this.ctn.files = [`${helper.path.main}/logs/cmd/${serverId}.log`];
        }
    }
    listData() {
        {
            const fields: Discord.RestOrArray<Discord.APIEmbedField> = [];
            const files: string[] = [];
            //command data
            const cmdCache = fs.readdirSync(`${helper.path.cache}/commandData`);
            fields.push(this.debugIntoField('Cache', cmdCache, `${helper.path.files}/cmdcache.txt`, files));
            //debug
            const debugCMD = fs.readdirSync(`${helper.path.cache}/debug/command`);
            const debugFP = fs.readdirSync(`${helper.path.cache}/debug/fileparse`);
            const debugCache = debugCMD.concat(debugFP);
            fields.push(this.debugIntoField('Debug', debugCache, `${helper.path.files}/debugcache.txt`, files, true));
            //error files
            const errf = fs.readdirSync(`${helper.path.cache}/errors`);
            fields.push(this.debugIntoField('Error files', errf, `${helper.path.files}/errcache.txt`, files));
            //previous files
            const prevF = fs.readdirSync(`${helper.path.cache}/previous`);
            fields.push(this.debugIntoField('Previous files', prevF, `${helper.path.files}/prevcache.txt`, files));
            //map files
            const mapC = fs.readdirSync(`${helper.path.files}/maps`);
            fields.push(this.debugIntoField('Map files', mapC, `${helper.path.files}/mapcache.txt`, files));

            const embed = new Discord.EmbedBuilder()
                .setTitle('Files')
                .setFields(fields);

            this.ctn.embeds = [embed];
            this.ctn.files = files;
        }
    }
    memoryUsage() {
        const tomb = (into: number) => Math.round(into / 1024 / 1024 * 100) / 100;
        const memdat = process.memoryUsage();

        const embed = new Discord.EmbedBuilder()
            .setTitle('Current Memory Usage')
            .setDescription(`
RSS:        ${tomb(memdat.rss)} MiB
Heap Total: ${tomb(memdat.heapTotal)} MiB
Heap Used:  ${tomb(memdat.heapUsed)} MiB
External:   ${tomb(memdat.external)} MiB
`);
        this.ctn.embeds = [embed];
    }
}