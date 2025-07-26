import Discord from 'discord.js';
import { ScoreListCommand } from './ScoreListCommand';

export class Firsts extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'firsts';
        this.name = 'Firsts';
    }
}

export class OsuTop extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'osutop';
        this.name = 'OsuTop';
    }
}

export class NoChokes extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'nochokes';
        this.name = 'NoChokes';
        this.params.sort = 'pp';
    }
}

export class Pinned extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'pinned';
        this.name = 'Pinned';
    }
}
export class RecentList extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'recent';
        this.name = 'RecentList';
    }
    async argsMsgExtra(): Promise<void> {

    }
}

export class MapScores extends ScoreListCommand {
    constructor() {
        super();
        this.type = 'map';
        this.name = 'MapScores';
    }
    async argsMsgExtra(): Promise<void> {
        const temp = this.setParamMap();
        this.params.mapid = temp.map;
        if (this.params.mapid != null) {
            this.input.args.splice(this.input.args.indexOf(this.input.args.find(arg => arg.includes('https://osu.ppy.sh/'))), 1);
        }
    }
    async argsInteractExtra(): Promise<void> {
        let interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getNumber('id');
    }
    async argsButtonsExtra(): Promise<void> {

    }

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('page');
        this.setParamOverride('sort');
        this.setParamOverride('reverse');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride('commanduser');
        this.setParamOverride('user');
        this.setParamOverride('mode');
    }
}