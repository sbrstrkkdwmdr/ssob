import Discord from 'discord.js';
import * as helper from '../../helper';
import * as data from '../../tools/data';
import { OsuCommand } from '../command';
import { MapParse } from './MapParse';

type mapType = 'Ranked' | 'Loved' | 'Approved' | 'Qualified' | 'Pending' | 'WIP' | 'Graveyard';

export class RandomMap extends OsuCommand {
    declare protected params: {
        mapType: mapType;
        useRandomRanked: boolean;
    };
    constructor() {
        super();
        this.name = 'RandomMap';
        this.params = {
            mapType: null,
            useRandomRanked: false,
        };
    }
    async setParamsMsg() {
        this.params.useRandomRanked = this.setParam(this.params.useRandomRanked, ['-leaderboard', '-lb'], 'bool', {});
        this.params.mapType = this.setParamBoolList(this.params.mapType,
            { set: 'Ranked', flags: helper.argflags.mapRanked },
            { set: 'Loved', flags: helper.argflags.mapLove },
            { set: 'Approved', flags: helper.argflags.mapApprove },
            { set: 'Qualified', flags: helper.argflags.mapQualified },
            { set: 'Pending', flags: helper.argflags.mapPending },
            { set: 'WIP', flags: helper.argflags.mapWip },
            { set: 'Graveyard', flags: helper.argflags.mapGraveyard },
        );
    }
    async setParamsInteract() {
    }
    async setParamsBtn() {
    }
    async setParamsLink() {
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        let txt = '';

        if (this.params.useRandomRanked) {
            const arr: ('Ranked' | 'Loved' | 'Approved')[] = ['Ranked', 'Loved', 'Approved'];
            this.params.mapType = arr[Math.floor(Math.random() * arr.length)];
        }

        const randomMap = data.randomMap(this.params.mapType);
        if (randomMap.err != null) {
            txt = randomMap.err;
        } else {
            txt = `https://osu.ppy.sh/b/${randomMap.returnId}`;
        }
        const embed = new Discord.EmbedBuilder()
            .setTitle('Random map')
            .setDescription(txt);

        if (randomMap.err == null) {
            this.input.overrides = {
                id: randomMap.returnId,
                commanduser: this.commanduser,
                commandAs: this.input.type
            };

            const cmd = new MapParse();
            cmd.setInput(this.input);
            await cmd.execute();

            return;
        }

        this.ctn.embeds = [embed];

        await this.send();
    }
}