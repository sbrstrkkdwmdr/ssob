import Discord from 'discord.js';
import * as helper from '../../helper';
import { Command } from '../command';

export class CoinFlip extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = 'CoinFlip';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff

        const arr = ['Heads', 'Tails'];
        const msg = arr[Math.floor(Math.random() * arr.length)];
        const file = new Discord.AttachmentBuilder(`${helper.path.precomp}/files/coin/${msg}.png`);
        const embed = new Discord.EmbedBuilder()
            .setTitle(msg)
            .setImage(`attachment://${msg}.png`);

        this.ctn.embeds = [embed];
        this.ctn.files = [file];

        await this.send();
    }
}