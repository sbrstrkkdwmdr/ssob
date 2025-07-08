import * as Discord from 'discord.js';
import moment from 'moment';
import * as osumodcalc from 'osumodcalculator';
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
    protected argParser: ArgsParser;
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
    protected params: helper.tooltypes.Dict;
    protected input: helper.bottypes.commandInput;

    constructor() {
        this.voidcontent();
    }
    setInput(input: helper.bottypes.commandInput) {
        this.input = input;
        this.argParser = new ArgsParser(this.input.args);
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
     * 
     * ```
     * this.input.args = ['-p', '55.3',]
     * const page = setParam(null, flags: ['-p'], 'number', { number_isInt:true });
     * // => 55
     * 
     * this.input.args = ['-p', 'waow',]
     * const page = setParam(null, flags: ['-p'], 'number', { number_isInt:true });
     * // => NaN
     * ```
     */
    protected setParam(defaultValue: any, flags: string[], type: 'string' | 'number' | 'bool', typeParams: {
        bool_setValue?: any,
        number_isInt?: boolean,
        string_isMultiple?: boolean,
    }) {
        flags = this.setParamCheckFlags(flags);
        switch (type) {
            case 'string': {
                let temparg = this.argParser.getParam(flags);
                if (temparg) defaultValue = temparg;
            }
                break;
            case 'number': {
                let temparg = this.argParser.getParam(flags);
                if (temparg) defaultValue =
                    typeParams.number_isInt ?
                        parseInt(temparg) :
                        +temparg;
            }
                break;
            case 'bool': {
                let temparg = this.argParser.getParamBool(flags);
                if (temparg) defaultValue = typeParams?.bool_setValue ?? true;
            }
                break;
        }
        return defaultValue;
    };
    private setParamCheckFlags(flags: string[]) {
        if (flags.length == 0) return [];
        const nf: string[] = [];
        for (const flag of flags) {
            if (!flag.startsWith('-')) {
                nf.push('-' + flag.toLowerCase());
            } else {
                nf.push(flag.toLowerCase());
            }
        }
        return nf;
    }
    protected setParamPage() {
        this.params.page = this.setParam(this.params.page, helper.argflags.pages, 'number', { number_isInt: true });
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
    /**
     * this.params[pKey] = this.input.overrides[oKey]
     */
    protected setParamOverride(paramKey: string, overrideKey?: string, type?: 'string' | 'number') {
        const oKey = overrideKey ?? paramKey;
        if (this.input.overrides[oKey]) {
            this.params[paramKey] = this.forceType(this.input.overrides[oKey], type);
        }
    }
    private forceType(value: any, type: 'string' | 'number') {
        switch (type) {
            case 'string':
                value = value + '';
                break;
            case 'number':
                value = +value;
                break;
        }
        return value;
    }
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
    /**
     * will think of a better name later
     * 
     * default value is what to return if args aren't found
     * 
     * basically the way this works is 
     * 
     * set - what value to return if flag is found
     * 
     * flags - what to search for
     * 
     * if args includes flags, then return set
     * 
     * if multiple args are found, only the first one is returned
     * 
     * see this.setParamMode() for an example on how to use
     */
    protected setParamBoolList(defaultValue: any, ...args: { set: any, flags: string[]; }[]) {
        for (const arg of args) {
            const temp = this.setParam(false, arg.flags, 'bool', { bool_setValue: arg.set });
            if (temp) {
                return temp;
            }
        }
        return defaultValue;
    }
    protected setParamMode() {
        this.params.mode = this.setParamBoolList('osu',
            { set: 'osu', flags: ['-o', '-osu', '-std'] },
            { set: 'taiko', flags: ['-t', '-taiko'] },
            { set: 'fruits', flags: ['-f', '-fruits', '-ctb', '-catch'] },
            { set: 'mania', flags: ['-m', '-mania'] }
        );
    }
    /**
     * +{mods}
     * 
     * ```
     * 
     * ```
     */
    protected setParamMods() {
        let mods: osumodcalc.types.Mod[] = null;
        let apiMods: osuapi.types_v2.Mod[] = null;
        if (this.input.args.join(' ').includes('+')) {
            const temp = this.argParser.getParamFlexible(['+{param}']);
            if (temp) {
                mods = osumodcalc.mod.fromString(temp);
                apiMods = mods.map(x => { return { acronym: x }; });
            }
            // this.input.args = this.input.args.join(' ').replace('+', '').replace(temp, '').split(' ');
        }
        return { mods, apiMods };
    }
    protected setParamUser(): { user: string, mode: osuapi.types_v2.GameMode; } {
        const webpatterns = [
            'osu.ppy.sh/users/{user}/{mode}',
            'osu.ppy.sh/users/{user}',
            'osu.ppy.sh/u/{user}',
        ];
        for (const pattern of webpatterns.slice()) {
            webpatterns.push('https://' + pattern);
        }
        const res: {
            user: string,
            mode: osuapi.types_v2.GameMode,
        } = {
            user: null,
            mode: null,
        };
        for (const pattern of webpatterns) {
            let temp = this.argParser.getLink(pattern);
            if (temp) {
                res.user = temp.user ?? res.user;
                res.mode = this.argParser.paramFixMode(temp.mode ?? res.mode);
                break;
            };
        }
        return res?.user ?
            res :
            { user: this.argParser.getParamFlexible(helper.argflags.user), mode: null };
    }
    /**
     * get map-related params
     */
    protected setParamMap() {
        const webpatterns = [
            'osu.ppy.sh/beatmapsets/{set}#{mode}/{map}',
            'osu.ppy.sh/beatmapsets/{set}',
            'osu.ppy.sh/beatmaps/{map}?m={mode}',
            'osu.ppy.sh/beatmaps/{map}',
            'osu.ppy.sh/s/{set}#{mode}/{map}',
            'osu.ppy.sh/s/{set}',
            'osu.ppy.sh/b/{map}?m={modeInt}',
            'osu.ppy.sh/b/{map}',
        ];
        for (const pattern of webpatterns.slice()) {
            webpatterns.push('https://' + pattern);
        }
        const res: {
            set: number,
            map: number,
            mode: osuapi.types_v2.GameMode,
            modeInt: number,
        } = {
            set: null,
            map: null,
            mode: null,
            modeInt: null,
        };
        for (const pattern of webpatterns) {
            let temp = this.argParser.getLink(pattern);
            if (temp) {
                res.set = this.argParser.paramFixInt(temp.set ?? res.set);
                res.map = this.argParser.paramFixInt(temp.map ?? res.map);
                res.mode = this.argParser.paramFixMode(temp.mode ?? res.mode);
                res.modeInt = this.argParser.paramFixInt(temp.modeInt ?? res.modeInt);
                break;
            };
        }
        return res;
    }
    protected setParamScore() {
        const webpatterns = [
            'osu.ppy.sh/scores/{mode}/{score}',
            'osu.ppy.sh/scores/{score}',
        ];
        for (const pattern of webpatterns.slice()) {
            webpatterns.push('https://' + pattern);
        }
        const res: {
            score: number,
            mode: osuapi.types_v2.GameMode,
        } = {
            score: null,
            mode: null,
        };
        for (const pattern of webpatterns) {
            let temp = this.argParser.getLink(pattern);
            if (temp) {
                res.score = this.argParser.paramFixInt(temp.score ?? res.score);
                res.mode = this.argParser.paramFixMode(temp.mode ?? res.mode);
                break;
            };
        }
        return res;
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
    protected async getMapSet(mapsetid: number) {
        let bmsdata: osuapi.types_v2.BeatmapsetExtended;
        if (data.findFile(mapsetid, `bmsdata`) &&
            !('error' in data.findFile(mapsetid, `bmsdata`)) &&
            this.input.buttonType != 'Refresh') {
            bmsdata = data.findFile(mapsetid, `bmsdata`);
        } else {
            bmsdata = await osuapi.v2.beatmaps.mapset({ id: mapsetid });
        }
        data.debug(bmsdata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'bmsData');
        if (bmsdata?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.ms.replace('[ID]', `${mapsetid}`), true);
            return;
        }
        data.storeFile(bmsdata, mapsetid, `bmsdata`);

        return bmsdata;
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

export class ArgsParser {
    private args: string[];
    private used: Set<number>;
    constructor(args: string[]) {
        this.args = args.map(x => x.toLowerCase());
        this.used = new Set();
    }
    /**
     * assisted by ChatGPT
     */
    getParam(flags: string[]) {
        for (let i = 0; i < this.args.length; i++) {
            if (flags.includes(this.args[i]) && !this.used.has(i)) {
                this.used.add(i);

                const values: string[] = [];
                let collecting = false;

                for (let j = i + 1; j < this.args.length; j++) {
                    const arg = this.args[j];
                    if (this.used.has(j)) continue;

                    if (!collecting && arg.startsWith('"')) {
                        collecting = true;
                        values.push(arg.slice(1));
                        this.used.add(j);
                    } else if (collecting && arg.endsWith('"')) {
                        values.push(arg.slice(0, -1));
                        this.used.add(j);
                        break;
                    } else if (collecting) {
                        values.push(arg);
                        this.used.add(j);
                    } else if (!arg.startsWith('-')) {
                        values.push(arg);
                        this.used.add(j);
                        break;
                    } else {
                        break;
                    }
                }

                return values.length > 0 ? values.join(' ') : null;
            }
        }

        return null;
    }
    getParamBool(flags: string[]) {
        for (let i = 0; i < this.args.length; i++) {
            if (flags.includes(this.args[i])) {
                this.used.add(i);
                return true;
            }
        }
        return false;
    }
    paramExists(flags: string[]) {
        for (let i = 0; i < this.args.length; i++) {
            if (flags.includes(this.args[i])) {
                return true;
            }
        }
        return false;
    }
    paramFixNumber(value: any): number {
        if (value) return +value;
        return null;
    }
    paramFixInt(value: any): number {
        if (value) return Math.floor(+value);
        return null;
    }
    paramFixMode(value: any): osuapi.types_v2.GameMode {
        if (value) return osumodcalc.mode.fromValue(value);
        return null;
    }
    /**
     * assisted by ChatGPT
     * 
     * flags can be formatted as `-foo` or `*{param}*`
     * 
     * example of how to use:
     * ```
     * input.args = ['-u', '152'];
     * getParamFlexible(['-u', 'osu.ppy.sh/u/{param}']); // 152
     * 
     * input.args = ['osu.ppy.sh/u/34'];
     * getParamFlexible(['-u', 'osu.ppy.sh/u/{param}']); // 34
     * 
     *      * input.args = ['osu.ppy.sh/users/15222484/mania'];
     * getParamFlexible(['-u', 'osu.ppy.sh/users/{param}/*']); // 15222484
     * ```
     */
    getParamFlexible(flagsOrPatterns: string[]) {
        for (let i = 0; i < this.args.length; i++) {
            const arg = this.args[i];
            if (this.used.has(i)) continue;

            for (const pattern of flagsOrPatterns) {
                // Case 1: CLI-style flag
                if (!pattern.includes('{')) {
                    if (arg === pattern) {
                        this.used.add(i);
                        const value = this.args[i + 1];
                        if (value && !value.startsWith('-')) {
                            this.used.add(i + 1);
                            return value.replace(/^"|"$/g, '');
                        }
                        return null;
                    }
                }

                // Case 2: Pattern with {param} and wildcards
                else {
                    const regex = new RegExp(
                        '^' +
                        pattern
                            .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex characters
                            .replace(/\\\*/g, '.*')                // turn \* into .*
                            .replace(/\\{param\\}/g, '([^/#?]+)') + // capture {param}
                        '$'
                    );

                    const match = arg.match(regex);
                    if (match) {
                        this.used.add(i);
                        return match[1];
                    }
                }
            }
        }

        return null;
    }
    /**
     * get remaining args that haven't already been parsed
     */
    getRemaining(): string[] {
        return this.args.filter((_, i) => !this.used.has(i));
    }

    /**
     * assisted by ChatGPT
     */
    getLink(pattern: string): helper.tooltypes.Dict | null {
        const paramNames: string[] = [];

        let rawRegex = pattern.replace(/{(\w+)}/g, (_, name) => {
            paramNames.push(name);
            return '<<<CAPTURE>>>';
        });

        rawRegex = rawRegex.replace(/([.+?^$()|[\]\\])/g, '\\$1');

        const regexPattern = rawRegex.replace(/<<<CAPTURE>>>/g, '([^/#?]+)');

        const regex = new RegExp('^' + regexPattern + '$');
        for (let i = 0; i < this.args.length; i++) {
            if (this.used.has(i)) continue;

            const arg = this.args[i];
            const match = arg.match(regex);
            if (match) {
                this.used.add(i);

                const result: helper.tooltypes.Dict[] = paramNames.map((name, index) => ({
                    [name]: match[index + 1],
                }));

                return this.kvToDict(result as helper.tooltypes.DictEntry[]);
            }
        }

        return null;
    }
    kvToDict(array: { (key: string): any; }[]) {
        const dictionary: helper.tooltypes.Dict = {};
        for (const elem of array) {
            const key = Object.keys(elem)[0];
            dictionary[key] = elem[key];
        }
        return dictionary;
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