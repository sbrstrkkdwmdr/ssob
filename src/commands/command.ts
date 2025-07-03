import * as Discord from 'discord.js';
import moment from 'moment';
import * as helper from '../helper';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as log from '../tools/log';
import * as osuapi from '../tools/osuapi';
import * as other from '../tools/other';

export abstract class InputHandler {
    protected selected: Command;
    protected overrides: helper.bottypes.overrides = {};
    abstract onMessage(message: Discord.Message): Promise<void>;
    abstract onInteraction(interaction: Discord.Interaction): Promise<void>;
}

export class Command {
    #name: string;
    protected set name(input: string) {
        this.#name = input[0] == input[0].toUpperCase() ? input : formatters.toCapital(input);
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
    /**
     * for message params only
     */
    protected setParam(param: any, flags: string[], type: 'string' | 'number' | 'bool', typeParams: {
        bool_setValue?: any,
        number_isInt?: boolean,
        string_isMultiple?: boolean,
    }) {
        flags = this.setParamCheckFlags(flags);

        switch (type) {
            case 'string': {
                const argFinder = commandTools.matchArgMultiple(helper.argflags.pages, this.input.args, true, 'string', typeParams.string_isMultiple ?? false, false);
                if (argFinder.found) {
                    param = argFinder.output;
                    this.input.args = argFinder.args;
                }
            }
                break;
            case 'number': {
                const argFinder = commandTools.matchArgMultiple(helper.argflags.pages, this.input.args, true, 'number', false, typeParams.number_isInt ?? false);
                if (argFinder.found) {
                    param = argFinder.output;
                    this.input.args = argFinder.args;
                }
            }
                break;
            case 'bool': {
                const argFinder = commandTools.matchArgMultiple(flags, this.input.args, false, null, false, false);
                if (argFinder.found) {
                    param = typeParams.bool_setValue ?? true;
                    this.input.args = argFinder.args;
                }
            }
                break;
        }
        return param;
    };
    setParamCheckFlags(flags: string[]) {
        if (flags.length == 0) return [];
        const nf: string[] = [];
        for (const flag of flags) {
            if (!flag.startsWith('-')) {
                nf.push('-' + flag);
            } else {
                nf.push(flag);
            }
        }
        return nf;
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
                    name: formatters.toCapital(x[0]),
                    value: x[1]
                };
            });
        }
        log.commandOptions(
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
        await commandTools.sendMessage({
            type: this.input.type,
            message: this.input.message,
            interaction: this.input.interaction,
            args: this.ctn,
        }, this.input.canReply);
    }
}

// gasp capitalised o
export class OsuCommand extends Command {
    protected setParamMode() {
        const otemp = commandTools.matchArgMultiple(['-o', '-osu'], this.input.args, false, null, false, false);
        if (otemp.found) {
            this.params.mode = 'osu';
            this.input.args = otemp.args;
        }
        const ttemp = commandTools.matchArgMultiple(['-t', '-taiko'], this.input.args, false, null, false, false);
        if (ttemp.found) {
            this.params.mode = 'taiko';
            this.input.args = ttemp.args;
        }
        const ftemp = commandTools.matchArgMultiple(['-f', '-fruits', '-ctb', '-catch'], this.input.args, false, null, false, false);
        if (ftemp.found) {
            this.params.mode = 'fruits';
            this.input.args = ftemp.args;
        }
        const mtemp = commandTools.matchArgMultiple(['-m', '-mania'], this.input.args, false, null, false, false);
        if (mtemp.found) {
            this.params.mode = 'mania';
            this.input.args = mtemp.args;
        }
    }
    // if no user, use DB or disc name
    protected async validUser(user: string, searchid: string, mode: osuapi.types_v2.GameMode) {
        if (user == null) {
            const cuser = await data.searchUser(searchid, true);
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

    protected async getProfile(user: string, mode: osuapi.types_v2.GameMode) {
        let osudata: osuapi.types_v2.UserExtended;

        if (data.findFile(user, 'osudata', other.modeValidator(mode)) &&
            !('error' in data.findFile(user, 'osudata', other.modeValidator(mode))) &&
            this.input.buttonType != 'Refresh'
        ) {
            osudata = data.findFile(user, 'osudata', other.modeValidator(mode));
        } else {
            osudata = await osuapi.v2.users.profile({ name: user, mode });
        }

        if (osudata?.hasOwnProperty('error') || !osudata.id) {
            const err = helper.errors.uErr.osu.profile.user.replace('[ID]', user);
            await commandTools.errorAndAbort(this.input, this.name, true, err, false);
            throw new Error(err);

        }
        data.debug(osudata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'osuData');

        data.userStatsCache([osudata], other.modeValidator(mode), 'User');

        data.storeFile(osudata, osudata.id, 'osudata', other.modeValidator(mode));
        data.storeFile(osudata, osudata.username, 'osudata', other.modeValidator(mode));

        return osudata;
    }
    protected async getMap(mapid: string | number) {
        let mapdata: osuapi.types_v2.BeatmapExtended;
        if (data.findFile(mapid, 'mapdata') &&
            !('error' in data.findFile(mapid, 'mapdata')) &&
            this.input.buttonType != 'Refresh') {
            mapdata = data.findFile(mapid, 'mapdata');
        } else {
            mapdata = await osuapi.v2.beatmaps.map({ id: +mapid });
        }

        if (mapdata?.hasOwnProperty('error')) {
            const err = helper.errors.uErr.osu.map.m.replace('[ID]', mapid + '');
            await commandTools.errorAndAbort(this.input, this.name, true, err, true);
            throw new Error(err);
        }

        data.storeFile(mapdata, mapid, 'mapdata');

        return mapdata;
    }
    protected getLatestMap() {
        const tempMap = data.getPreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId);
        const tempScore = data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
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
        const temp = commandTools.getButtonArgs(this.input.id);
        if (temp.error) {
            interaction.followUp({
                content: helper.errors.paramFileMissing,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            commandTools.disableAllButtons(this.input.message);
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