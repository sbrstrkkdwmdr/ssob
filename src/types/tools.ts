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

export type Dict<T = any> = { [key: string]: T; };
export type DictEntry<T = any> = { (key: string): T; };
export type indexed<T = any> = T & {
    originalIndex: number,
};

export type formatterInfo<T> = {
    text: string,
    curPage: number,
    maxPage: number,
    used: T[]
};

export type dataset = {
    label: string,
    data: number[];
    fill: boolean,
    borderColor: string | ((colour) => string),
    borderWidth: number,
    pointRadius: number,
    yAxisID: string,
};

export type graphPosition = 'left' | 'top' | 'center' | 'right' | 'bottom'