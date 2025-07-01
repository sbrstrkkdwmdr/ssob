import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

type scoreListParams = {
    user_id: number,
    mode: apitypes.GameMode;
    limit?: number,
    offset?: number;
};

export async function profile(i: {
    name?: string,
    mode?: apitypes.GameMode;
    id?: string,
}) {
    if (!i.name && !i.id) throw new Error('Missing an ID or username');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    let url = `/users/${i.name}`;

    if (i?.mode) {
        url += `/${i.mode}`;
    }

    return await helper.requests.get_v2(
        url,
        {}
    ) as Promise<apitypes.UserExtended>;
}

export async function users(i: {
    ids: number[];
    include_variant_statistics?: boolean;
}) {
    if (!i.ids || i.ids.length == 0) throw new Error('Missing user IDs');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users`;

    const params = helper.setParams(i, {}, ['ids', 'include_variant_statistics']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.User[]>;
}

export async function recentActivity(i: {
    user_id: number,
    limit?: number,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/${i.user_id}/recent_activity`;

    const params = helper.setParams(i, { limit: 100 }, ['limit']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.Event[]>;
}

export async function beatmaps(i: {
    user_id: number,
    type: 'favourite' | 'graveyard' | 'guest' | 'loved' | 'nominated' | 'pending' | 'ranked';
    limit?: number,
    offset?: number,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!i.type) throw new Error('Missing type');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/${i.user_id}/beatmapsets/${i.type}`;

    const params = helper.setParams(i, { limit: 100 }, ['limit', 'offset']);


    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.Beatmapset[]>;
};

export async function mostPlayed(i: {
    user_id: number,
    limit?: number,
    offset?: number,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/${i.user_id}/beatmapsets/most_played`;

    const params = helper.setParams(i, { limit: 100 }, ['limit', 'offset']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.BeatmapPlaycount[]>;
};

export async function kudosu(i: {
    user_id: number,
    limit?: number,
    offset?: number,
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/${i.user_id}/kudosu`;

    const params = helper.setParams(i, { limit: 100 }, ['limit', 'offset']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.KudosuHistory[]>;
}


export async function lookup(i: {
    checksum?: string,
    id?: number,
}) {
    if (!(i.checksum && i.id)) throw new Error('Please input a checksum or ID to lookup');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/lookup`;

    const params = helper.setParams(i, {}, ['id', 'checksum']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.User[]>;
};

export async function scores(i: {
    user_id: number,
    mode?: apitypes.GameMode;
    type: 'recent' | 'firsts' | 'best' | 'pinned',
    limit?: number,
    include_fails?: 1 | 0,
    offset?: number;
}) {
    if (!i.user_id) throw new Error('Missing user ID');
    if (!i.type) throw new Error('Missing scores type');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/users/${i.user_id}/scores/${i.type}`;

    const params = helper.setParams(i, { limit: 100 }, ['limit', 'offset', 'mode', 'include_fails']);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.Score[]>;
}

/**
 * past 24h
 */
export async function scoresRecent(i: scoreListParams & { include_fails: 1 | 0; }) {
    return await scores({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: i.include_fails,
        type: 'recent',
        offset: i.offset
    });
}

/**
 * top ranks
 */
export async function scoresBest(i: scoreListParams) {
    return await scores({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: 0,
        type: 'best',
        offset: i.offset
    });
}

/**
 * #1 scores
 */
export async function scoresFirst(i: scoreListParams) {
    return await scores({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: 0,
        type: 'firsts',
        offset: i.offset
    });
}

export async function scoresPinned(i: scoreListParams) {
    return await scores({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: 0,
        type: 'pinned',
        offset: i.offset
    });
}