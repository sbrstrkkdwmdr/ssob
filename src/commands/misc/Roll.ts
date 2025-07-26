import Discord from 'discord.js';
import { Command } from '../command';

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