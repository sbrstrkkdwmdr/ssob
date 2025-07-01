import * as apitypes from './apitypes_old';
import * as helper from './helper';
import { credentials } from './helper';
import { Dict } from './types';
export function login(key: string) {
    credentials.key = key;
}

/**
 * convert these keys to these values when sending via the API
 */
const convert: Dict = {
    'set_id': 's',
    'map_id': 'b',
    'user': 'u',
    'mode': 'm',
    'show_converts': 'a',
    'hash': 'h',
    'score_id': 's',
    'match_id': 'mp',
};

function modsToInt(mods: apitypes.Mods[]) {
    let temp = 0;
    mods = mods as apitypes.Mods[] ?? [];
    for (const mod of mods) {
        temp += mod;
    }
    return temp;
}

/**
 * type - if user is string or name
 */
export async function beatmaps(i: {
    since?: string,
    set_id?: string,
    map_id?: string,
    user?: string,
    type?: 'string' | 'id',
    mode?: helper.Ruleset,
    show_converts?: 1 | 0,
    hash?: string,
    limit?: number,
    mods?: apitypes.Mods[] | number;
}) {
    const url = `/get_beatmaps`;
    if (Array.isArray(i.mods ?? 0)) {
        i.mods = modsToInt(i.mods as apitypes.Mods[]);
    }
    const params: Dict = {
    };
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Beatmap[]>;
}

export async function user(i: {
    user: string,
    mode?: helper.Ruleset,
    type?: 'string' | 'id',
    event_days?: number;
}) {
    if (!(i.user)) throw new Error('Missing user');
    const url = `/get_user`;
    const params: Dict = {};
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.User[]>;
};

export async function mapLeaderboard(i: {
    map_id: string,
    user?: string,
    type?: 'string' | 'id',
    mode?: helper.Ruleset,
    limit?: number,
    mods?: apitypes.Mods[] | number;
}) {
    if (!(i.map_id)) throw new Error('Missing beatmap ID');
    const url = `/get_scores`;
    if (Array.isArray(i.mods ?? 0)) {
        i.mods = modsToInt(i.mods as apitypes.Mods[]);
    }
    const params: Dict = {};
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Score[]>;
}

export async function userBestScores(i: {
    user: string,
    type?: 'string' | 'id',
    limit?: number,
    mode?: helper.Ruleset,
}) {
    if (!(i.user)) throw new Error('Missing user');
    const url = `/get_user_recent`;
    const params: Dict = {};
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Score[]>;
}

export async function userRecentScores(i: {
    user: string,
    type?: 'string' | 'id',
    limit?: number,
    mode?: helper.Ruleset,
}) {
    if (!(i.user)) throw new Error('Missing user');
    const url = `/get_user_recent`;
    const params: Dict = {};
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Score[]>;
}
export async function match(i: {
    match_id: number,
}) {
    if (!(i.match_id)) throw new Error('Missing match ID');
    const url = `/get_match`;
    const params: Dict = {
        mp: i.match_id
    };
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Match>;
}

export async function replay(i: {
    map_id?: number,
    user?: string,
    mode?: helper.Ruleset,
    score_id?: number,
    type?: 'string' | 'id',
    mods?: apitypes.Mods[] | number;

}) {
    if (!(i.user && i.map_id && i.score_id)) throw new Error('Missing user, map ID and score ID. Please use either a score ID or map ID + user');
    if (i.user && !i.map_id && !i.score_id) throw new Error('Missing user');
    if (!i.user && i.map_id && !i.score_id) throw new Error('Missing map');
    const url = `/get_replay`;
    if (Array.isArray(i.mods ?? 0)) {
        i.mods = modsToInt(i.mods as apitypes.Mods[]);
    }
    const params: Dict = {};
    for (const key in i) {
        if (convert[key]) {
            params[convert[key]] = (i as Dict)[key];
        } else {
            params[key] = (i as Dict)[key];
        }
    }
    return await helper.requests.get_v1(
        url, params
    ) as Promise<apitypes.Replay>;
}