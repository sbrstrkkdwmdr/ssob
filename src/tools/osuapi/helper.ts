import axios from 'axios';
import fs from 'fs';
import * as apitypes from './apitypes';
import { Dict } from './types';

export const credentials: {
    id?: string,
    secret?: string,
    auth?: apitypes.OAuth,
    lastAuthUpdate?: Date,
    key?: string,
    user?: boolean,
    lazer?: boolean,
} = {};

export let logCalls = false;

export function logCaller(i: boolean) {
    logCalls = i;
}

// TODO - for things like chat access and checking if scopes are enabled
const validScopes: apitypes.Scope[] = ['public'];

export function allowed(...scopes: apitypes.Scope[]) {
    for (const scope of scopes) {
        if (!validScopes.includes(scope)) return false;
    }
    return true;
}

export enum Ruleset {
    osu = 0,
    taiko = 1,
    fruits = 2,
    mania = 3
}

export const baseUrl = {
    v1: 'https://osu.ppy.sh/api',
    v2: 'https://osu.ppy.sh/api/v2'
};

export function setParams(input: Dict, params: Dict, keys?: string[]) {
    if (!keys) {
        return setParams_all(input, params);
    }
    for (const key of keys) {
        if (input[key]) {
            params[key] = input[key];
        }
    }
    return params;
}

function setParams_all(input: Dict, params: Dict) {
    for (const key in input) {
        if (input[key]) {
            params[key] = input[key];
        }
    }
    return params;
}

export function log(data: any) {
    if (logCalls) {
        console.log(data);
    }
}

export * as requests from './requests';

