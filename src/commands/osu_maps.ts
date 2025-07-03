import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../helper';
import * as calculate from '../tools/calculate';
import * as commandTools from '../tools/commands';
import * as data from '../tools/data';
import * as formatters from '../tools/formatters';
import * as log from '../tools/log';
import * as osuapi from '../tools/osuapi';
import * as other from '../tools/other';
import * as performance from '../tools/performance';
import { OsuCommand } from './command';

export class Map extends OsuCommand {
    declare protected params: {
        mapid: number;
        mapmods: osumodcalc.types.Mod[];
        maptitleq: string;
        detailed: number;
        isppCalc: boolean;
        searchRestrict: string;
        overrideSpeed: number;
        overrideBpm: number;
        overwriteModal: Discord.StringSelectMenuComponent | Discord.StringSelectMenuBuilder;
        customCS: 'current' | number;
        customAR: 'current' | number;
        customOD: 'current' | number;
        customHP: 'current' | number;
        showBg: boolean;
        forceMode: osuapi.types_v2.GameMode;
    };
    #apiMods: osumodcalc.types.ApiMod[];
    constructor() {
        super();
        this.name = 'Map';
        this.params = {
            mapid: undefined,
            mapmods: [],
            maptitleq: null,
            detailed: 1,
            isppCalc: false,
            searchRestrict: 'any',
            overrideSpeed: 1,
            overrideBpm: null,
            overwriteModal: null,
            customCS: 'current',
            customAR: 'current',
            customOD: 'current',
            customHP: 'current',
            showBg: false,
            forceMode: 'osu',
        };
    }
    async setParamsMsg() {
        const detailArgFinder = commandTools.matchArgMultiple(helper.argflags.details, this.input.args, false, null, false, false);
        if (detailArgFinder.found) {
            this.params.detailed = 2;
            this.input.args = detailArgFinder.args;
        }
        if (this.input.args.includes('-bpm')) {
            const temp = commandTools.parseArg(this.input.args, '-bpm', 'number', this.params.overrideBpm);
            this.params.overrideBpm = temp.value;
            this.input.args = temp.newArgs;
        }
        if (this.input.args.includes('-speed')) {
            const temp = commandTools.parseArg(this.input.args, '-speed', 'number', this.params.overrideSpeed);
            this.params.overrideSpeed = temp.value;
            this.input.args = temp.newArgs;
        }

        if (this.input.args.includes('-cs')) {
            const temp = commandTools.parseArg(this.input.args, '-cs', 'number', this.params.customCS);
            this.params.customCS = temp.value;
            this.input.args = temp.newArgs;
        }
        if (this.input.args.includes('-ar')) {
            const temp = commandTools.parseArg(this.input.args, '-ar', 'number', this.params.customAR);
            this.params.customAR = temp.value;
            this.input.args = temp.newArgs;
        }
        const customODArgFinder = commandTools.matchArgMultiple(helper.argflags.toFlag(['od', 'accuracy',]), this.input.args, true, 'number', false, false);
        if (customODArgFinder.found) {
            this.params.customOD = customODArgFinder.output;
            this.input.args = customODArgFinder.args;
        }
        const customHPArgFinder = commandTools.matchArgMultiple(helper.argflags.toFlag(['hp', 'drain', 'health']), this.input.args, true, 'number', false, false);
        if (customHPArgFinder.found) {
            this.params.customHP = customHPArgFinder.output;
            this.input.args = customHPArgFinder.args;
        }

        if (this.input.args.includes('-?')) {
            const temp = commandTools.parseArg(this.input.args, '-?', 'string', this.params.maptitleq, true);
            this.params.maptitleq = temp.value;
            this.input.args = temp.newArgs;
        }

        if (this.input.args.join(' ').includes('"')) {
            this.params.maptitleq = this.input.args.join(' ').substring(
                this.input.args.join(' ').indexOf('"') + 1,
                this.input.args.join(' ').lastIndexOf('"')
            );
            this.input.args = this.input.args.join(' ').replace(this.params.maptitleq, '').split(' ');
        }
        if (this.input.args.includes('-bg')) {
            this.params.showBg = true;
        }
        const isppCalcArgFinder = commandTools.matchArgMultiple(helper.argflags.toFlag(['pp', 'calc', 'performance']), this.input.args, false, null, false, false);
        if (isppCalcArgFinder.found) {
            this.params.isppCalc = true;
            this.input.args = isppCalcArgFinder.args;
        }

        const modeTemp = await commandTools.parseArgsMode(this.input);
        this.params.forceMode = modeTemp.mode;
        this.input.args = modeTemp.args;

        if (this.input.args.join(' ').includes('+')) {
            let temp = this.input.args.join(' ').split('+')[1].trim();
            if (temp.includes(' ') && temp.split(' ').length > 1) {
                temp = temp.split(' ')[0];
            } else if (temp.length < 2) {
                temp = null;
            }
            if (temp) {
                this.params.mapmods = osumodcalc.mod.fromString(temp);
                this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
            }
            this.input.args = this.input.args.join(' ').replace('+', '').replace(temp, '').split(' ');
        }

        this.input.args = commandTools.cleanArgs(this.input.args);
        const mapTemp = await commandTools.mapIdFromLink(this.input.args.join(' '), true);
        this.params.mapid = mapTemp.map;
        mapTemp.mode ? this.params.forceMode = mapTemp.mode : null;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getInteger('id');
        this.params.mapmods = osumodcalc.mod.fromString(interaction.options.getString('mods').toUpperCase());
        this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        this.params.detailed = interaction.options.getBoolean('detailed') ? 2 : 1;
        this.params.maptitleq = interaction.options.getString('query');
        interaction.options.getNumber('bpm') ? this.params.overrideBpm = interaction.options.getNumber('bpm') : null;
        interaction.options.getNumber('speed') ? this.params.overrideSpeed = interaction.options.getNumber('speed') : null;

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        const temp = commandTools.getButtonArgs(this.input.id);
        if (temp.error) {
            interaction.followUp({
                content: helper.errors.paramFileMissing,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            commandTools.disableAllButtons(this.input.message);
            return;
        }
        this.params.mapid = temp.mapId;
        this.params.forceMode = temp.mode;
        this.params.mapmods = temp.modsInclude;
        this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        this.params.overrideBpm = temp.overrideBpm;
        this.params.overrideSpeed = temp.overrideSpeed;
        this.params.isppCalc = temp.ppCalc;
        this.params.detailed = commandTools.buttonDetail(temp.detailed, this.input.buttonType);
    }
    async setParamsLink() {
        const messagenohttp = this.input.message.content.replace('https://', '').replace('http://', '').replace('www.', '');
        if (this.input.args.join(' ').includes('+')) {
            let temp = messagenohttp.split('+')[1].trim();
            if (temp.includes(' ') && temp.split(' ').length > 1) {
                temp = temp.split(' ')[0];
            } else if (temp.length < 2) {
                temp = null;
            }
            if (temp) {
                this.params.mapmods = osumodcalc.mod.fromString(temp);
                this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
            }
        }
        if (this.input.args[0] && this.input.args[0].startsWith('query')) {
            this.params.maptitleq = this.input.args[1];
        } else if (messagenohttp.includes('q=')) {
            this.params.maptitleq =
                messagenohttp.includes('&') ?
                    messagenohttp.split('q=')[1].split('&')[0] :
                    messagenohttp.split('q=')[1];
        } else {
            const mapTemp = await commandTools.mapIdFromLink(messagenohttp, true,);
            this.params.mapid = mapTemp.map;
            this.params.forceMode = mapTemp.mode ?? this.params.forceMode;
            if (!(mapTemp.map || mapTemp.set)) {
                this.voidcontent();
                this.ctn.content = helper.errors.uErr.osu.map.url;
                await this.send();
                return;
            }
            //get map id via mapset if not in the given URL
            if (!mapTemp.map && mapTemp.set) {
                this.params.mapid = this.mapset?.beatmaps[0]?.id;
                try {
                    const bm = await this.getMapSet(this.map.beatmapset_id);
                    this.mapset = bm;
                    this.params.mapid = bm.beatmaps[0].id;
                } catch (e) {
                    return;
                }
            }
        }
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        if (this.input.overrides?.overwriteModal != null) {
            this.params.overwriteModal = this.input?.overrides?.overwriteModal ?? this.params.overwriteModal;
        }
        if (this.input.overrides?.id != null) {
            this.params.mapid = +(this.input?.overrides?.id ?? this.params.mapid);
        }
        if (this.input.overrides?.commanduser != null) {
            this.commanduser = this.input.overrides.commanduser;
            // this.ctn.content = `Requested by <@${this.commanduser.id}>\n`;
        }
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        if (this.input.overrides?.filterMods != null) {
            this.params.mapmods = this.input.overrides.filterMods;
            this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        }
        if (this.input.overrides?.ex != null) {
            this.ctn.content += this.input.overrides?.ex;
        }
        if (this.input.overrides?.type != null) {
            this.params.isppCalc = true;
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        this.getOverrides();
        // do stuff
        const buttons = new Discord.ActionRowBuilder();
        if (this.params.isppCalc) {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-${this.commanduser.id}-${this.input.id}-${this.params.mapid}${this.params.mapmods && this.params.mapmods.length > 0 ? '+' + this.params.mapmods.join(',') : ''}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.map)
            );
        } else {
            if (this.params.detailed == 2) {
                buttons.addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-DetailDisable-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailLess)
                );
            } else {
                buttons.addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId(`${helper.versions.releaseDate}-DetailEnable-${this.name}-${this.commanduser.id}-${this.input.id}`)
                        .setStyle(helper.buttons.type.current)
                        .setEmoji(helper.buttons.label.main.detailMore)
                );
            }
        }

        if (this.checkNullParams()) {
            return;
        }

        const inputModalDiff = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-Select-map-${this.commanduser.id}-${this.input.id}-diff`)
            .setPlaceholder('Select a difficulty');
        const inputModalSearch = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-Select-map-${this.commanduser.id}-${this.input.id}-search`)
            .setPlaceholder('Select a map');

        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

        if (await this.checkQueryType(inputModalSearch)) {
            return;
        }

        this.setModalDifficulty(inputModalDiff);

        if (this.params.showBg) {
            this.execute_bg();
        } else {
            this.execute_map(buttons, inputModalDiff, inputModalSearch);
        }

        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: null,
                mode: this.params.forceMode
            }
        );
        this.send();
    }
    map: osuapi.types_v2.BeatmapExtended;
    mapset: osuapi.types_v2.BeatmapsetExtended;

    async getMapSet(mapsetid: number) {
        let bmsdata: osuapi.types_v2.BeatmapsetExtended;
        if (data.findFile(mapsetid, `bmsdata`) &&
            !('error' in data.findFile(mapsetid, `bmsdata`)) &&
            this.input.buttonType != 'Refresh') {
            bmsdata = data.findFile(mapsetid, `bmsdata`);
        } else {
            bmsdata = await osuapi.v2.beatmaps.mapset({ id: mapsetid });
        }
        data.debug(bmsdata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'bmsData');
        if (bmsdata?.hasOwnProperty('error')) {
            await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.ms.replace('[ID]', `${mapsetid}`), true);
            return;
        }
        data.storeFile(bmsdata, mapsetid, `bmsdata`);

        return bmsdata;
    }

    checkNullParams() {
        if (!this.params.mapid && !this.params.maptitleq) {
            const temp = this.getLatestMap();
            this.params.mapid = +temp.mapid;

            if (!this.params.mapmods || this.params.mapmods.length == 0) {
                this.params.mapmods = temp.mods.map(x => x.acronym) as osumodcalc.types.Mod[];
                this.#apiMods = temp.mods;
                const tempStats = osumodcalc.stats.modded({
                    cs: 1, ar: 1, od: 1, hp: 1, bpm: 1, songLength: 1
                }, temp.mods);
                if (!(this.params.mapmods.includes('HR') || this.params.mapmods.includes('EZ'))) {
                    if (!this.params.customCS && tempStats.cs != 1) {
                        this.params.customCS = tempStats.cs;
                    }
                    if (!this.params.customAR && tempStats.ar != 1) {
                        this.params.customAR = tempStats.ar;
                    }
                    if (!this.params.customOD && tempStats.od != 1) {
                        this.params.customOD = tempStats.od;
                    }
                    if (!this.params.customHP && tempStats.hp != 1) {
                        this.params.customHP = tempStats.hp;
                    }
                }
                if (!this.params.overrideSpeed && tempStats.bpm != 1) {
                    this.params.overrideSpeed = tempStats.bpm;
                }
            }
            this.params.forceMode = temp.mode;
        }
        if (this.params.mapid == 0 && !this.params.maptitleq) {
            commandTools.missingPrevID_map(this.input, 'map');
            return true;
        }
        return false;
    }
    async checkQueryType(inputModalSearch: Discord.StringSelectMenuBuilder) {
        if (this.params.maptitleq == null) {
            try {
                const m = await this.getMap(this.params.mapid);
                this.map = m;
            } catch (e) {
                return true;
            }

            try {
                const bm = await this.getMapSet(this.map.beatmapset_id);
                this.mapset = bm;
            } catch (e) {
                return;
            }
        }
        else if (this.params.maptitleq != null) {
            const mapidtest = await osuapi.v2.beatmaps.search({ query: this.params.maptitleq });
            if (mapidtest?.error) {
                await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.search, false);
                return;
            }
            data.debug(mapidtest, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'mapIdTestData');
            data.storeFile(mapidtest, this.params.maptitleq.replace(/[\W_]+/g, '').replaceAll(' ', '_'), 'mapQuerydata');

            if (mapidtest?.hasOwnProperty('error') && !mapidtest.hasOwnProperty('beatmapsets')) {
                await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.search, true);
                return;
            }

            let usemapidpls: number;
            let mapidtest2: osuapi.types_v2.Beatmap[];

            if (mapidtest.beatmapsets.length == 0) {
                this.voidcontent();
                this.ctn.content = helper.errors.uErr.osu.map.search_nf.replace('[INPUT]', this.params.maptitleq);
                await this.send();
                return;
            }
            try {
                let matchedId: number = null;
                // first check if any diff name matches the search
                for (let i = 0; i < mapidtest.beatmapsets[0].beatmaps.length; i++) {
                    if (this.params.maptitleq.includes(mapidtest.beatmapsets[0].beatmaps[i].version)) {
                        matchedId = mapidtest.beatmapsets[0].beatmaps[i].id;
                    }
                }

                mapidtest2 = mapidtest.beatmapsets[0].beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating);
                usemapidpls = matchedId ?? mapidtest2[0].id;
            } catch (error) {
                this.voidcontent();
                this.ctn.content = `Error - could not sort maps`;
                await this.send();
                return;
            }

            try {
                const m = await this.getMap(usemapidpls);
                this.map = m;
            } catch (e) {
                return;
            }
            //options menu to switch to other maps
            for (let i = 0; i < mapidtest?.beatmapsets?.length && i < 25; i++) {
                const curmapset = mapidtest?.beatmapsets?.[i];
                if (!curmapset) break;
                const curmap = curmapset.beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating)[0];
                inputModalSearch.addOptions(
                    new Discord.StringSelectMenuOptionBuilder()
                        .setEmoji(`${curmap.mode_int == 0 ? helper.emojis.gamemodes.standard :
                            curmap.mode_int == 1 ? helper.emojis.gamemodes.taiko :
                                curmap.mode_int == 2 ? helper.emojis.gamemodes.fruits :
                                    curmap.mode_int == 3 ? helper.emojis.gamemodes.mania :
                                        helper.emojis.gamemodes.standard
                            }` as Discord.APIMessageComponentEmoji)
                        .setLabel(`${curmapset.title} // ${curmapset.creator}`)
                        .setDescription(`[${curmap.version}] ${curmap.difficulty_rating}⭐`)
                        .setValue(`${curmap.id}`)
                );
            }

            try {
                const bm = await this.getMapSet(this.map.beatmapset_id);
                this.mapset = bm;
            } catch (e) {
                return;
            }
        }
    }
    setModalDifficulty(inputModalDiff: Discord.StringSelectMenuBuilder) {
        if (typeof this.mapset?.beatmaps == 'undefined' || this.mapset?.beatmaps?.length < 2) {
            inputModalDiff.addOptions(
                new Discord.StringSelectMenuOptionBuilder()
                    .setEmoji(`${this.map.mode_int == 0 ? helper.emojis.gamemodes.standard :
                        this.map.mode_int == 1 ? helper.emojis.gamemodes.taiko :
                            this.map.mode_int == 2 ? helper.emojis.gamemodes.fruits :
                                this.map.mode_int == 3 ? helper.emojis.gamemodes.mania :
                                    helper.emojis.gamemodes.standard
                        }` as Discord.APIMessageComponentEmoji)
                    .setLabel(`${this.map.version}`)
                    .setDescription(`${this.map.difficulty_rating}⭐`)
                    .setValue(`${this.map.id}`)
            );
        } else {
            for (let i = 0; i < this.mapset.beatmaps.length && i < 25; i++) {
                const curmap = this.mapset.beatmaps.slice().sort((a, b) => b.difficulty_rating - a.difficulty_rating)[i];
                if (!curmap) break;
                inputModalDiff.addOptions(
                    new Discord.StringSelectMenuOptionBuilder()
                        .setEmoji(`${this.map.mode_int == 0 ? helper.emojis.gamemodes.standard :
                            this.map.mode_int == 1 ? helper.emojis.gamemodes.taiko :
                                this.map.mode_int == 2 ? helper.emojis.gamemodes.fruits :
                                    this.map.mode_int == 3 ? helper.emojis.gamemodes.mania :
                                        helper.emojis.gamemodes.standard
                            }` as Discord.APIMessageComponentEmoji)
                        .setLabel(`${curmap.version}`)
                        .setDescription(`${curmap.difficulty_rating}⭐`)
                        .setValue(`${curmap.id}`)
                );
            }
        }
    }
    execute_bg() {
        const url = osuapi.other.beatmapImages(this.map.beatmapset_id);
        const embed = new Discord.EmbedBuilder()
            .setTitle('Beatmap images')
            .addFields([
                {
                    name: 'Thumbnail (4:3)',
                    value: `${url.thumbnail}\n\n${url.thumbnailLarge}`,
                    inline: true
                },
                {
                    name: 'Full/Raw',
                    value: `${url.full}\n\n${url.raw}`,
                    inline: true
                },
                {
                    name: 'Cover (18:5)',
                    value: `${url.cover}\n\n${url.cover2x}`,
                    inline: true
                },
                {
                    name: 'Card (20:7)',
                    value: `${url.card}\n\n${url.card2x}`,
                    inline: true
                },
                {
                    name: 'List (1:1)',
                    value: `${url.list}\n\n${url.list2x}`,
                    inline: true
                },
                {
                    name: 'Slimcover (16:3)',
                    value: `${url.slimcover}\n\n${url.slimcover2x}`,
                    inline: true
                },
            ])
            .setImage(url.full);
        this.ctn.embeds = [embed];
        this.ctn.edit = true;
    }
    async execute_map(buttons: Discord.ActionRowBuilder, inputModalDiff: Discord.StringSelectMenuBuilder, inputModalSearch: Discord.StringSelectMenuBuilder) {
        this.checkMapMods();

        //converts
        let [useMapdata] = this.converts();

        if (this.params.customCS == 'current' || isNaN(+this.params.customCS)) {
            this.params.customCS = useMapdata.cs;
        }
        if (this.params.customAR == 'current' || isNaN(+this.params.customAR)) {
            this.params.customAR = useMapdata.ar;
        }
        if (this.params.customOD == 'current' || isNaN(+this.params.customOD)) {
            this.params.customOD = useMapdata.accuracy;
        }
        if (this.params.customHP == 'current' || isNaN(+this.params.customHP)) {
            this.params.customHP = useMapdata.drain;
        }

        let hitlength = useMapdata.hit_length;

        const allvals = osumodcalc.stats.modded({
            cs: this.params.customCS,
            ar: this.params.customAR,
            od: this.params.customOD,
            hp: this.params.customHP,
            bpm: this.params.overrideBpm ?? useMapdata.bpm,
            songLength: hitlength
        }, this.params.mapmods,
            this?.params?.overrideSpeed ?? undefined
        );

        let ppComputed: rosu.PerformanceAttributes[];
        let ppissue: string;
        let totaldiff: string = useMapdata.difficulty_rating?.toFixed(2);
        try {
            ppComputed = await performance.calcMap({
                mods: this.params.mapmods,
                mode: useMapdata.mode_int as number as rosu.GameMode,
                mapid: useMapdata.id,
                clockRate: this.params.overrideSpeed,
                customCS: this.params.customCS,
                customAR: this.params.customAR,
                customOD: this.params.customOD,
                customHP: this.params.customHP,
                mapLastUpdated: new Date(useMapdata.last_updated)
            });
            ppissue = '';
            try {
                totaldiff = useMapdata.difficulty_rating.toFixed(2) != ppComputed[0].difficulty.stars?.toFixed(2) ?
                    `${useMapdata.difficulty_rating.toFixed(2)}=>${ppComputed[0].difficulty.stars?.toFixed(2)}` :
                    `${useMapdata.difficulty_rating.toFixed(2)}`;
            } catch (error) {
                totaldiff = useMapdata.difficulty_rating?.toFixed(2);
            }
            data.debug(ppComputed, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'ppCalc');

        } catch (error) {
            log.stdout(error);
            ppissue = 'Error - pp could not be calculated';
            const tstmods = this.params.mapmods;

            if (tstmods.includes('EZ') || tstmods.includes('HR')) {
                ppissue += '\nInvalid mod combinations: EZ + HR';
            }
            if ((tstmods.includes('DT') || tstmods.includes('NC')) && tstmods.includes('HT')) {
                ppissue += '\nInvalid mod combinations: DT/NC + HT';
            }
            const ppComputedTemp = performance.template(useMapdata);
            ppComputed = [
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
                ppComputedTemp,
            ];
        }
        const mapname = formatters.parseUnicodeStrings({
            title: this.map.beatmapset.title,
            artist: this.map.beatmapset.artist,
            title_unicode: this.map.beatmapset.title_unicode,
            artist_unicode: this.map.beatmapset.artist_unicode,
            ignore: {
                artist: false,
                title: false
            }
        }, 1);
        const showMods =
            this.params.mapmods && this.params.mapmods.length > 0 ?
                ' +' + this.params.mapmods.join('') :
                '';

        const maptitle: string = `\`${mapname} [${this.map.version}]\`${showMods}`;
        const embed = new Discord.EmbedBuilder()
            .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${useMapdata.mode}/${this.map.id}`)
            .setThumbnail(osuapi.other.beatmapImages(this.map.beatmapset_id).list2x)
            .setTitle(maptitle);
        embed.setColor(formatters.difficultyColour(+totaldiff).dec);
        await this.embedStart(useMapdata, allvals, totaldiff, ppComputed, buttons);

        commandTools.storeButtonArgs(this.input.id, {
            mapId: this.params.mapid,
            mode: this.params.forceMode,
            modsInclude: this.params.mapmods,
            overrideBpm: this.params.overrideBpm,
            overrideSpeed: this.params.overrideSpeed,
            ppCalc: this.params.isppCalc,
            detailed: this.params.detailed,
            filterTitle: this.params.maptitleq,
        });

        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: this.#apiMods,
                mode: this.params.forceMode
            }
        );

        this.ctn.components.push(buttons);

        let frmod = inputModalSearch;
        if (this.params.overwriteModal != null) {
            frmod = this.params.overwriteModal as Discord.StringSelectMenuBuilder;
        }

        if (!(inputModalDiff.options.length < 1)) {
            this.ctn.components.push(new Discord.ActionRowBuilder()
                .addComponents(inputModalDiff));
        }
        if (!(inputModalSearch.options.length < 1)) {
            this.ctn.components.push(new Discord.ActionRowBuilder()
                .addComponents(frmod));
        }
        if (this.params.overwriteModal) {

            this.ctn.components.push(new Discord.ActionRowBuilder()
                //@ts-expect-error anycomponentbuilder has properties missing in stringselectmenu  
                .addComponents(this.params.overwriteModal));
        }
    }
    checkMapMods() {
        if (this.params.mapmods == null) {
            this.params.mapmods = [];
            this.#apiMods = [];
        }
        else {
            this.params.mapmods = osumodcalc.mod.fix(this.params.mapmods, this.map.mode);
            this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        }
    }
    converts(): [osuapi.types_v2.BeatmapExtended, boolean] {
        let useMapdata: osuapi.types_v2.BeatmapExtended = this.map;
        let successConvert: boolean = false;
        if (this.params.forceMode && this.params.forceMode != this.map.mode && this.params.forceMode != 'osu') {
            for (const beatmap of this.mapset.converts) {
                if (beatmap.mode == this.params.forceMode && beatmap.id == this.map.id) {
                    useMapdata = beatmap;
                    successConvert = true;
                    break;
                }
            }
        }
        return [useMapdata, successConvert];
    }
    async perf(mods: osumodcalc.types.Mod[], useMapdata: osuapi.types_v2.BeatmapExtended) {
        return await performance.calcFullCombo({
            mapid: useMapdata.id,
            mods,
            mode: useMapdata.mode_int as number as rosu.GameMode,
            accuracy: 100,
            customCS: +this.params.customCS,
            customAR: +this.params.customAR,
            customOD: +this.params.customOD,
            customHP: +this.params.customHP,
            mapLastUpdated: new Date(useMapdata.last_updated)
        });
    }
    async embedStart(useMapdata: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[], buttons:Discord.ActionRowBuilder) {
        const mapname = formatters.parseUnicodeStrings({
            title: this.map.beatmapset.title,
            artist: this.map.beatmapset.artist,
            title_unicode: this.map.beatmapset.title_unicode,
            artist_unicode: this.map.beatmapset.artist_unicode,
            ignore: {
                artist: false,
                title: false
            }
        }, 1);
        const showMods =
            this.params.mapmods && this.params.mapmods.length > 0 ?
                ' +' + this.params.mapmods.join('') :
                '';

        const maptitle: string = `\`${mapname} [${this.map.version}]\`${showMods}`;
        const embed = new Discord.EmbedBuilder()
            .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${useMapdata.mode}/${this.map.id}`)
            .setThumbnail(osuapi.other.beatmapImages(this.map.beatmapset_id).list2x)
            .setTitle(maptitle);
        embed.setColor(formatters.difficultyColour(+useMapdata.difficulty_rating).dec);
        if (this.params.isppCalc) await this.embedPerformance(embed, useMapdata, allvals, totaldiff, ppComputed); else await this.embedMap(embed, useMapdata, allvals, totaldiff, ppComputed, buttons);
    }
    async embedMap(embed: Discord.EmbedBuilder, useMapdata: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[], buttons:Discord.ActionRowBuilder) {
        const strains = await performance.calcStrains(
            {
                mapid: this.map.id,
                mode: useMapdata.mode_int as number as rosu.GameMode,
                mods: this.params.mapmods,
                mapLastUpdated: new Date(useMapdata.last_updated),
            });
        try {
            data.debug(strains, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');

        } catch (error) {
            data.debug({ error: error }, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
        }
        let mapgraph;
        if (strains) {
            const mapgraphInit =
                await other.graph(strains.strainTime, strains.value, 'Strains', {
                    startzero: true,
                    type: 'bar',
                    fill: true,
                    displayLegend: false,
                    title: 'Strains',
                    imgUrl: osuapi.other.beatmapImages(this.map.beatmapset_id).full,
                    blurImg: true,
                });
            this.ctn.files.push(mapgraphInit.path);
            mapgraph = mapgraphInit.filename;
        } else {
            mapgraph = null;
        }

        const exMapDetails = `${calculate.separateNum(useMapdata.playcount)} plays | ${calculate.separateNum(this.map.beatmapset.play_count)} mapset plays | ${calculate.separateNum(useMapdata.passcount)} passes | ${calculate.separateNum(this.map.beatmapset.favourite_count)} favourites\n` +
            `Submitted <t:${new Date(this.map.beatmapset.submitted_date).getTime() / 1000}:R> | Last updated <t:${new Date(this.map.beatmapset.last_updated).getTime() / 1000}:R>
        ${this.map.status == 'ranked' ?
                `Ranked <t:${Math.floor(new Date(this.map.beatmapset.ranked_date).getTime() / 1000)}:R>` : ''
            }${useMapdata.status == 'approved' || useMapdata.status == 'qualified' ?
                `Approved/Qualified <t: ${Math.floor(new Date(this.map.beatmapset.ranked_date).getTime() / 1000)}:R>` : ''
            }${useMapdata.status == 'loved' ?
                `Loved <t:${Math.floor(new Date(this.map.beatmapset.ranked_date).getTime() / 1000)}:R>` : ''
            }\n` +
            `${this.map.beatmapset.video ? '📺' : ''} ${this.map.beatmapset.storyboard ? '🎨' : ''}`;

        embed
            .setAuthor({
                name: `Mapped by ${this.map.beatmapset.creator}`,
                url: `https://osu.ppy.sh/users/${this.mapset.user_id}`,
                iconURL: `${this.mapset.user.avatar_url ?? helper.defaults.images.any.url}`,
            })
            .addFields([
                {
                    name: 'MAP VALUES',
                    value: this.mapstats(useMapdata, allvals, totaldiff),
                    inline: true
                },
                {
                    name: helper.defaults.invisbleChar,
                    value: `${helper.emojis.mapobjs.bpm}${useMapdata.bpm * (this.params.overrideSpeed ?? 1) != useMapdata.bpm ? `${useMapdata.bpm}=>${useMapdata.bpm * (this.params.overrideSpeed ?? 1)}` : useMapdata.bpm}\n` +
                        `${helper.emojis.mapobjs.circle}${useMapdata.count_circles} \n${helper.emojis.mapobjs.slider}${useMapdata.count_sliders} \n${helper.emojis.mapobjs.spinner}${useMapdata.count_spinners}\n` +
                        `${helper.emojis.mapobjs.total_length}${allvals.songLength != useMapdata.hit_length ? `${calculate.secondsToTime(useMapdata.hit_length)}=>${allvals.extra.lengthReadable}` : allvals.extra.lengthReadable}\n`,
                    inline: true
                },
                {
                    name: 'PP',
                    value:
                        `SS: ${ppComputed[0].pp?.toFixed(2)} \n ` +
                        `99: ${ppComputed[1].pp?.toFixed(2)} \n ` +
                        `98: ${ppComputed[2].pp?.toFixed(2)} \n ` +
                        `97: ${ppComputed[3].pp?.toFixed(2)} \n ` +
                        `96: ${ppComputed[4].pp?.toFixed(2)} \n ` +
                        `95: ${ppComputed[5].pp?.toFixed(2)} \n `
                    ,
                    inline: this.params.detailed != 2
                },
                {
                    name: 'DOWNLOAD',
                    value: `[osu!](https://osu.ppy.sh/b/${this.map.id}) | [Chimu](https://api.chimu.moe/v1/download${this.map.beatmapset_id}) | [Beatconnect](https://beatconnect.io/b/${this.map.beatmapset_id}) | [Kitsu](https://kitsu.io/d/${this.map.beatmapset_id})\n` +
                        `[MAP PREVIEW](https://jmir.xyz/osu/preview.html#${this.map.id})`,
                    inline: false
                }, // [osu!direct](osu://b/${this.map.id}) - discord doesn't support schemes other than http, https and discord
                {
                    name: 'MAP DETAILS',
                    value: `${this.statusEmoji(useMapdata)} | ${helper.emojis.gamemodes[useMapdata.mode]} | ${ppComputed[0].difficulty.maxCombo ?? this.map.max_combo}x combo \n ` +
                        `${this.params.detailed == 2 ?
                            exMapDetails
                            : ''}`

                    ,
                    inline: false
                }
            ]);

        if (this.map?.owners && !(this.map?.owners?.length == 1 && this.map?.owners?.[0].id == this.mapset.user_id)) {
            embed.setDescription("Guest difficulty by " + other.listItems(this.map.owners.map(x => `[${x.username}](https://osu.ppy.sh/u/${x.id})`)));
        }
        buttons
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.map.user_id}+${this.map.mode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        buttons.addComponents(
            new Discord.ButtonBuilder()
                .setCustomId(`${helper.versions.releaseDate}-Leaderboard-${this.name}-${this.commanduser.id}-${this.input.id}`)
                .setStyle(helper.buttons.type.current)
                .setEmoji(helper.buttons.label.extras.leaderboard)
        );

        if (mapgraph) {
            embed.setImage(`attachment://${mapgraph}.jpg`);
        }
        embed.setColor(formatters.difficultyColour(+totaldiff).dec);

        this.ctn.embeds = [embed];

        if (this.params.detailed == 2) {
            const failval = useMapdata.failtimes.fail;
            const exitval = useMapdata.failtimes.exit;
            const numofval = [];
            for (let i = 0; i < failval.length; i++) {
                numofval.push(`${i}s`);
            }
            const passInit = await other.graph(numofval, useMapdata.failtimes.fail, 'Fails', {
                stacked: true,
                type: 'bar',
                showAxisX: false,
                title: 'Fail times',
                imgUrl: osuapi.other.beatmapImages(this.map.beatmapset_id).full,
                blurImg: true,
            }, [{
                data: useMapdata.failtimes.exit,
                label: 'Exits',
                separateAxis: false,
            }]);
            this.ctn.files.push(passInit.path);

            const passurl = passInit.filename;
            const passEmbed = new Discord.EmbedBuilder()
                .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${useMapdata.mode}/${this.map.id}`)
                .setImage(`attachment://${passurl}.jpg`);
            this.ctn.embeds.push(passEmbed);
        }
    }
    async embedPerformance(embed: Discord.EmbedBuilder, useMapdata: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[]) {
        let extras = '';

        switch (useMapdata.mode) {
            case 'osu': {
                extras = `
---===SS===---  
\`Aim        ${ppComputed[0].ppAim?.toFixed(3)}\`
\`Speed      ${ppComputed[0].ppSpeed?.toFixed(3)}\`
\`Acc        ${ppComputed[0].ppAccuracy?.toFixed(3)}\`
${ppComputed[0].ppFlashlight > 0 ? `\`Flashlight ${ppComputed[0].ppFlashlight?.toFixed(3)}\`\n` : ''}\`Total      ${ppComputed[0].pp?.toFixed(3)}\`
---===97%===---
\`Aim        ${ppComputed[3].ppAim?.toFixed(3)}\`
\`Speed      ${ppComputed[3].ppSpeed?.toFixed(3)}\`
\`Acc        ${ppComputed[3].ppAccuracy?.toFixed(3)}\`
${ppComputed[0].ppFlashlight > 0 ? `\`Flashlight ${ppComputed[3].ppFlashlight?.toFixed(3)}\`\n` : ''}\`Total      ${ppComputed[3].pp?.toFixed(3)}\`
---===95%===---
\`Aim        ${ppComputed[5].ppAim?.toFixed(3)}\`
\`Speed      ${ppComputed[5].ppSpeed?.toFixed(3)}\`
\`Acc        ${ppComputed[5].ppAccuracy?.toFixed(3)}\`
${ppComputed[0].ppFlashlight > 0 ? `\`Flashlight ${ppComputed[5].ppFlashlight?.toFixed(3)}\`\n` : ''}\`Total      ${ppComputed[5].pp?.toFixed(3)}\`
---===93%===---
\`Aim        ${ppComputed[7].ppAim?.toFixed(3)}\`
\`Speed      ${ppComputed[7].ppSpeed?.toFixed(3)}\`
\`Acc        ${ppComputed[7].ppAccuracy?.toFixed(3)}\`
${ppComputed[0].ppFlashlight > 0 ? `\`Flashlight ${ppComputed[7].ppFlashlight?.toFixed(3)}\`\n` : ''}\`Total      ${ppComputed[7].pp?.toFixed(3)}\`
---===90%===---
\`Aim        ${ppComputed[10].ppAim?.toFixed(3)}\`
\`Speed      ${ppComputed[10].ppSpeed?.toFixed(3)}\`
\`Acc        ${ppComputed[10].ppAccuracy?.toFixed(3)}\`
${ppComputed[0].ppFlashlight > 0 ? `\`Flashlight ${ppComputed[10].ppFlashlight?.toFixed(3)}\`\n` : ''}\`Total      ${ppComputed[10].pp?.toFixed(3)}\`
`;
            }
                break;
            case 'taiko': {
                extras = `
---===SS===---  
- Strain: ${ppComputed[0].ppDifficulty}
- Acc: ${ppComputed[0].ppAccuracy}
- Total: ${ppComputed[0].pp} 
---===97%===---
- Strain: ${ppComputed[3].ppDifficulty}
- Acc: ${ppComputed[3].ppAccuracy}
- Total: ${ppComputed[3].pp} 
---===95%===---
- Strain: ${ppComputed[5].ppDifficulty}
- Acc: ${ppComputed[5].ppAccuracy}
- Total: ${ppComputed[5].pp} 
---===93%===---
- Strain: ${ppComputed[7].ppDifficulty}
- Acc: ${ppComputed[7].ppAccuracy}
- Total: ${ppComputed[7].pp} 
---===90%===---
- Strain: ${ppComputed[10].ppDifficulty}
- Acc: ${ppComputed[10].ppAccuracy}
- Total: ${ppComputed[10].pp}                 
`;
            }
                break;
            case 'fruits': {
                extras = `
---===SS===---  
- Strain: ${ppComputed[0].ppDifficulty}
- Total: ${ppComputed[0].pp} 
---===97%===---
- Strain: ${ppComputed[3].ppDifficulty}
- Total: ${ppComputed[3].pp} 
---===95%===---
- Strain: ${ppComputed[5].ppDifficulty}
- Total: ${ppComputed[5].pp} 
---===93%===---
- Strain: ${ppComputed[7].ppDifficulty}
- Total: ${ppComputed[7].pp} 
---===90%===---
- Strain: ${ppComputed[10].ppDifficulty}
- Total: ${ppComputed[10].pp}                 
`;
            }
                break;
            case 'mania': {
                extras = `
---===SS===---  
- Total: ${ppComputed[0].pp} 
---===97%===---
- Total: ${ppComputed[3].pp} 
---===95%===---
- Total: ${ppComputed[5].pp} 
---===93%===---
- Total: ${ppComputed[7].pp} 
---===90%===---
- Total: ${ppComputed[10].pp}                 
`;
            }
                break;
        }

        embed
            .addFields([
                {
                    name: 'MAP VALUES',
                    value:
                        this.mapstats(useMapdata, allvals, totaldiff).replaceAll('\n', ' ') + '\n' +
                        `${helper.emojis.mapobjs.bpm}${useMapdata.bpm * (this.params.overrideSpeed ?? 1) != useMapdata.bpm ? `${useMapdata.bpm}=>${useMapdata.bpm * (this.params.overrideSpeed ?? 1)}` : useMapdata.bpm} | ` +
                        `${helper.emojis.mapobjs.total_length}${allvals.songLength != useMapdata.hit_length ? `${allvals.extra.lengthReadable}(${calculate.secondsToTime(useMapdata.hit_length)})` : allvals.extra.lengthReadable} | ` +
                        `${ppComputed[0].difficulty.maxCombo ?? this.map.max_combo}x combo\n ` +
                        `${helper.emojis.mapobjs.circle}${useMapdata.count_circles} \n${helper.emojis.mapobjs.slider}${useMapdata.count_sliders} \n${helper.emojis.mapobjs.spinner}${useMapdata.count_spinners}\n`,
                    inline: false
                },
                {
                    name: 'PP',
                    value:
                        `\`SS:    \` ${ppComputed[0].pp?.toFixed(2)} \n ` +
                        `\`99%:   \` ${ppComputed[1].pp?.toFixed(2)} \n ` +
                        `\`98%:   \` ${ppComputed[2].pp?.toFixed(2)} \n ` +
                        `\`97%:   \` ${ppComputed[3].pp?.toFixed(2)} \n ` +
                        `\`96%:   \` ${ppComputed[4].pp?.toFixed(2)} \n ` +
                        `\`95%:   \` ${ppComputed[5].pp?.toFixed(2)} \n ` +
                        `\`94%:   \` ${ppComputed[6].pp?.toFixed(2)} \n ` +
                        `\`93%:   \` ${ppComputed[7].pp?.toFixed(2)} \n ` +
                        `\`92%:   \` ${ppComputed[8].pp?.toFixed(2)} \n ` +
                        `\`91%:   \` ${ppComputed[9].pp?.toFixed(2)} \n ` +
                        `\`90%:   \` ${ppComputed[10].pp?.toFixed(2)} \n ` +
                        `---===MODDED===---\n` +
                        `\`HD:    \` ${(await this.perf(['HD'], useMapdata)).pp?.toFixed(2)} \n ` +
                        `\`HR:    \` ${(await this.perf(['HR'], useMapdata)).pp?.toFixed(2)} \n ` +
                        `\`DT:    \` ${(await this.perf(['DT'], useMapdata)).pp?.toFixed(2)} \n ` +
                        `\`HDHR:  \` ${(await this.perf(['HD', 'HR'], useMapdata)).pp?.toFixed(2)} \n ` +
                        `\`HDDT:  \` ${(await this.perf(['HD', 'DT'], useMapdata)).pp?.toFixed(2)} \n ` +
                        `\`HDDTHR:\` ${(await this.perf(['HD', 'DT', 'HR'], useMapdata)).pp?.toFixed(2)} \n `
                    ,
                    inline: true
                },
                {
                    name: 'Full',
                    value: extras,
                    inline: true
                }
            ]);
    }
    mapstats(useMapdata: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string) {
        return `CS${allvals.cs != useMapdata.cs ? `${useMapdata.cs}=>${allvals.cs}` : allvals.cs}
AR${allvals.ar != useMapdata.ar ? `${useMapdata.ar}=>${allvals.ar}` : allvals.ar}OD${allvals.od != useMapdata.accuracy ? `${useMapdata.accuracy}=>${allvals.od}` : allvals.od}
HP${allvals.hp != useMapdata.drain ? `${useMapdata.drain}=>${allvals.hp}` : allvals.hp}
⭐${totaldiff}`;
    }
    statusEmoji(useMapdata: osuapi.types_v2.BeatmapExtended) {
        let statusimg = helper.emojis.rankedstatus.graveyard;
        switch (useMapdata.status) {
            case 'ranked':
                statusimg = helper.emojis.rankedstatus.ranked;
                break;
            case 'approved': case 'qualified':
                statusimg = helper.emojis.rankedstatus.approved;
                break;
            case 'loved':
                statusimg = helper.emojis.rankedstatus.loved;
                break;
        }
        return statusimg;
    }
}

