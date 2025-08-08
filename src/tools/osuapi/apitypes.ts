import { Dict } from "./types";

export type Scope =
    'chat.read' | // read chat, requires user
    'chat.write' | // send message, requires user
    'chat.write_manage' | // join/leave channels, requires user
    'delegate' | // act as user, requires user
    'forum.write' | // create/edit forums, requires user
    'friends.read' | // read friend list, requires user
    'identify' | // read user profile data, requires user
    'public' | // read data, requires credentials only
    'lazer'; // lazer client only

export interface Beatmap {
    beatmapset_id: number,
    beatmapset?: Beatmapset,
    checksum?: string | null,
    difficulty_rating: number,
    failtimes: Failtimes;
    id: number,
    max_combo?: number,
    mode: GameMode,
    status: string,
    total_length: number,
    user_id: number,
    owners: BeatmapOwner[],
    version: string,
    last_updated?: Timestamp;
}

export interface BeatmapExtended extends Beatmap {
    accuracy: number,
    ar: number,
    beatmapset_id: number,
    beatmapset?: BeatmapsetExtended,
    bpm?: number | null,
    convert: boolean,
    count_circles: number,
    count_sliders: number,
    count_spinners: number,
    cs: number,
    deleted_at: Timestamp | null,
    drain: number,
    hit_length: number,
    is_scoreable: boolean,
    last_updated: Timestamp,
    mode_int: Ruleset,
    passcount: number,
    playcount: number,
    ranked: number,
    url: string,
}

export interface BeatmapOwner {
    id: number,
    username: string,
};

export interface BeatmapPack {
    author: string,
    date: Timestamp,
    name: string,
    no_diff_reduction: boolean,
    ruleset_id: number,
    tag: string,
    url: string,
    beatmapsets?: Beatmapset[],
    user_completion_data: {
        beatmapset_ids: number[],
        completed: boolean,
    };
};



//==============================================================================================================================================================================================

export interface BeatmapDifficultyAttributes {
    attributes: {
        aim_difficulty: number,
        approach_rate: number,
        flashlight_difficulty: number,
        max_combo: number,
        overall_difficulty: number,
        slider_factor: number,
        speed_difficulty: number,
        star_rating: number,
    } | {
        star_rating: number,
        max_combo: number,
        stamina_difficulty: number,
        rhythm_difficulty: number,
        colour_difficulty: number,
        approach_rate: number,
        great_hit_window: number,
    } | {
        star_rating: number,
        max_combo: number,
        approach_rate: number,
    } | {
        star_rating: number,
        max_combo: number,
        great_hit_window: number,
        score_multiplier: number,
    };
}

//==============================================================================================================================================================================================

export interface BeatmapPlaycount {
    beatmap_id: number,
    beatmap: Beatmap | null,
    beatmapset: Beatmapset | null,
    count: number,
}

//==============================================================================================================================================================================================

export interface Beatmapset {
    artist: string,
    artist_unicode: string,
    beatmaps?: Beatmap[],
    converts?: Beatmap[],
    covers: Covers,
    creator: string,
    current_user_attributes?: any,
    description?: {
        description: string,
    },
    discussions?: any,
    events?: any,
    favourite_count: number,
    genre?: {
        id: number,
        name: string,
    },
    has_favourited?: boolean,
    id: number,
    language?: {
        id: number,
        name: string,
    },
    nominations?: {
        current: number,
        required: number,
    },
    nsfw: boolean,
    play_count: number,
    preview_url: string,
    ratings?: number[],
    recent_favourites?: User[],
    related_users?: User[] | User,
    source: string,
    status: string,
    title: string,
    title_unicode: string,
    track_id: number,
    user: User,
    user_id: number,
    video: boolean,
}

//==============================================================================================================================================================================================

export interface BeatmapsetExtended extends Beatmapset {
    availability: {
        download_disabled: boolean,
        more_information?: string | null,
    };
    beatmaps?: BeatmapExtended[],
    bpm: number,
    can_be_hyped: boolean,
    converts?: BeatmapExtended[],
    creator: string,
    description?: {
        description: string,
    },
    discussion_locked: boolean,
    has_favourited: any,
    hype: {
        current: number,
        required: number,
    },
    is_scoreable: boolean,
    last_updated: Timestamp,
    legacy_thread_url?: string | null,
    nominations?: {
        current: number,
        required: number,
    },
    nominations_summary?: {
        current: number,
        required: number,
    };
    ranked: number,
    ranked_date?: Timestamp | null,
    ratings?: number[],
    source: string,
    storyboard: boolean,
    submitted_date?: Timestamp | null,
    tags: string,
}

