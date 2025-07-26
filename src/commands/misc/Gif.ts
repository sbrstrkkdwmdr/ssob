import Discord from 'discord.js';
import * as helper from '../../helper';
import * as api from '../../tools/api';
import { Command } from '../command';

type giftype = 'slap' | 'punch' | 'kiss' | 'hug' | 'lick' | 'pet';
export class Gif extends Command {
    declare protected params: {
        target: Discord.User;
        type: giftype;
    };
    constructor() {
        super();
        this.name = 'Gif';
        this.params = {
            target: null,
            type: null,
        };
    }
    async setParamsMsg() {
        this.params.target = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first() : this.input.message.author;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.target = interaction.options.getUser('target');
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('type', 'ex')
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        let gifSelection = [helper.defaults.images.any.url];
        let baseString = 'null';
        const self = this.commanduser.id == this.params.target.id;
        switch (this.params.type) {
            case 'hug': {
                baseString = self ?
                    'user wants a hug' :
                    'user gives target a big hug';
            }
                break;
            case 'kiss': {
                baseString = self ?
                    'user wants a kiss' :
                    'user kisses target';
            }
                break;
            case 'lick': {
                baseString = self ?
                    'user licks themselves' :
                    'user licks target';
            }
                break;
            case 'pet': {
                baseString = self ?
                    'user wants to be pet' :
                    'user pets target softly';
            }
                break;
            case 'punch': {
                baseString = self ?
                    'user punches themselves' :
                    'user punches target very hard';
            }
                break;
            case 'slap': {
                baseString = self ?
                    'user slaps themselves' :
                    'user slaps target very hard';
            }
                break;
        }

        const gifSearch = await api.getGif(this.params.type);
        if (gifSearch?.data?.results?.length > 1) {
            gifSelection = gifSearch?.data?.results?.map(x => x.media_formats.gif.url);
        }

        if (gifSelection.length < 1) {
            gifSelection.push(helper.defaults.images.any.url);
        }

        const embed = new Discord.EmbedBuilder()
            .setTitle(baseString.replace('user', this.commanduser.username).replace('target', this.params.target.username))
            .setImage(gifSelection[Math.floor(Math.random() * gifSelection.length)]);

        this.ctn.embeds = [embed];
        this.send();
    }

}