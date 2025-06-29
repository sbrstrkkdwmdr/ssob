import axios from 'axios';
import * as fs from 'fs';
import * as helper from '../helper';

export async function dlMap(mapid: number | string, curCall: number, lastUpdated: Date) {
    const mapFiles = fs.readdirSync(`${helper.path.main}/files/maps`);
    let isFound = false;
    let mapDir = '';
    if (!mapFiles.some(x => x == mapid + '.osu') || !fs.existsSync(`${helper.path.main}/files/maps/` + mapid + '.osu')) {
        const url = `https://osu.ppy.sh/osu/${mapid}`;
        const thispath = `${helper.path.main}/files/maps/${mapid}.osu`;
        mapDir = thispath;
        if (!fs.existsSync(thispath)) {
            fs.mkdirSync(`${helper.path.main}/files/maps/`, { recursive: true });
        }
        helper.log.stdout('DOWNLOAD MAP: ' + url);
        const res = await axios.get(url);
        fs.writeFileSync(thispath, res.data, 'utf-8');
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('w');
            }, 200);
        });
    } else {
        for (let i = 0; i < mapFiles.length; i++) {
            const curmap = mapFiles[i];
            if (curmap.includes(`${mapid}`)) {
                mapDir = `${helper.path.main}/files/maps/${curmap}`;
            }
        }
        isFound = true;
    }
    const fileStat = fs.statSync(mapDir);
    if (fileStat.size < 500) {
        await fs.unlinkSync(mapDir);
        if (!curCall) {
            curCall = 0;
        }
        if (curCall > 3) {
            throw new Error('Map file size is too small. Deleting file...');
        } else {
            return await dlMap(mapid, curCall + 1, lastUpdated);
        }
    }
    if (fileStat.birthtimeMs < lastUpdated.getTime() && isFound == true) {
        await fs.unlinkSync(mapDir);
        return await dlMap(mapid, curCall + 1, lastUpdated);
    }
    return mapDir;
}

// tenor

export async function getGif(find: string) {
    helper.log.stdout(`GIF: https://g.tenor.com/v2/search?q=${find}&key=REDACTED&limit=50`);
    if (helper.vars.config.tenorKey == 'INVALID_ID') {
        return {
            data: {
                error: "Invalid or missing tenor key",
                results: [],
            }
        };
    };
    const dataf = await axios.get(`https://g.tenor.com/v2/search?q=${find}&key=${helper.vars.config.tenorKey}&limit=50`).catch(err => {
        return {
            data: {
                error: err
            }
        };
    });
    return dataf;
}