"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseM3U8 = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const m3u8_parser_1 = require("m3u8-parser");
const utils_1 = require("./utils");
async function parseM3U8(content, url = process.cwd(), cacheDir = './cache') {
    if (!content && url) {
        if (!url.startsWith('http') && (0, node_fs_1.existsSync)(url)) {
            url = (0, node_path_1.resolve)(process.cwd(), url);
            content = await node_fs_1.promises.readFile(url, 'utf8');
        }
        else {
            content = (await (0, utils_1.getRetry)(url)).data;
        }
    }
    if (!content) {
        utils_1.logger.error('获取播放列表为空！', url);
    }
    utils_1.logger.debug('starting parsing m3u8 file:', url);
    let parser = new m3u8_parser_1.Parser();
    parser.push(content);
    parser.end();
    utils_1.logger.debug('parser.manifest', parser.manifest);
    if (parser.manifest.playlists?.length > 0) {
        url = new URL(parser.manifest.playlists[0].uri, url).toString();
        content = (await (0, utils_1.getRetry)(url)).data;
        parser = new m3u8_parser_1.Parser();
        parser.push(content);
        parser.end();
    }
    const tsList = parser.manifest.segments || [];
    const result = {
        manifest: parser.manifest,
        /** ts 文件数量 */
        tsCount: tsList.length,
        /** 总时长 */
        durationSecond: 0,
        data: [],
        /** 加密相关信息 */
        crypto: {
            method: 'AES-128',
            iv: new Uint8Array(16),
            key: '',
            uri: '',
        },
    };
    if (!result.tsCount) {
        utils_1.logger.error('m3u8 file error!\n', url, content);
        return result;
    }
    const tsKeyInfo = tsList[0].key;
    if (tsKeyInfo?.uri) {
        if (tsKeyInfo.method)
            result.crypto.method = tsKeyInfo.method.toUpperCase();
        if (tsKeyInfo.iv)
            result.crypto.iv = new Uint8Array(Buffer.from(tsKeyInfo.iv));
        result.crypto.uri = tsKeyInfo.uri.includes('://') ? tsKeyInfo.uri : new URL(tsKeyInfo.uri, url).toString();
    }
    if (result.crypto.uri !== '') {
        const r = await (0, utils_1.getRetry)(result.crypto.uri);
        result.crypto.key = r.buffer;
    }
    for (let i = 0; i < result.tsCount; i++) {
        if (!tsList[i].uri.startsWith('http'))
            tsList[i].uri = new URL(tsList[i].uri, url).toString();
        result.data.push({
            index: i,
            duration: tsList[i].duration,
            timeline: tsList[i].timeline,
            uri: tsList[i].uri,
            tsOut: `${cacheDir}/${i}-${(0, node_path_1.basename)(tsList[i].uri).replace(/\.ts\?.+/, '.ts')}`,
        });
        result.durationSecond += tsList[i].duration;
    }
    result.durationSecond = +Number(result.durationSecond).toFixed(2);
    return result;
}
exports.parseM3U8 = parseM3U8;
// parseM3U8('', 't.m3u8').then(d => console.log(d));
