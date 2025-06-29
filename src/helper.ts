import { Client } from 'discord.js';
import Sequelize from 'sequelize';
import * as checks from './tools/checks';
import * as bottypes from './types/bot';
// bundle all functions in one file
export * as path from './path';
export * as api from './tools/api';
export * as calculate from './tools/calculate';
export * as checks from './tools/checks';
export * as colourcalc from './tools/colourcalc';
export * as commandTools from './tools/commands';
export * as data from './tools/data';
export * as formatter from './tools/formatters';
export * as game from './tools/game';
export * as log from './tools/log';
export * as osuapi from './tools/osuapi/index';
export * as other from './tools/other';
export * as performance from './tools/performance';
export * as track from './tools/trackfunc';

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

export * as cmd_admin from './commands/admin';
export * as cmd_gen from './commands/general';
export * as cmd_fun from './commands/misc';
export * as cmd_osu_maps from './commands/osu_maps';
export * as cmd_osu_other from './commands/osu_other';
export * as cmd_osu_profiles from './commands/osu_profiles';
export * as cmd_osu_scores from './commands/osu_scores';
export * as cmd_osu_track from './commands/osu_track';

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