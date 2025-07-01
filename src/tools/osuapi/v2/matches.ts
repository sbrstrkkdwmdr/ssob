import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function listing(i: {
    sort?: 'id_desc' | 'id_asc',
    limit?: number,
    cursor_string?: string,
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/matches`;

    const params = helper.setParams(i, {});

    return await helper.requests.get_v2(url, params) as Promise<{
        cursor: apitypes.Cursor,
        cursor_string: apitypes.CursorString,
        matches: apitypes.Match[],
        params: {
            limit: number,
            sort: string;
        };
    }>;
}

export async function get(i: {
    match_id: number,
    before?: number,
    after?: number,
    limit?: number,
}) {
    if (!i.match_id) throw new Error('Missing match ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/matches/${i.match_id}`;

    const params = helper.setParams(i, {}, ['before', 'after', 'limit',]);

    return await helper.requests.get_v2(url, params) as Promise<{
        match: apitypes.Match,
        events: apitypes.MatchEvent[],
        users: apitypes.User[],
        first_event_id: number,
        latest_event_id: number,
    }>;
}