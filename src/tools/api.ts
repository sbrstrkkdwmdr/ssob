import axios from 'axios';
import * as fs from 'fs';
import * as osumodcalc from 'osumodcalculator';
import perf from 'perf_hooks';
import * as helper from '../helper.js';
import * as bottypes from '../types/bot.js';
import * as apitypes from '../types/osuapi.js';
import * as tooltypes from '../types/tools.js';
const baseUrl = 'https://osu.ppy.sh/api/v2/';

export function oAuth(): apitypes.OAuth {
    const str = fs.readFileSync(`${helper.vars.path.precomp}/config/osuauth.json`, 'utf-8');
    return JSON.parse(str) as apitypes.OAuth;
}

export async function PostOAuth() {
    return new Promise(async (resolve, reject) => {
        helper.tools.log.stdout('UPDATE TOKEN: https://osu.ppy.sh/oauth/token');
        /**
         * error: 'unsupported_grant_type',
         * error_description: 'The authorization grant type is not supported by the authorization server.',
         * hint: 'Check that all required parameters have been provided',
         * message: 'The authorization grant type is not supported by the authorization server.'
         */
        const newtoken: apitypes.OAuth = (await axios.post('https://osu.ppy.sh/oauth/token',
            `grant_type=client_credentials&client_id=${helper.vars.config.osu.clientId}&client_secret=${helper.vars.config.osu.clientSecret}&scope=public`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            },
        ).catch(err => {
            helper.tools.log.stdout(err);
            return {
                failed: true,
                data: {
                    err,
                }
            };
        })).data;
        if (newtoken?.access_token) {
            fs.writeFileSync(`${helper.vars.path.precomp}/config/osuauth.json`, JSON.stringify(newtoken));
        }
        resolve(true);
    });
}
export async function apiGet(input: tooltypes.apiInput) {
    const oauth = oAuth();
    const before = perf.performance.now();
    let data: tooltypes.apiReturn;
    let datafirst;
    let url = helper.tools.other.appendUrlParamsString(input.url, input.extra ?? []);
    url = encodeURI(url);
    // helper.tools.log.stdout(input.url);
    if (input.tries >= 5) {
        return {
            msTaken: 0,
            apiData: {},
            error: new Error("Exceeded amount of tries"),
        } as tooltypes.apiReturn;
    }
    try {
        helper.tools.log.stdout('OSU API GET: ' + input.url);
        datafirst = (await axios.get(url, {
            headers: {
                Authorization: `Bearer ${oauth.access_token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
                "x-api-version": "20220705"
            }
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
        })
        ).data;
        // helper.tools.log.stdout(datafirst);
    } catch (error) {
        data = {
            msTaken: perf.performance.now() - before,
            apiData: datafirst,
            error
        };
    }
    const after = perf.performance.now();

    try {
        if (datafirst?.authentication) {
            await PostOAuth();
            input.tries ? input.tries = input.tries + 1 : input.tries = 1;
            datafirst = await apiGet(input);
        }
        // if ('error' in datafirst && !input.type.includes('search')) {
        //     throw new Error(helper.vars.errors.apiError);
        // }
        data = {
            msTaken: after - before,
            apiData: datafirst
        };
    } catch (error) {
        data = {
            msTaken: after - before,
            apiData: datafirst,
            error: error ?? 'Unknown error'
        };
        fs.writeFileSync(`${helper.vars.path.main}/cache/errors/osuApi${Date.now()}.json`, JSON.stringify(data, null, 2));
    }
    while (data?.apiData?.apiData) {
        data = data.apiData;
    }
    return data;
}
export async function getUser(name: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `users/${helper.tools.checks.toHexadecimal(name)}/${helper.tools.other.modeValidator(mode)}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.User>;
}
export async function getUserActivity(name: string | number, extra: string[]) {
    const url = baseUrl + `users/${helper.tools.checks.toHexadecimal(name)}/recent_activity?limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Event[]>;
}
export async function getScoreWithMode(id: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `scores/${helper.tools.other.modeValidator(mode)}/${id}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Score>;
}
export async function getScore(id: string | number, extra: string[]) {
    const url = baseUrl + `scores/${id}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Score>;
}
export async function getScoresRecent(id: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `users/${id}/scores/recent?mode=${helper.tools.other.modeValidator(mode)}&limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Score[]>;
}
export async function getScoresBest(id: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `users/${id}/scores/best?mode=${helper.tools.other.modeValidator(mode)}&limit=100`;
    return await apiGet({
        url,
        extra
    });
}
export async function getScoresFirst(id: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `users/${id}/scores/firsts?mode=${helper.tools.other.modeValidator(mode)}&limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Score[]>;
}
export async function getScoresPinned(id: string | number, mode: string, extra: string[]) {
    const url = baseUrl + `users/${id}/scores/pinned?mode=${helper.tools.other.modeValidator(mode)}&limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Score[]>;
}
export async function getUserMapScores(userid: string | number, mapid: number, extra: string[]) {
    const url = baseUrl + `beatmaps/${mapid}/scores/users/${userid}/all?legacy_only=0`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.ScoreArrA>;
}
export async function getMapLeaderboard(id: number, mode: string, mods: string[], extra: string[]) {
    let url = baseUrl + `beatmaps/${id}/scores?mode=${helper.tools.other.modeValidator(mode)}&limit=100`;
    if (mods) {
        const tempmods = osumodcalc.mod.fix(mods as osumodcalc.types.Mod[], mode as apitypes.GameMode);
        tempmods.forEach(mod => {
            url += `&mods[]=${mod}`;
        });
    }
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.BeatmapScores<apitypes.Score>>;
}
export async function getMapLeaderboardNonLegacy(id: number, mode: string, mods: string[], extra: string[]) {
    mode = helper.tools.other.modeValidator(mode);
    let url = baseUrl + `beatmaps/${id}/solo-scores?mode=${mode}&limit=100`;
    if (mods) {
        const tempmods = osumodcalc.mod.fix(mods as osumodcalc.types.Mod[], mode as apitypes.GameMode);
        tempmods.forEach(mod => {
            url += `&mods[]=${mod}`;
        });
    }
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.BeatmapScores<apitypes.Score>>;
}
export async function getMap(id: number | string, extra?: string[]) {
    const url = baseUrl + 'beatmaps/' + id;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Beatmap>;
}
export async function getMapSha(md5: string, extra: string[]) {
    const url = baseUrl + `beatmaps/lookup?checksum=${md5}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Beatmap>;
}
export async function getMapset(id: string | number, extra: string[]) {
    const url = baseUrl + `beatmapsets/${id}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Beatmapset>;
}
export async function getMapSearch(search: string, extra: string[]) {
    const url = baseUrl + `beatmapsets/search?q=${search}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.BeatmapsetSearch>;
}
export async function getUserMaps(id: number, category: string, extra: string[]) {
    const url = baseUrl + `users/${id}/beatmapsets/${category}?limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Beatmapset[]>;
}

export async function getUserMostPlayed(id: number, extra: string[]) {
    const url = baseUrl + `users/${id}/beatmapsets/most_played?limit=100`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.BeatmapPlayCountArr>;
}
export async function getRankings(mode: string, type: string, extra: string[]) {
    const url = baseUrl + `rankings/${helper.tools.other.modeValidator(mode)}/${type}`;
    return await apiGet({
        url,
        extra
    }) as tooltypes.apiReturn<apitypes.Rankings>;
}

export async function dlMap(mapid: number | string, curCall: number, lastUpdated: Date) {
    const mapFiles = fs.readdirSync(`${helper.vars.path.main}/files/maps`);
    let isFound = false;
    let mapDir = '';
    if (!mapFiles.some(x => x == mapid + '.osu') || !fs.existsSync(`${helper.vars.path.main}/files/maps/` + mapid + '.osu')) {
        const url = `https://osu.ppy.sh/osu/${mapid}`;
        const thispath = `${helper.vars.path.main}/files/maps/${mapid}.osu`;
        mapDir = thispath;
        if (!fs.existsSync(thispath)) {
            fs.mkdirSync(`${helper.vars.path.main}/files/maps/`, { recursive: true });
        }
        helper.tools.log.stdout('DOWNLOAD MAP: ' + url);
        const res = await axios.get(url);
        fs.writeFileSync(thispath, res.data, 'utf-8');
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('w');
            }, 200);
        });
    } else {
        for (let i = 0; i < mapFiles.length; i++) {
            const curmap = mapFiles[i];
            if (curmap.includes(`${mapid}`)) {
                mapDir = `${helper.vars.path.main}/files/maps/${curmap}`;
            }
        }
        isFound = true;
    }
    const fileStat = fs.statSync(mapDir);
    if (fileStat.size < 500) {
        await fs.unlinkSync(mapDir);
        if (!curCall) {
            curCall = 0;
        }
        if (curCall > 3) {
            throw new Error('Map file size is too small. Deleting file...');
        } else {
            return await dlMap(mapid, curCall + 1, lastUpdated);
        }
    }
    if (fileStat.birthtimeMs < lastUpdated.getTime() && isFound == true) {
        await fs.unlinkSync(mapDir);
        return await dlMap(mapid, curCall + 1, lastUpdated);
    }
    return mapDir;
}

export function mapImages(mapSetId: string | number) {
    return {
        //smaller res of full/raw
        thumbnail: `https://b.ppy.sh/thumb/${mapSetId}l.jpg`,
        thumbnailLarge: `https://b.ppy.sh/thumb/${mapSetId}l.jpg`,

        //full res of map bg
        full: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/fullsize.jpg`,
        raw: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/raw.jpg`,

        //same width but shorter height
        cover: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/cover.jpg`,
        cover2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/cover@2x.jpg`,

        //smaller ver of cover
        card: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/card.jpg`,
        card2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/card@2x.jpg`,

        //square
        list: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/list.jpg`,
        list2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/list@2x.jpg`,

        //shorter height ver of cover
        slimcover: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/slimcover.jpg`,
        slimcover2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/slimcover@2x.jpg`,

    };
}

// tenor

export async function getGif(find: string) {
    helper.tools.log.stdout(`GIF: https://g.tenor.com/v2/search?q=${find}&key=REDACTED&limit=50`);
    if (helper.vars.config.tenorKey == 'INVALID_ID') {
        return {
            data: {
                error: "Invalid or missing tenor key",
                results: [],
            }
        };
    };
    const dataf = await axios.get(`https://g.tenor.com/v2/search?q=${find}&key=${helper.vars.config.tenorKey}&limit=50`).catch(err => {
        return {
            data: {
                error: err
            }
        };
    });
    return dataf;
}