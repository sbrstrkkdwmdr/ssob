import Discord from 'discord.js';
import * as fs from 'fs';
import * as helper from '../../helper';
import * as checks from '../../tools/checks';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as track from '../../tools/track';
import { Command } from '../command';

export class Clear extends Command {
    declare protected params: {
        type: string;
    };
    constructor() {
        super();
        this.name = 'Clear';
        this.params = {
            type: ''
        };
    }
    async setParamsMsg() {
        this.params.type = this.input?.args[0];
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff
        let embed = new Discord.EmbedBuilder()
            .setTitle('Clearing cache');

        embed = this.clearCache(this.params.type, embed);
        this.ctn.embeds = [embed];
        await this.send();
    }
    clearCache(type: string, embed: Discord.EmbedBuilder) {
        switch (type) {
            case 'normal': default: { //clears all temprary files (cache/commandData)
                this.clearTemporary();
                embed.setDescription(`Clearing temporary files in ./cache/commandData/\n(ranked/loved/approved maps are kept)`);
            }
                break;
            case 'all': { //clears all files in commandData
                this.clearCommandData();
                embed.setDescription(`Clearing all files in ./cache/commandData/`);
            }
                break;
            case 'trueall': { //clears everything in cache
                embed = this.clearCache('all', embed);
                embed = this.clearCache('previous', embed);
                embed = this.clearCache('errors', embed);
                embed = this.clearCache('mapall', embed);
                embed = this.clearCache('params', embed);
                embed = this.clearCache('graphs', embed);
                embed.setDescription(`Clearing all files in ./cache/ and ./files/maps`);
            }
                break;
            case 'mapall': case 'mapsall': { // clears all maps and mapset files
                this.clearMapMetadata();
                this.clearMapFiles();
                embed.setDescription(`Clearing all map-related files in ./cache/commandData/ and ./files/maps/`);
            }
                break;
            case 'mapmeta': {
                this.clearMapMetadata();
                embed.setDescription(`Clearing all map-related files in ./cache/commandData/`);
            }
                break;
            case 'mapobjects': case 'pp': {
                this.clearMapFiles();
                embed.setDescription(`Clearing all files in ./files/maps/`);
            }
            case 'users': { //clears all osudata files
                this.clearUserData();
                embed.setDescription(`Clearing all user data files in ./cache/commandData/`);
            }
                break;
            case 'previous': { // clears all previous files
                this.clearPreviousMaps();
                this.clearPreviousScores();
                this.clearPreviousUsers();
                embed.setDescription(`Clearing all files in ./cache/previous/`);
            }
                break;
            case 'pmaps': { // clears all previous map files
                this.clearPreviousMaps();
                embed.setDescription(`Clearing all previous map files in ./cache/previous/`);
            }
                break;
            case 'pscores': { // clears all previous score files
                this.clearPreviousScores();
                embed.setDescription(`Clearing all previous score files in ./cache/previous/`);
            }
            case 'pusers': { // clears all previous user files
                this.clearPreviousUsers();
                embed.setDescription(`Clearing all previous user files in ./cache/previous/`);
            }
                break;
            case 'errors': { //clears all errors
                this.clearErrors();
                embed.setDescription(`Clearing error files in ./cache/errors/`);
            }
                break;
            case 'graph': {
                this.clearGraphs();
                embed.setDescription(`Clearing graph files in ./cache/graphs/`);
            }
            case 'params': {
                this.clearParams();
                embed.setDescription(`Clearing param files in ./cache/params/`);
            }
            case 'help': {
                embed.setDescription(
                    this.clearHelp() + '\n'
                    + '* previous files store the data of the last object used in that given server/guild'
                );
            }
                break;
        }
        return embed;
    }
    clearTemporary() {
        log.stdout(`manually clearing temporary files in ${helper.path.cache}/commandData/`);
        const curpath = `${helper.path.cache}/commandData`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            const keep = ['Approved', 'Ranked', 'Loved', 'Qualified'];
            if (!keep.some(x => file.includes(x))) {
                fs.unlinkSync(`${curpath}/` + file);
                log.stdout(`Deleted file: ${curpath}/` + file);
            }
        }
    }
    clearCommandData() {
        log.stdout(`manually clearing all files in ${helper.path.cache}/commandData/`);
        const curpath = `${helper.path.cache}/commandData`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            fs.unlinkSync(`${curpath}/` + file);
            log.stdout(`Deleted file: ${curpath}/` + file);
        }
    }
    clearMapMetadata() {
        log.stdout(`manually clearing all map and mapset files in ${helper.path.cache}/commandData/`);
        const curpath = `${helper.path.cache}/commandData`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            if (file.includes('bmsdata') || file.includes('mapdata')) {
                fs.unlinkSync(`${curpath}/` + file);
                log.stdout(`Deleted file: ${curpath}/` + file);
            }
        }
    }
    clearMapFiles() {
        log.stdout(`manually clearing all map files in ${helper.path.files}/maps/`);
        const curpath = `${helper.path.files}/maps`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            fs.unlinkSync(`${curpath}/` + file);
            log.stdout(`Deleted file: ${curpath}/` + file);
        }
    }
    clearUserData() {
        log.stdout(`manually clearing all osudata files in ${helper.path.cache}/commandData/`);
        const curpath = `${helper.path.cache}/commandData`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            if (file.includes('osudata')) {
                fs.unlinkSync(`Deleted file: ${curpath}/` + file);
                log.stdout(`${curpath}/` + file,);
            }
        }
    }
    clearPreviousMaps() {
        log.stdout(`manually clearing all prevmap files in ${helper.path.cache}/previous/`,);
        const curpath = `${helper.path.cache}/previous`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            if (file.includes('map')) {
                fs.unlinkSync(`${curpath}/` + file);
                log.stdout(`Deleted file: ${curpath}/` + file,);
            }
        }
    }
    clearPreviousScores() {
        log.stdout(`manually clearing all prev score files in ${helper.path.cache}/previous/`,);
        const curpath = `${helper.path.cache}/previous`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            if (file.includes('score')) {
                fs.unlinkSync(`${curpath}/` + file);
                log.stdout(`Deleted file: ${curpath}/` + file);
            }
        }
    }
    clearPreviousUsers() {
        log.stdout(`manually clearing all prev user files in ${helper.path.cache}/previous/`);
        const curpath = `${helper.path.cache}/previous`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            if (file.includes('user')) {
                fs.unlinkSync(`${curpath}/` + file);
                log.stdout(`Deleted file: ${curpath}/` + file);
            }
        }
    }
    clearErrors() {
        log.stdout(`manually clearing all err files in ${helper.path.cache}/errors/`);
        const curpath = `${helper.path.cache}/errors`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            fs.unlinkSync(`${curpath}/` + file);
            log.stdout(`Deleted file: ${curpath}/` + file);
        }
    }
    clearGraphs() {
        log.stdout(`manually clearing all graph files in ${helper.path.cache}/graphs/`);
        const curpath = `${helper.path.cache}/graphs`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            fs.unlinkSync(`${curpath}/` + file);
            log.stdout(`Deleted file: ${curpath}/` + file);
        }
    }
    clearParams() {
        log.stdout(`manually clearing all param files in ${helper.path.cache}/params/`);
        const curpath = `${helper.path.cache}/params`;
        const files = fs.readdirSync(curpath);
        for (const file of files) {
            fs.unlinkSync(`${curpath}/` + file);
            log.stdout(`Deleted file: ${curpath}/` + file);
        }
    }
    clearHelp() {
        const dict: helper.tooltypes.Dict<string> = {
            'help': 'show this list',
            'normal': 'clears all temporary files (maps with leaderboard are kept)',
            'all': 'clears all files in command cache',
            'trueall': 'clears all files in all cache folders and `.osu` files',
            'mapall/mapsall': 'clears all map files and `.osu` files',
            'mapmeta': 'clears all map files in command cache',
            'mapobjects/pp': 'clears all `.osu` files',
            'users': 'clear all osu profile data',
            'previous': 'clear all previous* files',
            'pmaps': 'clear all previous* map files',
            'pscores': 'clear all previous* score files',
            'pusers': 'clear all previous* user files',
            'errors': 'clear cached errors',
            'graph': 'clear cached graphs',
            'params': 'clear command params (such as sorting order, filters etc.)',
        };
        let text: string[] = [];
        for (const entry in dict) {
            text.push(`**${entry}:** ${dict[entry]}`);
        }
        return text.join('\n');
    }
}