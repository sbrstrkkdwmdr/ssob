import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function page(i: {
    locale: string,
    path: string,
}) {
    if (!i.path) throw new Error('Missing path');
    if (!i.locale) i.locale = 'en';
    if (!helper.allowed('public')) throw new Error('Missing scope: public');
    
    const url = `/wiki/${i.locale}/${i.path}`;

    return await helper.requests.get_v2(
        url, {}
    ) as Promise<apitypes.KudosuHistory[]>;
}