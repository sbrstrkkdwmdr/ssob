import * as apitypes from '../apitypes';
import * as helper from '../helper';
import { Dict } from '../types';

export async function kudosu(i: {
    page?: number;
}) {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/rankings/kudosu`;

    const params = helper.setParams(i, {}, ['page',]);

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.User[]>;
}

/**
 * variant is 4k or 7k, global type only
 * 
 * country is ISO 3166-1 alpha-2, global type only
 */
export async function ranking<T extends apitypes.RankingType>(i: {
    mode: apitypes.GameMode,
    type: T,
    ruleset?: apitypes.GameMode,
    country?: string,
    cursor?: string,
    filter?: string,
    spotlight?: string,
    variant?: string,
}): Promise<
    T extends 'country' ?
    apitypes.Rankings<apitypes.CountryStatistics> :
    apitypes.Rankings<apitypes.UserStatistics>
> {
    if (!i.mode) throw new Error('Missing mode');
    if (!i.type) throw new Error('Missing type');
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/rankings/${i.mode}/${i.type}`;

    const params = helper.setParams(i, {}, ['country', 'cursor', 'filter', 'spotlight', 'variant',]);

    return await helper.requests.get_v2(
        url, params
    );
}

export async function spotlights() {
    if (!helper.allowed('public')) throw new Error('Missing scope: public');

    const url = `/spotlights`;

    const params: Dict = {};

    return await helper.requests.get_v2(
        url, params
    ) as Promise<apitypes.SpotLights>;
}