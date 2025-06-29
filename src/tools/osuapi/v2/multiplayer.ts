import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function scores(i: {
    room_id: number,
    playlist_id: number,
    limit?: number,
    sort?: string,
    cursor_string?: string,
}) {
    if (!i.room_id) throw new Error('Missing room ID');
    if (!i.playlist_id) throw new Error('Missing playlist ID');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/rooms/${i.room_id}/playlist/${i.playlist_id}/scores`;

    const params = helper.setParams(i, {}, ['limit', 'sort', 'cursor_string']);

    return await helper.requests.get_v2(url, params) as Promise<apitypes.MultiplayerScores>;
}

export async function rooms(i: {
    limit?: number,
    sort?: string,
    mode?: 'active' | 'all' | 'ended' | 'participated' | 'owned',
    season_id?: string,
    type_group?: 'playlists' | 'realtime',
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/rooms`;

    const params = helper.setParams(i, {},);

    return await helper.requests.get_v2(url, params) as Promise<{
        rooms: apitypes.Room[],
        cursor: apitypes.Cursor,
        cursor_string: apitypes.CursorString,
    }>;
}