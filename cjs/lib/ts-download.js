"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsDownload = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_worker_threads_1 = require("node:worker_threads");
const fe_utils_1 = require("@lzwme/fe-utils");
const utils_1 = require("./utils");
async function tsDownload(info, cryptoInfo) {
    try {
        if ((0, node_fs_1.existsSync)(info.tsOut))
            return true;
        const r = await (0, utils_1.getRetry)(info.uri);
        if (r.response.statusCode === 200) {
            utils_1.logger.debug('\n', info);
            const data = cryptoInfo.key ? aesDecrypt(r.buffer, cryptoInfo) : r.buffer;
            (0, fe_utils_1.mkdirp)((0, node_path_1.dirname)(info.tsOut));
            await node_fs_1.promises.writeFile(info.tsOut, data);
            info.tsSize = r.buffer.byteLength;
            return true;
        }
        utils_1.logger.warn('[TS-Download][failed]', r.response.statusCode, info.uri);
    }
    catch (e) {
        utils_1.logger.error('[TS-Download][error]', e?.message || e || 'unkown');
    }
    return false;
}
exports.tsDownload = tsDownload;
function aesDecrypt(data, cryptoInfo) {
    const decipher = (0, node_crypto_1.createDecipheriv)((cryptoInfo.method + '-cbc').toLocaleLowerCase(), cryptoInfo.key, cryptoInfo.iv);
    return Buffer.concat([decipher.update(Buffer.isBuffer(data) ? data : Buffer.from(data)), decipher.final()]);
}
if (!node_worker_threads_1.isMainThread && node_worker_threads_1.parentPort) {
    node_worker_threads_1.parentPort.on('message', (data) => {
        if (data.options.debug)
            utils_1.logger.updateOptions({ levelType: 'debug' });
        if (data.options?.headers)
            utils_1.request.setHeaders(data.options.headers);
        tsDownload(data.info, data.crypto).then(success => {
            node_worker_threads_1.parentPort.postMessage({ success, info: data.info });
        });
    });
}
