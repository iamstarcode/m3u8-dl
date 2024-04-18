"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.m3u8Download = exports.preDownLoad = exports.workPoll = void 0;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const fe_utils_1 = require("@lzwme/fe-utils");
const helper_1 = require("@lzwme/fe-utils/cjs/common/helper");
const console_log_colors_1 = require("console-log-colors");
const utils_1 = require("./utils");
const worker_pool_1 = require("./worker_pool");
const parseM3u8_1 = require("./parseM3u8");
const m3u8_convert_1 = require("./m3u8-convert");
const local_play_1 = require("./local-play");
const cache = {
    m3u8Info: {},
    downloading: new Set(),
};
const tsDlFile = (0, node_path_1.resolve)(__dirname, './ts-download.js');
exports.workPoll = new worker_pool_1.WorkerPool(tsDlFile);
async function formatOptions(url, opts) {
    const options = {
        delCache: !opts.debug,
        saveDir: process.cwd(),
        showProgress: true,
        ...opts,
    };
    if (!url.startsWith('http')) {
        url = url.replace(/\$+/, '|').replace(/\|\|+/, '|');
        if (url.includes('|')) {
            const r = url.split('|');
            url = r[1];
            if (!options.filename)
                options.filename = r[0];
            else
                options.filename = `${options.filename.replace(/\.(ts|mp4)$/, '')}-${r[0]}`;
        }
    }
    const urlMd5 = (0, fe_utils_1.md5)(url, false);
    if (!options.threadNum || +options.threadNum <= 0)
        options.threadNum = Math.min((0, node_os_1.cpus)().length * 2, 8);
    if (!options.filename)
        options.filename = urlMd5;
    if (!options.filename.endsWith('.mp4'))
        options.filename += '.mp4';
    if (!options.cacheDir)
        options.cacheDir = `cache/${urlMd5}`;
    if (options.headers)
        utils_1.request.setHeaders(options.headers);
    if (options.debug) {
        utils_1.logger.updateOptions({ levelType: 'debug' });
        utils_1.logger.debug('[m3u8-DL]options', options, url);
    }
    return [url, options];
}
async function m3u8InfoParse(url, options = {}) {
    [url, options] = await formatOptions(url, options);
    const ext = (0, utils_1.isSupportFfmpeg)() ? '.mp4' : '.ts';
    let filepath = (0, node_path_1.resolve)(options.saveDir, options.filename);
    if (!filepath.endsWith(ext))
        filepath += ext;
    const result = { options, m3u8Info: null, filepath };
    if (cache.m3u8Info[url]) {
        Object.assign(result, cache.m3u8Info[url]);
        return result;
    }
    if (!options.force && (0, node_fs_1.existsSync)(filepath))
        return result;
    const m3u8Info = await (0, parseM3u8_1.parseM3U8)('', url, options.cacheDir).catch(e => utils_1.logger.error('[parseM3U8][failed]', e));
    if (m3u8Info && m3u8Info?.tsCount > 0)
        result.m3u8Info = m3u8Info;
    return result;
}
async function preDownLoad(url, options) {
    const result = await m3u8InfoParse(url, options);
    if (!result.m3u8Info)
        return;
    for (const info of result.m3u8Info.data) {
        if (!exports.workPoll.freeNum)
            return;
        if (!cache.downloading.has(info.uri)) {
            cache.downloading.add(info.uri);
            exports.workPoll.runTask({ info, options: JSON.parse(JSON.stringify(result.options)), crypto: result.m3u8Info.crypto }, () => {
                cache.downloading.delete(info.uri);
            });
        }
    }
}
exports.preDownLoad = preDownLoad;
async function m3u8Download(url, options = {}) {
    utils_1.logger.info('Starting download for', (0, console_log_colors_1.cyanBright)(url));
    const result = await m3u8InfoParse(url, options);
    options = result.options;
    if (!options.force && (0, node_fs_1.existsSync)(result.filepath) && !result.m3u8Info) {
        utils_1.logger.info('file already exist:', result.filepath);
        return result;
    }
    if (result.m3u8Info?.tsCount > 0) {
        let n = options.threadNum - exports.workPoll.numThreads;
        if (n > 0)
            while (n--)
                exports.workPoll.addNewWorker();
        const { m3u8Info } = result;
        const startTime = Date.now();
        const barrier = new fe_utils_1.Barrier();
        const playStart = Math.min(options.threadNum + 2, result.m3u8Info.tsCount);
        const stats = {
            /** 下载成功的 ts 数量 */
            tsSuccess: 0,
            /** 下载失败的 ts 数量 */
            tsFailed: 0,
            /** 下载完成的时长 */
            duration: 0,
        };
        const runTask = (data) => {
            for (const info of data) {
                exports.workPoll.runTask({ info, options: JSON.parse(JSON.stringify(options)), crypto: m3u8Info.crypto }, (err, res) => {
                    if (!res || err) {
                        if (err) {
                            console.log('\n');
                            utils_1.logger.error('[TS-DL][error]', info.index, err, res || '');
                        }
                        if (!info.success)
                            info.success = -1;
                        else
                            info.success--;
                        if (info.success > -3) {
                            utils_1.logger.info(`[retry][times: ${info.success}]`, info.index, info.uri);
                            setTimeout(() => runTask([info]), 1000);
                            return;
                        }
                    }
                    if (res?.success) {
                        info.tsSize = res.info.tsSize;
                        info.success = 1;
                        stats.tsSuccess++;
                        stats.duration += info.duration;
                    }
                    else {
                        stats.tsFailed++;
                    }
                    const finished = stats.tsFailed + stats.tsSuccess;
                    if (options.showProgress) {
                        const timeCost = Date.now() - startTime;
                        const downloadedSize = m3u8Info.data.reduce((a, b) => a + (b.tsSize || 0), 0);
                        const downloadedDuration = m3u8Info.data.reduce((a, b) => a + (b.tsSize ? b.duration : 0), 0);
                        const avgSpeed = (0, helper_1.formatByteSize)((downloadedSize / timeCost) * 1000);
                        const restTime = downloadedDuration ? (timeCost * (m3u8Info.durationSecond - stats.duration)) / downloadedDuration : 0;
                        const percent = Math.floor((finished / m3u8Info.tsCount) * 100);
                        const processBar = '='.repeat(Math.floor(percent * 0.2)).padEnd(20, '-');
                        utils_1.logger.logInline(`${percent}% [${(0, console_log_colors_1.greenBright)(processBar)}] ${(0, console_log_colors_1.cyan)(finished)} ` +
                            `${(0, console_log_colors_1.green)(stats.duration.toFixed(2) + 'sec')} ` +
                            `${(0, console_log_colors_1.blueBright)((0, helper_1.formatByteSize)(downloadedSize))} ${(0, console_log_colors_1.yellowBright)((0, fe_utils_1.formatTimeCost)(startTime))} ${(0, console_log_colors_1.magentaBright)(avgSpeed + '/s')} ` +
                            (finished === m3u8Info.tsCount ? '\n' : restTime ? `${(0, console_log_colors_1.cyan)((0, fe_utils_1.formatTimeCost)(Date.now() - Math.ceil(restTime)))}` : ''));
                    }
                    if (options.onProgress)
                        options.onProgress(finished, m3u8Info.tsCount, info);
                    if (finished === m3u8Info.tsCount) {
                        // pool.close();
                        barrier.open();
                    }
                    if (options.play && finished === playStart) {
                        (0, local_play_1.localPlay)(m3u8Info.data, options);
                    }
                });
            }
        };
        if (options.showProgress) {
            console.info(`\nTotal segments: ${(0, console_log_colors_1.cyan)(m3u8Info.tsCount)}, duration: ${(0, console_log_colors_1.green)(m3u8Info.durationSecond + 'sec')}.`, `Parallel jobs: ${(0, console_log_colors_1.magenta)(options.threadNum)}`);
        }
        runTask(m3u8Info.data);
        await barrier.wait();
        if (stats.tsFailed === 0) {
            result.filepath = await (0, m3u8_convert_1.m3u8Convert)(options, m3u8Info.data);
            if (result.filepath && (0, node_fs_1.existsSync)(options.cacheDir) && options.delCache)
                (0, fe_utils_1.rmrfAsync)(options.cacheDir);
        }
        else
            utils_1.logger.warn('Download Failed! Please retry!', stats.tsFailed);
    }
    utils_1.logger.debug('Done!', url, result.m3u8Info);
    return result;
}
exports.m3u8Download = m3u8Download;
