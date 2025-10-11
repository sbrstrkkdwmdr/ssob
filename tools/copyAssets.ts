import shell from 'shelljs';

const outFolder = './dist/src/';

const folders = new Set([
    './src/views'
]);

folders.forEach((folder) => {
    shell.cp('-R', folder, outFolder);
});