export interface BeatmapsetSearch {
    beatmapsets?: BeatmapsetExtended[],
    cursor: Cursor,
    cursor_string: CursorString,
    total: number,
    error: any,
    search: any,
    recommended_difficulty: any,
}

//==============================================================================================================================================================================================

export interface BeatmapsetDiscussion {
    beatmap?: Beatmap | null,
    beatmap_id?: number | null,
    beatmapset?: Beatmapset | null,
    beatmapset_id: number,
    can_be_resolved: boolean,
    can_grant_kudosu: boolean,
    created_at: Timestamp,
    current_user_attributes: CurrentUserAttributes,
    deleted_at?: Timestamp | null,
    deleted_by_id?: number | null,
    id: number,
    kudosu_denied: boolean,
    last_post_at: Timestamp,
    message_type: MessageType,
    parent_id?: number | null,
    posts?: BeatmapsetDiscussionPost[] | null,
    resolved: boolean,
    starting_post?: BeatmapsetDiscussionPost | null,
    timestamp?: number | null,
    updated_at: Timestamp,
    user_id: number,
}

export interface BeatmapsetDiscussionPost {
    beatmapset_discussion_id: number,
    created_at: Timestamp,
    deleted_at?: Timestamp | null,
    deleted_by_id?: number | null,
    id: number,
    last_editor_id?: number | null,
    message: string,
    system: boolean,
    updated_at: Timestamp,
    user_id: number,
}

export interface BeatmapsetDiscussionVote {
    beatmapset_discussion_id: number,
    created_at: Timestamp,
    id: number,
    score: number,
    updated_at: Timestamp,
    user_id: number,
}

//==============================================================================================================================================================================================

/**
 * T is either Score or LegacyScore
 */
export interface BeatmapScores<T> {
    scores: T[],
    userScore: T | null,
}

//==============================================================================================================================================================================================

export interface BeatmapUserScore {
    position: number,
    score: Score,
}

//==============================================================================================================================================================================================

export interface Build {
    created_at: Timestamp,
    display_version: string,
    id: number,
    update_stream?: UpdateStream | null,
    users: number,
    version?: string | null,
    changelog_entries?: ChangelogEntry[],
    versions?: Versions;
}

//==============================================================================================================================================================================================

export interface ChangelogEntry {
    category: string,
    created_at?: Timestamp | null,
    github_pull_request_id?: number | null,
    github_url?: string,
    github_user?: GithubUser,
    id?: number | null,
    major: boolean,
    message?: string,
    message_html?: string,
    repository?: string | null,
    title?: string | null,
    type: string,
    url?: string | null,
}

//==============================================================================================================================================================================================

export interface ChatChannel {
    channel_id: number,
    current_user_attributes?: CurrentUserAttributes | null,
    name: string,
    description?: string | null,
    icon: string,
    type: 'PUBLIC' | 'PRIVATE' | 'MULTIPLAYER' | 'SPECTATOR' | 'TEMPORARY' | 'PM' | 'GROUP',
    last_read_id?: number | null,
    last_message_id?: number | null,
    recent_messages?: ChatMessage[] | null,
    moderated: boolean,
    users?: number[] | null,
}

//==============================================================================================================================================================================================

export interface ChatMessage {
    message_id: number,
    sender_id: number,
    channel_id: number,
    timestamp: Timestamp,
    content: string,
    is_action: boolean,
    sender: User;
}

//==============================================================================================================================================================================================

export interface Comment {
    commentable_id: number,
    commentable_type: string,
    created_at: Timestamp,
    deleted_at?: Timestamp | null,
    edited_at?: Timestamp | null,
    edited_by_id?: number | null,
    id: number,
    legacy_name?: string | null,
    message?: string | null,
    message_html?: string | null,
    parent_id?: number | null,
    pinned: boolean,
    replies_count: number,
    updated_at: Timestamp,
    user_id: number,
    votes_count: number,
}

export interface CommentBundle {
    commentable_meta: CommentableMeta,
    comments: Comment[],
    cursor: Cursor,
    has_more: boolean,
    has_more_id?: number | null,
    included_comments: Comment[],
    pinned_comments?: Comment[] | null,
    sort: string,
    top_level_count?: number | null,
    total?: number | null,
    user_follow: boolean;
    user_votes: number[],
    users: User[],
}

