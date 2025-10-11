import ejs from 'ejs';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import { readFileSync } from 'fs';
import path from 'path';
import * as helper from './helper';
import { Dict } from './types/tools';
import { cmds } from './vars/commandData';

type routeEntry = {
    file: string,
    title: string,
    addon: object,
};

export function begin() {
    console.log('Initialising Express...');
    const app = express();
    app.use(express.static('./static', { extensions: ['.html'] }));
    app.engine('.html', ejs.renderFile);
    app.use(expressLayouts);
    app.set('views', path.join(__dirname, 'views'),);
    app.set('view engine', 'ejs');

    app.get('/', (req, res, next) => {
        // console.log(req.params.page);
        // const dict: Dict<routeEntry> = {
        //     'commands': {
        //         file: 'commands', title: 'SSoB Command List', addon: {
        //             cmdlist: JSON.stringify(cmds)
        //         }
        //     },
        //     'changelog': { file: 'changelog', title: 'SSoB Changelog', addon: {} },
        //     'types': { file: 'types', title: 'Argument types', addon: {} },
        // };
        res.render('index', {
            layout: 'layout',
            title: 'Home',
        });
    });
    app.get('/changelog', (req, res, next) => {
        const doc = readFileSync(`${helper.path.main}/cache/changelog.md`, 'utf-8');
        res.render('changelog', {
            layout: 'layout',
            title: 'Changelog',
            content: doc
                .replaceAll('\n', '\\n')
                .replaceAll('\'', '\\\'')
                .replaceAll('\"', '\\\"')
                .replaceAll('\`', '\\\`')

            ,
        });
    });
    app.get('/commands', (req, res, next) => {
        res.render('commands', {
            layout: 'layout',
            title: 'Commands',
            cmds: JSON.stringify(cmds)
        });
    });
    app.get('/types', (req, res, next) => {
        res.render('types', {
            layout: 'layout',
            title: 'Types',
        });
    });

    // app.get('/{*any}', (err, req, res, next) => {
    //     res.status(404).send('Could not find resource');
    // });

    app.use(function (req, res) {
        res.status(404).send('Could not find resource');
    });

    app.listen(helper.vars.config.port, () => {
        console.log('Express started on port ' + helper.vars.config.port);
    });
}