"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportFfmpeg = exports.logger = exports.getRetry = exports.request = void 0;
const fe_utils_1 = require("@lzwme/fe-utils");
exports.request = new fe_utils_1.Request('', {
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
});
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const getRetry = (url, retries = 3) => (0, fe_utils_1.retry)(() => exports.request.get(url, null, {}, { rejectUnauthorized: false }), 1000, retries, r => {
    if (r.response.statusCode !== 200) {
        console.log();
        exports.logger.warn(`[retry][${url}][${r.response.statusCode}]`, r.response.statusMessage || r.data);
        // throw Error(`[${r.response.statusCode}]${r.response.statusMessage || r.data}`);
    }
    return r.response.statusCode === 200;
});
exports.getRetry = getRetry;
exports.logger = fe_utils_1.NLogger.getLogger('[M3U8-DL]', { color: fe_utils_1.color });
let _isSupportFfmpeg = null;
function isSupportFfmpeg() {
    if (null == _isSupportFfmpeg)
        _isSupportFfmpeg = (0, fe_utils_1.execSync)('ffmpeg -version').stderr === '';
    return _isSupportFfmpeg;
}
exports.isSupportFfmpeg = isSupportFfmpeg;