export type CommentSort = 'new' | 'old' | 'top';

export interface CommentableMeta {
    id: number,
    title: string,
    type: string,
    url: string,
}

export interface CurrentUserAttributes { }
/* {
    BeatmapsetDiscusionPermissions: {
        can_destroy: boolean,
        can_reopen: boolean,
        can_moderate_kudosu: boolean,
        can_resolve: boolean,
        vote_score: number,
    },
    ChatChannelUserAttributes: {
        can_message: boolean,
        can_message_error?: string,
        last_read_id: number,
    }
} */ //& Error

export type Cursor = CursorString; //& Error

export type CursorString = Dict; //{}

export interface Event {
    created_at: Timestamp,
    id: number,
    type: EventTypes,
}

export interface Forum {
    id: number;
    name: string;
    description: string;
    subforums?: Forum[];
}

export interface ForumPost {
    created_at: Timestamp,
    deleted_at?: Timestamp | null,
    edited_at?: Timestamp | null,
    edited_by_id?: number | null,
    forum_id: number,
    id: number,
    topic_id: number,
    user_id: number,
}

export interface ForumTopic {
    created_at: Timestamp,
    deleted_at?: Timestamp | null,
    first_post_id: number,
    forum_id: number,
    id: number,
    is_locked: boolean,
    last_post_id: number,
    poll?: Poll | null,
    post_count: number,
    title: string,
    type: 'normal' | 'sticky' | 'announcement',
    updated_at: Timestamp,
    user_id: number,
}

export type GameMode = ('osu' | 'taiko' | 'fruits' | 'mania');

// export type Ruleset = number;

export enum Ruleset {
    osu = 0,
    taiko = 1,
    fruits = 2,
    mania = 3
}

export interface GithubUser {
    display_name: string,
    github_url?: string | null,
    id?: number | null,
    osu_username?: string | null,
    user_id?: number | null,
    user_url?: string | null,
}

export interface Group {
    colour?: string | null,
    description?: Description;
    has_listing: boolean,
    has_playmodes: boolean,
    id: number,
    identifier: string,
    is_probationary: boolean,
    name: string,
    short_name: string;
}

export interface KudosuHistory {
    id: number,
    action: string,
    amount: number,
    model: string,
    created_at: Timestamp,
    giver?: Giver | null,
    post: Post,
}

export interface Match {
    id: number,
    start_time: Timestamp,
    end_time?: Timestamp,
    name: string,
}

export interface MatchEvent {
    id: number,
    timestamp: Timestamp,
    detail: {
        type: MatchEventType,
        text: string,
    };
    user_id?: number;
    game?: MatchGame;
}

export interface MatchGame {
    id: number,
    beatmap: Beatmap,
    beatmap_id: number,
    start_time: Timestamp,
    end_time?: Timestamp,
    mode: GameMode,
    mode_int: Ruleset,
    mods: string[],
    scores: Score[],
    scoring_type: ['accuracy', 'combo', 'score', 'scorev2'],
    team_type: ['head-to-head', 'tag-coop', 'tag-team-vs', 'team-vs'],
}

export interface MultiplayerScore {
    id: number,
    user_id: number,
    room_id: number,
    playlist_item_id: number,
    beatmap_id: number,
    rank: Rank,
    total_score: number,
    accuracy: number,
    max_combo: number,
    mods: Mod[],
    statistics: Statistics,
    passed: boolean,
    position?: number | null,
    scores_around?: MultiplayerScoresAround | null,
    user: User,
}

export interface MultiplayerScores {
    cursor: MultiplayerScoresCursor,
    params: object, //read https://osu.ppy.sh/docs/index.html?javascript#multiplayerscores for more info
    scores: MultiplayerScore[],
    total?: number | null,
    user_score?: MultiplayerScore,
}
//params:
//sort, limit, cursor[score_id],cursor[total_score]

export interface MultiplayerScoresAround {
    higher: MultiplayerScores,
    lower: MultiplayerScores,
}

export interface MultiplayerScoresCursor {
    score_id: number,
    total_score: number,
}

export type MultiplayerScoresSort = ('score_asc' | 'score_desc');

export interface NewsPost {
    author: string,
    edit_url: string,
    first_image?: string | null,
    id: number,
    published_at: Timestamp,
    slug: string,
    title: string,
    updated_at: Timestamp,
    content?: string,
    navigation?: Navigation,
    preview?: string,
}

