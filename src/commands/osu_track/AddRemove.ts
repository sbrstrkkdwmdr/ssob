import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { OsuCommand } from '../command';

export class TrackAR extends OsuCommand {
    declare protected params: {
        user: string;
        mode: osuapi.types_v2.GameMode;
    };
    type: 'add' | 'remove';
    constructor() {
        super();
        this.params = {
            user: undefined,
            mode: 'osu'
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode();

        }

        this.params.user = this.params.user ?? this.input.args[0];
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.user = interaction.options.getString('user');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        if (this.params.user == null || !this.params.user || this.params.user.length < 1) {
            await this.sendError(helper.errors.tracking.nullUser);
        }

        const guildsetting = await helper.vars.guildSettings.findOne({ where: { guildid: this.input.message?.guildId ?? this.input.interaction?.guildId } });

        if (!guildsetting?.dataValues?.trackChannel) {
            await this.sendError(helper.errors.tracking.channel_ms);
        } else if (guildsetting?.dataValues?.trackChannel != (this.input?.message?.channelId ?? this.input?.interaction?.channelId)) {
            await this.sendError(helper.errors.tracking.channel_wrong(guildsetting?.dataValues?.trackChannel));
        }

        let osudata: osuapi.types_v2.User;

        try {
            const t = await this.getProfile(this.params.user, this.params.mode);
            osudata = t;
        } catch (e) {
            return;
        }

        this.ctn.content = this.getMsg(osudata.username);

        track.editTrackUser({
            userid: osudata.id,
            action: this.type,
            guildId: this.input.message?.guildId ?? this.input.interaction?.guildId,
            mode: this.params.mode
        });
        this.send();
    }
    getMsg(uid: string) {
        switch (this.type) {
            case 'add':
                return `Added \`${uid}\` to the tracking list`;
            case 'remove':
                return `Removed \`${uid}\` from the tracking list`;
        }
    }
}

export class TrackAdd extends TrackAR {
    constructor() {
        super();
        this.name = 'TrackAdd';
        this.params = {
            user: undefined,
            mode: 'osu'
        };
        this.type = 'add';
    }
}

export class TrackRemove extends TrackAR {
    constructor() {
        super();
        this.name = 'TrackRemove';
        this.params = {
            user: undefined,
            mode: 'osu'
        };
        this.type = 'remove';
    }
}