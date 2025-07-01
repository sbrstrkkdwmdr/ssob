import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function topicListing(i: {
    forum_id?: string,
    sort?: string,
    limit?: number,
    cursor_string?: string,
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');
    
    const url = `/forums/topics`;

    const params = helper.setParams(i, {});

    return await helper.requests.get_v2(url, params) as Promise<{
        cursor_string: apitypes.CursorString,
        topics: apitypes.ForumTopic[],
    }>;
}

export async function topicPosts(i: {
    topic_id: number,
    sort?: string,
    limit?: number,
    start?: string,
    end?: string,
    cursor_string?: string,
}) {
    if (!i.topic_id) throw new Error('Missing topic ID');
    const url = `/forums/topics/${i.topic_id}`;

    const params = helper.setParams(i, {}, ['sort', 'limit', 'start', 'end', 'cursor_string',]);

    return await helper.requests.get_v2(url, params) as Promise<{
        cursor_string: apitypes.CursorString,
        posts: apitypes.ForumPost[],
        search: Dict,
        topic: apitypes.ForumTopic,
    }>;
}

export async function listing() {
    const url = `/forums`;

    const params = {} as Dict;

    return await helper.requests.get_v2(url, params) as Promise<{
        forums: apitypes.Forum[];
    }>;
}


export async function topics(i: {
    forum_id: number,
}) {
    if (!i.forum_id) throw new Error('Missing topic ID');

    const url = `/forums/${i.forum_id}`;

    const params = {} as Dict;

    return await helper.requests.get_v2(url, params) as Promise<{
        forum: apitypes.Forum,
        topics: apitypes.ForumTopic[],
        pinned_topics: apitypes.ForumTopic[],
    }>;
}
