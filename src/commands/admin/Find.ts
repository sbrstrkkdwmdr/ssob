import Discord from 'discord.js';
import * as fs from 'fs';
import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { Command } from '../command';

// TODO
export class Find extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Find';

    }
    async setParamsMsg() {
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
    }

    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff

        await this.send();
    }
}