export interface Notification {
    id: number,
    name: string,
    created_at: Timestamp,
    object_type: string,
    object_id: number,
    source_user_id?: number | null,
    is_read: boolean,
    details: NotificationEvent | object,
}

export type RankingType = ('charts' | 'country' | 'performance' | 'score');

export interface Rankings<T = UserStatistics | CountryStatistics> {
    beatmapsets?: Beatmapset[],
    cursor: Cursor,
    ranking: T[],
    spotlight?: SpotLight | null,
    total: number,
}

// not mentioned in API docs
export interface CountryStatistics {
    code: CountryCode,
    active_users: number,
    play_count: number,
    ranked_score: number,
    performance: number,
    country: Country;
}

// taken from https://github.com/cyperdark/osu-api-extended/blob/master/types/v2/rooms_list.ts
export interface Room {
    id: number,
    name: string,
    category: string,
    type: string,
    user_id: number,
    starts_at: string,
    ends_at: any,
    max_attempts: any,
    participant_count: number,
    channel_id: number,
    active: boolean,
    has_password: boolean,
    queue_mode: string,
    auto_skip: boolean,
    current_playlist_item: PlaylistItem,
    difficulty_range: {
        min: number,
        max: number,
    };
    host: User,
    playlist_item_stats: {
        count_active: number,
        count_total: number,
        ruleset_ids: number[],
    },
    recent_participants: User[],
}

export interface PlaylistItem {
    id: number,
    room_id: number,
    beatmap_id: number,
    ruleset_id: number,
    allowed_mods: Mod[],
    required_mods: Mod[],
    expired: boolean,
    owner_id: number,
    playlist_order: number,
    played_at: any,
    beatmap: Beatmap,
}

//==============================================================================================================================================================================================

export interface ScoreLegacy {
    accuracy: number,
    beatmap?: Beatmap,
    beatmapset?: Beatmapset,
    best_id: number,
    created_at: Timestamp,
    id: number,
    match?: any,
    max_combo: number,
    mode_int: Ruleset,
    mode: GameMode,
    mods: string[],
    passed: boolean,
    perfect: boolean,
    pp: number,
    preserve?: boolean,
    processed?: boolean,
    rank_country?: string | number,
    rank_global?: string | number,
    rank: Rank,
    replay: boolean,
    room_id?: number,
    ruleset_id?: Ruleset,
    score: number,
    scores_around?: MultiplayerScoresAround,
    statistics: Statistics,
    type?: string,
    user_id: number,
    current_user_attributes?: {
        pin: boolean,
    };
    user?: User,
    weight?: {
        percentage: number,
        pp: number,
    },
}

export interface Score {
    accuracy: number,
    beatmap_id?: number,
    beatmap?: Beatmap,
    beatmapset?: Beatmapset,
    best_id?: number,
    build_id?: number,
    classic_total_score: number,
    current_user_attributes?: {
        pin: boolean,
    };
    ended_at: Timestamp,
    has_replay: boolean,
    id: number,
    is_perfect_combo: boolean,
    legacy_perfect: boolean;
    legacy_score_id: number;
    legacy_total_score: number;
    max_combo: number,
    maximum_statistics: ScoreStatistics;
    mods: Mod[],
    passed: boolean,
    playlist_item_id: number,
    pp?: number,
    position?: number,
    preserve: boolean,
    processed: boolean,
    rank: Rank,
    rank_country?: string | number,
    rank_global?: string | number,
    room_id?: number,
    ruleset_id: number,
    scores_around?: MultiplayerScoresAround,
    started_at: Timestamp,
    statistics: ScoreStatistics;
    total_score: number;
    type: string,
    user_id: number,
    user?: User,
    weight?: {
        percentage: number,
        pp: number,
    },
};

//==============================================================================================================================================================================================

export interface SpotLight {
    end_date: Timestamp,
    id: number,
    mode_specific: boolean,
    participant_count?: number | null,
    name: string,
    start_date: Timestamp,
    type: string,
}

export interface SpotLights {
    spotlights: SpotLight[];
}

/**
 * iso 8601 date
 * ${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}+${hh}:${mm}
 * year-month-dayThour-minute-second+hour:minute
 * eg. 2019-09-05T06:31:20+00:00
*/
export type Timestamp = `${number}-${number}-${number}T${number}:${number}:${number}${'+' | '-'}${number}:${number}`; //& Error

