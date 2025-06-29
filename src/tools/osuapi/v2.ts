import { credentials } from './helper';

export function login(clientId: string, clientSecret: string) {
    credentials.id = clientId;
    credentials.secret = clientSecret;
}

export * as types from './apitypes';
export * as beatmaps from './v2/beatmaps';
export * as rankings from './v2/rankings';
export * as scores from './v2/scores';
export * as users from './v2/users';
export * as wiki from './v2/wiki';