type mapType = 'Ranked' | 'Loved' | 'Approved' | 'Qualified' | 'Pending' | 'WIP' | 'Graveyard';

export class RandomMap extends OsuCommand {
    declare protected params: {
        mapType: mapType;
        useRandomRanked: boolean;
    };
    constructor() {
        super();
        this.name = 'RandomMap';
        this.params = {
            mapType: null,
            useRandomRanked: false,
        };
    }
    async setParamsMsg() {
        if (this.input.args.includes('-leaderboard')) {
            this.params.useRandomRanked = true;
            this.input.args.splice(this.input.args.indexOf('-leaderboard'), 1);
        }
        if (this.input.args.includes('-lb')) {
            this.params.useRandomRanked = true;
            this.input.args.splice(this.input.args.indexOf('-lb'), 1);
        }
        const mapTypeRankedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapRanked, this.input.args, false, null, false, false);
        if (mapTypeRankedArgFinder.found) {
            this.params.mapType = 'Ranked';
            this.input.args = mapTypeRankedArgFinder.args;
        }
        const mapTypeLovedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapLove, this.input.args, false, null, false, false);
        if (mapTypeLovedArgFinder.found) {
            this.params.mapType = 'Loved';
            this.input.args = mapTypeLovedArgFinder.args;
        }
        const mapTypeApprovedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapApprove, this.input.args, false, null, false, false);
        if (mapTypeApprovedArgFinder.found) {
            this.params.mapType = 'Approved';
            this.input.args = mapTypeApprovedArgFinder.args;
        }
        const mapTypeQualifiedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapQualified, this.input.args, false, null, false, false);
        if (mapTypeQualifiedArgFinder.found) {
            this.params.mapType = 'Qualified';
            this.input.args = mapTypeQualifiedArgFinder.args;
        }
        const mapTypePendArgFinder = commandTools.matchArgMultiple(helper.argflags.mapPending, this.input.args, false, null, false, false);
        if (mapTypePendArgFinder.found) {
            this.params.mapType = 'Pending';
            this.input.args = mapTypePendArgFinder.args;
        }
        const mapTypeWipArgFinder = commandTools.matchArgMultiple(helper.argflags.mapWip, this.input.args, false, null, false, false);
        if (mapTypeWipArgFinder.found) {
            this.params.mapType = 'WIP';
            this.input.args = mapTypeWipArgFinder.args;
        }
        const mapTypeGraveyardArgFinder = commandTools.matchArgMultiple(helper.argflags.mapGraveyard, this.input.args, false, null, false, false);
        if (mapTypeGraveyardArgFinder.found) {
            this.params.mapType = 'Graveyard';
            this.input.args = mapTypeGraveyardArgFinder.args;
        }
    }
    async setParamsInteract() {
    }
    async setParamsBtn() {
    }
    async setParamsLink() {
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        let txt = '';

        if (this.params.useRandomRanked) {
            const arr: ('Ranked' | 'Loved' | 'Approved')[] = ['Ranked', 'Loved', 'Approved'];
            this.params.mapType = arr[Math.floor(Math.random() * arr.length)];
        }

        const randomMap = data.randomMap(this.params.mapType);
        if (randomMap.err != null) {
            txt = randomMap.err;
        } else {
            txt = `https://osu.ppy.sh/b/${randomMap.returnId}`;
        }
        const embed = new Discord.EmbedBuilder()
            .setTitle('Random map')
            .setDescription(txt);

        if (randomMap.err == null) {
            this.input.overrides = {
                id: randomMap.returnId,
                commanduser: this.commanduser,
                commandAs: this.input.type
            };

            const cmd = new Map();
            cmd.setInput(this.input);
            await cmd.execute();

            return;
        }

        this.ctn.embeds = [embed];

        this.send();
    }
}