export interface UpdateStream {
    display_name?: string | null,
    id: number,
    is_featured: boolean,
    name: string,
    latest_build?: Build | null,
    user_count?: number,
}

//==============================================================================================================================================================================================

export interface User {
    avatar_url: string,
    country_code: string,
    default_group: string,
    id: number,
    is_active: boolean,
    is_bot: boolean,
    is_deleted: boolean,
    is_online: boolean,
    is_supporter: boolean,
    pm_friends_only: boolean,
    profile_colour: string | null,
    username: string,
    account_history?: UserAccountHistory[],
    active_tournament?: ProfileBanner,
    badges?: UserBadge[],
    beatmap_playcounts_count?: number,
    blocks?: any,
    country?: Country,
    cover?: {
        custom_url: string,
        url: string,
        id: number,
    },
    kudosu?: {
        available: number,
        total: number,
    },
    favourite_beatmapset_count?: number,
    follower_count?: number,
    friends?: any,
    graveyard_beatmapset_count?: number,
    groups?: Group[],
    is_restricted?: boolean,
    last_visit?: Timestamp | null,
    loved_beatmapset_count?: number,
    monthly_playcounts?: UserMonthlyPlaycount[],
    page?: any,
    pending_beatmapset_count?: any,
    previous_usernames?: string[],
    rank_history?: any,
    rank_highest?: {
        rank: number,
        updated_at: Timestamp;
    };
    ranked_beatmapset_count?: number,
    replays_watched_counts?: any,
    scores_best_count?: number,
    scores_first_count?: number,
    scores_recent_count?: number,
    statistics?: UserStatistics,
    statstics_rulesets?: UserStatisticsRulesets,
    support_level?: any,
    unread_pm_count?: any,
    user_achievements?: {
        achieved_at: Timestamp,
        achievement_id: number;
    }[],
    user_preferences?: any,
}

//==============================================================================================================================================================================================

export interface UserExtended extends User {
    cover_url: string,
    discord?: string | null,
    has_supported: boolean,
    interests?: string | null,
    join_date: Timestamp,
    location?: string | null,
    max_blocks: number,
    max_friends: number,
    occupation?: string | null,
    playmode: GameMode,
    playstyle: string[],
    post_count: number,
    profile_order: ProfilePage[],
    title?: string | null,
    title_url?: string | null,
    twitter?: string | null,
    website?: string | null,
};

export interface ScoreArrALegacy {
    scores: ScoreLegacy[];
}

export interface ScoreArrA {
    scores: Score[];
}


export type BeatmapPlayCountArr = BeatmapPlaycount[];


//==============================================================================================================================================================================================

export interface UserGroup {
    playmodes: string[] | null,
}

export interface UserSilence {
    id: number,
    user_id: number,
}

export interface UserStatistics {
    grade_counts: {
        a: number,
        s: number,
        sh: number,
        ss: number,
        ssh: number;
    } /* | {
        a: number,
        s: number,
        sh: number,
        x: number,
        xh: number,
    } */,
    hit_accuracy: number,
    is_ranked: boolean,
    level: {
        current: number,
        progress: number,
    },
    maximum_combo: number,
    play_count: number,
    play_time: number,
    pp: number,
    country_rank?: number | null,
    global_rank: number | null,
    ranked_score: number,
    replays_watched_by_others: number,
    total_hits: number,
    total_score: number,
    user?: User,
}

export interface WikiPage {
    available_locales: string[],
    layout: string,
    locale: string,
    markdown: string,
    path: string,
    subtitle: string | null,
    tags: string,
    title: string,
}

//api shit

export interface Error {
    error?: string,
    authentication?: string,
};

export interface OAuth {
    access_token: string,
    expires_in: number,
    token_type: string,
}

//mini-types ???

//beatmap
interface Failtimes {
    exit: number[] | null,
    fail: number[] | null,
};
interface Covers {
    cover: string,
    'cover@2x': string,
    card: string,
    'card@2x': string,
    list: string,
    'list@2x': string,
    slimcover: string,
    'slimcover@2x': string,
};
type RankStatus = -2 | -1 | 0 | 1 | 2 | 3 | 4;
//graveyard, wip, pending, ranked, approved, qualified, loved

//BeatmapsetDiscussion
type MessageType = 'hype' | 'mapper_note' | 'praise' | 'problem' | 'review' | 'suggestion';

