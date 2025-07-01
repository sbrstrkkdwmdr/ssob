import * as Discord from 'discord.js';
import fs from 'fs';
import https from 'https';
import { Command } from './commands/command';
import * as helper from './helper';

let command: Command;
const overrides: helper.bottypes.overrides = {

};
let id: number;
export async function onMessage(message: Discord.Message) {
    if (!(message.content.startsWith('http') || message.content.includes('osu.') || message.attachments.size > 0)) {
        return;
    }
    let canReply = true;
    if (!helper.checks.botHasPerms(message, ['ReadMessageHistory'])) {
        canReply = false;
    }


    let settings:helper.tooltypes.guildSettings;
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
        id = helper.commandTools.getCmdId();
        command = new helper.cmd_osu_maps.Map();
        await runCommand(message);
        return;
    }
    if (messagenohttp.startsWith('osu.ppy.sh/u/') || messagenohttp.startsWith('osu.ppy.sh/users/')) {
        command = new helper.cmd_osu_profiles.Profile();
        id = helper.commandTools.getCmdId();
        await runCommand(message);
        return;
    }
    if (message.attachments.size > 0 && message.attachments.every(attachment => helper.formatter.removeURLparams(attachment.url).endsWith('.osr'))) {
        if (settings.osuParseReplays == false) {
            return;
        }
        const attachosr = message.attachments.first().url;
        id = helper.commandTools.getCmdId();
        const osrdlfile = fs.createWriteStream(`${helper.path.files}/replays/${id}.osr`);
        https.get(`${attachosr}`, function (response) {
            response.pipe(osrdlfile);
        });
        setTimeout(async () => {
            command = new helper.cmd_osu_scores.ReplayParse();
            await runCommand(message);
        }, 1500);
    }
    if (messagenohttp.startsWith('osu.ppy.sh/scores/')) {
        id = helper.commandTools.getCmdId();
        command = new helper.cmd_osu_scores.ScoreParse();
        await runCommand(message);
    }
}

async function runCommand(message: Discord.Message,) {
    command.setInput({
        message,
        interaction: null,
        args: [],
        date: new Date(),
        id,
        overrides,
        canReply: true,
        type: "link",
    });
    await command.execute();
}