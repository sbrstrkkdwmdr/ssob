import * as fs from 'fs';
import { rimraf } from 'rimraf';

const paths = [
    'commands',
    'consts',
    'tools',
    'types',
    'vars',
];

const files = [
    'buttonHandler',
    'commandHandler',
    'commandHelper',
    'helper',
    'linkHandler',
    'loops',
    'main',
    'osutrack',
    'path',
    'slashCommands'
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