//Build
interface Versions {
    next?: Build,
    previous?: Build;
};

//Event

export interface Achievement {
    icon_url?: string,
    id: number,
    name?: string,
    grouping?: string,
    ordering?: number,
    slug: string,
    description?: string,
    mode?: GameMode,
    instructions: string;
};

export type EventType = EventAchievement |
    EventBeatmapPlaycount | EventBeatmapsetApprove | EventBeatmapsetDelete | EventBeatmapsetRevive | EventBeatmapsetUpdate | EventBeatmapsetUpload |
    EventRank | EventRankLost |
    EventUserSupportAgain | EventUserSupportFirst | EventUserSupportGift |
    EventUsernameChange;

export type EventTypes =
    'achievement' |
    'beatmapPlaycount' | 'beatmapsetApprove' | 'beatmapsetDelete' | 'beatmapsetRevive' | 'beatmapsetUpdate' | 'beatmapsetUpload' |
    'rank' | 'rankLost' |
    'userSupportAgain' | 'userSupportFirst' | 'userSupportGift' |
    'usernameChange';

export interface EventBeatmap extends Event {
    title: string,
    url: string;
}
export interface EventUser extends Event {
    username: string,
    url: string;
    previousUsername?: string | null,
}

export interface EventAchievement extends Event {
    achievement: Achievement,
    user: EventUser;
}
export interface EventBeatmapPlaycount extends Event {
    beatmap: EventBeatmap,
    count: number,
}
export interface EventBeatmapsetApprove extends Event {
    approval: string,
    beatmapset: EventBeatmap,
    user: EventUser;
}
export interface EventBeatmapsetDelete extends Event {
    beatmapset: EventBeatmap,
}
export interface EventBeatmapsetRevive extends Event {
    beatmapset: EventBeatmap,
    user: EventUser;
}
export interface EventBeatmapsetUpdate extends EventBeatmapsetRevive { }
export interface EventBeatmapsetUpload extends EventBeatmapsetRevive { }
export interface EventRank extends Event {
    scoreRank: string,
    rank: number,
    mode: GameMode,
    beatmap: EventBeatmap,
    user: EventUser;
}
export interface EventRankLost extends Event {
    mode: GameMode,
    beatmap: EventBeatmap,
    user: EventUser;
}
export interface EventUserSupportAgain extends Event {
    user: EventUser,
}
export interface EventUserSupportFirst extends Event {
    user: EventUser,
}
export interface EventUserSupportGift extends Event {
    user: EventUser,
}
export interface EventUsernameChange extends Event {
    user: EventUser,
}

//forum-topic
interface Poll {
    allow_vote_change: boolean,
    ended_at?: Timestamp | null,
    hide_incomplete_results: boolean,
    last_vote_at?: Timestamp | null,
    options: PollOption[],
    started_at: Timestamp,
    title: {
        bbcode: string,
        html: string,
    },
    total_votes_count: number,
};
interface PollOption {
    id: number,
    text: {
        bbcode: string,
        html: string,
    },
    vote_count?: number | null,
};
//Group
interface Description {
    html: string,
    markdown: string,
};

//Kudosu History
interface Giver {
    url: string,
    username: string,
};
interface Post {
    url?: string | null,
    title: string,
};

type MatchEventType = 'host-changed' |
    'match-created' |
    'match-disbanded' |
    'other' |
    'player-joined' |
    'player-kicked' |
    'player-left';

//scores
// https://github.com/ppy/osu-web/blob/master/database/mods.json
export interface Mod {
    name?: string,
    acronym: string;
    settings?: {
        retries?: number, // EZ
        speed_change?: number, // HT, DC, DT, NC
        adjust_pitch?: boolean, // HT, DT, WU, WD, AS
        restart?: boolean, // SD, PF, AC
        only_fade_approach_circles?: boolean, //HD
        follow_delay?: number, //FL
        size_multiplier?: number, //FL
        combo_based_size?: boolean, //FL
        minimum_accuracy?: number, //AC
        accuracy_judge_mode?: number, //AC
        seed?: number, //TP, RD
        metronome?: boolean,//TP
        circle_size?: number,//DA
        approach_rate?: number,//DA
        drain_rate?: number,//DA
        overall_difficulty?: number,//DA
        extended_limits?: boolean,//DA
        no_slider_head_accuracy?: boolean, //CL
        classic_note_lock?: boolean, //CL
        always_play_tail_sample?: boolean, //CL
        fade_hit_circle_early?: boolean, //CL
        classic_health?: boolean, //CL
        angle_sharpness?: number, //RD
        reflection?: string, //MR
        strength?: number; //WG
        start_scale?: number, //GR, DF
        initial_rate?: number; //WU, WD, AS
        final_rate?: number; //WU, WD
        spin_speed?: number, //BR
        direction?: string, //BR
        scale?: number, //AD
        style?: string, //AD
        inverse_muting?: boolean, //MU
        enable_metronome?: boolean, //MU
        mute_combo_count?: number, //MU
        affects_hit_sounds?: boolean, //MU
        hidden_combo_count?: number, //NS,
        attraction_strength?: number, //MG
        max_depth?: number, //DP
        show_approach_circles?: boolean, //DP
        max_size_combo_count?: number, //BM
        max_cursor_size?: number, //BM
    };
};
//'NM' | ''

