// recurring functions
import axios from 'axios';
import Discord from 'discord.js';
import fs from 'fs';
import v8 from 'v8';
import * as helper from './helper';
import * as log from './tools/log';
import * as osuapi from './tools/osuapi';
import * as track from './tools/track';

const totalTrackTime = 60 * 1000 * 60; //requests every 60 min

export function loops() {
    setInterval(() => {
        updateStatus();
    }, 5 * 60 * 1000);
    setInterval(() => {
        clearMapFiles();
        clearParseArgs();
        clearCommandCache();
    }, 60 * 60 * 1000);

    setInterval(async () => {
        getOnlineChangelog();
    }, 1000 * 60 * 60 * 6);

    if (enableTrack == true) {
        a();
        setInterval(() => {
            a();
        }, totalTrackTime);
    }

    updateStatus();
    clearMapFiles();
    clearParseArgs();
    clearCommandCache();
    getOnlineChangelog();
    // guild stuff
    helper.vars.client.on('guildCreate', async (guild) => {
        createGuildSettings(guild);
    });

    // statusTimer();
    updateStatus();
}

export function heapLoop() {
    checkHeap();
    setInterval(async () => {
        checkHeap();
        try {
            if (global?.gc) {
                log.stdout('Calling garbage collector...');
                global.gc();
            }
        } catch (err) {

        }
    }, 1000 * 60 * 1);
}

function checkHeap() {
    const sl = v8.getHeapStatistics();
    log.stdout(toMiB(sl.heap_size_limit) + ' MiB Heap Limit');
    log.stdout(toMiB(sl.used_heap_size).toFixed(2) + ' MiB Heap Used');
}

function toMiB(number: number) {
    return number / (1024 * 1024);
}
// status switcher

function getMap() {
    const filesPathing = `${helper.path.cache}/commandData`;
    const maps = fs.readdirSync(`${filesPathing}`).filter(x => x.includes('mapdata'));
    if (maps.length == 0) {
        return false;
    }
    const mapFile = maps[Math.floor(Math.random() * maps.length)];
    const map = (JSON.parse(fs.readFileSync(`${filesPathing}/${mapFile}`, 'utf-8'))) as osuapi.types_v2.Beatmap;
    return map;
}
function setActivity() {
    let string: string;
    let fr = 0;
    const map = getMap();
    if (map == false) {
        string = 'you';
        fr = 3;
    } else {
        string = `${map?.beatmapset?.artist ?? 'UNKNOWN ARTIST'} - ${map?.beatmapset?.title ?? 'UNKNOWN TITLE'}`;
        fr = 2;
    }

    helper.vars.client.user?.setPresence({
        activities: [{
            name: `${string} | ${helper.vars.config.prefix}help`,
            type: fr,
            url: 'https://twitch.tv/sbrstrkkdwmdr'
        }],
        status: 'dnd',
        afk: false
    });
    return (map as osuapi.types_v2.Beatmap).total_length;
}

//seasonal status updates

function updateStatus() {
    let timer = 60 * 1000;
    let activities = [];
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    let specialDay = false;
    if ((month == 12 && day == 31) || (month == 1 && day == 1)) {
        activities = [{
            name: `Happy New Year! | ${helper.vars.config.prefix}help`,
            type: 0,
            url: 'https://twitch.tv/sbrstrkkdwmdr',
        },
        {
            name: `Happy New Year!! | ${helper.vars.config.prefix}help`,
            type: 0,
            url: 'https://twitch.tv/sbrstrkkdwmdr',
        },
        {
            name: `Happy New Year!!! | ${helper.vars.config.prefix}help`,
            type: 0,
            url: 'https://twitch.tv/sbrstrkkdwmdr',
        }
        ];
        specialDay = true;
    }
    else if (month == 10 && day == 31) {
        activities = [{
            name: `Happy Halloween! | ${helper.vars.config.prefix}help`,
            type: 0,
            url: 'https://twitch.tv/sbrstrkkdwmdr',
        },
        {
            name: `🎃 | ${helper.vars.config.prefix}help`,
            type: 0,
            url: 'https://twitch.tv/sbrstrkkdwmdr',
        }
        ];
        specialDay = true;
    } else if (month == 12 && day == 25) {
        activities = [
            {
                name: `Merry Christmas! | ${helper.vars.config.prefix}help`,
                type: 0,
                url: 'https://twitch.tv/sbrstrkkdwmdr',
            },
            {
                name: `🎄 | ${helper.vars.config.prefix}help`,
                type: 0,
                url: 'https://twitch.tv/sbrstrkkdwmdr',
            },
        ];
        specialDay = true;
    }
    if (specialDay == true) {
        helper.vars.client.user?.setPresence({
            activities: [activities[Math.floor(Math.random() * activities.length)]],
            status: 'dnd',
            afk: false
        });
        timer = 10 * 60 * 1000;
    } else {
        const temp = setActivity();
        timer = temp > 60 * 1000 * 30 ?
            60 * 1000 : temp * 1000;
    }
    return timer;
}

