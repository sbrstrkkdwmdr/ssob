import * as Discord from 'discord.js';
import moment from 'moment';
import * as helper from '../helper';

export class Command {
    #name: string;
    protected set name(input: string) {
        this.#name = input[0] == input[0].toUpperCase() ? input : helper.formatter.toCapital(input);
    }
    protected get name() { return this.#name; }
    protected commanduser: Discord.User | Discord.APIUser;
    protected ctn: {
        content?: string,
        embeds?: (Discord.EmbedBuilder | Discord.Embed)[],
        files?: (string | Discord.AttachmentBuilder | Discord.Attachment)[],
        components?: Discord.ActionRowBuilder<any>[],
        ephemeral?: boolean,
        react?: boolean,
        edit?: boolean,
        editAsMsg?: boolean,
    };
    protected params: { [id: string]: any; };
    protected input: helper.bottypes.commandInput;
    constructor() {
        this.voidcontent();
    }
    setInput(input: helper.bottypes.commandInput) {
        this.input = input;
    }
    voidcontent() {
        this.ctn = {
            content: undefined,
            embeds: [],
            files: [],
            components: [],
            ephemeral: false,
            react: undefined,
            edit: undefined,
            editAsMsg: undefined,
        };
    }
    async setParams() {
        switch (this.input.type) {
            case 'message':
                this.commanduser = this.input.message.author;
                await this.setParamsMsg();
                break;
            case 'interaction':
                this.commanduser = this.input.interaction?.member?.user ?? this.input.interaction?.user;
                await this.setParamsInteract();
                break;
            case 'button':
                this.commanduser = this.input.interaction?.member?.user ?? this.input.interaction?.user;
                await this.setParamsBtn();
                break;
            case 'link':
                this.commanduser = this.input.message.author;
                await this.setParamsLink();
                break;
        }
    }
    async setParamsMsg() {
    }
    async setParamsInteract() {
    }
    async setParamsBtn() {
    }
    async setParamsLink() {
    }
    logInput(skipKeys: boolean = false) {
        let keys = [];
        if (!skipKeys) {
            keys = Object.entries(this.params).map(x => {
                return {
                    name: helper.formatter.toCapital(x[0]),
                    value: x[1]
                };
            });
        }
        helper.log.commandOptions(
            keys,
            this.input.id,
            this.name,
            this.input.type,
            this.commanduser,
            this.input.message,
            this.input.interaction,
        );
    }
    getOverrides() { }
    async execute() {
        this.ctn.content = 'No execution method has been set';
        this.send();
    }
    async send() {
        await helper.commandTools.sendMessage({
            type: this.input.type,
            message: this.input.message,
            interaction: this.input.interaction,
            args: this.ctn,
        }, this.input.canReply);
    }
}

// gasp capitalised o
export class OsuCommand extends Command {
    // if no user, use DB or disc name
    async validUser(user: string, searchid: string, mode: helper.osuapi.types_v2.GameMode) {
        if (user == null) {
            const cuser = await helper.data.searchUser(searchid, true);
            user = cuser?.username;
            if (mode == null) {
                mode = cuser?.gamemode;
            }
        }

        if (user == null) {
            const cuser = helper.vars.client.users.cache.get(searchid);
            user = cuser?.username;
        }
        return { user, mode };
    }

    async getProfile(user: string, mode: helper.osuapi.types_v2.GameMode) {
        let osudata: helper.osuapi.types_v2.UserExtended;

        if (helper.data.findFile(user, 'osudata', helper.other.modeValidator(mode)) &&
            !('error' in helper.data.findFile(user, 'osudata', helper.other.modeValidator(mode))) &&
            this.input.buttonType != 'Refresh'
        ) {
            osudata = helper.data.findFile(user, 'osudata', helper.other.modeValidator(mode));
        } else {
            osudata = await helper.osuapi.v2.users.profile({ name: user, mode });
        }

        if (osudata?.hasOwnProperty('error') || !osudata.id) {
            const err = helper.errors.uErr.osu.profile.user.replace('[ID]', user);
            await helper.commandTools.errorAndAbort(this.input, this.name, true, err, false);
            throw new Error(err);

        }
        helper.data.debug(osudata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'osuData');

        helper.data.userStatsCache([osudata], helper.other.modeValidator(mode), 'User');

        helper.data.storeFile(osudata, osudata.id, 'osudata', helper.other.modeValidator(mode));
        helper.data.storeFile(osudata, osudata.username, 'osudata', helper.other.modeValidator(mode));

        return osudata;
    }
    async getMap(mapid: string | number) {
        let mapdata: helper.osuapi.types_v2.BeatmapExtended;
        if (helper.data.findFile(mapid, 'mapdata') &&
            !('error' in helper.data.findFile(mapid, 'mapdata')) &&
            this.input.buttonType != 'Refresh') {
            mapdata = helper.data.findFile(mapid, 'mapdata');
        } else {
            mapdata = await helper.osuapi.v2.beatmaps.map({ id: +mapid });
        }

        if (mapdata?.hasOwnProperty('error')) {
            const err = helper.errors.uErr.osu.map.m.replace('[ID]', mapid + '');
            await helper.commandTools.errorAndAbort(this.input, this.name, true, err, true);
            throw new Error(err);
        }

        helper.data.storeFile(mapdata, mapid, 'mapdata');

        return mapdata;
    }
    getLatestMap() {
        const tempMap = helper.data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
        const tempScore = helper.data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
        const tmt = moment(tempMap.last_access ?? '1975-01-01');
        const tst = moment(tempScore.last_access ?? '1975-01-01');
        if (tst.isBefore(tmt)) {
            return {
                mapid: tempMap?.id,
                mods: tempMap?.mods,
                mode: tempMap?.mode,
            };
        }
        return {
            mapid: tempScore?.apiData?.beatmap_id,
            mods: tempScore?.mods,
            mode: tempScore?.mode,
        };
    }
}

class TEMPLATE extends Command {
    declare protected params: {
        xyzxyz: string;
    };
    constructor() {
        super();
        this.name = 'TEMPLATE';
        this.params = {
            xyzxyz: ''
        };
    }
    async setParamsMsg() {
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        const temp = helper.commandTools.getButtonArgs(this.input.id);
        if (temp.error) {
            interaction.followUp({
                content: helper.errors.paramFileMissing,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            helper.commandTools.disableAllButtons(this.input.message);
            return;
        }
    }
    async setParamsLink() {
        const messagenohttp = this.input.message.content.replace('https://', '').replace('http://', '').replace('www.', '');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        this.send();
    }
}