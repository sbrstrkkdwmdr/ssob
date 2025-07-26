import * as helper from '../../helper';
import { Command } from '../command';

export class Invite extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Invite';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        this.ctn.content = helper.versions.linkInvite;
        this.send();
    }
}