export type Rank = 'XH' | 'X' | 'SH' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Statistics { //legacy score statistics
    count_100: number,
    count_300: number,
    count_50: number,
    count_geki: number,
    count_katu: number,
    count_miss: number;
};

export interface ScoreStatistics {
    perfect?: number, // geki/300+
    great: number, // 300
    good?: number, // katu/200
    ok?: number, // 100
    meh?: number, // 50
    miss?: number, // miss
    small_tick_miss?: number, // katu
    small_tick_hit?: number, // count 50
    legacy_combo_increase?: number, // max stats
};

//newspost
interface Navigation {
    newer?: NewsPost,
    older?: NewsPost,
};

//notification
type NotificationEvent =
    Notification_beatmapset_discussion_lock | Notification_beatmapset_discussion_post_new | Notification_beatmapset_discussion_unlock | Notification_beatmapset_disqualify | Notification_beatmapset_love | Notification_beatmapset_nominate | Notification_beatmapset_qualify | Notification_beatmapset_remove_from_loved
    | Notification_reset_nominations
    | Notification_channel_message | Notification_forum_topic_reply;

interface Notification_beatmapset_discussion_lock {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_discussion_post_new {
    title: string,
    cover_url: string,
    discussion_id: number,
    post_id: number,
    beatmap_id?: number | null,
    username: string,
};
interface Notification_beatmapset_discussion_unlock {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_disqualify {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_love {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_nominate {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_qualify {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_beatmapset_remove_from_loved {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_reset_nominations {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_channel_message {
    cover_url: string,
    title: string,
    username: string,
};
interface Notification_forum_topic_reply {
    cover_url: string,
    title: string,
    username?: string | null,
    post_id: number,
};


//user
interface UserAccountHistory {
    description: string | null,
    id: number,
    length: number,
    permanent: boolean,
    timestamp: Timestamp,
    type: 'note' | 'restriction' | 'silence',
};

interface ProfileBanner {
    id: number,
    tournament_id: number,
    image: string;
};

interface UserBadge {
    awarded_at: Timestamp,
    description: string,
    image_url: string,
    url: string,
};

interface UserMonthlyPlaycount {
    start_date: Timestamp,
    count: number,
}; //undocumented so this is all based off debug stuff

type UserStatisticsRulesets = any;/* {

} */

interface Country { code: CountryCode, name: string; };

type CountryCode = string;

type ProfilePage = 'me' | 'recent_activity' | 'beatmaps' | 'historical' | 'kudosu' | 'top_ranks' | 'medals';

export type ModAcronym =
    'EZ' | 'HD' | 'FI' | 'HT' | 'DT' | 'NC' | 'HR' | 'FL' | 'SD' | 'PF' | 'NF' | 'AT' | 'CN' | 'RX' | 'AP' | 'TP' | 'SO' | 'TD' | '1K' | '2K' | '3K' | '4K' | '5K' | '6K' | '7K' | '8K' | '9K' | 'CO' | 'RD' | 'MR' | 'SV2'
    | 'BM' | 'DP' | 'SY' | 'BU' | '10K' | 'HO' | 'CS' | 'IN' | 'SW' | 'NR' | 'AC' | 'DC' | 'BL' | 'ST' | 'DA' | 'CL' | 'AL' | 'SG' | 'TR' | 'WG' | 'SI' | 'GR' | 'DF' | 'WU' | 'WD' | 'TC' | 'BR' | 'AD' | 'MU' | 'NS' | 'MG' | 'RP' | 'AS' | 'FF' | 'FR';