export class RecommendMap extends OsuCommand {
    declare protected params: {
        searchid: string;
        user: string;
        maxRange: number;
        useType: 'closest' | 'random';
        mode: osuapi.types_v2.GameMode;
    };
    constructor() {
        super();
        this.name = 'RecommendMap';
        this.params = {
            searchid: null,
            user: null,
            maxRange: 1,
            useType: 'random',
            mode: null,
        };
    }
    async setParamsMsg() {
        const usetypeRandomArgFinder = commandTools.matchArgMultiple(helper.argflags.toFlag(['r', 'random', 'f2', 'rdm', 'range', 'diff']), this.input.args, true, 'number', false, false);
        if (usetypeRandomArgFinder.found) {
            this.params.maxRange = usetypeRandomArgFinder.output;
            this.params.useType = 'random';
            this.input.args = usetypeRandomArgFinder.args;
        }
        if (this.input.args.includes('-closest')) {
            this.params.useType = 'closest';
            this.input.args = this.input.args.splice(this.input.args.indexOf('-closest'), 1);

        }
        {
            const temp = await commandTools.parseArgsMode(this.input);
            this.input.args = temp.args;
            this.params.mode = temp.mode;
        }

        this.input.args = commandTools.cleanArgs(this.input.args);
        this.params.user = this.input.args.join(' ')?.replaceAll('"', '');
        if (!this.input.args[0] || this.input.args[0].includes(this.params.searchid)) {
            this.params.user = null;
        }
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.searchid = interaction?.member?.user.id ?? interaction?.user.id;

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        this.params.searchid = interaction?.member?.user.id ?? interaction?.user.id;
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        {
            const t = await this.validUser(this.params.user, this.params.searchid, this.params.mode);
            this.params.user = t.user;
            this.params.mode = t.mode;
        }

        if (this.params.maxRange < 0.5 || !this.params.maxRange) {
            this.params.maxRange = 0.5;
        }

        let osudata: osuapi.types_v2.User;

        try {
            const t = await this.getProfile(this.params.user, this.params.mode);
            osudata = t;
        } catch (e) {
            return;
        }

        const randomMap = data.recommendMap(+(osumodcalc.extra.recdiff(osudata.statistics.pp)).toFixed(2), this.params.useType, this.params.mode, this.params.maxRange ?? 1);
        const exTxt =
            this.params.useType == 'closest' ? '' :
                `Random map within ${this.params.maxRange}⭐ of ${(osumodcalc.extra.recdiff(osudata.statistics.pp))?.toFixed(2)}
    Pool of ${randomMap.poolSize}
    `;

        const embed = new Discord.EmbedBuilder();
        if (!isNaN(randomMap.mapid)) {
            this.input.overrides = {
                id: randomMap.mapid,
                commanduser: this.commanduser,
                commandAs: this.input.type,
                ex: exTxt
            };

            const cmd = new Map();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        } else {
            embed
                .setTitle('Error')
                .setDescription(`${randomMap.err}`);
        }

        this.ctn.embeds = [embed];

        this.send();
    }
}

