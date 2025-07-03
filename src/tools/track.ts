import * as Discord from 'discord.js';
import fs from 'fs';
import * as osumodcalc from 'osumodcalculator';
import * as helper from '../helper';
import * as calculate from './calculate';
import * as data from './data';
import * as formatters from './formatters';
import * as log from './log';
import * as osuapi from './osuapi';
import * as other from './other';
import * as performance from './performance';

export async function editTrackUser(fr: {
    userid: string | number,
    action?: 'add' | 'remove',
    guildId: string | number,
    mode: string;
}
) {

    if (!fr.action || fr.action == 'add') {
        try {
            await helper.vars.trackDb.create({
                osuid: fr.userid,
                [`guilds${fr.mode}`]: fr.guildId,
                [`guilds`]: fr.guildId
            });

        } catch (error) {
            const previous = await helper.vars.trackDb.findOne({ where: { osuid: fr.userid } });
            const prevchannels: string[] = previous?.dataValues?.guilds?.split(',') ?? [];

            if (!prevchannels.includes(`${fr.guildId}`)) {
                prevchannels.push(`${fr.guildId}`);
            }

            await helper.vars.trackDb.update({
                osuid: fr.userid,
                [`guilds${fr.mode}`]: prevchannels.join(','),
                [`guilds`]: prevchannels.join(',')
            }, {
                where: {
                    osuid: fr.userid,
                }
            });
        }
    } else {
        const curuser = await helper.vars.trackDb.findOne({ where: { osuid: fr.userid } });
        const curguilds: string[] = curuser.dataValues[`guilds${fr.mode}`].split(',');
        const newguilds = curguilds.filter(channel => channel != fr.guildId);
        await helper.vars.trackDb.update({
            osuid: fr.userid,
            [`guilds${fr.mode}`]: newguilds.join(',')
        }, {
            where: {
                osuid: fr.userid
            }
        });

    }
    return true;
}


export async function trackUser(fr: { user: string, mode: string, inital?: boolean; }) {
    if (!fr.user) return;
    const curdata: osuapi.types_v2.Score[] & osuapi.types_v2.Error = await osuapi.v2.scores.best({
        user_id: +fr.user,
        mode: other.modeValidator(fr.mode),
    });
    const thisUser: osuapi.types_v2.User = await osuapi.v2.users.profile({
        name: fr.user,
        mode: other.modeValidator(fr.mode),
    });
    if (!curdata?.[0]?.user_id) return;

    data.updateUserStats(thisUser, fr.mode);

    if (curdata?.[0]?.user_id && fr.inital == true) {
        fs.writeFileSync(`${helper.path.main}/trackingFiles/${curdata[0].user_id}_${fr.mode}.json`, JSON.stringify(curdata, null, 2));
        return;
    }
    if (curdata?.[0]?.user_id) {
        if (fs.existsSync(`${helper.path.main}/trackingFiles/${curdata[0].user_id}_${fr.mode}.json`)) {
            let previous: osuapi.types_v2.Score[] & osuapi.types_v2.Error;
            try {
                previous = JSON.parse(fs.readFileSync(`${helper.path.main}/trackingFiles/${curdata[0].user_id}_${fr.mode}.json`, 'utf-8'));
            }
            catch {
                fs.writeFileSync(`${helper.path.main}/trackingFiles/${curdata[0].user_id}_${fr.mode}.json`, JSON.stringify(curdata, null, 2));
                return;
            }

            const idCollection = previous.map(x => x.id);
            for (let i = 0; i < curdata.length; i++) {
                if (!idCollection.includes(curdata[i].id)) {
                    // console.log(curdata[i].id)
                    sendMsg(await getEmbed({
                        scoredata: curdata[i],
                        scorepos: i,
                    }), fr.user,);
                }
            }
        }
        fs.writeFileSync(`${helper.path.main}/trackingFiles/${curdata[0].user_id}_${fr.mode}.json`, JSON.stringify(
            curdata.slice().sort((a, b) => b.pp - a.pp), null, 2));
    }
}

