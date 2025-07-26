import Discord from 'discord.js';
import * as game from '../../tools/game';
import { Command } from '../command';

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