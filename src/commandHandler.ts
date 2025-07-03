import * as Discord from 'discord.js';
import { admin, fun, gen, osu_maps, osu_other, osu_profiles, osu_scores, osu_track } from './commandHelper';
import { Command, InputHandler } from './commands/command';
import * as helper from './helper';
import * as checks from './tools/checks';
import * as commandTools from './tools/commands';


const rslist = [
    'recent', 'recentscore', 'rs', 'r',
    'recenttaiko', 'rt',
    'recentfruits', 'rf', 'rctb',
    'recentmania', 'rm',
    'rslist', 'recentlist', 'rl',
    'recentlisttaiko', 'rlt',
    'recentlistfruits', 'rlf', 'rlctb', 'rlc',
    'recentlistmania', 'rlm',
    'rb', 'recentbest', 'rsbest',
];
const scorelist = [
    'firsts', 'firstplaceranks', 'fpr', 'fp', '#1s', 'first', '#1', '1s',
    'leaderboard', 'maplb', 'mapleaderboard', 'ml',
    'nochokes', 'nc',
    'osutop', 'top', 't', 'ot', 'topo', 'toposu',
    'taikotop', 'toptaiko', 'tt', 'topt',
    'ctbtop', 'fruitstop', 'catchtop', 'topctb', 'topfruits', 'topcatch', 'tf', 'tctb', 'topf', 'topc',
    'maniatop', 'topmania', 'tm', 'topm',
    'scores', 'c',
    'pinned', 'pins'
].concat(rslist).sort((a, b) => b.length - a.length);

function startType(object: Discord.Message | Discord.Interaction) {
    try {
        (object.channel as Discord.GuildTextBasedChannel).sendTyping();
        setTimeout(() => {
            return;
        }, 1000);
    } catch (error) {
    }
}

export class CommandHandler extends InputHandler {
    async onMessage(message: Discord.Message) {
        this.selected = null;
        this.overrides = {};
        if (this.validateMessage(message)) {
            const args = message.content.slice(helper.vars.config.prefix.length).trim().split(/ +/g);
            const cmd = args.shift().toLowerCase();
            this.runCommand(cmd, message, null, args, true, 'message');
        }
    }
    async onInteraction(interaction: Discord.Interaction) {
        this.selected = null;
        this.overrides = null;
        if (!(interaction.type === Discord.InteractionType.ApplicationCommand)) { return; }
        interaction = interaction as Discord.ChatInputCommandInteraction;
        // interaction?.reply({
        //     content: 'Interaction based commands are currently unsupported in this version',
        //     allowedMentions: { repliedUser: false },
        //     flags: Discord.MessageFlags.Ephemeral,
        // });
        // return;
        let args = [];
        const cmd = interaction.commandName;
        this.runCommand(cmd, null, interaction, args, true, 'interaction');
    }

    validateMessage(message: Discord.Message) {
        if (!(message.content.startsWith(helper.vars.config.prefix))) return false;
        return true;
    }

