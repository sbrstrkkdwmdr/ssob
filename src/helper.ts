import { Client } from 'discord.js';
import Sequelize from 'sequelize';
import * as checks from './tools/checks';
import * as bottypes from './types/bot';

export * as path from './path';
export * as argflags from './vars/argFlags';
export * as buttons from './vars/buttons';
export * as colours from './vars/colours';
export * as commandData from './vars/commandData';
export * as commandopts from './vars/commandopts';
export * as defaults from './vars/defaults';
export * as emojis from './vars/emojis';
export * as errors from './vars/errors';
export * as iso from './vars/iso';
export * as responses from './vars/responses';
export * as versions from './vars/versions';

export * as bottypes from './types/bot';
export * as tooltypes from './types/tools';

export const vars = {
    client: {} as Client<boolean>, // initialised in main.ts
    config: checks.checkConfig(),
    userdata: null as any as Sequelize.ModelCtor<Sequelize.Model<any, any>>, // initialised in main.ts
    guildSettings: null as any as Sequelize.ModelCtor<Sequelize.Model<any, any>>, // initialised in main.ts
    trackDb: null as any as Sequelize.ModelCtor<Sequelize.Model<any, any>>, // initialised in main.ts
    statsCache: {} as any as Sequelize.ModelCtor<Sequelize.Model<any, any>>, // initialised in main.ts
    cooldownSet: (new Set()) as Set<string>,
    startTime: new Date(),
    id: 0,
    reminders: [] as bottypes.reminder[],
};