export async function getEmbed(
    data: {
        scoredata: osuapi.types_v2.Score,
        scorepos: number,
    },
) {
    const curscore = data.scoredata;
    const scorestats = data.scoredata.statistics;
    let totalhits = other.scoreTotalHits(scorestats);

    const overrides = calculate.modOverrides(curscore.mods);
    const perf = await performance.calcScore({
        mods: curscore.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
        mode: curscore.ruleset_id,
        mapid: curscore.beatmap.id,
        stats: scorestats,
        accuracy: curscore.accuracy,
        maxcombo: curscore.max_combo,
        mapLastUpdated: new Date(curscore.beatmap.last_updated),
        customAR: overrides.ar,
        customHP: overrides.hp,
        customCS: overrides.cs,
        customOD: overrides.od,
        clockRate: overrides.speed,
    });
    const fcperf = await performance.calcFullCombo({
        mods: curscore.mods.map(x => x.acronym) as osumodcalc.types.Mod[],
        mode: curscore.ruleset_id,
        mapid: curscore.beatmap.id,
        accuracy: curscore.accuracy,
        mapLastUpdated: new Date(curscore.beatmap.last_updated),
        customAR: overrides.ar,
        customHP: overrides.hp,
        customCS: overrides.cs,
        customOD: overrides.od,
        clockRate: overrides.speed,
    });

    let pp: string;
    const mxCombo = perf.difficulty.maxCombo;
    const usepp = data.scoredata.pp ?? perf.pp;
    if (data.scoredata.accuracy != 1) {
        pp = `${usepp}pp ${data.scoredata.max_combo == mxCombo ? '(FC)' : `(${fcperf.pp.toFixed(2)} if FC)`}`;
    } else {
        pp = `${usepp}pp (SS)`;
    }

    const embed = new Discord.EmbedBuilder()
        .setTitle(`${data.scoredata.beatmapset.title} [${data.scoredata.beatmap.version}]`)
        .setURL(`https://osu.ppy.sh/beatmapsets/${data.scoredata.beatmapset.id}#osu/${data.scoredata.beatmap.id}`)
        .setAuthor({
            name: `${data.scoredata?.user?.username} | New #${data.scorepos + 1} Personal Best`,
            url: `https://osu.ppy.sh/u/${data.scoredata?.user?.id}`,
            iconURL: `${`https://osuflags.omkserver.nl/${data.scoredata?.user?.country_code}.png`}`
        })
        .setThumbnail(`${data.scoredata?.user?.avatar_url ?? helper.defaults.images.user.url}`)
        .setImage(`${data.scoredata.beatmapset.covers['cover@2x']}`)
        .setDescription(
            `${data.scoredata.mods.length > 0 ? '+' + data.scoredata.mods.map(x => x.acronym).join('') + ' | ' : ''} **Score set** <t:${new Date(data.scoredata.ended_at).getTime() / 1000}:R>\n` +
            `${(data.scoredata.accuracy * 100).toFixed(2)}% | ${formatters.gradeToEmoji(data.scoredata.rank)} | ${(perf.difficulty.stars ?? data.scoredata.beatmap.difficulty_rating).toFixed(2)}⭐\n` +
            `${formatters.returnHits(data.scoredata.statistics, data.scoredata.ruleset_id).short} | ${data.scoredata.max_combo}x\n` +
            `${pp}`
        );
    return embed;
}

export async function trackUsers(totalTime: number) {
    const allUsers: helper.tooltypes.trackUser[] = await helper.vars.trackDb.findAll() as any;
    for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];

        setTimeout(() => {
            // log.toOutput(`Tracking - index ${i + 1}/${allUsers.length}. Next track in ${Math.floor(totalTime / allUsers.length)}`, config);
            let willFetch = false;
            if (!(typeof user.osuid == 'undefined' || user.osuid == null || user.osuid == undefined)) {
                if (`${user.guildsosu}`.length > 0 && `${user.guildsosu}`.length != 4) {
                    trackUser({
                        user: user.osuid,
                        mode: 'osu',
                        inital: false
                    });
                    willFetch = true;
                }
                if (`${user.guildstaiko}`.length > 0 && `${user.guildstaiko}`.length != 4) {
                    trackUser({
                        user: user.osuid,
                        mode: 'taiko',
                        inital: false
                    });
                    willFetch = true;
                }
                if (`${user.guildsfruits}`.length > 0 && `${user.guildsfruits}`.length != 4) {
                    trackUser({
                        user: user.osuid,
                        mode: 'fruits',
                        inital: false
                    });
                    willFetch = true;
                }
                if (`${user.guildsmania}`.length > 0 && `${user.guildsfruits}`.length != 4) {
                    trackUser({
                        user: user.osuid,
                        mode: 'mania',
                        inital: false
                    });
                    willFetch = true;
                }
            }
            if (willFetch == true) {
                log.stdout(`Tracking - Fetching ${user.osuid}`);
            } else {
                log.stdout(`Tracking cancelled - User ${user.osuid} has no tracked channels`);
            }
        },
            i < 1 ? 0 : (Math.floor(totalTime / allUsers.length)));
    }
}

export async function sendMsg(embed: Discord.EmbedBuilder, curuser: string) {
    const userobj: helper.tooltypes.trackUser = await helper.vars.trackDb.findOne({
        where: {
            osuid: curuser
        }
    }) as any;
    const guilds = userobj?.guilds?.includes(',') ? userobj?.guilds?.split(',')
        :
        [userobj?.guilds];

    let channels = [];
    if (!guilds[0]) {
        return;
    }

    guilds.forEach(() => {
        helper.vars.client.guilds.cache.forEach(async guild2 => {
            if (guilds.includes(guild2.id)) {
                const curset = await helper.vars.guildSettings.findOne({
                    where: {
                        guildid: guild2.id
                    }
                });
                if (curset?.dataValues?.trackChannel) {
                    await channels.push(`${curset?.dataValues?.trackChannel}`);
                    log.stdout(`Found channel in guild settings - ${curset?.dataValues.trackChannel}`);
                } else {
                    log.stdout('Found channel in guild settings - No channel set');
                }
            }
        });
    });

    //filter out duplicates
    channels = await channels.filter((item, index) => channels.indexOf(item) === index);

    setTimeout(() => {
        channels.filter((item, index) => channels.indexOf(item) === index).forEach(channel => {
            const curchannel: Discord.GuildTextBasedChannel = helper.vars.client.channels.cache.get(channel) as Discord.GuildTextBasedChannel;
            if (curchannel) {
                log.stdout(`Sending to channel: ${curchannel.id}`);
                curchannel.send({
                    embeds: [embed]
                }).catch(error => {
                    log.stdout(`Error sending to channel: ${error}`);
                });
            } else {
                log.stdout(`Error sending to channel: Channel not found`);
            }
        });
    }, 2000);

}