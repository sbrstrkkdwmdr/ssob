import Discord from "discord.js";
import * as helper from "./helper";
import { Dict } from "./types/tools";

const emojis /* : Dict<string> */ = {
    page_first: "button/page_first",
    page_previous: "button/page_previous",
    page_search: "button/page_select",
    page_next: "button/page_next",
    page_last: "button/page_last",
    refresh: "button/refresh",
    details_default: "button/details_default",
    details_more: "button/details_more",
    details_less: "button/details_less",
    random: "button/random",
    graph: "button/graph",
    map: "button/map",
    user: "button/user",
    leaderboard: "button/leaderboard",
    count_circles: "osu_mapobjs/count_circles",
    count_sliders: "osu_mapobjs/count_sliders",
    count_spinners: "osu_mapobjs/count_spinners",
    bpm: "osu_mapobjs/bpm",
    total_length: "osu_mapobjs/total_length",
    modeosu: "osu_gamemodes/modeosu",
    modetaiko: "osu_gamemodes/modetaiko",
    modefruits: "osu_gamemodes/modefruits",
    modemania: "osu_gamemodes/modemania",
    statusranked: "osu_rankedstatus/status-ranked",
    statusapproved: "osu_rankedstatus/status-approved",
    statusloved: "osu_rankedstatus/status-loved",
    statusgraveyard: "osu_rankedstatus/status-graveyard",
    Ranking_XH: "osu_grades/Ranking_XH",
    Ranking_X: "osu_grades/Ranking_X",
    Ranking_SH: "osu_grades/Ranking_SH",
    Ranking_S: "osu_grades/Ranking_S",
    Ranking_A: "osu_grades/Ranking_A",
    Ranking_B: "osu_grades/Ranking_B",
    Ranking_C: "osu_grades/Ranking_C",
    Ranking_D: "osu_grades/Ranking_D",
    Ranking_F: "osu_grades/Ranking_F",
    osu_online: "osu_onlinestatus/osu_online",
    osu_offline: "osu_onlinestatus/osu_offline",
    support1: "osu_supporter/support1",
    support2: "osu_supporter/support2",
    support3: "osu_supporter/support3",
};

export async function setup() {
    const guild = helper.vars.client.guilds.cache.get(
        helper.vars.config.emojiGuild,
    );
    if (!guild) {
        throw new Error(
            "Could not find guild matching ID: " +
                helper.vars.config.emojiGuild,
        );
    }
    let basePath = helper.path.precomp + "/files/emojis/";
    const ems = guild.emojis;
    for (const [emoji, path] of Object.entries(emojis) as [
        keyof typeof emojis,
        string,
    ][]) {
        let tempemo: Discord.GuildEmoji | void;
        let exists = emojiExists(emoji, ems.cache);
        if (exists) {
            tempemo = emojiGet(emoji, ems.cache);
        } else {
            let filepath = basePath + path + ".png";
            tempemo = await ems
                .create({
                    name: emoji,
                    attachment: filepath,
                })
                .catch(console.error);
            if (!tempemo) {
                console.log("Failed to create emoji - " + emoji);
                throw new Error("Emoji creation fail");
                continue;
            }
            console.log(`Created emoji - ${tempemo.name}`);
            // prevent ratelimit
            await delay(250);
        }
        setEmoji(emoji, tempemo.id);
    }
}

async function delay(amt: number) {
    return new Promise((res, rej) => {
        setTimeout(res, amt);
    });
}

// because cache.get() works based on ID, we need a separate function to do that but name-based
function emojiExists(
    name: string,
    cache: Discord.Collection<string, Discord.GuildEmoji>,
) {
    let uname = name.toLowerCase();
    for (const [idx, emoji] of cache) {
        if (uname == emoji.name.toLowerCase()) return true;
    }
    return false;
}

function emojiGet(
    name: string,
    cache: Discord.Collection<string, Discord.GuildEmoji>,
) {
    let uname = name.toLowerCase();
    for (const [idx, emoji] of cache) {
        if (uname == emoji.name.toLowerCase()) return emoji;
    }
    return null;
}

const buttonkeys = [
    "page_first",
    "page_previous",
    "page_search",
    "page_next",
    "page_last",
    "refresh",
    "details_default",
    "details_more",
    "details_less",
    "random",
    "graph",
    "map",
    "user",
    "leaderboard",
];
const emojikeys = [
    "count_circles",
    "count_sliders",
    "count_spinners",
    "bpm",
    "total_length",
    "modeosu",
    "modetaiko",
    "modefruits",
    "modemania",
    "ranked",
    "approved",
    "loved",
    "graveyard",
    "Ranking_XH",
    "Ranking_X",
    "Ranking_SH",
    "Ranking_S",
    "Ranking_A",
    "Ranking_B",
    "Ranking_C",
    "Ranking_D",
    "Ranking_F",
    "osu_online",
    "osu_offline",
    "support1",
    "support2",
    "support3",
];

