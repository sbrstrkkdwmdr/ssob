// for api

export const placeholder = {};

export function beatmapImages(mapSetId: number) {
    return {
        //smaller res of full/raw
        thumbnail: `https://b.ppy.sh/thumb/${mapSetId}l.jpg`,
        thumbnailLarge: `https://b.ppy.sh/thumb/${mapSetId}l.jpg`,

        //full res of map bg
        full: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/fullsize.jpg`,
        raw: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/raw.jpg`,

        //same width but shorter height
        cover: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/cover.jpg`,
        cover2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/cover@2x.jpg`,

        //smaller ver of cover
        card: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/card.jpg`,
        card2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/card@2x.jpg`,

        //square
        list: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/list.jpg`,
        list2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/list@2x.jpg`,

        //shorter height ver of cover
        slimcover: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/slimcover.jpg`,
        slimcover2x: `https://assets.ppy.sh/beatmaps/${mapSetId}/covers/slimcover@2x.jpg`,

    };
}


export function userAvatar(id: string) {
    return `https://a.ppy.sh/` + id;
}

/**
 * beatmap .osu file
 */
export function mapFile(id:string) {
    return `https://osu.ppy.sh/osu/${id}`;
}