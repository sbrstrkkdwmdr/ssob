import * as fs from 'fs';
import { rimraf } from 'rimraf';

const paths = [
    'commands',
    'consts',
    'tests',
    'tools',
    'types',
    'vars',
    'views',
];

const files = [
    'app',
    'app_botonly',
    'app_webonly',
    'bot',
    'buttonHandler',
    'commandHandler',
    'commandHelper',
    'emoji_setup',
    'helper',
    'linkHandler',
    'loops',
    'main',
    'osutrack',
    'path',
    'setup',
    'slashCommands',
    'web',
];
async function removeAll() {
    if (fs.existsSync('./dist')) {
        for (const path of paths) {
            await rimraf(`./dist/src/` + path + '/').catch(e => console.log(e));
        }
        for (const file of files) {
            await rimraf(`./dist/src/` + file + '.js').catch(e => console.log(e));
            await rimraf(`./dist/src/` + file + '.js.map').catch(e => console.log(e));
        }
    }
}
removeAll();