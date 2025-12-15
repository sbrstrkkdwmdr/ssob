import * as canvas from 'canvas';
import * as chartjs from 'chart.js/auto';
import Discord from 'discord.js';
import fs from 'fs';
import { Jimp } from 'jimp';
import * as osuclasses from 'osu-classes';
import * as osuparsers from 'osu-parsers';
import * as rosu from 'rosu-pp-js';
import * as helper from '../helper';
import * as colourcalc from './colourcalc';
import * as log from './log';
import * as osuapi from './osuapi';

const WIDTH = 1500;
const HEIGHT = 500;

type graphInput = {
    x: number[] | string[];
    y: number[];
    label: string;
    other: {
        startzero?: boolean,
        fill?: boolean,
        displayLegend?: boolean,
        lineColour?: string,
        pointSize?: number;
        gradient?: boolean;
        type?: 'line' | 'bar';
        stacked?: boolean;
        title?: string;
        showAxisX?: boolean;
        showAxisY?: boolean;
        stacksSeparate?: boolean;
        reverse?: boolean;
        imgUrl?: string;
        blurImg?: boolean;
        barOutline?: true;
    };
    extra?: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }[];
};

const colours_hex = [
    '#FF7575',
    '#FFA775',
    '#FFF375',
    '#BCFF75',
    '#758CFF',
    '#D775FF',
];
const colours_rgb = [
    'rgb(255,117,117)',
    'rgb(255,167,117)',
    'rgb(255,243,117)',
    'rgb(118,255,117)',
    'rgb(117,140,255)',
    'rgb(215,117,255)',
];

type SimpleGraphBuilderInput = {
    x: x,
    y: number[],
    title?: string,
    displayGrid?: boolean,
    type: 'line' | 'bar',
};

type x = (string | number)[];

type FloatingSimpleGraphBuilderInput = {
    x: x,
    y: number[],
    title?: string,
    displayGrid?: boolean,
    isFlipped: boolean;
};

