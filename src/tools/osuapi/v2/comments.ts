import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function multiple(i: {
    after?: string,
    commentable_type?: string,
    commentable_id?: string,
    cursor?: string,
    parent_id?: string,
    sort?: string,

}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/comments`;

    const params = helper.setParams(i, {});

    return await helper.requests.get_v2(url, params) as Promise<apitypes.CommentBundle>;
}

export async function single(i: {
    comment:string
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');
    
    const url = `/comments/${i.comment}`;

    const params = {} as Dict;

    return await helper.requests.get_v2(url, params) as Promise<apitypes.CommentBundle>;
}
