import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as formatters from '../../tools/formatters';
import { Command } from '../command';

export class Ping extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'Ping';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const trueping = `${formatters.toCapital(this.input.type)} latency: ${Math.abs((this.input.message ?? this.input.interaction).createdAt.getTime() - new Date().getTime())}ms`;

        const pingEmbed = new Discord.EmbedBuilder()
            .setTitle('Pong!')
            .setColor(helper.colours.embedColour.info.dec)
            .setDescription(`
    Client latency: ${helper.vars.client.ws.ping}ms
    ${trueping}`);
        const preEdit = new Date();

        switch (this.input.type) {
            case 'message':
                {
                    this.input.message.reply({
                        embeds: [pingEmbed],
                        allowedMentions: { repliedUser: false },
                        failIfNotExists: true
                    }).then((msg: Discord.Message | Discord.ChatInputCommandInteraction) => {
                        const timeToEdit = new Date().getTime() - preEdit.getTime();
                        pingEmbed.setDescription(`
            Client latency: ${helper.vars.client.ws.ping}ms
            ${trueping}
            ${formatters.toCapital(this.input.type)} edit latency: ${Math.abs(timeToEdit)}ms
            `);
                        commandTools.sendMessage({
                            type: this.input.type,
                            message: msg as Discord.Message,
                            interaction: msg as Discord.ChatInputCommandInteraction,
                            args: {
                                embeds: [pingEmbed],
                                edit: true,
                                editAsMsg: true,
                            }
                        }, this.input.canReply);
                    })
                        .catch();
                }
                break;
            case 'interaction': {
                this.input.interaction.reply({
                    embeds: [pingEmbed],
                    allowedMentions: { repliedUser: false },
                }).then((intRes: Discord.InteractionResponse) => {
                    const timeToEdit = new Date().getTime() - preEdit.getTime();
                    pingEmbed.setDescription(`
        Client latency: ${helper.vars.client.ws.ping}ms
        ${trueping}
        ${formatters.toCapital(this.input.type)} edit latency: ${Math.abs(timeToEdit)}ms
        `);
                    intRes.edit({
                        embeds: [pingEmbed]
                    });
                })
                    .catch();
            }
                break;
        }
    }
}