function toEmoji(name: string, id: string) {
    return "<:" + name + ":" + id + ">";
}

function setEmoji(name: keyof typeof emojis, id: string) {
    // TODO find better solution than long ass switch statement
    switch (name) {
        case "page_first":
            helper.buttons.label.page.first = toEmoji(name, id);
            break;
        case "page_previous":
            helper.buttons.label.page.previous = toEmoji(name, id);
            break;
        case "page_search":
            helper.buttons.label.page.search = toEmoji(name, id);
            break;
        case "page_next":
            helper.buttons.label.page.next = toEmoji(name, id);
            break;
        case "page_last":
            helper.buttons.label.page.last = toEmoji(name, id);
            break;
        case "refresh":
            helper.buttons.label.main.refresh = toEmoji(name, id);
            break;
        case "details_default":
            helper.buttons.label.main.detailed = toEmoji(name, id);
            helper.buttons.label.main.detailDefault = toEmoji(name, id);
            break;
        case "details_more":
            helper.buttons.label.main.detailMore = toEmoji(name, id);
            break;
        case "details_less":
            helper.buttons.label.main.detailLess = toEmoji(name, id);
            break;
        case "random":
            helper.buttons.label.extras.random = toEmoji(name, id);
            break;
        case "graph":
            helper.buttons.label.extras.graph = toEmoji(name, id);
            break;
        case "map":
            helper.buttons.label.extras.map = toEmoji(name, id);
            break;
        case "user":
            helper.buttons.label.extras.user = toEmoji(name, id);
            break;
        case "leaderboard":
            helper.buttons.label.extras.leaderboard = toEmoji(name, id);
            break;
        case "count_circles":
            helper.emojis.mapobjs.circle = toEmoji(name, id);
            break;
        case "count_sliders":
            helper.emojis.mapobjs.slider = toEmoji(name, id);
            break;
        case "count_spinners":
            helper.emojis.mapobjs.spinner = toEmoji(name, id);
            break;
        case "bpm":
            helper.emojis.mapobjs.bpm = toEmoji(name, id);
            break;
        case "total_length":
            helper.emojis.mapobjs.total_length = toEmoji(name, id);
            break;
        case "modeosu":
            helper.emojis.gamemodes.osu = toEmoji(name, id);
            helper.emojis.gamemodes.standard = toEmoji(name, id);
            helper.emojis.gamemodes[0] = toEmoji(name, id);
            break;
        case "modetaiko":
            helper.emojis.gamemodes.taiko = toEmoji(name, id);
            helper.emojis.gamemodes[1] = toEmoji(name, id);
            break;
        case "modefruits":
            helper.emojis.gamemodes.fruits = toEmoji(name, id);
            helper.emojis.gamemodes[2] = toEmoji(name, id);
            break;
        case "modemania":
            helper.emojis.gamemodes.mania = toEmoji(name, id);
            helper.emojis.gamemodes[3] = toEmoji(name, id);
            break;
        case "statusranked":
            helper.emojis.rankedstatus.ranked = toEmoji(name, id);
            break;
        case "statusapproved":
            helper.emojis.rankedstatus.approved = toEmoji(name, id);
            helper.emojis.rankedstatus.qualified = toEmoji(name, id);
            break;
        case "statusloved":
            helper.emojis.rankedstatus.loved = toEmoji(name, id);
            break;
        case "statusgraveyard":
            helper.emojis.rankedstatus.graveyard = toEmoji(name, id);
            break;
        case "Ranking_XH":
            helper.emojis.grades.XH = toEmoji(name, id);
            break;
        case "Ranking_X":
            helper.emojis.grades.X = toEmoji(name, id);
            break;
        case "Ranking_SH":
            helper.emojis.grades.SH = toEmoji(name, id);
            break;
        case "Ranking_S":
            helper.emojis.grades.S = toEmoji(name, id);
            break;
        case "Ranking_A":
            helper.emojis.grades.A = toEmoji(name, id);
            break;
        case "Ranking_B":
            helper.emojis.grades.B = toEmoji(name, id);
            break;
        case "Ranking_C":
            helper.emojis.grades.C = toEmoji(name, id);
            break;
        case "Ranking_D":
            helper.emojis.grades.D = toEmoji(name, id);
            break;
        case "Ranking_F":
            helper.emojis.grades.F = toEmoji(name, id);
            break;
        case "osu_online":
            helper.emojis.onlinestatus.online = toEmoji(name, id);
            break;
        case "osu_offline":
            helper.emojis.onlinestatus.offline = toEmoji(name, id);
            break;
        case "support1":
            helper.emojis.supporter[1] = toEmoji(name, id);
            break;
        case "support2":
            helper.emojis.supporter[2] = toEmoji(name, id);
            break;
        case "support3":
            helper.emojis.supporter[3] = toEmoji(name, id);
            break;
    }
}
