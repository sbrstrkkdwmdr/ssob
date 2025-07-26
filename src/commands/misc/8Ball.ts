import * as helper from '../../helper';
import { Command } from '../command';

export class _8Ball extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = '8Ball';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff

        const value = Math.floor(Math.random() * 4);
        switch (value) {
            case 0:
                this.ctn.content = helper.responses.affirm[Math.floor(Math.random() * helper.responses.affirm.length)];
                break;
            case 1:
                this.ctn.content = helper.responses.negate[Math.floor(Math.random() * helper.responses.negate.length)];
                break;
            case 2:
                this.ctn.content = helper.responses.huh[Math.floor(Math.random() * helper.responses.huh.length)];
                break;
            case 3: default:
                this.ctn.content = helper.responses.other[Math.floor(Math.random() * helper.responses.other.length)];
                break;
        }

        this.send();
    }
}