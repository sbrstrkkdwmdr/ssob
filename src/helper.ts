import { Client } from "discord.js";
import Sequelize from "sequelize";
import * as checks from "./tools/checks";
import * as bottypes from "./types/bot";

export * as path from "./path";
export * as argflags from "./vars/argFlags";
export * as buttons from "./vars/buttons";
export * as colours from "./vars/colours";
export * as commandData from "./vars/commandData";
export * as commandopts from "./vars/commandopts";
export * as defaults from "./vars/defaults";
export * as emojis from "./vars/emojis";
export * as errors from "./vars/errors";
export * as iso from "./vars/iso";
export * as responses from "./vars/responses";
export * as versions from "./vars/versions";

export * as bottypes from "./types/bot";
export * as tooltypes from "./types/tools";

export const vars: {
    client: Client<boolean>;
    config: bottypes.config;
    userdata: Sequelize.ModelCtor<Sequelize.Model<any, any>>;
    guildSettings: Sequelize.ModelCtor<Sequelize.Model<any, any>>;
    trackDb: Sequelize.ModelCtor<Sequelize.Model<any, any>>;
    statsCache: Sequelize.ModelCtor<Sequelize.Model<any, any>>;
    cooldownSet: Set<string>;
    startTime: Date;
    id: number;
} = {
    client: null, // initialised in bot.ts
    config: checks.checkConfig(),
    userdata: null, // initialised in app.ts
    guildSettings: null, // initialised in app.ts
    trackDb: null, // initialised in app.ts
    statsCache: null, // initialised in app.ts
    cooldownSet: new Set() as Set<string>,
    startTime: new Date(),
    id: 0,
};
