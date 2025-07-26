import * as Discord from 'discord.js';
import * as fs from 'fs';
import { format } from 'util';
import * as helper from '../helper';
import * as path from '../path';
import { Dict } from '../types/tools';
import * as log from './log';

type prototypes = 'undefined' | 'object' | 'boolean' | 'number' | 'bigint' | 'string' | 'symbol' | 'function' | 'array';
type cfgKey = [boolean, Dict<cfgKey>, prototypes, any];
export function checkConfig() {
    console.log('Initialising config...');
    let config = getcfg();

    // name: [{throw if invalid}, {children}, {type}, {default value}]
    const keys: Dict<cfgKey> = {
        'token': [true, null, 'string', null],
        'osu': [true,
            {
                'clientId': [true, null, 'string', null],
                'clientSecret': [true, null, 'string', null],
            },
            'object', null],
        'prefix': [false, null, 'string', 'sbr-'],
        'owners': [false, null, 'array', ['INVALID_ID']],
        'tenorKey': [false, null, 'string', 'INVALID_ID'],
        'enableTracking': [false, null, 'boolean', false],
        'logs': [false,
            {
                'console': [false, null, 'boolean', true],
                'file': [false, null, 'boolean', true],
            },
            'object', {
                console: true,
                file: true,
            }],
    };

    config = iterateConfigKeys(config, keys);

    return config as helper.bottypes.config;
}

function iterateConfigKeys(cfg: any, keys: Dict<cfgKey>) {
    for (const key in keys) {
        console.log('Checking config key: ' + key);
        if (keys[key][2] == 'object') {
            if (cfg.hasOwnProperty(key)) {
                cfg[key] = iterateConfigKeys(cfg[key], keys[key][1]);
            } else if (keys[key][0]) {
                throw new Error(`missing ${key} value in config`);
            } else {
                console.log(`Property ${key} is either missing or invalid. Setting to default value of ${format(keys[key][3])}`);
                cfg[key] = keys[key][3];
            }
        } else if (keys[key][2] == 'array') {
            if (!cfg.hasOwnProperty(key)) {
                if (keys[key][0]) throw new Error(`Property ${key} is missing. Bot cannot run without this property`);
                console.log(`Property ${key} is either missing or invalid. Setting to default value of ${format(keys[key][3])}`);
                cfg[key] = keys[key][3];
            }
        } else if (!cfg.hasOwnProperty(key) || typeof cfg[key] != keys[key][2]) {
            if (keys[key][0]) throw new Error(`Property ${key} is invalid. Make sure key is set to type ${format(keys[key][2])}`);
            console.log(`Property ${key} is either missing or invalid. Setting to default value of ${format(keys[key][3])}`);
            cfg[key] = keys[key][3];
        }
    }
    return cfg;
}

/**
 * 
 * @param {number} userid 
 * @returns true if the user is an owner
 */
export function isOwner(userid: string | number,) {
    for (let i = 0; i < helper.vars.config.owners.length; i++) {
        if (`${helper.vars.config.owners[i]}` == `${userid}`) {
            return true;
        }
    }
    return false;
}

/**
 * @param userid user ID
 * @param guildid ID of the current guild
 * @param client client object
 * @returns true if user is admin in the current guild
 */
export function isAdmin(userid: string | number, guildid: string | number,) {
    try {
        if (helper.vars.client.guilds.cache.has(`${guildid}`)) {
            const curguild = helper.vars.client.guilds.cache.get(`${guildid}`);
            const curmem = curguild?.members?.cache?.has(`${userid}`) ? curguild?.members?.cache?.get(`${userid}`) : null;
            if (curmem != null) {
                if (curmem.permissions.toArray().includes('Administrator')) {
                    return true;
                }
            }
        }
    } catch (error) {
        return false;
    }
    return false;
}

/**
 * 
 * @param object message/interaction called
 * @param client bot client
 */
export function botHasPerms(object: Discord.Interaction | Discord.Message, requiredPerms: Discord.PermissionsString[]) {
    const guild = helper.vars.client.guilds.cache.get(object.guildId);
    const botmember = guild?.members?.cache?.get(helper.vars.client.user.id);
    if (!botmember) return false;
    const botperms = botmember.permissions.toArray();
    //if all of the elements in requiredPerms are in botperms return true
    const len = requiredPerms.length;
    let newLen = 0;
    for (const i in requiredPerms) {
        if (botperms.includes(requiredPerms[i])) {
            newLen++;
        }
    }
    const channel = helper.vars.client.channels.cache.get(object.channelId) as Discord.TextChannel | Discord.ThreadChannel;
    const botchannelperms = channel.permissionsFor(helper.vars.client.user.id).toArray();
    let channelPermLen = 0;
    for (const i in requiredPerms) {
        if (botchannelperms.includes(requiredPerms[i])) {
            channelPermLen++;
        }
    }

    return newLen == len && channelPermLen == len ? true : false;
}

/**
 * 
 * @param str input string
 * @returns a string with special characters converted to versions that won't break URLs
 */
export function toHexadecimal(str: string | number) {
    const newstr = `${str}`
        .replaceAll('%', '%25')
        .replaceAll('`', '%60')
        .replaceAll('~', '%7E')
        .replaceAll('!', '%21')
        .replaceAll('@', '%40')
        .replaceAll('#', '%23')
        .replaceAll('$', '%24')
        .replaceAll('^', '%5E')
        .replaceAll('&', '%26')
        .replaceAll('*', '%2A')
        .replaceAll('(', '%28')
        .replaceAll(')', '%29')
        .replaceAll('-', '%2D')
        .replaceAll('_', '%5F')
        .replaceAll('=', '%3D')
        .replaceAll('+', '%2B')
        .replaceAll('[', '%5B')
        .replaceAll(']', '%5D')
        .replaceAll('{', '%7B')
        .replaceAll('}', '%7D')
        .replaceAll('|', '%7C')
        .replaceAll('\\', '%5C')
        .replaceAll(':', '%3A')
        .replaceAll(';', '%3B')
        .replaceAll('\'', '%27')
        .replaceAll('"', '%22')
        .replaceAll(',', '%2C')
        .replaceAll('.', '%2E')
        .replaceAll('<', '%3C')
        .replaceAll('>', '%3E')
        .replaceAll('?', '%3F')
        .replaceAll('/', '%2F')
        .replaceAll(' ', '%20')
        .replace(/([^A-Za-z0-9 %])/g, '');
    return newstr;
}

function getcfg() {
    try {
        const p = JSON.parse(fs.readFileSync(path.precomp + '/config/config.json', 'utf-8'));
        return p;
    } catch (err) {
        return {
            "token": process.env.DISCORD_TOKEN ?? undefined,
            "osu": {
                "clientId": process.env.OSU_CLIENT_ID ?? undefined,
                "clientSecret": process.env.OSU_CLIENT_SECRET ?? undefined
            },
            "prefix": process.env.PREFIX ?? "sbr-",
            "owners": ["id1", "id2"],
            "tenorKey": process.env.TENOR_KEY,
            "enableTracking": true,
            "logs": {
                "console": true,
                "file": true
            }
        };
    }
}