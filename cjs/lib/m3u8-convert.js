"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.m3u8Convert = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fe_utils_1 = require("@lzwme/fe-utils");
const console_log_colors_1 = require("console-log-colors");
const utils_1 = require("./utils");
const helper_1 = require("@lzwme/fe-utils/cjs/common/helper");
async function m3u8Convert(options, data) {
    let ffmpegSupport = (0, utils_1.isSupportFfmpeg)();
    let filepath = (0, node_path_1.resolve)(options.saveDir, options.filename);
    if (!ffmpegSupport)
        filepath = filepath.replace(/\.mp4$/, '.ts');
    if (!options.force && (0, node_fs_1.existsSync)(filepath))
        return filepath;
    utils_1.logger.info(`Starting ${ffmpegSupport ? 'convert to mp4' : 'merge into ts'} file:`, (0, console_log_colors_1.greenBright)(filepath));
    if (ffmpegSupport) {
        const inputFilePath = (0, node_path_1.resolve)(options.cacheDir, 'input.txt');
        let filesAllArr = data.map(d => (0, node_path_1.resolve)(d.tsOut)).filter(d => (0, node_fs_1.existsSync)(d));
        if (process.platform === 'win32')
            filesAllArr = filesAllArr.map(d => d.replaceAll('\\', '/'));
        await node_fs_1.promises.writeFile(inputFilePath, 'ffconcat version 1.0\nfile ' + filesAllArr.join('\nfile '));
        let headersString = '';
        if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                headersString += `-headers "${key}: ${value}" `;
            }
        }
        const cmd = `ffmpeg -y -f concat -safe 0 -i ${inputFilePath} -acodec copy -vcodec copy -bsf:a aac_adtstoasc ${headersString} "${filepath}"`;
        utils_1.logger.debug('[convert to mp4]cmd:', (0, console_log_colors_1.cyan)(cmd));
        const r = (0, fe_utils_1.execSync)(cmd);
        ffmpegSupport = !r.error;
        if (r.error)
            utils_1.logger.error('Conversion to mp4 failed. Please confirm that `ffmpeg` is installed!', r.stderr);
    }
    if (!ffmpegSupport) {
        filepath = filepath.replace(/\.mp4$/, '.ts');
        await node_fs_1.promises.writeFile(filepath, Buffer.concat(data.map(d => (0, node_fs_1.readFileSync)(d.tsOut))));
    }
    if (!(0, node_fs_1.existsSync)(filepath))
        return '';
    utils_1.logger.info(`File saved[${(0, console_log_colors_1.magentaBright)((0, helper_1.formatByteSize)((0, node_fs_1.statSync)(filepath).size))}]:`, (0, console_log_colors_1.greenBright)(filepath));
    return filepath;
}
exports.m3u8Convert = m3u8Convert;
