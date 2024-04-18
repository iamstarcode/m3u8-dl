"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.m3u8BatchDownload = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const m3u8_download_1 = require("./lib/m3u8-download");
const utils_1 = require("./lib/utils");
async function formatUrls(urls, options) {
    const taskset = new Map();
    for (const url of urls) {
        if (!url)
            continue;
        if ((0, node_fs_1.existsSync)(url)) {
            const content = await node_fs_1.promises.readFile(url, 'utf8');
            if (content.includes('.m3u8')) {
                const list = content
                    .split('\n')
                    .filter(d => d.includes('.m3u8'))
                    .map((href, idx) => {
                    if (href.startsWith('http'))
                        href = `${idx}|${href}`;
                    return href;
                });
                const o = { ...options };
                if (!o.filename)
                    o.filename = (0, node_path_1.basename)(url).split('.')[0];
                const t = await formatUrls(list, o);
                for (const d of t.entries())
                    taskset.set(d[0], d[1]);
                continue;
            }
        }
        taskset.set(url, options);
    }
    return taskset;
}
async function m3u8BatchDownload(urls, options) {
    const tasks = await formatUrls(urls, options);
    return new Promise(rs => {
        let preDLing = false;
        const run = async () => {
            const [key, keyNext] = [...tasks.keys()];
            if (key) {
                const o = { ...tasks.get(key) };
                tasks.delete(key);
                const p = o.onProgress;
                o.onProgress = (finished, total, info) => {
                    if (p)
                        p(finished, total, info);
                    if (!preDLing && keyNext && tasks.size && m3u8_download_1.workPoll.freeNum > 1 && total - finished < options.threadNum) {
                        utils_1.logger.debug('\n[预下载下一集]', 'freeNum:', m3u8_download_1.workPoll.freeNum, 'totalNum:', m3u8_download_1.workPoll.totalNum, 'totalTask:', m3u8_download_1.workPoll.totalTask, tasks.size);
                        preDLing = true;
                        (0, m3u8_download_1.preDownLoad)(keyNext, options).then(() => (preDLing = false));
                    }
                };
                (0, m3u8_download_1.m3u8Download)(key, o).then(r => (tasks.size === 0 ? rs((0, node_fs_1.existsSync)(r.filepath)) : run()));
            }
        };
        run();
    }).then(d => {
        if (m3u8_download_1.workPoll.freeNum === m3u8_download_1.workPoll.numThreads)
            m3u8_download_1.workPoll.close();
        return d;
    });
}
exports.m3u8BatchDownload = m3u8BatchDownload;
