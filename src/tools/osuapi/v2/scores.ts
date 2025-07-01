import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

type scoreListParams = {
    user_id: number,
    mode: apitypes.GameMode;
    limit?: number,
    offset?: number;
};

/**
 * mode is needed for old score links
 */
export async function single(i: {
    id: number,
    mode?: apitypes.GameMode;
}) {
    if (!i.id) throw new Error('Missing score ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    let url = `/scores/${i.id}`;
    if (i.mode) {
        url = `/scores/${i.mode}/${i.id}`;
    }

    return await helper.requests.get_v2(
        url,
        {}
    ) as Promise<apitypes.Score>;
};

export async function multiple(i: {
    ruleset?: apitypes.GameMode,
    cursor_string?: string,
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    let url = `/scores`;

    const params = helper.setParams(i, {}, ['cursor_string', 'ruleset',]);

    return await helper.requests.get_v2(
        url,
        params
    ) as Promise<{
        scores: apitypes.Score[],
        cursor_string: apitypes.CursorString,
    }>;
};

export async function list(i: {
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
export async function recent(i: scoreListParams & { include_fails: 1 | 0; }) {
    return await list({
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
export async function best(i: scoreListParams) {
    return await list({
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
export async function first(i: scoreListParams) {
    return await list({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: 0,
        type: 'firsts',
        offset: i.offset
    });
}

export async function pinned(i: scoreListParams) {
    return await list({
        user_id: i.user_id,
        mode: i.mode,
        limit: i.limit,
        include_fails: 0,
        type: 'pinned',
        offset: i.offset
    });
}