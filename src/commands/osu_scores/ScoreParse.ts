import Discord from 'discord.js';
import * as helper from '../../helper';
import * as data from '../../tools/data';
import * as osuapi from '../../tools/osuapi';
import * as other from '../../tools/other';
import { ArgsParser } from '../command';
import { SingleScoreCommand } from './SingleScoreCommand';

export class ScoreParse extends SingleScoreCommand {

    declare protected params: {
        mode: osuapi.types_v2.GameMode;
        scoreid: number;
        nochoke: boolean;
        overrideAuthor: string;
    };
    constructor() {
        super();
        this.name = 'ScoreParse';
        this.type = 'default';
        this.params = {
            mode: null,
            scoreid: null,
            nochoke: false,
            overrideAuthor: null,
        };
    }
    async setParamsMsg() {
        this.params.mode = this.input.args[1] as osuapi.types_v2.GameMode;
        this.params.scoreid = +this.input.args[0];
        if (this.input.message.content.includes('osu.ppy.sh/scores/')) {
            this.input.args = this.input.message.content.split(' ');
            const temp = this.setParamScore();
            this.params.mode = temp.mode;
            this.params.scoreid = +temp.score;
        }
    }
    async setParamsLink() {
        this.input.args = this.input.message.content.split(' ');
        this.argParser = new ArgsParser(this.input.args);
        const temp = this.setParamScore();
        this.params.mode = temp.mode;
        this.params.scoreid = +temp.score;
    }

    getOverrides(): void {
        if (!this.input.overrides) return;
        this.setParamOverride('scoreid', 'id', 'number');
        this.setParamOverride('mode');
        this.setParamOverride('commanduser');
        this.setParamOverride('overrideAuthor', 'ex', 'string');
        if (this.input.overrides?.commandAs != null) {
            this.input.type = this.input.overrides.commandAs;
        }
        if (this.input.overrides?.type == 'nochoke') {
            this.params.nochoke = true;
        }
    }
    async execute() {
        await this.setParams();
        this.getOverrides();
        this.logInput();
        // do stuff

        if (!this.params.scoreid) {
            const temp = data.getPreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId);
            if (temp?.apiData?.best_id && typeof temp?.apiData?.best_id === 'number') {
                this.params.scoreid = temp?.apiData?.best_id;
            } else {
                await this.sendError(helper.errors.score.ms);
            }
        }

        await this.sendLoading();

        if (data.findFile(this.params.scoreid, 'scoredata') &&
            !('error' in data.findFile(this.params.scoreid, 'scoredata')) &&
            this.input.buttonType != 'Refresh'
        ) {
            this.score = data.findFile(this.params.scoreid, 'scoredata');
        } else {
            const hasMode = this.params.mode ? { mode: this.params.mode } : {};
            this.score = await osuapi.v2.scores.single({ id: this.params.scoreid, ...hasMode });
        }

        data.debug(this.score, this.name, this.input.message?.guildId ?? this.input.interaction?.guildId, 'scoreData');
        if (helper.errors.isErrorObject(this.score)) {
            await this.sendError(helper.errors.score.nd(this.params.scoreid));
        }
        data.storeFile(this.score, this.params.scoreid, 'scoredata', other.modeValidator(this.score.ruleset_id));

        const buttons = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-Map-${this.name}-any-${this.input.id}-${this.score?.beatmap?.id}${this.score.mods ? '+' + this.score.mods.map(x => x.acronym).join() : ''}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.map),
                new Discord.ButtonBuilder()
                    .setCustomId(`${helper.versions.releaseDate}-User-${this.name}-any-${this.input.id}-${this.score.user_id}`)
                    .setStyle(helper.buttons.type.current)
                    .setEmoji(helper.buttons.label.extras.user),
            );

        this.ctn.components = [buttons];

        try {
            this.score.rank.toUpperCase();
        } catch (error) {
            await this.sendError(helper.errors.score.wrong + ` - osu.ppy.sh/scores/${this.params.mode}/${this.params.scoreid}`);
        }
        if (data.findFile(this.score.beatmap.id, 'this.map') &&
            !('error' in data.findFile(this.score.beatmap.id, 'this.map')) &&
            this.input.buttonType != 'Refresh') {
            this.map = data.findFile(this.score.beatmap.id, 'this.map');
        } else {
            this.map = await osuapi.v2.beatmaps.map({ id: this.score?.beatmap?.id ?? this.score?.beatmap_id });
        }

        if (helper.errors.isErrorObject(this.map)) {
            await this.sendError(helper.errors.map.m(this.score.beatmap.id));
        }

        data.storeFile(this.map, this.score.beatmap.id, 'this.map');

        this.mapset = this.map.beatmapset;

        try {
            const u = await this.getProfile(this.score.user_id + '', other.modeValidator(this.score.ruleset_id));
            this.osudata = u;
        } catch (e) {
            return;
        }

        const e = await this.renderEmbed();
        const s = await this.getStrains(this.map, this.score);
        e.setImage(`attachment://${s}`);

        data.writePreviousId('score', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.score.id}`,
                apiData: this.score,
                mods: this.score.mods,
            });
        data.writePreviousId('map', this.input.message?.guildId ?? this.input.interaction?.guildId,
            {
                id: `${this.map.id}`,
                apiData: null,
                mods: this.score.mods,
            }
        );

        await this.send();
    }


}