/**
 * WARNING - can cause memory leaks on some operating systems
 * 
 * doesn't seem to affect windows tho
 */
function statusTimer() {
    const timer = updateStatus();
    setTimeout(statusTimer, timer);
    return;
};

// clear cache

function clearMapFiles() {
    const files = fs.readdirSync(`${helper.path.files}/maps`);
    for (const file of files) {
        fs.stat(`${helper.path.files}/maps` + file, (err, stat) => {
            if (err) {
                return;
            } else {
                if (file.includes('undefined')) {
                    if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 60 * 12)) {
                        fs.unlinkSync(`${helper.path.files}/maps/` + file);
                        log.stdout(`Deleted file ${helper.path.files}/maps/` + file,);
                        // fs.appendFileSync('logs/updates.log', `\ndeleted file "${file}" at ` + new Date().toLocaleString() + '\n')
                    }
                }
            }
        });

    }
}

// other
async function getOnlineChangelog() {
    await axios.get(`https://raw.githubusercontent.com/sbrstrkkdwmdr/ssob/dev/changelog.md`)
        .then(data => {
            fs.writeFileSync(`${helper.path.cache}/changelog.md`, data.data);
        })
        .catch(error => {
            log.stdout('ERROR FETCHING GIT');
            log.out(`${helper.path.logs}/err.log`, JSON.stringify(error));
        });
}
function clearCommandCache() {
    const permanentCache = [
        'mapdataRanked', 'mapdataLoved', 'mapdataApproved',
        'bmsdataRanked', 'bmsdataLoved', 'bmsdataApproved',
    ];
    const files = fs.readdirSync(`${helper.path.cache}/commandData`);
    for (const file of files) {
        fs.stat(`${helper.path.cache}/commandData/` + file, (err, stat) => {
            if (err) {
                log.stdout(err);
                return;
            } else {
                if (permanentCache.some(x => file.startsWith(x))) {
                    //if amount of permcache mapfiles are < 100, keep them. otherwise, delete

                    if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 60 * 24 * 28) && files.filter(x => permanentCache.some(x => file.startsWith(x))).length >= 100) {
                        //kill after 4 weeks
                        fs.unlinkSync(`${helper.path.cache}/commandData/` + file);
                        log.stdout(`Deleted file ${helper.path.cache}/commandData/` + file,);
                    }
                }
                else if (['bmsdata', 'mapdata', 'osudata', 'scoredata', 'maplistdata', 'firstscoresdata', 'weatherlocationdata',].some(x => file.startsWith(x))) {
                    if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 60 * 24)) {
                        fs.unlinkSync(`${helper.path.cache}/commandData/` + file);
                        log.stdout(`Deleted file ${helper.path.cache}/commandData/` + file,);
                        // fs.appendFileSync('logs/updates.log', `\ndeleted file "${file}" at ` + new Date().toLocaleString() + '\n')
                    }
                } else if (file.includes('weatherdata')) {
                    if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 15)) {
                        fs.unlinkSync(`${helper.path.cache}/commandData/` + file);
                        log.stdout(`Deleted file ${helper.path.cache}/commandData/` + file,);
                        // fs.appendFileSync('logs/updates.log', `\ndeleted file "${file}" at ` + new Date().toLocaleString() + '\n')
                    }
                }
                else {
                    if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 60 * 3)) {
                        fs.unlinkSync(`${helper.path.cache}/commandData/` + file);
                        log.stdout(`Deleted file ${helper.path.cache}/commandData/` + file,);
                        // fs.appendFileSync('logs/updates.log', `\ndeleted file "${file}" at ` + new Date().toLocaleString() + '\n')
                    }
                }
            }
        });

    }
}
function clearParseArgs() {
    const files = fs.readdirSync(`${helper.path.cache}/params`);
    for (const file of files) {
        fs.stat(`${helper.path.cache}/params/` + file, (err, stat) => {
            if ((new Date().getTime() - stat.mtimeMs) > (1000 * 60 * 60 * 24)) {
                fs.unlinkSync(`${helper.path.cache}/params/` + file);
                log.stdout(`Deleted file ${helper.path.cache}/params/` + file,);
                // fs.appendFileSync('logs/updates.log', `\ndeleted file "${file}" at ` + new Date().toLocaleString() + '\n')
            }
        });
    }
}
async function createGuildSettings(guild: Discord.Guild) {
    try {
        await helper.vars.guildSettings.create({
            guildid: guild.id ?? null,
            guildname: guild.name ?? null,
            prefix: helper.vars.config.prefix,
        });
    } catch (error) {
        console.log(error);
    }
}

// osu track
let enableTrack = helper.vars.config.enableTracking;
function a() {
    try {
        track.trackUsers(totalTrackTime);
    } catch (err) {
        log.stdout(err);
        log.stdout('temporarily disabling tracking for an hour');
        enableTrack = false;
        setTimeout(() => {
            enableTrack = true;
        }, totalTrackTime);
    }
}