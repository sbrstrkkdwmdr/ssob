import * as Discord from 'discord.js';
import fs from 'fs';
import https from 'https';
import { gen, osu_maps, osu_other, osu_profiles, osu_scores } from './commandHelper';
import { Command, InputHandler } from './commands/command';
import * as helper from './helper';
import * as checks from './tools/checks';
import * as commandTools from './tools/commands';
import * as formatters from './tools/formatters';

export class LinkHandler extends InputHandler {
    async onMessage(message: Discord.Message) {
        if (!(message.content.startsWith('http') || message.content.includes('osu.') || message.attachments.size > 0)) {
            return;
        }
        let canReply = true;
        if (!checks.botHasPerms(message, ['ReadMessageHistory'])) {
            canReply = false;
        }


        let settings: helper.tooltypes.guildSettings;
        try {
            const curGuildSettings = await helper.vars.guildSettings.findOne({ where: { guildid: message.guildId } });
            settings = curGuildSettings.dataValues;
        } catch (error) {
            try {
                await helper.vars.guildSettings.create({
                    guildid: message.guildId,
                    guildname: message?.guild?.name ?? 'Unknown',
                    prefix: 'sbr-',
                    osuParseLinks: true,
                    osuParseScreenshots: true,
                    osuParseReplays: true,
                });
            } catch (error) {

            }
            settings = {
                guildid: message.guildId,
                guildname: message?.guild?.name ?? 'Unknown',
                prefix: 'sbr-',
                osuParseLinks: true,
                osuParseScreenshots: false,
                osuParseReplays: true,
            };
        }

        const messagenohttp = message.content.replace('https://', '').replace('http://', '').replace('www.', '');
        if (messagenohttp.startsWith('osu.ppy.sh/b/') || messagenohttp.startsWith('osu.ppy.sh/beatmaps/') || messagenohttp.startsWith('osu.ppy.sh/beatmapsets/') || messagenohttp.startsWith('osu.ppy.sh/s/')) {
            this.selected = new osu_maps.Map();
            await this.runCommand(message);
            return;
        }
        if (messagenohttp.startsWith('osu.ppy.sh/u/') || messagenohttp.startsWith('osu.ppy.sh/users/')) {
            this.selected = new osu_profiles.Profile();
            await this.runCommand(message);
            return;
        }
        if (message.attachments.size > 0 && message.attachments.every(attachment => formatters.removeURLparams(attachment.url).endsWith('.osr'))) {
            if (settings.osuParseReplays == false) {
                return;
            }
            const id = commandTools.getCmdId();
            const attachosr = message.attachments.first().url;
            const osrdlfile = fs.createWriteStream(`${helper.path.files}/replays/${id}.osr`);
            https.get(`${attachosr}`, function (response) {
                response.pipe(osrdlfile);
            });
            setTimeout(async () => {
                this.selected = new osu_scores.ReplayParse();
                await this.runCommand(message, id);
            }, 1500);
        }
        if (messagenohttp.startsWith('osu.ppy.sh/scores/')) {
            this.selected = new osu_scores.ScoreParse();
            await this.runCommand(message);
        }
    }
    async onInteraction(interaction: Discord.Interaction) { }
    async runCommand(message: Discord.Message, tid?: number) {
        this.selected.setInput({
            message,
            interaction: null,
            args: [],
            date: new Date(),
            id: tid ?? commandTools.getCmdId(),
            overrides: {},
            canReply: true,
            type: "link",
        });
        await this.selected.execute();
        this.selected = null;
    }
}