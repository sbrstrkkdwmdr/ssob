import Discord from 'discord.js';
import * as osumodcalc from 'osumodcalculator';
import * as rosu from 'rosu-pp-js';
import * as helper from '../../helper';
import * as calculate from '../../tools/calculate';
import * as commandTools from '../../tools/commands';
import * as data from '../../tools/data';
import * as formatters from '../../tools/formatters';
import * as log from '../../tools/log';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import * as performance from '../../tools/performance';
import { OsuCommand } from '../command';

export class MapParse extends OsuCommand {
    declare protected params: {
        mapid: number;
        mapmods: osumodcalc.types.Mod[];
        query: string;
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
        mode: osuapi.types_v2.GameMode;
    };
    #apiMods: osumodcalc.types.ApiMod[];
    constructor() {
        super();
        this.name = 'Map';
        this.params = {
            mapid: undefined,
            mapmods: [],
            query: null,
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
            mode: 'osu',
        };
    }
    async setParamsMsg() {
        this.params.detailed = this.setParam(this.params.detailed, helper.argflags.details, 'bool', { bool_setValue: 2 });
        this.params.showBg = this.setParam(this.params.showBg, ['-bg'], 'bool', {});

        this.params.overrideBpm = this.setParam(this.params.overrideBpm, ['-bpm'], 'number', {});
        this.params.overrideSpeed = this.setParam(this.params.overrideSpeed, ['-speed'], 'number', {});

        this.params.customCS = this.setParam(this.params.customCS, ['-cs'], 'number', {});
        this.params.customAR = this.setParam(this.params.customAR, ['-ar'], 'number', {});
        this.params.customOD = this.setParam(this.params.customOD, ['-od', '-accuracy'], 'number', {});
        this.params.customHP = this.setParam(this.params.customHP, ['-hp', '-drain', 'health'], 'number', {});

        this.params.query = this.setParam(this.params.query, ['-?'], 'string', { string_isMultiple: true });

        this.params.isppCalc = this.setParam(this.params.isppCalc, ['pp', 'calc', 'performance'], 'bool', {});

        this.setParamMode();

        const tmod = this.setParamMods();
        if (tmod) {
            this.#apiMods = tmod.apiMods;
            this.params.mapmods = tmod.mods;
        }

        const mapTemp = this.setParamMap();
        this.params.mapid = mapTemp.map;
        mapTemp.mode && !this.params.mode ? this.params.mode = mapTemp.mode : null;

        //get map id via mapset if not in the given URL
        await this.setParamMapGone(mapTemp);
    }
    async setParamsInteract() {
        const interaction = this.input.interaction as Discord.ChatInputCommandInteraction;
        this.params.mapid = interaction.options.getInteger('id');
        this.params.mapmods = osumodcalc.mod.fromString(interaction.options.getString('mods').toUpperCase());
        this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        this.params.detailed = interaction.options.getBoolean('detailed') ? 2 : 1;
        this.params.query = interaction.options.getString('query');
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
            throw new Error('Buttons disabled');
        }
        this.params.mapid = temp.mapId;
        this.params.mode = temp.mode;
        this.params.mapmods = temp.modsInclude;
        this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        this.params.overrideBpm = temp.overrideBpm;
        this.params.overrideSpeed = temp.overrideSpeed;
        this.params.isppCalc = temp.ppCalc;
        this.params.detailed = commandTools.buttonDetail(temp.detailed, this.input.buttonType);
    }
    async setParamsLink() {
        const messagenohttp = this.input.message.content.replace('https://', '').replace('http://', '').replace('www.', '');
        const tmod = this.setParamMods();
        if (tmod) {
            this.#apiMods = tmod.apiMods;
            this.params.mapmods = tmod.mods;
        }
        if (this.input.args[0] && this.input.args[0].startsWith('query')) {
            this.params.query = this.input.args[1];
        } else if (messagenohttp.includes('q=')) {
            this.params.query = this.setParamMapSearch().query;
        } else {
            const mapTemp = this.setParamMap();
            this.params.mapid = mapTemp.map;
            this.params.mode = mapTemp.mode ?? this.params.mode;
            if (!(mapTemp.map || mapTemp.set || this.map || this.mapset)) {
                await this.sendError(helper.errors.map.url);
            }
            //get map id via mapset if not in the given URL
            await this.setParamMapGone(mapTemp);
        }
    }
    async setParamMapGone(mapTemp: {
        set: number;
        map: number;
        mode: osuapi.types_v2.GameMode;
        modeInt: number;
    }) {
        if (!mapTemp.map && mapTemp.set) {
            this.params.mapid = this.mapset?.beatmaps[0]?.id;

            this.mapset = await this.getMapSet(mapTemp.set);
            if (!this.mapset?.beatmaps?.[0] || this.mapset?.beatmaps?.length == 0) {
                await this.sendError(helper.errors.map.setonly(mapTemp.set));
            }
            this.params.mapid = this.mapset.beatmaps[0].id;
        }
    }
    protected setParamMapSearch() {
        const webpatterns = [
            'osu.ppy.sh/beatmapsets?q={query}&{other}',
            'osu.ppy.sh/beatmapsets?q={query}',
        ];
        for (const pattern of webpatterns.slice()) {
            webpatterns.push('https://' + pattern);
        }
        const res: {
            query: string,
        } = {
            query: null,
        };
        for (const pattern of webpatterns) {
            let temp = this.argParser.getLink(pattern);
            if (temp) {
                res.query = temp.query ?? res.query;
                break;
            };
        }
        return res;
    }
    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('overwriteModal');
        this.setParamOverride('mapid', 'id', 'number');
        this.setParamOverride('commanduser');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        this.setParamOverride('content', 'ex');
        if (this.input.overrides?.filterMods != null) {
            this.params.mapmods = this.input.overrides.filterMods;
            this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
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
        this.init_buttons(buttons);
        if (this.checkNullParams()) {
            return;
        }

        const inputModalDiff = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-Select-map-${this.commanduser.id}-${this.input.id}-diff`)
            .setPlaceholder('Select a difficulty');
        const inputModalSearch = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${helper.versions.releaseDate}-Select-map-${this.commanduser.id}-${this.input.id}-search`)
            .setPlaceholder('Select a map');

        this.sendLoading();

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
                mode: this.params.mode
            }
        );
        this.send();
    }
    map: osuapi.types_v2.BeatmapExtended;
    mapset: osuapi.types_v2.BeatmapsetExtended;

    init_buttons(buttons: Discord.ActionRowBuilder) {
        if (this.params.isppCalc) {
            buttons.addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-${this.commanduser.id}-${this.input.id}-${this.params.mapid}${this.params.mapmods && this.params.mapmods.length > 0 ? '+' + this.params.mapmods.join(',') : ''}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.map)
            );
        } else if (this.params.detailed == 2) {
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
    protected checkNullParams() {
        if (!this.params.mapid && !this.params.query) {
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
            this.params.mode = temp.mode;
        }
        if (this.params.mapid == 0 && !this.params.query) {
            commandTools.missingPrevID_map(this.input, 'map');
            return true;
        }
        return false;
    }
    protected async checkQueryType(inputModalSearch: Discord.StringSelectMenuBuilder) {
        if (this.params.query == null) {
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
        else if (this.params.query != null) {
            const mapidtest = await osuapi.v2.beatmaps.search({ query: this.params.query });
            data.debug(mapidtest, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'mapIdTestData');
            data.storeFile(mapidtest, this.params.query.replace(/[\W_]+/g, '').replaceAll(' ', '_'), 'mapQuerydata');

            if (mapidtest?.hasOwnProperty('error')) {
                await this.sendError(helper.errors.map.search);
                return;
            }

            let usemapidpls: number;
            let mapidtest2: osuapi.types_v2.Beatmap[];

            if (mapidtest.beatmapsets.length == 0) {
                await this.sendError(helper.errors.map.search_nf(this.params.query));
                return;
            }
            try {
                let matchedId: number = null;
                // first check if any diff name matches the search
                for (let i = 0; i < mapidtest.beatmapsets[0].beatmaps.length; i++) {
                    if (this.params.query.includes(mapidtest.beatmapsets[0].beatmaps[i].version)) {
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
    protected setModalDifficulty(inputModalDiff: Discord.StringSelectMenuBuilder) {
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
    protected execute_bg() {
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
    protected async execute_map(buttons: Discord.ActionRowBuilder, inputModalDiff: Discord.StringSelectMenuBuilder, inputModalSearch: Discord.StringSelectMenuBuilder) {
        this.checkMapMods();

        //converts
        let [map] = this.converts();

        if (this.params.customCS == 'current' || isNaN(+this.params.customCS)) {
            this.params.customCS = map.cs ?? this.map.cs;
        }
        if (this.params.customAR == 'current' || isNaN(+this.params.customAR)) {
            this.params.customAR = map.ar ?? this.map.ar;
        }
        if (this.params.customOD == 'current' || isNaN(+this.params.customOD)) {
            this.params.customOD = map.accuracy ?? this.map.accuracy;
        }
        if (this.params.customHP == 'current' || isNaN(+this.params.customHP)) {
            this.params.customHP = map.drain ?? this.map.drain;
        }

        const allvals = osumodcalc.stats.modded({
            cs: this.params.customCS,
            ar: this.params.customAR,
            od: this.params.customOD,
            hp: this.params.customHP,
            bpm: this.params.overrideBpm ?? map.bpm ?? this.map.bpm,
            songLength: map.hit_length ?? this.map.hit_length
        }, this.params.mapmods,
            this?.params?.overrideSpeed ?? undefined
        );

        let ppComputed: rosu.PerformanceAttributes[];
        let ppissue: string;
        let totaldiff: string = map.difficulty_rating?.toFixed(2);
        try {
            ppComputed = await performance.calcMap({
                mods: this.params.mapmods,
                mode: map.mode_int as number as rosu.GameMode,
                mapid: map.id,
                clockRate: this.params.overrideSpeed,
                customCS: this.params.customCS,
                customAR: this.params.customAR,
                customOD: this.params.customOD,
                customHP: this.params.customHP,
                mapLastUpdated: new Date(map.last_updated)
            });
            ppissue = '';
            try {
                totaldiff = map.difficulty_rating.toFixed(2) != ppComputed[0].difficulty.stars?.toFixed(2) ?
                    `${map.difficulty_rating.toFixed(2)}=>${ppComputed[0].difficulty.stars?.toFixed(2)}` :
                    `${map.difficulty_rating.toFixed(2)}`;
            } catch (error) {
                totaldiff = map.difficulty_rating?.toFixed(2);
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
            const ppComputedTemp = performance.template(map);
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
            .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${map.mode}/${this.map.id}`)
            .setThumbnail(osuapi.other.beatmapImages(this.map.beatmapset_id).list2x)
            .setTitle(maptitle);
        embed.setColor(formatters.difficultyColour(+totaldiff).dec);
        await this.embedStart(map, allvals, totaldiff, ppComputed, buttons);

        commandTools.storeButtonArgs(this.input.id, {
            mapId: this.params.mapid,
            mode: this.params.mode,
            modsInclude: this.params.mapmods,
            overrideBpm: this.params.overrideBpm,
            overrideSpeed: this.params.overrideSpeed,
            ppCalc: this.params.isppCalc,
            detailed: this.params.detailed,
            filterTitle: this.params.query,
        });

        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: this.#apiMods,
                mode: this.params.mode
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
    protected checkMapMods() {
        if (this.params.mapmods == null) {
            this.params.mapmods = [];
            this.#apiMods = [];
        }
        else {
            this.params.mapmods = osumodcalc.mod.fix(this.params.mapmods, this.map.mode);
            this.#apiMods = this.params.mapmods.map(x => { return { acronym: x }; });
        }
    }
    protected converts(): [osuapi.types_v2.BeatmapExtended, boolean] {
        let map: osuapi.types_v2.BeatmapExtended = this.map;
        let successConvert: boolean = false;
        if (this.params.mode && this.params.mode != this.map.mode && this.params.mode != 'osu') {
            for (const beatmap of this.mapset.converts) {
                if (beatmap.mode == this.params.mode && beatmap.id == this.map.id) {
                    map = beatmap;
                    successConvert = true;
                    break;
                }
            }
        }
        return [map, successConvert];
    }
    protected convert;
    protected async perf(mods: osumodcalc.types.Mod[], map: osuapi.types_v2.BeatmapExtended) {
        return await performance.calcFullCombo({
            mapid: map.id,
            mods,
            mode: map.mode_int as number as rosu.GameMode,
            accuracy: 100,
            customCS: +this.params.customCS,
            customAR: +this.params.customAR,
            customOD: +this.params.customOD,
            customHP: +this.params.customHP,
            mapLastUpdated: new Date(map.last_updated)
        });
    }
    protected async embedStart(map: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[], buttons: Discord.ActionRowBuilder) {
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
            .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${map.mode}/${this.map.id}`)
            .setThumbnail(osuapi.other.beatmapImages(this.map.beatmapset_id).list2x)
            .setTitle(maptitle);
        embed.setColor(formatters.difficultyColour(+map.difficulty_rating).dec);
        if (this.params.isppCalc) await this.embedPerformance(embed, map, allvals, totaldiff, ppComputed); else await this.embedMap(embed, map, allvals, totaldiff, ppComputed, buttons);
    }
    protected async embedMap(embed: Discord.EmbedBuilder, map: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[], buttons: Discord.ActionRowBuilder) {
        let mapgraph = await this.strainsGraph(map);

        const exMapDetails = this.mapCounts(this.map.beatmapset, map) +
            this.mapTimes(this.map.beatmapset, map) +
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
                    value: this.mapstats(map, allvals, totaldiff),
                    inline: true
                },
                {
                    name: helper.defaults.invisbleChar,
                    value: `${helper.emojis.mapobjs.bpm}${map.bpm * (this.params.overrideSpeed ?? 1) != map.bpm ? `${map.bpm}=>${map.bpm * (this.params.overrideSpeed ?? 1)}` : map.bpm}\n` +
                        `${helper.emojis.mapobjs.circle}${map.count_circles} \n${helper.emojis.mapobjs.slider}${map.count_sliders} \n${helper.emojis.mapobjs.spinner}${map.count_spinners}\n` +
                        `${helper.emojis.mapobjs.total_length}${allvals.songLength != map.hit_length ? `${calculate.secondsToTime(map.hit_length)}=>${allvals.extra.lengthReadable}` : allvals.extra.lengthReadable}\n`,
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
                    value: `${this.statusEmoji(map)} | ${helper.emojis.gamemodes[map.mode]} | ${ppComputed[0].difficulty.maxCombo ?? this.map.max_combo}x combo \n ` +
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
            await this.failGraph(map);
        }
    }
    async strainsGraph(map: osuapi.types_v2.BeatmapExtended) {
        const strains = await performance.calcStrains(
            {
                mapid: this.map.id,
                mode: map.mode_int as number as rosu.GameMode,
                mods: this.params.mapmods,
                mapLastUpdated: new Date(map.last_updated),
            });
        try {
            data.debug(strains, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
        } catch (error) {
            data.debug({ error: error }, 'command', this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'strains');
        }
        let mapgraph: string;
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
        return mapgraph;
    }
    async failGraph(map: osuapi.types_v2.BeatmapExtended) {
        const failval = map.failtimes.fail;
        const exitval = map.failtimes.exit;
        const numofval = [];
        for (let i = 0; i < failval.length; i++) {
            numofval.push(`${i}s`);
        }
        const passInit = await other.graph(numofval, map.failtimes.fail, 'Fails', {
            stacked: true,
            type: 'bar',
            showAxisX: false,
            title: 'Fail times',
            imgUrl: osuapi.other.beatmapImages(this.map.beatmapset_id).full,
            blurImg: true,
        }, [{
            data: map.failtimes.exit,
            label: 'Exits',
            separateAxis: false,
        }]);
        this.ctn.files.push(passInit.path);

        const passurl = passInit.filename;
        const passEmbed = new Discord.EmbedBuilder()
            .setURL(`https://osu.ppy.sh/beatmapsets/${this.map.beatmapset_id}#${map.mode}/${this.map.id}`)
            .setImage(`attachment://${passurl}.jpg`);
        this.ctn.embeds.push(passEmbed);
    }
    mapCounts(mapset: osuapi.types_v2.BeatmapsetExtended, map: osuapi.types_v2.BeatmapExtended) {
        const plays = `${calculate.separateNum(map.playcount)} plays`;
        const passes = `${calculate.separateNum(map.passcount ?? 0)} passes`;
        const favourites = `${calculate.separateNum(mapset.favourite_count)} favourites`;
        return formatters.listLine(plays, passes, favourites);
    }
    mapTimes(mapset: osuapi.types_v2.BeatmapsetExtended, map: osuapi.types_v2.Beatmap) {
        const submit = `Submitted <t:${new Date(mapset.submitted_date).getTime() / 1000}:R>`;
        let last = `Last updated <t:${new Date(mapset.last_updated).getTime() / 1000}:R>`;
        const states = ['ranked', 'approved', 'qualified', 'loved'];
        if (states.includes(map.status)) {
            last = `${formatters.toCapital(map.status)} <t:${Math.floor(new Date(mapset.ranked_date).getTime() / 1000)}:R>`;
        }
        return formatters.listLine(submit, last);
    }
    protected async embedPerformance(embed: Discord.EmbedBuilder, map: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string, ppComputed: rosu.PerformanceAttributes[]) {
        let extras = '';

        switch (map.mode) {
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
                        this.mapstats(map, allvals, totaldiff).replaceAll('\n', ' ') + '\n' +
                        `${helper.emojis.mapobjs.bpm}${map.bpm * (this.params.overrideSpeed ?? 1) != map.bpm ? `${map.bpm}=>${map.bpm * (this.params.overrideSpeed ?? 1)}` : map.bpm} | ` +
                        `${helper.emojis.mapobjs.total_length}${allvals.songLength != map.hit_length ? `${allvals.extra.lengthReadable}(${calculate.secondsToTime(map.hit_length)})` : allvals.extra.lengthReadable} | ` +
                        `${ppComputed[0].difficulty.maxCombo ?? this.map.max_combo}x combo\n ` +
                        `${helper.emojis.mapobjs.circle}${map.count_circles} \n${helper.emojis.mapobjs.slider}${map.count_sliders} \n${helper.emojis.mapobjs.spinner}${map.count_spinners}\n`,
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
                        `\`HD:    \` ${(await this.perf(['HD'], map)).pp?.toFixed(2)} \n ` +
                        `\`HR:    \` ${(await this.perf(['HR'], map)).pp?.toFixed(2)} \n ` +
                        `\`DT:    \` ${(await this.perf(['DT'], map)).pp?.toFixed(2)} \n ` +
                        `\`HDHR:  \` ${(await this.perf(['HD', 'HR'], map)).pp?.toFixed(2)} \n ` +
                        `\`HDDT:  \` ${(await this.perf(['HD', 'DT'], map)).pp?.toFixed(2)} \n ` +
                        `\`HDDTHR:\` ${(await this.perf(['HD', 'DT', 'HR'], map)).pp?.toFixed(2)} \n `
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
    protected mapstats(map: osuapi.types_v2.BeatmapExtended, allvals, totaldiff: string) {
        return `CS${allvals.cs != map.cs ? `${map.cs}=>${allvals.cs}` : allvals.cs}
AR${allvals.ar != map.ar ? `${map.ar}=>${allvals.ar}` : allvals.ar}OD${allvals.od != map.accuracy ? `${map.accuracy}=>${allvals.od}` : allvals.od}
HP${allvals.hp != map.drain ? `${map.drain}=>${allvals.hp}` : allvals.hp}
⭐${totaldiff}`;
    }
    protected statusEmoji(map: osuapi.types_v2.BeatmapExtended) {
        let statusimg = helper.emojis.rankedstatus.graveyard;
        switch (map.status) {
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