import Discord from 'discord.js';
import * as helper from '../helper';
import * as api from '../tools/api';
import * as game from '../tools/game';
import * as bottypes from '../types/bot';
import { Command } from './command';
export class _8Ball extends Command {
    declare protected params: {};
    constructor() {
        super();
        this.name = '8Ball';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff

        const value = Math.floor(Math.random() * 4);
        switch (value) {
            case 0:
                this.ctn.content = helper.responses.affirm[Math.floor(Math.random() * helper.responses.affirm.length)];
                break;
            case 1:
                this.ctn.content = helper.responses.negate[Math.floor(Math.random() * helper.responses.negate.length)];
                break;
            case 2:
                this.ctn.content = helper.responses.huh[Math.floor(Math.random() * helper.responses.huh.length)];
                break;
            case 3: default:
                this.ctn.content = helper.responses.other[Math.floor(Math.random() * helper.responses.other.length)];
                break;
        }

        this.send();
    }
}

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

        this.send();
    }
}
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
export class Janken extends Command {
    declare protected params: {
        userchoice: string;
    };
    constructor() {
        super();
        this.name = 'Janken';
        this.params = {
            userchoice: ''
        };
    }
    async setParamsMsg() {
        this.params.userchoice = this.input.args[0];
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.userchoice = interaction.options.getString('choice');
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        const real = game.jankenConvert(this.params.userchoice);
        if (real == 'INVALID') {
            this.voidcontent();
            this.ctn.content = 'Please input a valid argument';
            await this.send();
            return;
        }

        const opts = ['paper', 'scissors', 'rock'];
        const pcChoice = opts[Math.floor(Math.random() * opts.length)];

        let content = `It's a draw!`;
        const wtxt = 'You win!';
        const ltxt = 'You lose!';
        switch (pcChoice) {
            case 'paper':
                switch (real) {
                    case 'rock':
                        content = ltxt;
                        break;
                    case 'scissors':
                        content = wtxt;
                        break;
                }
                break;
            case 'rock':
                switch (real) {
                    case 'paper':
                        content = wtxt;
                        break;
                    case 'scissors':
                        content = ltxt;
                        break;
                }
                break;
            case 'scissors':
                switch (real) {
                    case 'paper':
                        content = ltxt;
                        break;
                    case 'rock':
                        content = wtxt;
                        break;
                }
                break;
        }

        const toEmoji = {
            'paper': '📃',
            'scissors': '✂',
            'rock': '🪨',
        };

        this.ctn.content = `${toEmoji[real]} vs. ${toEmoji[pcChoice]} | ` + content;
        this.send();
    }
}
export class Roll extends Command {
    declare protected params: {
        maxNum: number;
        minNum: number;
    };
    constructor() {
        super();
        this.name = 'Roll';
        this.params = {
            maxNum: 100,
            minNum: 0,
        };
    }
    async setParamsMsg() {
        this.params.maxNum = parseInt(this.input.args[0]);
        this.params.minNum = parseInt(this.input.args[1]);
        if (isNaN(this.params.maxNum) || !this.input.args[0]) {
            this.params.maxNum = 100;
        }
        if (isNaN(this.params.minNum) || !this.input.args[1]) {
            this.params.minNum = 0;
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.maxNum = interaction.options.getNumber('max') ?? this.params.maxNum;
        this.params.minNum = interaction.options.getNumber('min') ?? this.params.minNum;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        if (isNaN(this.params.maxNum)) {
            this.params.maxNum = 100;
        }
        if (isNaN(this.params.minNum)) {
            this.params.minNum = 0;
        }
        const eq = Math.floor(Math.random() * (this.params.maxNum - this.params.minNum)) + this.params.minNum;
        this.ctn.content = eq + '';
        this.send();
    }
}