export class SimpleGraphBuilder {
    protected y: number[] = [];
    protected x: x = [];
    protected title: string = '';
    protected type: 'line' | 'bar' = 'line';
    protected displayGrid: boolean = false;
    constructor({ x, y, title, displayGrid, type }: SimpleGraphBuilderInput) {
        this.x = x;
        this.y = y;
        if (title != null) this.title = title;
        if (displayGrid != null) this.displayGrid = displayGrid;
        if (type != null) this.type = type;
    }
    protected canvas: canvas.Canvas;
    protected datasets;
    protected chart: chartjs.Chart;
    protected validateData() {
        if (this.y.length > 200) {
            this.dataMax();
        }
    }
    protected dataMax(limit = 200) {
        let x: x = [];
        let y: number[] = [];
        const div = this.y.length / 200;
        for (let i = 0; i < 200; i++) {
            const offset = Math.ceil(i * div);
            x.push(this.x[offset]);
            y.push(this.y[offset]);
        }
        this.x = x;
        this.y = y;
        const isNumbered = this.x.filter(x => typeof x == 'number');
        if (isNumbered.length > 0) {
            let temp: string[] = [];
            for (const value of this.x) {
                temp.push(value + '');
            }
            this.x = temp;
        }
    }
    protected formatData() {
        const dataset = {
            data: this.y,
            fill: true,
            borderColor: '#ffffff',
            backgroundColor: colours_rgb[4],
            borderWidth: 1,
            id: '1y',
        };
        this.datasets = [dataset];
    }
    protected canvasOptions() {
        return {
            legend: {
                display: false,
            },
            title: {
                display: Boolean(this.title),
                title: this.title,
            },
            scales: {
                x: {
                    grid: {
                        display: this.displayGrid,
                        drawOnChartArea: true,
                        drawTicks: false,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                y: {
                    grid: {
                        drawTicks: false,
                    }
                },
            }
        };
    }
    protected generateCanvas() {
        this.canvas = canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = this.canvas.getContext('2d');
        this.chart = new chartjs.Chart(ctx, {
            type: this.type,
            data: {
                labels: this.x,
                datasets: this.datasets,
            },
            options: this.canvasOptions()
        });
        return this.chart;
    }
    protected async toBuffer(mode = 0) {
        switch (mode) {
            case 0: default:
                return this.canvas.toBuffer();
                break;
            case 1:
                const chartbuffer = this.canvas.toBuffer();
                const asImage = new Jimp({
                    width: WIDTH,
                    height: HEIGHT,
                    color: '#000000'
                });
                const graph = await Jimp.read(chartbuffer);
                asImage.composite(graph, 0, 0);
                return await asImage.getBuffer('image/png');
        }
    }
    protected async toFile() {
        const filename = `${(new Date).getTime()}`;
        let curt = `${helper.path.main}/cache/graphs/${filename}.jpg`;
        try {
            const buffer = await this.toBuffer();
            fs.writeFileSync(curt, buffer);
        } catch (err) {
            log.stdout(err);
            curt = `${helper.path.precomp}/files/blank_graph.png`;
        }
        return {
            path: curt,
            filename
        };
    }
    /**
     * returns raw buffer of graph which can be later written to a file
     */
    public async executeToBuffer() {
        this.validateData();
        this.formatData();
        this.generateCanvas();
        return await this.toBuffer();
    }
    /**
     * returns filepath and name of graph
     */
    public async execute() {
        this.validateData();
        this.formatData();
        this.generateCanvas();
        return await this.toFile();
    }
}

export class FloatingSimpleGraphBuilder extends SimpleGraphBuilder {
    protected isFlipped: boolean = false;
    constructor({ x, y, title, displayGrid, isFlipped }: FloatingSimpleGraphBuilderInput) {
        super({ x, y, title, displayGrid, type: 'line' });
        this.isFlipped = isFlipped;
    }
    protected formatData() {
        const dataset = {
            data: this.y,
            fill: false,
            borderColor: '#ffffff',
            backgroundColor: colours_rgb[4],
            borderWidth: 1,
            id: '1y',
        };
        this.datasets = [dataset];
    }
    protected canvasOptions() {
        const opts = {
            legend: {
                display: false,
            },
            title: {
                display: Boolean(this.title),
                title: this.title,
            },
            scales: {
                x: {
                    grid: {
                        display: this.displayGrid,
                        drawOnChartArea: true,
                        drawTicks: false,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgb(128, 128, 128)'
                    },
                    grid: {
                        display: this.displayGrid,
                        drawOnChartArea: true,
                        drawTicks: false,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                yAxes: [
                    {
                        id: '1y',
                        type: 'linear',
                        position: 'left',
                        display: true,
                        ticks: {
                            reverse: this.isFlipped,
                            beginAtZero: false
                        },
                    }
                ]
            }
        };
        return opts;
    }
    protected generateCanvas() {
        this.canvas = canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = this.canvas.getContext('2d');
        this.chart = new chartjs.Chart(ctx, {
            type: this.type,
            data: {
                labels: this.x,
                datasets: this.datasets,
            },
            //@ts-expect-error something something line
            options: this.canvasOptions()
        });
        return this.chart;
    }
    protected async toBuffer(mode = 0) {
        switch (mode) {
            case 0: default:
                return this.canvas.toBuffer();
                break;
            case 1:
                const chartbuffer = this.canvas.toBuffer();
                const asImage = new Jimp({
                    width: WIDTH,
                    height: HEIGHT,
                    color: '#000000'
                });
                const graph = await Jimp.read(chartbuffer);
                asImage.composite(graph, 0, 0);
                return await asImage.getBuffer('image/png');
        }
    }
    protected async toFile() {
        let filename = `${(new Date).getTime()}`;
        let curt = `${helper.path.main}/cache/graphs/${filename}.jpg`;
        try {
            const buffer = await this.toBuffer();
            fs.writeFileSync(curt, buffer);
        } catch (err) {
            log.stdout(err);
            curt = `${helper.path.precomp}/files/blank_graph.png`;
            filename = 'blank_graph';
        }
        return {
            path: curt,
            filename
        };
    }
    /**
     * returns raw buffer of graph which can be later written to a file
     */
    public async executeToBuffer() {
        this.validateData();
        this.formatData();
        this.generateCanvas();
        return await this.toBuffer();
    }
    /**
     * returns filepath and name of graph
     */
    public async execute() {
        this.validateData();
        this.formatData();
        this.generateCanvas();
        return await this.toFile();
    }
}

/**
 * times formatted as yyyy-mm-ddThh:mm
 */
export function timeForGraph(times: string[]) {
    const reformattedTimes: string[] = [];
    for (const time of times) {
        if (time.includes('T')) {
            if (time.includes('00:00')) {
                reformattedTimes.push(time.split('T')[0]);

            } else {
                reformattedTimes.push(time.split('T')[1]);
            }
        } else {
            reformattedTimes.push(time);
        }
    }
    return reformattedTimes;
}

/**
 * 
 * @param x 
 * @param y 
 * @param label name of graph
 * @param lineColour colour of graph line written as rgb(x, y, z)
 * @returns path to the graph
 */
export function graph({ x, y, label, other, extra = [] }: graphInput) {
    const builder = new OldGraphBuilder({ x, y, label, other, extra });
    return builder.execute();
}

// adapted from https://stackoverflow.com/a/75305539
function customCanvasBgImage(canvas) {
    return {
        id: 'customCanvasBackgroundImage',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };
}

// might re-write at some point
export class OldGraphBuilder {
    x: string[];
    y: number[];
    label: string;
    other: {
        startzero?: boolean,
        fill?: boolean,
        displayLegend?: boolean,
        lineColour?: string,
        pointSize?: number;
        gradient?: boolean;
        type?: 'line' | 'bar';
        stacked?: boolean;
        title?: string;
        showAxisX?: boolean;
        showAxisY?: boolean;
        stacksSeparate?: boolean;
        reverse?: boolean;
        imgUrl?: string;
        blurImg?: boolean;
        barOutline?: true;
    };
    extra?: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }[];
    highlightPoints?: number[];
    constructor({ x, y, label, other, extra = [] }: graphInput) {
        this.x = x.map((foo: string | number) => typeof foo == 'string' ? foo : foo + '');
        this.y = y;
        this.label = label;
        this.other = other;
        this.extra = extra;
    };
    checkSettings() {
        if (this.other.startzero == null || typeof this.other.startzero == 'undefined') {
            this.other.startzero = true;
        }
        if (this.other.fill == null || typeof this.other.fill == 'undefined') {
            this.other.fill = false;
        }
        if (this.other.displayLegend == null || this.other.displayLegend == undefined || typeof this.other.displayLegend == 'undefined') {
            this.other.displayLegend = false;
        }
        if (this.other.type == null || this.other.type == undefined || typeof this.other.displayLegend == 'undefined') {
            this.other.type = 'line';
        }
    }
    checkData() {
        if (this.y.length > 200) {
            let curx: string[] = [];
            let cury: number[] = [];
            const div = this.y.length / 200;
            for (let i = 0; i < 200; i++) {
                const offset = Math.ceil(i * div);
                const curval = this.y[offset];
                const xval = this.x[offset];
                cury.push(curval);
                curx.push(xval);
            }
            this.x = curx;
            this.y = cury;
        }
        const isNumbered = this.x.filter(x => typeof x == 'number');
        if (isNumbered.length > 0) {
            let temp: string[] = [];
            for (const value of this.x) {
                temp.push(value + '');
            }
            this.x = temp;
        }
    }
    protected datasets: helper.tooltypes.dataset[];
    protected secondary = {
        axis: false,
        reverse: false,
    };
    primaryData() {
        this.datasets = [{
            label: this.label,
            data: this.y,
            fill: this.other.fill,
            borderColor: this.other.lineColour ?? 'rgb(101, 101, 135)',
            backgroundColor: 'rgba(188, 255, 117, 1)',
            borderWidth: 1,
            pointRadius: this.other.pointSize ?? 2,
            yAxisID: '1y'
        }];
        if (this.other?.stacked == true) {
            this.datasets[0]['stack'] = 'Stack 0';
        }
    }
    extraData() {
        if (!(this.extra == null || this.extra == undefined)) {
            const diff = 360 / Math.floor(this.extra.length);
            let i = 1;
            for (const newData of this.extra) {
                i = this.extraDataItem(newData, i, diff);
            }
        }
    }
    extraDataItem(data: {
        data: number[];
        label: string;
        separateAxis: boolean;
        customStack?: number;
        reverse?: boolean;
    }, index: number, diff: number) {
        if (data?.data?.length > 0) {
            const nHSV = colourcalc.rgbToHsv(101, 101, 135);
            const newclr = colourcalc.hsvToRgb(nHSV.h + (diff * index), nHSV.s, nHSV.v);
            const xData = {
                label: data.label,
                data: data.data,
                fill: this.other.fill,
                borderColor: this.other.lineColour ?? `rgb(${newclr})`,
                backgroundColor: 'rgba(188, 255, 117, 1)',
                borderWidth: 1,
                pointRadius: this.other.pointSize ?? 2,
                yAxisID: data.separateAxis ? '2y' : '1y'
            };
            if (data.reverse) this.secondary.reverse = true;
            if (this.other?.type == 'bar' && this.other?.stacked == true && this.other?.stacksSeparate == true) {
                data.customStack ?
                    xData['stack'] = `Stack ${data.customStack}` :
                    xData['stack'] = 'Stack 0';
            }
            this.datasets.push(xData);
            if (data.separateAxis) this.secondary.axis = true;
            return index++;
        }
        return index;
    }
    protected get defaultConfig_old() {
        return {
            legend: {
                display: this.other.displayLegend
            },
            title: {
                display: this.other?.title ? true : false,
                title: this.other?.title ?? 'No title'
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgb(128, 128, 128)'
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgb(128, 128, 128)'
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: 'rgb(64, 64, 64)'
                    }
                },
                xAxes: [
                    {
                        display: true,
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 10
                        },
                    }
                ],
                yAxes: [
                    {
                        id: '1y',
                        type: 'linear',
                        position: 'left',
                        display: true,
                        ticks: {
                            reverse: this.other.reverse,
                            beginAtZero: this.other.startzero
                        },
                    }, {
                        id: '2y',
                        type: 'linear',
                        position: 'right',
                        display: this.secondary.axis,
                        ticks: {
                            reverse: this.secondary.reverse,
                            beginAtZero: this.other.startzero
                        },
                    }
                ]
            },
        };
    }
    protected get config_old() {
        const cfgopts = this.defaultConfig_old;
        if (this.other?.type == 'bar') {
            cfgopts['elements'] = {
                backgroundColor: this.other.lineColour ?? 'rgb(101, 101, 135)',
                borderColor: this.other?.barOutline ? 'rgb(255, 255, 255)' : this.other.lineColour ?? 'rgb(101, 101, 135)',
                borderWidth: 2
            };
        }
        if (this.other?.type == 'bar' && this.other?.stacked == true) {
            for (const elem of cfgopts['scales']['xAxes']) {
                elem['stacked'] = this.other.stacked ?? false;
            }
            for (const elem of cfgopts['scales']['yAxes']) {
                elem['stacked'] = this.other.stacked ?? false;
            }
        }
        return cfgopts;
    }
    protected get xTicks() {
        return {
            color: 'rgb(128, 128, 128)',
            backdropColor: 'rgb(128, 128, 128)',
            callback: function (value, index, values) {
                // if (highlightPoints && highlightPoints.includes(index)) {
                //     this.backgroundColor = 'rgb(128, 128, 128)';
                // }
                // this.backgroundColor = 'rgb(255, 0, 0)';
                return '';
            }
        };
    }
    protected get xGrid() {
        return {
            display: true,
            drawOnChartArea: true,
            drawTicks: false,
            color: 'rgb(64, 64, 64)'
        };
    }
    protected get yTicksPrimary() {
        return {
            color: 'rgb(128, 128, 128)',
            // beginAtZero: other.startzero
        };
    }
    protected get yGrid() {
        return {
            display: true,
            drawOnChartArea: true,
            drawTicks: false,
            color: 'rgb(64, 64, 64)'
        };
    }
    protected get yPrimary() {
        return {
            position: 'left' as helper.tooltypes.graphPosition,
            reverse: this.other.reverse,
            beginAtZero: this.other.startzero,
            ticks: this.yTicksPrimary,
            grid: this.yGrid,
        };
    }
    protected get ySecondary() {
        return {
            position: 'right' as helper.tooltypes.graphPosition,
            display: this.secondary.axis,
            reverse: this.secondary.reverse,
            ticks: {
                // beginAtZero: other.startzero,
            },
        };
    }
    protected get scales() {
        return {
            x: {
                ticks: this.xTicks,
                grid: this.xGrid,
            },
            y: this.yPrimary,
            y1: this.ySecondary,
        };
    }
    canvas: canvas.Canvas;
    protected createChart() {
        this.canvas = canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = this.canvas.getContext("2d");
        const chart = new chartjs.Chart(ctx, {
            type: this.other?.type ?? 'line',
            data: {
                labels: this.x,
                datasets: this.datasets
            },
            options: {
                scales: this.scales
            },
            plugins: [{
                id: 'customImage',
                beforeDraw: (chart) => {
                    // console.log(chart.chartArea);
                }
            },
            customCanvasBgImage(canvas)
            ]
        });
        return chart;
    }
    async graphBuffer(mode = 0) {
        switch (mode) {
            case 0: default:
                return this.canvas.toBuffer();
                break;
            case 1:
                const chartbuffer = this.canvas.toBuffer();
                const asImage = new Jimp({
                    width: WIDTH,
                    height: HEIGHT,
                    color: '#000000'
                });
                const graph = await Jimp.read(chartbuffer);
                asImage.composite(graph, 0, 0);
                return await asImage.getBuffer('image/png');
        }
    }
    async writeToFile() {
        const filename = `${(new Date).getTime()}`;
        let curt = `${helper.path.main}/cache/graphs/${filename}.jpg`;
        try {
            const buffer = await this.graphBuffer();
            fs.writeFileSync(curt, buffer);
        } catch (err) {
            log.stdout(err);
            curt = `${helper.path.precomp}/files/blank_graph.png`;
        }
        return {
            path: curt,
            filename
        };
    }
    async execute() {
        this.checkSettings();
        this.checkData();
        this.primaryData();
        this.extraData();
        this.createChart();
        return await this.writeToFile();
    }
}