export class UserBeatmaps extends OsuCommand {
    declare protected params: {
        filter: helper.bottypes.ubmFilter;
        sort: helper.bottypes.ubmSort;
        reverse: boolean;
        user: string;
        searchid: string;
        page: number;
        parseMap: boolean;
        parseId: number;
        filterTitle: string;
        reachedMaxCount: boolean;
        mode: osuapi.types_v2.GameMode;
        detailed: number;
    };
    constructor() {
        super();
        this.name = 'UserBeatmaps';
        this.params = {
            filter: 'favourite',
            sort: 'dateadded',
            reverse: false,
            user: undefined,
            searchid: undefined,
            page: 1,
            parseMap: false,
            parseId: undefined,
            filterTitle: null,
            reachedMaxCount: false,
            mode: 'osu',
            detailed: 1,
        };
    }
    async setParamsMsg() {
        this.params.searchid = this.input.message.mentions.users.size > 0 ? this.input.message.mentions.users.first().id : this.input.message.author.id;
        const pageArgFinder = commandTools.matchArgMultiple(helper.argflags.pages, this.input.args, true, 'number', false, true);
        if (pageArgFinder.found) {
            this.params.page = pageArgFinder.output;
            this.input.args = pageArgFinder.args;
        }

        const detailArgFinder = commandTools.matchArgMultiple(helper.argflags.details, this.input.args, false, null, false, false);
        if (detailArgFinder.found) {
            this.params.detailed = 2;
            this.input.args = detailArgFinder.args;
        }
        const filterRankArgFinder = commandTools.matchArgMultiple(helper.argflags.mapRanked, this.input.args, false, null, false, false);
        if (filterRankArgFinder.found) {
            this.params.filter = 'ranked';
            this.input.args = filterRankArgFinder.args;
        }
        const filterFavouritesArgFinder = commandTools.matchArgMultiple(helper.argflags.mapFavourite, this.input.args, false, null, false, false);
        if (filterFavouritesArgFinder.found) {
            this.params.filter = 'favourite';
            this.input.args = filterFavouritesArgFinder.args;
        }
        const filterGraveyardArgFinder = commandTools.matchArgMultiple(helper.argflags.mapGraveyard, this.input.args, false, null, false, false);
        if (filterGraveyardArgFinder.found) {
            this.params.filter = 'graveyard';
            this.input.args = filterGraveyardArgFinder.args;
        }
        const filterLovedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapLove, this.input.args, false, null, false, false);
        if (filterLovedArgFinder.found) {
            this.params.filter = 'loved';
            this.input.args = filterLovedArgFinder.args;
        }
        const filterPendingArgFinder = commandTools.matchArgMultiple(helper.argflags.mapPending, this.input.args, false, null, false, false);
        if (filterPendingArgFinder.found) {
            this.params.filter = 'pending';
            this.input.args = filterPendingArgFinder.args;
        }
        const filterNominatedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapNominated, this.input.args, false, null, false, false);
        if (filterNominatedArgFinder.found) {
            this.params.filter = 'nominated';
            this.input.args = filterNominatedArgFinder.args;
        }
        const filterGuestArgFinder = commandTools.matchArgMultiple(helper.argflags.mapGuest, this.input.args, false, null, false, false);
        if (filterGuestArgFinder.found) {
            this.params.filter = 'guest';
            this.input.args = filterGuestArgFinder.args;
        }
        const filterMostPlayedArgFinder = commandTools.matchArgMultiple(helper.argflags.mapMostPlayed, this.input.args, false, null, false, false);
        if (filterMostPlayedArgFinder.found) {
            this.params.filter = 'most_played';
            this.input.args = filterMostPlayedArgFinder.args;
        }
        const reverseArgFinder = commandTools.matchArgMultiple(['-reverse', '-rev'], this.input.args, false, null, false, false);
        if (reverseArgFinder.found) {
            this.params.reverse = true;
            this.input.args = reverseArgFinder.args;
        }
        if (this.input.args.includes('-reverse')) {
            this.params.reverse = true;
            this.input.args.splice(this.input.args.indexOf('-reverse'), 1);
        }
        if (this.input.args.includes('-parse')) {
            this.params.parseMap = true;
            const temp = commandTools.parseArg(this.input.args, '-parse', 'number', 1, null, true);
            this.params.parseId = temp.value;
            this.input.args = temp.newArgs;
        }

        if (this.input.args.includes('-?')) {
            const temp = commandTools.parseArg(this.input.args, '-?', 'string', this.params.filterTitle, true);
            this.params.filterTitle = temp.value;
            this.input.args = temp.newArgs;
        }

        this.input.args = commandTools.cleanArgs(this.input.args);

        const usertemp = commandTools.fetchUser(this.input.args);
        this.input.args = usertemp.args;
        this.params.user = usertemp.id;
        if (!this.params.user || this.params.user.includes(this.params.searchid)) {
            this.params.user = null;
        }
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;

        this.params.searchid = this.commanduser.id;

        this.params.user = interaction.options.getString('user') ?? null;
        this.params.filter = (interaction.options.getString('type') ?? 'favourite') as helper.bottypes.ubmFilter;
        this.params.sort = (interaction.options.getString('sort') ?? 'dateadded') as helper.bottypes.ubmSort;
        this.params.reverse = interaction.options.getBoolean('reverse') ?? false;
        this.params.filterTitle = interaction.options.getString('filter');

        this.params.parseId = interaction.options.getInteger('parse');
        if (this.params.parseId != null) {
            this.params.parseMap = true;
        }

    }
    async setParamsBtn() {
        if (!this.input.message.embeds[0]) return;
        const interaction = (this.input.interaction as Discord.ButtonInteraction);
        const temp = commandTools.getButtonArgs(this.input.id);
        if (temp.error) {
            interaction.followUp({
                content: helper.errors.paramFileMissing,
                flags: Discord.MessageFlags.Ephemeral,
                allowedMentions: { repliedUser: false }
            });
            commandTools.disableAllButtons(this.input.message);
            return;
        }
        this.params.searchid = temp.searchid;
        this.params.user = temp.user;
        this.params.filter = temp.mapType;
        this.params.sort = temp.sortMap;
        this.params.reverse = temp.reverse;
        this.params.page = commandTools.buttonPage(temp.page, temp.maxPage, this.input.buttonType);
        this.params.parseMap = temp.parse;
        this.params.parseId = temp.parseId;
        this.params.filterTitle = temp.filterTitle;
        // mode = temp.mode;
        this.params.detailed = commandTools.buttonDetail(temp.detailed, this.input.buttonType);

    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        if (this.input.overrides.page) {
            this.params.page = this.input.overrides.page;
        }
        if (this.input.overrides.ex) {
            switch (this.input.overrides.ex) {
                case 'ranked':
                    this.params.filter = 'ranked';
                    break;
                case 'favourite':
                    this.params.filter = 'favourite';
                    break;
                case 'graveyard':
                    this.params.filter = 'graveyard';
                    break;
                case 'loved':
                    this.params.filter = 'loved';
                    break;
                case 'pending':
                    this.params.filter = 'pending';
                    break;
                case 'nominated':
                    this.params.filter = 'nominated';
                    break;
                case 'guest':
                    this.params.filter = 'guest';
                    break;
                case 'most_played':
                    this.params.filter = 'most_played';
                    break;
            }
        }
    }
    async execute() {
        await this.setParams();
        this.logInput();
        // do stuff

        if (this.params.page < 2 || typeof this.params.page != 'number' || isNaN(this.params.page)) {
            this.params.page = 1;
        }

        {
            const t = await this.validUser(this.params.user, this.params.searchid, this.params.mode);
            this.params.user = t.user;
        }
        if (this.input.type == 'interaction') {
            this.ctn.content = 'Loading...';
            this.send();
            this.voidcontent();
            this.ctn.edit = true;
        }

        try {
            const u = await this.getProfile(this.params.user, this.params.mode);
            this.osudata = u;
        } catch (e) {
            return;
        }

        const pgbuttons: Discord.ActionRowBuilder = await commandTools.pageButtons(this.name, this.commanduser, this.input.id);
        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.osudata.id}+${this.osudata.playmode}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        let maplistdata: (osuapi.types_v2.Beatmapset[] | osuapi.types_v2.BeatmapPlaycount[]) = [];

        async function getScoreCount(cinitnum: number, input: helper.bottypes.commandInput, args, osudata) {
            if (cinitnum >= 499) {
                args.reachedMaxCount = true;
                return;
            }
            const fd =
                args.filter == 'most_played' ?
                    await osuapi.v2.users.mostPlayed({
                        user_id: osudata.id,
                        offset: cinitnum
                    })
                    :
                    await osuapi.v2.users.beatmaps({
                        user_id: osudata.id,
                        type: args.filter,
                        offset: cinitnum
                    });
            if (fd?.hasOwnProperty('error')) {
                await commandTools.errorAndAbort(input, this.name, true, helper.errors.uErr.osu.map.group_nf.replace('[TYPE]', args.filter), true);
                return;
            }
            for (let i = 0; i < fd.length; i++) {
                if (!fd[i] || typeof fd[i] == 'undefined') { break; }
                //@ts-expect-error Beatmapset missing properties from BeatmapPlaycount
                maplistdata.push(fd[i]);
            }
            if (fd.length == 100 && args.filter != 'most_played') {
                return await getScoreCount(cinitnum + 100, input, args, osudata);
            }
            return args;
        }
        if (data.findFile(this.osudata.id, 'maplistdata', null, this.params.filter) &&
            !('error' in data.findFile(this.osudata.id, 'maplistdata', null, this.params.filter)) &&
            this.input.buttonType != 'Refresh'
        ) {
            maplistdata = data.findFile(this.osudata.id, 'maplistdata', null, this.params.filter);
        } else {
            this.params = await getScoreCount(0, this.input, this.params, this.osudata);
        }

        data.debug(maplistdata, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'mapListData');
        data.storeFile(maplistdata, this.osudata.id, 'maplistdata', null, this.params.filter);

        if (this.params.parseMap) {
            if (this.params.filterTitle) {
                switch (this.params.filter) {
                    case 'most_played':
                        maplistdata = formatters.filterMapPlays(maplistdata as osuapi.types_v2.BeatmapPlaycount[],
                            this.params.sort as any, {
                            title: this.params.filterTitle
                        }, this.params.reverse);
                        break;
                    default:
                        maplistdata = formatters.filterMaps(maplistdata as osuapi.types_v2.BeatmapsetExtended[],
                            this.params.sort as any, {
                            title: this.params.filterTitle
                        }, this.params.reverse);
                        break;
                }

            }
            let pid = this.params.parseId - 1;
            if (pid < 0) {
                pid = 0;
            }
            if (pid > maplistdata.length) {
                pid = maplistdata.length - 1;
            }
            this.input.overrides = {
                id:
                    this.params.filter == 'most_played' ?
                        (maplistdata as osuapi.types_v2.BeatmapPlayCountArr)[pid]?.beatmap_id :
                        (maplistdata as osuapi.types_v2.Beatmapset[])[pid]?.beatmaps[0]?.id,
                commanduser: this.commanduser,
                commandAs: this.input.type
            };
            if (this.input.overrides.id == null) {
                await commandTools.errorAndAbort(this.input, this.name, true, helper.errors.uErr.osu.map.m_uk + `at index ${pid}`, true);
                return;
            }
            this.input.type = 'other';
            const cmd = new Map();
            cmd.setInput(this.input);
            await cmd.execute();
            return;
        }
        if (this.params.page >= Math.ceil(maplistdata.length / 5)) {
            this.params.page = Math.ceil(maplistdata.length / 5) - 1;
        }
        let mapsarg: {
            text: string;
            curPage: number;
            maxPage: number;
        };

        switch (this.params.filter) {
            case 'most_played':
                mapsarg = formatters.mapPlaysList(maplistdata as osuapi.types_v2.BeatmapPlayCountArr,
                    this.params.sort as any, {
                    title: this.params.filterTitle
                },
                    this.params.reverse, this.params.page);
                break;
            default:
                mapsarg = formatters.mapList(maplistdata as osuapi.types_v2.BeatmapsetExtended[],
                    this.params.sort as any, {
                    title: this.params.filterTitle
                },
                    this.params.reverse, this.params.page);
                break;
        }

        commandTools.storeButtonArgs(this.input.id, {
            searchid: this.params.searchid,
            user: this.params.user,
            mapType: this.params.filter,
            sortMap: this.params.sort,
            reverse: this.params.reverse,
            page: this.params.page,
            maxPage: mapsarg.maxPage,
            parse: this.params.parseMap,
            parseId: this.params.parseId,
            filterTitle: this.params.filterTitle,
            detailed: this.params.detailed
        });
        const mapList = new Discord.EmbedBuilder()
            .setFooter({
                text: `${mapsarg.curPage}/${mapsarg.maxPage}`
            })
            .setTitle(`${this.osudata.username}'s ${formatters.toCapital(this.params.filter)} Maps`)
            .setThumbnail(`${this.osudata?.avatar_url ?? helper.defaults.images.any.url}`)
            .setURL(`https://osu.ppy.sh/users/${this.osudata.id}/${this.osudata.playmode}#beatmaps`)
            .setColor(helper.colours.embedColour.userlist.dec)
            .setDescription(this.params.reachedMaxCount ? 'Only the first 500 mapsets are shown\n\n' : '\n\n' + mapsarg.text);
        formatters.userAuthor(this.osudata, mapList);

        if (mapsarg.text.length == 0) {
            mapList.setDescription('No mapsets found');
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[2].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }
        if (mapsarg.curPage <= 1) {
            (pgbuttons.components as Discord.ButtonBuilder[])[0].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[1].setDisabled(true);
        }
        if (mapsarg.curPage >= mapsarg.maxPage) {
            (pgbuttons.components as Discord.ButtonBuilder[])[3].setDisabled(true);
            (pgbuttons.components as Discord.ButtonBuilder[])[4].setDisabled(true);
        }

        this.ctn.embeds = [mapList];
        this.ctn.components = [pgbuttons, buttons];

        this.send();
    }
    osudata: osuapi.types_v2.UserExtended;
}