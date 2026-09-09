import Discord from "discord.js";
import * as helper from "../../helper";
import { ScoreListCommand } from "./ScoreListCommand";
export class Firsts extends ScoreListCommand {
    constructor() {
        super();
        this.type = "firsts";
        this.name = "Firsts";
    }
}

export class OsuTop extends ScoreListCommand {
    constructor() {
        super();
        this.type = "osutop";
        this.name = "OsuTop";
    }
}

export class NoChokes extends ScoreListCommand {
    constructor() {
        super();
        this.type = "nochokes";
        this.name = "NoChokes";
        this.params.sort = "pp";
    }
}

export class Pinned extends ScoreListCommand {
    constructor() {
        super();
        this.type = "pinned";
        this.name = "Pinned";
    }
}
export class RecentList extends ScoreListCommand {
    constructor() {
        super();
        this.type = "recent";
        this.name = "RecentList";
    }
    async argsMsgExtra(): Promise<void> {}
}

export class MapScores extends ScoreListCommand {
    constructor() {
        super();
        this.type = "map";
        this.name = "MapScores";
    }
    async paramsMsgExtra(): Promise<void> {
        const temp = this.setParamMap();
        this.params.mapid = temp.map;
        if (!this.params.mapid) {
            this.params.mapid = this.setParam(
                this.params.mapid,
                helper.argflags.beatmap,
                "number",
                { number_isInt: true },
            );
        }
        if (+this.params.user == this.params.mapid) this.params.user = null;
    }
    async paramsInteractExtra(): Promise<void> {
        let interaction = this.input
            .interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getNumber("id");
    }
    async paramsButtonsExtra(): Promise<void> {}

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride("page");
        this.setParamOverride("sort");
        this.setParamOverride("reverse");
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride("commanduser");
        this.setParamOverride("user");
        this.setParamOverride("mode");
    }
}
