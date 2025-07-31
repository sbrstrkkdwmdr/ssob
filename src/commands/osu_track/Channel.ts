import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { OsuCommand } from '../command';

export class TrackChannel extends OsuCommand {
    declare protected params: {
        channelId: string;
    };
    constructor() {
        super();
        this.name = 'TrackChannel';
        this.params = {
            channelId: null
        };
    }
    async setParamsMsg() {
        this.params.channelId = this.input.args[0];
        if (this.input.message.content.includes('<#')) {
            this.params.channelId = this.input.message.content.split('<#')[1].split('>')[0];
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.channelId = (interaction.options.getChannel('channel')).id;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        const guildsetting = await helper.vars.guildSettings.findOne({ where: { guildid: this.input.message?.guildId ?? this.input.interaction?.guildId } });
        if (!this.params.channelId) {
            if (!guildsetting.dataValues.trackChannel) {
                await this.sendError(helper.errors.tracking.channel_ms);
            }
            await commandTools.sendMessage({
                type: this.input.type,
                message: this.input.message,
                interaction: this.input.interaction,
                args: {
                    content: `The current tracking channel is <#${guildsetting.dataValues.trackChannel}>`,
                    edit: true
                },
                canReply: this.input.canReply
            });
            return;
        }
        if (!this.params.channelId || isNaN(+this.params.channelId) || !helper.vars.client.channels.cache.get(this.params.channelId)) {
            await this.sendError(helper.errors.generic.channel_inv);
            return;
        }
        await guildsetting.update({
            trackChannel: this.params.channelId
        }, {
            where: { guildid: this.input.message?.guildId ?? this.input.interaction?.guildId }
        });
        this.ctn.content = `Tracking channel set to <#${this.params.channelId}>`;
        await this.send();
    }
}