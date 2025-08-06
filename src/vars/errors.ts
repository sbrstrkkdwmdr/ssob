
export function noUser(name: string) {
    return `Error - could not find user "${name}"`;
}

export const genError = `Bot skill issue - something went wrong.`;

export const apiError = `Something went wrong with the osu! api.`;

export const osuTrackApiError = `Something went wrong with the osu!track api.`;

export const timeout = `The connection timed out`;

export const paramFileMissing = `This command has expired and the buttons can no longer be used.\nCommands will automatically expire after 24h of not being used.`;

export function anyError() {
    const errs = [
        'Bot is having a skill issue lol.',
        'Error - AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Error - something went wrong.',
        'Error - ????????!?!??!',
    ];

    return errs[Math.floor(Math.random() * errs.length)];
}

// ms - api success but empty result
// msp - no previous id found of type
//

export const generic = {
    channel_inv: 'Invalid channel id',
    rankings: 'Could not fetch rankings',
    datamissing: 'Missing data',
    rsact: 'Could not fetch recent activity',
    mode: 'Invalid mode given',
};

export const profile = {
    user: ((id: any) => {
        return 'Could not find user ' + id;
    }),
    user_msp: 'No previous user id found in this guild',
    mostplayed: 'Could not find the user\'s most played beatmaps',
    rsact: 'Could not find the user\'s recent activity',
    nf: 'Could not find the requested user'
};
export const map = {
    lb:
        ((id: any) => {
            return 'Could not find leaderboards for ' + id;
        }),
    m: ((id: any) => {
        return 'Could not find beatmap ' + id;
    }),
    m_msp: 'No previous map id found in this guild',
    m_uk: 'Could not find the requested beatmap',
    ms: ((id: any) => {
        return 'Could not find beatmapset ' + id;
    }),
    ms_md5: ((hash: any) => {
        return 'Could not find beatmap with the hash ' + hash;
    }),
    search: 'Beatmap search failed',
    search_nf: ((input: string) => {
        return 'No beatmaps found with args "' + input + '"';
    }),
    setonly: ((id: any) => {
        return 'No beatmaps found in beatmapset ' + id;
    }),
    strains: 'Could not calculate map\'s strains',
    strains_graph: 'Could not produce strains graph',
    unranked: 'Beatmap is unranked',
    url: 'Invalid URL given',
    group_nf: ((type: any) => {
        return 'Could not find ' + type + 'beatmaps';
    }),
};
export const score = {
    nf: 'Could not find the requested score',
    wrong: 'Score is invalid/unsubmitted and cannot be parsed',
    nd: ((id: any) => {
        return 'Could not find score data for ' + id;
    }),
    nd_mode: ((id: any, mode: string) => {
        return 'Could not find score data for ' + id + ' in ' + mode;
    }),
    msp: 'No previous score id found in this guild',
    ms: 'Missing arg <SCORE ID>'
};
export const scores = {
    generic: ((id: any) => {
        return 'Could not find ' + id + '\'s scores';
    }),
    // normal - API error
    // ms - API success but result is an empty array
    pinned: ((id: any) => {
        return 'Could not find ' + id + '\'s pinned scores';
    }),
    pinned_ms: ((id: any) => {
        return id + ' has no pinned scores';
    }),
    best: ((id: any) => {
        return 'Could not find ' + id + '\'s top scores';
    }),
    best_ms: ((id: any, mode: string) => {
        return id + ' has no ' + mode + ' top scores';
    }),
    recent: ((id: any) => {
        return 'Could not find ' + id + '\'s recent scores';
    }),
    recent_ms: ((id: any, mode: string) => {
        return id + ' has no recent ' + mode + ' scores';
    }),
    first: ((id: any) => {
        return 'Could not find ' + id + '\'s #1 scores';
    }),
    first_ms: ((id: any) => {
        return id + ' has no #1 scores';
    }),
    map: ((id: any, mapid: any) => {
        return 'Could not find ' + id + '\'s scores on beatmap ' + mapid;
    }),
    map_ms: ((id: any, mapid: any) => {
        return id + ' has no scores on beatmap ' + mapid;
    }),
};
export const performance = {
    mapMissing: ((id: any) => {
        return 'Could not find the `.osu` file for beatmap ' + id;
    }),
    crash: 'Could not calculate the map\'s pp'
};
export const tracking = {
    channel_ms: 'The current server/guild does not have a tracking channel',
    nullUser: 'Missing <user> argument',
    channel_wrong: ((id: any) => {
        return 'You can only use this command in <#' + id + '>';
    }),
};