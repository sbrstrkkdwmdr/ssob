import Discord from 'discord.js';
import * as helper from '../../helper';
import * as commandTools from '../../tools/commands';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { OsuCommand } from '../command';

export class TrackList extends OsuCommand {
    declare protected params: {};

    constructor() {
        super();
        this.name = 'TrackList';
    }
    async execute() {
        await this.setParams();
        this.logInput(true);
        // do stuff
        const users = await helper.vars.trackDb.findAll();
        const useridsarraylen = await helper.vars.trackDb.count();
        const userList: {
            osuid: string,
            userid: string,
            mode: string,
        }[] = [];
        for (let i = 0; i < useridsarraylen; i++) {
            const user = users[i].dataValues;
            let guilds;
            try {
                if (user.guilds.length < 3) throw new Error('no guilds');
                guilds = user.guilds.includes(',')
                    ? user.guilds.split(',') :
                    [user.guilds];

            } catch (error) {
                guilds = [];
            }

            //check if input.message?.guildId ?? input.interaction?.guildId is in guilds
            if (guilds.includes(this.input.message?.guildId)) {
                userList.push({
                    osuid: `${user.osuid}`,
                    userid: `${user.userid}`,
                    mode: `${user.mode}`
                });
            }
        }
        const userListEmbed = new Discord.EmbedBuilder()
            .setTitle(`All tracked users in ${this.input.message.guild.name}`)
            .setColor(helper.colours.embedColour.userlist.dec)
            .setDescription(`There are ${userList.length} users being tracked in this server\n\n` +
                `${userList.map((user, i) => `${i + 1}. ${helper.emojis.gamemodes[user.mode == 'undefined' ? 'osu' : user.mode]} https://osu.ppy.sh/users/${user.osuid}`).join('\n')}`
            );
        this.ctn.embeds = [userListEmbed];
        await this.send();
    }
}