"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLocalM3u8 = exports.localPlay = void 0;
const fe_utils_1 = require("@lzwme/fe-utils");
const console_log_colors_1 = require("console-log-colors");
const node_fs_1 = require("node:fs");
const node_http_1 = require("node:http");
const node_path_1 = require("node:path");
const utils_1 = require("./utils");
/**
 * 边下边看
 */
async function localPlay(m3u8Info, options) {
    if (!m3u8Info?.length)
        return null;
    const cacheDir = (0, node_path_1.dirname)(m3u8Info[0].tsOut);
    const info = await createLocalServer(cacheDir);
    const filename = (0, node_path_1.basename)(options.filename).slice(0, options.filename.lastIndexOf('.')) + `.m3u8`;
    await toLocalM3u8(m3u8Info, (0, node_path_1.resolve)(cacheDir, filename), info.origin);
    const playUrl = `https://lzw.me/x/m3u8-player?url=${encodeURIComponent(`${info.origin}/${filename}`)}`;
    const cmd = `${process.platform === 'win32' ? 'start' : 'open'} ${playUrl}`;
    (0, fe_utils_1.execSync)(cmd);
    return info;
}
exports.localPlay = localPlay;
async function toLocalM3u8(m3u8Info, filepath, host = '') {
    const m3u8ContentList = [
        `#EXTM3U`,
        `#EXT-X-VERSION:3`,
        `#EXT-X-ALLOW-CACHE:YES`,
        `#EXT-X-TARGETDURATION:${Math.max(...m3u8Info.map(d => d.duration))}`,
        `#EXT-X-MEDIA-SEQUENCE:0`,
        // `#EXT-X-KEY:METHOD=AES-128,URI="/api/aes/enc.key"`,
    ];
    m3u8Info.forEach(d => {
        if (d.tsOut)
            m3u8ContentList.push(`#EXTINF:${Number(d.duration).toFixed(6)},`, `${host}/${(0, node_path_1.basename)(d.tsOut)}`);
    });
    m3u8ContentList.push(`#EXT-X-ENDLIST`);
    const m3u8Content = m3u8ContentList.join('\n');
    await node_fs_1.promises.writeFile(filepath, m3u8Content, 'utf8');
}
exports.toLocalM3u8 = toLocalM3u8;
async function createLocalServer(baseDir) {
    const port = await (0, fe_utils_1.findFreePort)();
    const origin = `http://localhost:${port}`;
    const server = (0, node_http_1.createServer)((req, res) => {
        const filename = (0, node_path_1.join)(baseDir, decodeURIComponent(req.url));
        utils_1.logger.debug('[req]', req.url, filename);
        if ((0, node_fs_1.existsSync)(filename)) {
            const stats = (0, node_fs_1.statSync)(filename);
            const ext = (0, node_path_1.extname)(filename);
            if (stats.isFile()) {
                if (ext === '.m3u8')
                    res.setHeader('Cache-Control', 'no-cache');
                res.writeHead(200, {
                    'Last-Modified': stats.mtime.toUTCString(),
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Length': String(stats.size),
                    'Content-Type': ext === '.ts' ? 'video/mp2t' : ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : 'text/plain',
                });
                (0, node_fs_1.createReadStream)(filename).pipe(res);
                return;
            }
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }).listen(port, () => {
        console.log();
        utils_1.logger.info('Created Local Server:', console_log_colors_1.color.greenBright(origin));
    });
    return { port, origin, server };
}
