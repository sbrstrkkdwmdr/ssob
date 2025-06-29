import { Dict } from "./types";

export enum Mods {
    None = 0,
    NoFail = 1,
    Easy = 2,
    TouchDevice = 4,
    Hidden = 8,
    HardRock = 16,
    SuddenDeath = 32,
    DoubleTime = 64,
    Relax = 128,
    HalfTime = 256,
    Nightcore = 512, // Only set along with DoubleTime. i.e: NC only gives 576
    Flashlight = 1024,
    Autoplay = 2048,
    SpunOut = 4096,
    Relax2 = 8192,    // Autopilot
    Perfect = 16384, // Only set along with SuddenDeath. i.e: PF only gives 16416  
    Key4 = 32768,
    Key5 = 65536,
    Key6 = 131072,
    Key7 = 262144,
    Key8 = 524288,
    FadeIn = 1048576,
    Random = 2097152,
    Cinema = 4194304,
    Target = 8388608,
    Key9 = 16777216,
    KeyCoop = 33554432,
    Key1 = 67108864,
    Key3 = 134217728,
    Key2 = 268435456,
    ScoreV2 = 536870912,
    Mirror = 1073741824,
    KeyMod = Key1 | Key2 | Key3 | Key4 | Key5 | Key6 | Key7 | Key8 | Key9 | KeyCoop,
    FreeModAllowed = NoFail | Easy | Hidden | HardRock | SuddenDeath | Flashlight | FadeIn | Relax | Relax2 | SpunOut | KeyMod,
    ScoreIncreaseMods = Hidden | HardRock | DoubleTime | Flashlight | FadeIn
}

export type RankStatus = '-2' | '-1' | '0' | '1' | '2' | '3' | '4';
export type Timestamp = `${number}-${number}-${number} ${number}:${number}:${number}`;

export interface Beatmap {
    approved: RankStatus,                   // 4 = loved, 3 = qualified, 2 = approved, 1 = ranked, 0 = pending, -1 = WIP, -2 = graveyard
    submit_date: Timestamp, // date submitted, in UTC
    approved_date: Timestamp, // date ranked, in UTC
    last_update: Timestamp, // last update date, in UTC. May be after approved_date if map was unranked and reranked.
    artist: string,
    beatmap_id: string,              // beatmap_id is per difficulty
    beatmapset_id: string,               // beatmapset_id groups difficulties into a set
    bpm: string,
    creator: string,
    creator_id: string,
    difficultyrating: string,   // The number of stars the map would have in-game and on the website
    diff_aim: string,
    diff_speed: string,
    diff_size: string,                   // Circle size value (CS)
    diff_overall: string,                   // Overall difficulty (OD)
    diff_approach: string,                   // Approach Rate (AR)
    diff_drain: string,                   // Health drain (HP)
    hit_length: string,                 // seconds from first note to last note not including breaks
    source: string,
    genre_id: string,                   // 0 = any, 1 = unspecified, 2 = video game, 3 = anime, 4 = rock, 5 = pop, 6 = other, 7 = novelty, 9 = hip hop, 10 = electronic, 11 = metal, 12 = classical, 13 = folk, 14 = jazz (note that there's no 8)
    language_id: string,                   // 0 = any, 1 = unspecified, 2 = english, 3 = japanese, 4 = chinese, 5 = instrumental, 6 = korean, 7 = french, 8 = german, 9 = swedish, 10 = spanish, 11 = italian, 12 = russian, 13 = polish, 14 = other
    title: string,      // song name
    total_length: string,                 // seconds from first note to last note including breaks
    version: string,            // difficulty name
    file_md5: string,         // md5 hash of the beatmap
    mode: string,                   // game mode,
    tags: string,  // Beatmap tags separated by spaces.
    favourite_count: string,                 // Number of times the beatmap was favourited. (Americans: notice the ou!)
    rating: string,
    playcount: string,               // Number of times the beatmap was played
    passcount: string,               // Number of times the beatmap was passed, completed (the user didn't fail or retry)
    count_normal: string,
    count_slider: string,
    count_spinner: string,
    max_combo: string,                 // The maximum combo a user can reach playing this beatmap.
    storyboard: string,                   // If this beatmap has a storyboard
    video: string,                   // If this beatmap has a video
    download_unavailable: string,                   // If the download for this beatmap is unavailable (old map, etc.)
    audio_unavailable: string;                    // If the audio for this beatmap is unavailable (DMCA takedown, etc.)
}