    commandCheck(cmd: string, message: Discord.Message, interaction: Discord.ChatInputCommandInteraction, canReply: boolean) {
        //perms bot needs
        const requireEmbedCommands: string[] = [
            //gen
            'changelog', 'clog',
            'convert', 'conv',
            'country',
            'help', 'commands', 'list', 'command', 'h',
            'info', 'i',
            'invite',
            'ping',
            'remind', 'reminders', 'reminder',
            'stats',
            'time', 'tz',
            'weather', 'temperature', 'temp',
            'tropicalweather', 'ts',
            //misc
            'coin', 'coinflip', 'flip',
            'hug', 'kiss', 'lick', 'pet', 'punch', 'slap',
            'inspire', 'insp',
            'poll', 'vote',
            //osu
            'bws', 'badgeweightsystem', 'badgeweight', 'badgeweightseed', 'badgerank',
            'compare', 'common',
            'lb',
            'map', 'm',
            'maprandom', 'f2', 'maprand', 'mapsuggest', 'randommap', 'randmap',
            'osu', 'profile', 'o', 'user', 'taiko', 'drums', 'fruits', 'ctb', 'catch', 'mania',
            'osuseet', 'setuser', 'set', 'setmode', 'setskin',
            'nochokes', 'nc',
            'ppcalc', 'mapcalc', 'mapperf', 'maperf', 'mappp',
            'pp', 'rank',
            'ranking', 'rankings',
            'recentactivity', 'recentact', 'rsact',
            'saved',
            'scoreparse', 'score', 'sp',
            'scorestats', 'ss',
            'simplay', 'simulate', 'sim',
            'skin',
            'trackadd', 'track', 'ta', 'trackremove', 'trackrm', 'tr', 'untrack', 'trackchannel', 'tc', 'tracklist', 'tl',
            'userbeatmaps', 'ub', 'userb', 'ubm', 'um', 'usermaps',
            'whatif', 'wi',
            //admin
            'avatar', 'av', 'pfp',
            'checkperms', 'fetchperms', 'checkpermissions', 'permissions', 'perms',
            'clear',
            'find', 'get',
            'prefix', 'servers', 'userinfo'
        ].concat(scorelist);
        const requireReactions: string[] = [
            'poll', 'vote'
        ];
        const requireMsgManage: string[] = [
            'purge'
        ];

        const botRequireAdmin: string[] = [
            'checkperms', 'fetchperms', 'checkpermissions', 'permissions', 'perms',
            'get',
            'userinfo',
        ];

        //perms user needs
        const userRequireAdminOrOwner: string[] = [
            'checkperms', 'fetchperms', 'checkpermissions', 'permissions', 'perms',
            'userinfo',
            'purge',
        ];

        const userRequireOwner: string[] = [
            'crash', 'clear', 'debug', 'servers'
        ];

        const disabled: string[] = [
        ];

        const missingPermsBot: Discord.PermissionsString[] = [];
        const missingPermsUser: string[] = [];
        if (requireEmbedCommands.includes(cmd) && !checks.botHasPerms(message ?? interaction, ['EmbedLinks'])) {
            missingPermsBot.push('EmbedLinks');
        }
        if (requireReactions.includes(cmd) && !checks.botHasPerms(message ?? interaction, ['AddReactions'])) {
            missingPermsBot.push('AddReactions');
        }
        if (requireMsgManage.includes(cmd) && !checks.botHasPerms(message ?? interaction, ['ManageMessages'])) {
            missingPermsBot.push('ManageMessages');
        }
        if (botRequireAdmin.includes(cmd) && !checks.botHasPerms(message ?? interaction, ['Administrator'])) {
            missingPermsBot.push('Administrator');
        }
        if (userRequireAdminOrOwner.includes(cmd) && !(checks.isAdmin(message?.author?.id ?? interaction.member.user.id, message?.guildId ?? interaction?.guildId) || checks.isOwner(message?.author?.id ?? interaction.member.user.id))) {
            missingPermsUser.push('Administrator');
        }
        if (userRequireOwner.includes(cmd) && !checks.isOwner(message?.author?.id ?? interaction.member.user.id)) {
            missingPermsUser.push('Owner');
        }

        if (missingPermsBot.length > 0 && !(message ?? interaction).channel.isDMBased) {
            commandTools.sendMessage({
                type: "message",
                message,
                interaction,
                args: {
                    content: 'The bot is missing permissions.\nMissing permissions: ' + missingPermsBot.join(', ')
                },

            },
                canReply);
            return false;
        }
        if (missingPermsUser.length > 0) {
            commandTools.sendMessage({
                type: "message",
                message,
                interaction,
                args: {
                    content: 'You do not have permission to use this command.\nMissing permissions: ' + missingPermsUser.join(', ')
                },
            },
                canReply);
            return false;
        }

        if (disabled.includes(cmd)) {
            commandTools.sendMessage({
                type: "message",
                message,
                interaction,
                args: {
                    content: 'That command is currently disabled and cannot be used.'
                },
            },
                canReply);
            return false;
        }
        if (['hug', 'kiss', 'lick', 'pet', 'punch', 'slap',].includes(cmd) && helper.vars.config.tenorKey == 'INVALID_ID') {
            commandTools.sendMessage({
                type: "message",
                message,
                interaction,
                args: {
                    content: 'gif commands cannot be currently used (error: unset tenor key)'
                },
            },
                canReply);
            return false;
        }
        return true;
    }

