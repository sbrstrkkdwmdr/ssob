import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function scores(i: {
    id: number,
    ruleset: apitypes.GameMode,
    legacy_only?: 1 | 0,
    mods?: apitypes.ModAcronym[],
    limit?: number;
    type?: string;
}) {
    if (!i.id) throw new Error('Missing beatmap ID');
    if (!i.ruleset) throw new Error('Missing ruleset');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/${i.id}/scores`;

    const params = helper.setParams(i, {}, ['ruleset', 'legacy_only', 'mods', 'limit', 'type']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapScores<apitypes.Score>>;
}

export async function userScore(i: {
    user_id: number,
    map_id: number,
    legacy_only?: 1 | 0,
    mods?: apitypes.ModAcronym[],
    ruleset?: apitypes.GameMode,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!i.map_id) throw new Error('Missing map ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/${i.map_id}/scores/users/${i.user_id}`;

    const params = helper.setParams(i, {}, ['legacy_only', 'mods', 'ruleset']);

    return await helper.requests.get_v2(url, params) as Promise<apitypes.BeatmapUserScore>;
}

export async function userScores(i: {
    user_id: number,
    map_id: number,
    legacy_only?: 1 | 0,
    mods?: apitypes.ModAcronym[],
    ruleset?: apitypes.GameMode,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!i.map_id) throw new Error('Missing map ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/${i.map_id}/scores/users/${i.user_id}/all`;

    const params = helper.setParams(i, {}, ['legacy_only', 'mods', 'ruleset']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<{ scores: apitypes.Score[]; }>;
}

export async function map(i: {
    id: number;
}) {
    if (!i.id) throw new Error('Missing beatmap ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/${i.id}`;

    const params: Dict = {};

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapExtended>;
}

export async function maps(i: {
    ids: number[];
}) {
    if (!i.ids || i.ids.length == 0) throw new Error('Missing beatmap IDs');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps`;

    const params: Dict = {
        ids: i.ids
    };

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapExtended[]>;
}

export async function mapLookup(i: {
    filename?: string,
    checksum?: string,
    id?: number,
}) {
    if (!(i.filename && i.checksum && i.id)) throw new Error('Please input a filename, checksum or ID to lookup');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/lookup`;

    const params = helper.setParams(i, {}, ['filename', 'checksum', 'id']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapExtended>;
}

export async function attributes(i: {
    id: number;
    mods?: apitypes.ModAcronym[] | number,
    ruleset?: apitypes.GameMode,
    ruleset_id?: helper.Ruleset;
}) {
    if (!i.id) throw new Error('Missing beatmap ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/${i.id}`;

    const params: Dict = {
    };
    const body = helper.setParams(i, {}, ['mods', 'ruleset', 'ruleset_id']);


    return await helper.requests.post_v2(
        url, params, body
    ) as Promise<apitypes.BeatmapDifficultyAttributes>;
}

export async function mapset(i: {
    id: number;
}) {
    if (!i.id) throw new Error('Missing beatmapset ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmapsets/${i.id}`;

    const params: Dict = {
    };

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapsetExtended>;
}

/**
 * params assumed based on beatmap lookup
 */
export async function mapsetLookup(i: {
    filename?: string,
    checksum?: string,
    id?: number,
}) {
    if (!(i.filename && i.checksum && i.id)) throw new Error('Please input a filename, checksum or ID to lookup');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmapsets/lookup`;

    const params = helper.setParams(i, {}, ['filename', 'checksum', 'id']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapsetExtended>;
}

export async function search(i: {
    query: string;
    cursor_string?: string;
}) {
    if (!(i.query)) throw new Error('Please input a query');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmapsets/search`;

    const params: Dict = {
        q: encodeURIComponent(i.query),
        cursor_string: i?.cursor_string ?? ''
    };

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapsetSearch>;
}

export async function packs(i: {
    type?: string,
    cursor_string?: string;
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/packs`;

    const params = helper.setParams(i, {}, ['type', 'cursor_string']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapPack[]>;
}

export async function pack(i: {
    pack: string,
    legacy_only: 1 | 0,
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/beatmaps/packs/${i.pack}`;

    const params = helper.setParams(i, {}, ['legacy_only']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapPack>;
}

// https://github.com/cyperdark/osu-api-extended/blob/master/api/v2/beatmaps_events_list.ts
export async function events(i: {}) {
    const url = `beatmapsets/events`;
    const params = helper.setParams(i, {},);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<{
        events: apitypes.Event[];
        reviewsConfig: {
            max_blocks: number,
        };
        users: apitypes.User[];
    }>;
}