import Discord from 'discord.js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as log from '../../tools/log';
import { Command } from '../command';

export class Remind extends Command {
    declare protected params: {
        time: string;
        remindertxt: string;
        sendtochannel: boolean;
        list: boolean;
    };
    constructor() {
        super();
        this.name = 'Remind';
        this.params = {
            time: '1s',
            remindertxt: 'no reminder set',
            sendtochannel: false,
            list: false
        };
    }
    async setParamsMsg() {
        this.commanduser = this.input.message.author;
        this.params.time = this.input.args[0];
        this.params.remindertxt = this.input.args.join(' ').replaceAll(this.input.args[0], '');
        this.params.sendtochannel = false;

        if (!this.input.args[0] || this.input.args[0].includes('remind')) {
            this.params.list = true;
        }
        if (!this.input.args[1]) {
            this.params.remindertxt = 'null';
        }
        if (this.params.list == false && !this.input.args[0].endsWith('d') && !this.input.args[0].endsWith('h') && !this.input.args[0].endsWith('m') && !this.input.args[0].endsWith('s') && !this.params.time.includes(':') && !this.params.time.includes('.')) {
            this.ctn.content = 'Incorrect time format: please use `?d?h?m?s` or `hh:mm:ss`';
            this.send();
            return;
        }

    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.commanduser = interaction?.member?.user ?? interaction?.user;
        this.params.time = interaction.options.getString('time');
        this.params.remindertxt = interaction.options.getString('reminder');
        this.params.sendtochannel = interaction.options.getBoolean('sendinchannel');

    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        const reminder = new Discord.EmbedBuilder()
            .setColor(helper.colours.embedColour.info.dec)
            .setTitle(this.params.list ? 'REMINDERS' : 'REMINDER')
            .setDescription(`${this.params.remindertxt}`);

        if (this.params.list) {
            const useReminders = helper.vars.reminders.filter(x => `${x.userID}` === `${this.commanduser.id}`);
            reminder.setDescription(useReminders.length > 0 ?
                useReminders.map(x => `Reminder sending <t:${x.time}:R>: ${x.text}`).join('\n').slice(0, 2000)
                : 'You have no reminders'
            );
            this.ctn.embeds = [reminder];
        } else {
            const absTime = Math.floor(((new Date().getTime()) + calculate.timeToMs(this.params.time)) / 1000);
            this.ctn.content = `Sending reminder <t:${absTime}:R> (<t:${absTime}:f>)`;
            this.sendremind(reminder, this.params.time, this.params.sendtochannel, this.params.remindertxt, absTime);
        }
        this.send();
    }

    async sendremind(reminder: Discord.Embed | Discord.EmbedBuilder, time: string, sendchannel: boolean, remindertxt: string, absTime: number) {
        helper.vars.reminders.push({
            time: absTime,
            text: remindertxt,
            userID: `${this.commanduser.id}`
        });
        try {
            if (sendchannel == true) {
                setTimeout(() => {
                    ((this.input.message ?? this.input.interaction).channel as Discord.GuildTextBasedChannel).send({ content: `Reminder for <@${this.commanduser.id}> \n${remindertxt}` });
                    this.remReminder(absTime);
                }, calculate.timeToMs(time));
            }
            else {
                setTimeout(() => {
                    (this.commanduser as Discord.User).send({ embeds: [reminder] }).catch();
                    this.remReminder(absTime);
                }, calculate.timeToMs(time));
            }
        } catch (error) {
            log.stdout('embed error' + 'time:' + time + '\ntxt:' + remindertxt);
        }
    }

    remReminder(time: number) {
        const findOne = helper.vars.reminders.findIndex(x => x.time === time);
        return helper.vars.reminders.splice(findOne, 1);
    }
}