    commandSelect(cmd: string, args: string[]) {
        let tnum: string;
        if (scorelist.some(x => cmd.startsWith(x)) && !scorelist.some(x => cmd == x)) {
            let cont: boolean = true;
            scorelist.some(x => {
                if (cmd.startsWith(x) && cont) {
                    tnum = cmd.replace(x, '');
                    if (!isNaN(+tnum)) {
                        cmd = x;
                        cont = false;
                    }
                }
                return null;
            });
        }
        if (!isNaN(+tnum)) {
            if (rslist.includes(cmd)) args.push('-p', tnum);
            else args.push('-parse', tnum);
        }
        if (['uptime', 'server', 'website', 'timezone', 'version', 'v', 'dependencies', 'deps', 'source'].some(x => x.toLowerCase() == cmd.toLowerCase())) {
            args = [cmd];
            cmd = 'info';
        }

        switch (cmd) {
            // gen
            case 'changelog': case 'clog': case 'changes':
                this.selected = new gen.Changelog();
                break;
            case 'versions':
                args.unshift('versions');
                this.selected = new gen.Changelog();
                break;
            case 'list':
                args.unshift('list');
            case 'help': case 'commands': case 'command': case 'h':
                this.selected = new gen.Help();
                break;
            case 'info': case 'i':
                this.selected = new gen.Info();
                break;
            case 'invite':
                this.selected = new gen.Invite();
                break;
            case 'ping':
                this.selected = new gen.Ping();
                break;
            case 'remind': case 'reminder':
                this.selected = new gen.Remind();
                break;
            case 'stats':
                this.selected = new gen.Stats();
                break;

            // osu (profiles)
            case 'badges':
                this.selected = new osu_profiles.Badges();
                break;
            case 'bws': case 'badgeweightsystem': case 'badgeweight': case 'badgeweightseed': case 'badgerank':
                this.selected = new osu_profiles.BadgeWeightSeed();
                break;
            case 'osu': case 'profile': case 'o': case 'user':
                this.selected = new osu_profiles.Profile();
                break;
            case 'taiko': case 'drums': {
                this.overrides = {
                    mode: 'taiko'
                };
                this.selected = new osu_profiles.Profile();
            }
                break;
            case 'fruits': case 'ctb': case 'catch': {
                this.overrides = {
                    mode: 'fruits'
                };
                this.selected = new osu_profiles.Profile();
            }
                break;
            case 'mania': {
                this.overrides = {
                    mode: 'mania'
                };
                this.selected = new osu_profiles.Profile();
            }
                break;
            case 'ranking': case 'rankings': case 'lb': case 'leaderboard':
                this.selected = new osu_profiles.Ranking();
                break;
            case 'recentactivity': case 'recentact': case 'rsact':
                this.selected = new osu_profiles.RecentActivity();
                break;

            // osu (maps)
            case 'ppcalc': case 'mapcalc': case 'mapperf': case 'maperf': case 'mappp': {
                this.overrides = {
                    type: 'ppcalc'
                };
            }
            case 'map': case 'm':
                this.selected = new osu_maps.Map();
                break;
            case 'maprandom': case 'f2': case 'maprand': case 'randommap': case 'randmap':
                this.selected = new osu_maps.RandomMap();
                break;
            case 'recommendmap': case 'recmap': case 'maprec': case 'mapsuggest': case 'suggestmap': case 'maprecommend':
                this.selected = new osu_maps.RecommendMap();
                break;
            case 'userbeatmaps': case 'ub': case 'userb': case 'ubm': case 'um': case 'usermaps':
                this.selected = new osu_maps.UserBeatmaps();
                break;
            case 'ranked': {
                this.overrides = {
                    ex: 'ranked'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'favourite': case 'favourites': {
                this.overrides = {
                    ex: 'favourite'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'graveyard': case 'unranked': {
                this.overrides = {
                    ex: 'graveyard'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'loved': {
                this.overrides = {
                    ex: 'loved'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'most_played': case 'mostplayed': case 'mp': {
                this.overrides = {
                    ex: 'most_played'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'pending': case 'wip': {
                this.overrides = {
                    ex: 'pending'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'nominated': case 'bn': {
                this.overrides = {
                    ex: 'nominated'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            case 'guest': case 'gd': {
                this.overrides = {
                    ex: 'guest'
                };
                this.selected = new osu_maps.UserBeatmaps();
            }
                break;
            // // osu (scores)
            case 'firsts': case 'firstplaceranks': case 'fpr': case 'fp': case '#1s': case 'first': case '#1': case '1s':
                this.selected = new osu_scores.Firsts();
                break;
            case 'maplb': case 'mapleaderboard': case 'ml':
                this.selected = new osu_scores.MapLeaderboard();
                break;
            case 'nochokes': case 'nc': {
                this.overrides = {
                    miss: true
                };
                this.selected = new osu_scores.NoChokes();
            }
                break;
            case 'osutop': case 'top': case 't': case 'ot': case 'toposu': case 'topo':
                this.selected = new osu_scores.OsuTop();
                break;
            case 'taikotop': case 'toptaiko': case 'tt': case 'topt':
                {
                    this.overrides = {
                        mode: 'taiko'
                    };
                    this.selected = new osu_scores.OsuTop();
                }
                break;
            case 'ctbtop': case 'fruitstop': case 'catchtop': case 'topctb': case 'topfruits': case 'topcatch': case 'tctb': case 'tf': case 'topf': case 'topc':
                {
                    this.overrides = {
                        mode: 'fruits'
                    };
                    this.selected = new osu_scores.OsuTop();
                }
                break;
            case 'maniatop': case 'topmania': case 'tm': case 'topm':
                {
                    this.overrides = {
                        mode: 'mania'
                    };
                    this.selected = new osu_scores.OsuTop();
                }
                break;
            case 'pinned': case 'pins':
                this.selected = new osu_scores.Pinned();
                break;
            case 'recent': case 'rs': case 'recentscore': case 'r':
                this.selected = new osu_scores.Recent();
                break;
            case 'recenttaiko': case 'rt': {
                this.overrides = {
                    mode: 'taiko'
                };
                this.selected = new osu_scores.Recent();
            }
                break;
            case 'recentfruits': case 'rf': case 'rctb': {
                this.overrides = {
                    mode: 'fruits'
                };
                this.selected = new osu_scores.Recent();
            }
                break;
            case 'recentmania': case 'rm': {
                this.overrides = {
                    mode: 'mania'
                };
                this.selected = new osu_scores.Recent();
            }
                break;
            case 'recentbest': case 'rsbest': case 'rb': {
                this.overrides = {

                    sort: 'pp'
                };
                this.selected = new osu_scores.RecentList();
            }
                break;
            case 'recentlist': case 'rl': case 'rslist': {
                this.overrides = {

                    sort: 'recent'
                };
                this.selected = new osu_scores.RecentList();
            }
                break;
            case 'recentlisttaiko': case 'rlt': {
                this.overrides = {

                    mode: 'taiko',
                    sort: 'recent'
                };
                this.selected = new osu_scores.RecentList();
            }
                break;
            case 'recentlistfruits': case 'rlf': case 'rlctb': case 'rlc': {
                this.overrides = {

                    mode: 'fruits',
                    sort: 'recent'
                };
                this.selected = new osu_scores.RecentList();
            }
                break;
            case 'recentlistmania': case 'rlm': {
                this.overrides = {

                    mode: 'mania',
                    sort: 'recent'
                };
                this.selected = new osu_scores.RecentList();
            }
                break;
            case 'scoreparse': case 'score': case 'sp':
                this.selected = new osu_scores.ScoreParse();
                break;
            case 'scores': case 'c': case 'mapscores':
                this.selected = new osu_scores.MapScores();
                break;
            case 'scorestats': case 'ss':
                this.selected = new osu_scores.ScoreStats();
                break;
            case 'simplay': case 'simulate': case 'sim':
                this.selected = new osu_scores.Simulate();
                break;

            // // osu (track)
            case 'trackadd': case 'track': case 'ta':
                this.selected = new osu_track.TrackAdd();
                break;
            case 'trackremove': case 'trackrm': case 'tr': case 'untrack':
                this.selected = new osu_track.TrackRemove();
                break;
            case 'trackchannel': case 'tc':
                this.selected = new osu_track.TrackChannel();
                break;
            case 'tracklist': case 'tl':
                this.selected = new osu_track.TrackList();
                break;

            // // osu (other)
            case 'common': {
                this.overrides = {
                    type: 'top'
                };
            }
            case 'compare':
                this.selected = new osu_other.Compare();
                break;
            case 'osuset': case 'setuser': case 'set':
                this.selected = new osu_other.Set();
                break;
            case 'setmode': {
                this.overrides = {
                    type: 'mode'
                };
                this.selected = new osu_other.Set();
            }
                break;
            case 'setskin': {
                this.overrides = {
                    type: 'skin'
                };
                this.selected = new osu_other.Set();
            }
                break;
            case 'pp': {
                this.overrides = {
                    type: 'pp',
                };
                this.selected = new osu_other.RankPP();
            }
                break;
            case 'rank': {
                this.overrides = {
                    type: 'rank',
                };
                this.selected = new osu_other.RankPP();
            }
                break;
            case 'saved':
                this.selected = new osu_other.Saved();
                break;
            case 'serverleaderboard': case 'serverlb': case 'slb':
                this.selected = new osu_other.ServerLeaderboard();
                break;
            case 'whatif': case 'wi':
                this.selected = new osu_other.WhatIf();
                break;

            // // admin
            case 'checkperms': case 'fetchperms': case 'checkpermissions': case 'permissions': case 'perms':
                this.selected = new admin.CheckPerms();
                break;
            case 'crash':
                this.selected = new admin.Crash();
                break;
            case 'clear':
                this.selected = new admin.Clear();
                break;
            case 'debug':
                this.selected = new admin.Debug();
                break;
            case 'find': case 'get':
                this.selected = new admin.Find();
                break;
            case 'leaveguild': case 'leave':
                this.selected = new admin.LeaveGuild();
                break;
            case 'prefix':
                this.selected = new admin.Prefix();
                break;
            case 'servers':
                this.selected = new admin.Servers();
                break;


            // // misc
            case '8ball': case 'ask':
                this.selected = new fun._8Ball();
                break;
            case 'coin': case 'coinflip': case 'flip':
                this.selected = new fun.CoinFlip();
                break;
            case 'hug':
                this.overrides = {
                    ex: 'hug'
                };
                this.selected = new fun.Gif();
                break;
            case 'kiss':
                this.overrides = {
                    ex: 'kiss'
                };
                this.selected = new fun.Gif();
                break;
            case 'lick':
                this.overrides = {
                    ex: 'lick'
                };
                this.selected = new fun.Gif();
                break;
            case 'pet':
                this.overrides = {
                    ex: 'pet'
                };
                this.selected = new fun.Gif();
                break;
            case 'punch':
                this.overrides = {
                    ex: 'punch'
                };
                this.selected = new fun.Gif();
                break;
            case 'slap':
                this.overrides = {
                    ex: 'slap'
                };
                this.selected = new fun.Gif();
                break;
            case 'janken': case 'paperscissorsrock': case 'rockpaperscissors': case 'rps': case 'psr':
                this.selected = new fun.Janken();
                break;
            case 'roll': case 'rng': case 'randomnumber': case 'randomnumbergenerator': case 'pickanumber': case 'pickanum':
                this.selected = new fun.Roll();
                break;
            default:
                this.selected = null;
                break;
        }
        return args;
    }

    runCommand(cmd: string, message: Discord.Message, interaction: Discord.ChatInputCommandInteraction, args: string[], canReply: boolean, type: "message" | "interaction") {
        const isValid = this.commandCheck(cmd, message, interaction, canReply);
        if (isValid) {
            const helpOverrides: string[] = ['-h', '-help', '--h', '--help'];
            if (helpOverrides.some(x => args?.includes(x))) {
                args = [cmd];
                cmd = 'help';
            }
            args = this.commandSelect(cmd, args);
            if (this.selected) {
                startType(message ?? interaction);
                this.selected.setInput({
                    message,
                    interaction,
                    args,
                    date: new Date(),
                    id: commandTools.getCmdId(),
                    overrides: this.overrides,
                    canReply,
                    type,
                });
                this.selected.execute();
            }
        }
        this.selected = null;
        this.overrides = {};
    }
}