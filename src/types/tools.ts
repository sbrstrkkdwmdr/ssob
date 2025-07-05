export type dbUser = {
    id: number,
    userid: number,
    osuname: string,
    mode: string,
    osuacc: number,
    osupp: number,
    osurank: number,
    taikoacc: number,
    taikopp: number,
    taikorank: number,
    fruitsacc: number,
    fruitspp: number,
    fruitsrank: number,
    maniaacc: number,
    maniapp: number,
    maniarank: number,
};

export type trackUser = {
    id: number,
    osuid: string,
    guilds: string,
    guildsosu: string,
    guildstaiko: string,
    guildsfruits: string,
    guildsmania: string,
};

export type guildSettings = {
    guildid: number | string,
    guildname: string,
    prefix: string,
    osuParseLinks: boolean,
    osuParseScreenshots: boolean,
    osuParseReplays: boolean,
};

export type Dict = { [key: string]: any; };