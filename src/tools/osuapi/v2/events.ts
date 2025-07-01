import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function get() {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');
    
    const url = `/events`;

    const params = {} as Dict;

    return await helper.requests.get_v2(url, params) as Promise<{
        cursor_string: apitypes.CursorString,
        events: apitypes.Event[],
    }>;
}
