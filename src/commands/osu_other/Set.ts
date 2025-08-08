import Discord from 'discord.js';
import * as helper from '../../helper';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { OsuCommand } from '../command';

export class Set extends OsuCommand {
    declare protected params: {
        name: string;
        mode: osuapi.types_v2.GameMode;
        skin: string;
    };

    constructor() {
        super();
        this.name = 'Set';
        this.params = {
            name: null,
            mode: null,
            skin: null,
        };
    }
    async setParamsMsg() {
        {
            this.setParamMode(null);
        }

        this.params.skin = this.setParam(this.params.skin, ['-skin'], 'string', { string_isMultiple: true });

        this.params.name = this.argParser.getRemaining().join(' ');

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.name = interaction.options.getString('user');
        this.params.mode = interaction.options.getString('mode') as osuapi.types_v2.GameMode;
        this.params.skin = interaction.options.getString('skin');
    }
    getOverrides(): void {
        if (this.input.overrides.type != null && this.input.type == 'message') {
            switch (this.input.overrides.type) {
                case 'mode':
                    [this.params.mode, this.params.name] = [this.params.name as osuapi.types_v2.GameMode, this.params.mode];
                    break;
                case 'skin':
                    [this.params.skin, this.params.name] = [this.params.name, this.params.skin];
            }
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        this.ctn.content = 'null';
        // do stuff
        if (this.params.mode) {
            const thing = other.modeValidatorAlt(this.params.mode);
            this.params.mode = thing.mode;
            if (thing.isincluded == false) {
                await this.sendError(helper.errors.generic.mode);
            }
        }

        let updateRows: {
            userid: string | number,
            osuname?: string,
            mode?: string,
            skin?: string,
        } = {
            userid: this.commanduser.id
        };
        updateRows = {
            userid: this.commanduser.id,
        };
        if (this.params.name != null) {
            updateRows['osuname'] = this.params.name;
        }
        if (this.params.mode != null) {
            updateRows['mode'] = this.params.mode;
        }
        if (this.params.skin != null) {
            updateRows['skin'] = this.params.skin;
        }
        const findname: helper.tooltypes.dbUser = await helper.vars.userdata.findOne({ where: { userid: this.commanduser.id } }) as any;
        if (findname == null) {
            try {
                await helper.vars.userdata.create({
                    userid: this.commanduser.id,
                    osuname: this.params.name ?? 'undefined',
                    mode: this.params.mode ?? 'osu',
                    skin: this.params.skin ?? 'Default - https://osu.ppy.sh/community/forums/topics/129191?n=117',
                    location: '',
                    timezone: '',
                });
                this.ctn.content = 'Added to database';
                if (this.params.name) {
                    this.ctn.content += `\nSet your username to \`${this.params.name}\``;
                }
                if (this.params.mode) {
                    this.ctn.content += `\nSet your mode to \`${this.params.mode}\``;
                }
                if (this.params.skin) {
                    this.ctn.content += `\nSet your skin to \`${this.params.skin}\``;
                }
            } catch (error) {
                this.ctn.content = 'There was an error trying to update your settings';
                log.commandErr('Database error (create) ->' + error, this.input.id, 'osuset', this.input.message, this.input.interaction);
            }
        } else {
            const affectedRows = await helper.vars.userdata.update(
                updateRows,
                { where: { userid: this.commanduser.id } }
            );

            if (affectedRows.length > 0 || affectedRows[0] > 0) {
                this.ctn.content = 'Updated your settings:';
                if (this.params.name) {
                    this.ctn.content += `\nSet your username to \`${this.params.name}\``;
                }
                if (this.params.mode) {
                    this.ctn.content += `\nSet your mode to \`${this.params.mode}\``;
                }
                if (this.params.skin) {
                    this.ctn.content += `\nSet your skin to \`${this.params.skin}\``;
                }
            } else {
                this.ctn.content = 'There was an error trying to update your settings';
                log.commandErr('Database error (update) ->' + affectedRows, this.input.id, 'osuset', this.input.message, this.input.interaction);
            }
        }

        await this.send();
    }
}