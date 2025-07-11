import axios from 'axios';
import fs from 'fs';
import * as util from 'util';
import * as apitypes from './apitypes';
import * as helper from './helper';
import { Dict } from './types';

export function oAuth(): apitypes.OAuth {
    helper.log('Finding cached OAuth');
    const str = fs.readFileSync(`./osuauth.json`, 'utf-8');
    helper.credentials.auth = JSON.parse(str) as apitypes.OAuth;
    helper.credentials.lastAuthUpdate = new Date();
    return helper.credentials.auth;
}

let headerVersion = '20220705';

/**
 * YYYYMMDD
 * 
 * note that when using an api version below 20220705, Score is of type LegacyScore
 */
export function setVersion(version: string) {
    headerVersion = version;
}

export async function PostOAuth() {
    helper.log('Updating OAuth token');
    return new Promise(async (resolve, reject) => {
        const newtoken: apitypes.OAuth = (await axios.post('https://osu.ppy.sh/oauth/token',
            `grant_type=client_credentials&client_id=${helper.credentials.id}&client_secret=${helper.credentials.secret}&scope=public`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            },
        ).catch(err => {
            reject(err);
            return {
                failed: true,
                data: {
                    err,
                }
            };
        })).data;
        if (newtoken?.access_token) {
            fs.writeFileSync(`./osuauth.json`, JSON.stringify(newtoken));
            helper.credentials.auth = newtoken;
            helper.credentials.lastAuthUpdate = new Date();
        } else {
            reject(new Error(util.format(newtoken)));
        }
        resolve(true);
    });
}

export function checkCredentials(version: 1 | 2): [boolean, string] {
    if (version == 1 && !helper.credentials.key) {
        return [false, 'Missing API key. Please use add a key with v1.login(key)'];
    } else if (version == 2) {
        let msgs = '';
        let p = true;
        if (!helper.credentials.id) {
            msgs += 'Missing client ID. Please input the ID with v2.login(id,secret)\n';
            p = false;
        }
        if (!helper.credentials.secret) {
            msgs += 'Missing client secret. Please input the secret with v2.login(id,secret)\n';
            p = false;
        }
        if (helper.credentials?.id == helper.credentials?.secret) {
            msgs += 'Client ID and Secret are the same value.\n';
            p = false;
        }
        return [p, msgs];
    }
    return [true, ''];
}

export async function checkAuth() {
    helper.log('Verifying OAuth');
    let getting = true;
    if (helper.credentials.auth) {
        if (helper.credentials?.auth?.expires_in ?? 0 <= helper.credentials.lastAuthUpdate.getTime()) {
            helper.log('OAuth expired!');
            await PostOAuth();
        }
        getting = false;
    }
    try {
        oAuth();
    } catch (error) {
        helper.log('Error fetching cached OAuth');
        helper.log(error);
        await PostOAuth();
        getting = false;
    }
    if (fs.existsSync(`./osuauth.json`)) {
        const stat = fs.statSync(`./osuauth.json`);
        if ((helper.credentials.auth?.expires_in ?? 0) <= stat.mtime.getSeconds() && getting) {
            helper.log('OAuth expired!');
            // await PostOAuth();
        }
    } else if (getting) {
        await PostOAuth();
    }
}

export async function get_v2(url: string, params: Dict, tries: number = 0) {
    if (tries > 3) {
        throw new Error('Exceeded try count. Please ensure credentials are valid');
    }
    const c = checkCredentials(2);
    if (!c[0]) {
        throw new Error(c[1]);
    }
    let inp = new URL('https://osu.ppy.sh/api/v2' + url);
    for (const key in params) {
        if (Array.isArray(params[key])) {
            const _temp: any[] = params[key];
            for (const elem of _temp) {
                inp.searchParams.append(key + '[]', elem);
            }
        } else {
            inp.searchParams.append(key, params[key]);
        }
    }
    helper.log('v2 get: ' + inp.toString());
    const data = (await axios.get(inp.toString(), {
        headers: {
            Authorization: `Bearer ${helper.credentials?.auth?.access_token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-version": headerVersion
        },
    }).catch(err => {
        if (err?.response?.data?.authentication == 'basic') {
            return {
                data: {
                    authentication: "basic"
                }
            };
        } else {
            return {
                data: { error: null, }
            };
        }
    })).data;
    if (data?.authentication) {
        helper.log('Authentication error...\nUpdating authentication and retrying...');
        try {
            checkAuth();
        } catch (error) {
            console.log(error);
            return {
                error
            };
        }
        return get_v2(url, params, tries + 1);
    }
    return data;
}

export async function post_v2(url: string, params: Dict, body: Dict, tries: number = 0) {
    if (tries > 3) {
        throw new Error('Exceeded try count. Please ensure credentials are valid');
    }
    const c = checkCredentials(2);
    if (c[0]) {
        throw new Error(c[1]);
    }
    let inp = new URL('https://osu.ppy.sh/api/v2' + url);
    for (const key in params) {
        if (Array.isArray(params[key])) {
            const _temp: any[] = params[key];
            for (const elem of _temp) {
                inp.searchParams.append(key + '[]', elem);
            }
        } else {
            inp.searchParams.append(key, params[key]);
        }
    }
    helper.log('v2 post: ' + inp.toString());
    helper.log('v2 post body: ' + body);
    const data = (await axios.post(inp.toString(),
        JSON.stringify(body),
        {
            headers: {
                Authorization: `Bearer ${helper.credentials?.auth?.access_token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
                "x-api-version": "20220705"
            },
        }).catch(err => {
            if (err?.response?.data?.authentication == 'basic') {
                return {
                    data: {
                        authentication: "basic"
                    }
                };
            } else {
                return {
                    data: { error: null, }
                };
            }
        })).data;
    if (data?.authentication) {
        helper.log('Authentication error...\nUpdating authentication and retrying...');
        try {
            checkAuth();
        } catch (error) {
            console.log(error);
            return {
                error
            };
        }
        return post_v2(url, params, body, tries + 1);
    }
    return data;
}

export async function get_v1(url: string, params: Dict, tries: number = 0) {
    if (tries > 3) {
        throw new Error('Exceeded try count. Please ensure credentials are valid');
    }
    const c = checkCredentials(1);
    if (c[0]) {
        throw new Error(c[1]);
    }
    await checkAuth();
    let inp = new URL('https://osu.ppy.sh/api' + url);
    params.k = helper.credentials.key;
    for (const key in params) {
        if (Array.isArray(params[key])) {
            const _temp: any[] = params[key];
            for (const elem of _temp) {
                inp.searchParams.append(key + '[]', elem);
            }
        } else {
            inp.searchParams.append(key, params[key]);
        }
    }
    helper.log('v1 get: ' + inp.toString().replace(helper.credentials.key, 'KEY'));
    const data = (await axios.get(inp.toString(), {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    }).catch(err => {
        return {
            data: { error: err, }
        };
    })).data;
    return data;
}