export interface User {
    user_id: string,
    username: string,
    join_date: Timestamp, // In UTC
    count300: string,      // Total amount for all ranked, approved, and loved beatmaps played
    count100: string,       // Total amount for all ranked, approved, and loved beatmaps played
    count50: string,        // Total amount for all ranked, approved, and loved beatmaps played
    playcount: string,        // Only counts ranked, approved, and loved beatmaps
    ranked_score: string,    // Counts the best individual score on each ranked, approved, and loved beatmaps
    total_score: string, // Counts every score on ranked, approved, and loved beatmaps
    pp_rank: string,
    level: string,
    pp_raw: string,      // For inactive players this will be 0 to purge them from leaderboards
    accuracy: string,
    count_rank_ss: string,
    count_rank_ssh: string,
    count_rank_s: string,        // Counts for SS/SSH/S/SH/A ranks on maps
    count_rank_sh: string,
    count_rank_a: string,
    country: string,        // Uses the ISO3166-1 alpha-2 country code naming. See this for more information: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
    total_seconds_played: string,
    pp_country_rank: string,       // The user's rank in the country.
    events: {           // Contains events for this user
        display_html: string,
        beatmap_id: string,
        beatmapset_id: string,
        date: Timestamp, // In UTC
        epicfactor: string;      // How "epic" this event is (between 1 and 32)
    }[];
}
export interface Score {
    beatmap_id?: string,
    score_id: string,
    score: string,
    username?: string,
    count300: string,
    count100: string,
    count50: string,
    countmiss: string,
    maxcombo: string,
    countkatu: string,
    countgeki: string,
    perfect: string,          // 1 = maximum combo of map reached, 0 otherwise
    enabled_mods: string,         // bitwise flag representation of mods used. see reference
    user_id: string,
    date: Timestamp, // in UTC
    rank: string,
    pp: string,        //Float value , 4 decimals
    replay_available: string;              // 1 = replay is available for download, 0 = replay is unavailable
}
export interface Match {
    match: {
        match_id: string,
        name: string,
        start_time: Timestamp, // in UTC
        end_time?: Timestamp;             // null if not ended, date in UTC when match is disbanded
    },
    games: {
        game_id: string,
        start_time: Timestamp, // in UTC
        end_time: Timestamp, // in UTC
        beatmap_id: string,
        play_mode: string,              // standard = 0, taiko = 1, ctb = 2, o!m = 3
        match_type: string,              // couldn't find
        scoring_type: string,              // winning condition: score = 0, accuracy = 1, combo = 2, score v2 = 3
        team_type: string,              // Head to head = 0, Tag Co-op = 1, Team vs = 2, Tag Team vs = 3
        mods: string,              // global mods, see reference below
        scores: {
            slot: string,         // 0 based index of player's slot
            team: string,         // if mode doesn't support teams it is 0, otherwise 1 = blue, 2 = red
            user_id: string,
            score: string,
            maxcombo: string,
            rank: string,         // not used
            count50: string,
            count100: string,
            count300: string,
            countmiss: string,
            countgeki: string,
            countkatu: string,
            perfect: string,        // full combo
            pass: string,        // if the player failed at the end of the map it is 0, otherwise (pass or revive) it is 1
            enabled_mods?: string;
        }[];
    }[];
}
export interface Replay {
    content: string,
}