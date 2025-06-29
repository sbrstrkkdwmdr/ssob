import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function listing(i: {
    limit?: number,
    cursor_string?: string,
    year?: number,
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/news`;

    const params = helper.setParams(i, {},);

    return await helper.requests.get_v2(url, params) as Promise<{
        cursor_string: apitypes.CursorString,
        news_posts: apitypes.NewsPost[],
        news_sidebar: {
            current_year: number,
            news_posts: apitypes.NewsPost[],
            years: number[],
        },
        search: {
            limit: number,
            sort: 'published_desc',
        };
    }>;
}

export async function post(i: {
    news:string,
    key?: 'id',
}) {
    if (!i.news) throw new Error('Missing news ID or slug');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/news/${i.news}`;

    const params = helper.setParams(i, {},);

    return await helper.requests.get_v2(url, params) as Promise<apitypes.NewsPost>;
}