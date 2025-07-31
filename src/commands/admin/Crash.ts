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

export class Crash extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Crash';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        this.ctn.content = 'executing crash command...';
        await this.send();
        setTimeout(() => {
            log.stdout(`executed crash command by ${this?.commanduser?.id} - ${this?.commanduser?.username}`);
            process.exit(1);
        }, 1000);
    }
}