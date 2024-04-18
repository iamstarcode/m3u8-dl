"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSerachAndDL = exports.VideoSearch = void 0;
const fe_utils_1 = require("@lzwme/fe-utils");
const storage_js_1 = require("./storage.js");
const utils_js_1 = require("./utils.js");
const m3u8_batch_download_js_1 = require("../m3u8-batch-download.js");
const enquirer_1 = require("enquirer");
const console_log_colors_1 = require("console-log-colors");
const req = new fe_utils_1.Request(null, {
    'content-type': 'application/json; charset=UTF-8',
});
/**
 * @example
 * ```ts
 * const v = new VideoSearch({ api: ['https://api.xinlangapi.com/xinlangapi.php/provide/vod/'] });
 * v.search('三体')
 *   .then(d => {
 *     console.log(d.total, d.list);
 *     return v.getVideoList(d.list[0].vod_id);
 *   })
 *   .then(d => {
 *     console.log('detail:', d.total, d.list[0]);
 *   });
 * ```
 */
class VideoSearch {
    options;
    apiMap = new Map();
    get api() {
        return [...this.apiMap.values()].reverse();
    }
    constructor(options = {}) {
        this.options = options;
        if (!options.api?.length)
            options.api = [];
        if (process.env.VAPI)
            options.api.push(...process.env.VAPI.split('$$$'));
        this.updateOptions(options);
    }
    async updateOptions(options) {
        const cache = storage_js_1.stor.get();
        const apis = [...(cache.api || []), ...options.api];
        await this.formatUrl(apis);
        if (options.api?.length)
            storage_js_1.stor.set({ api: apis });
        (cache.api || []).forEach(url => {
            this.apiMap.set(url, { url, desc: url });
        });
        await this.updateApiFromRemote(options.force);
        if (!this.apiMap.size)
            throw Error('没有可用的 API 站点，请添加或指定');
        return this;
    }
    async search(wd, api = this.api[0]) {
        let { data } = await req.get(api.url, { wd }, null, { rejectUnauthorized: false });
        if (typeof data == 'string')
            data = JSON.parse(data);
        return data;
    }
    async getVideoList(ids, api = this.api[0]) {
        let { data } = await req.get(api.url, {
            ac: 'videolist',
            ids: Array.isArray(ids) ? ids.join(',') : ids,
        }, null, { rejectUnauthorized: false });
        if (typeof data == 'string')
            data = JSON.parse(data);
        return data;
    }
    formatUrl(url) {
        const urls = [];
        if (!url)
            return urls;
        if (typeof url === 'string')
            url = [url];
        for (let u of url) {
            u = String(u || '').trim();
            if (u.startsWith('http')) {
                if (u.endsWith('provide/'))
                    u += 'vod/';
                if (u.endsWith('provide/vod'))
                    u += '/';
                urls.push(u.replace('/at/xml/', '/'));
            }
        }
        return [...new Set(urls)];
    }
    async loadRemoteConfig(force = false) {
        const cache = storage_js_1.stor.get();
        let needUpdate = true;
        if (!force && cache.remoteConfig?.updateTime) {
            needUpdate = Date.now() - cache.remoteConfig.updateTime > 1 * 60 * 60 * 1000;
        }
        if (needUpdate) {
            const url = this.options.remoteConfigUrl || 'https://mirror.ghproxy.com/raw.githubusercontent.com/lzwme/m3u8-dl/main/test/remote-config.json';
            const { data } = await req.get(url, null, { 'content-type': 'application/json' }, { rejectUnauthorized: false });
            utils_js_1.logger.debug('加载远程配置', data);
            if (Array.isArray(data.apiSites)) {
                storage_js_1.stor.set({
                    remoteConfig: {
                        updateTime: Date.now(),
                        data,
                    },
                });
            }
        }
        return cache.remoteConfig;
    }
    async updateApiFromRemote(force = false) {
        const remoteConfig = await this.loadRemoteConfig(force);
        if (Array.isArray(remoteConfig?.data?.apiSites)) {
            remoteConfig.data.apiSites.forEach(item => {
                if (item.enable === 0 || item.enable === false)
                    return;
                item.url = this.formatUrl(item.url)[0];
                item.remote = true;
                this.apiMap.set(item.url, item);
            });
        }
    }
}
exports.VideoSearch = VideoSearch;
async function VideoSerachAndDL(keyword, options, baseOpts) {
    const cache = storage_js_1.stor.get();
    const doDownload = async (info, urls) => {
        const p = await (0, enquirer_1.prompt)({
            type: 'confirm',
            name: 'play',
            initial: baseOpts.play,
            message: `【${(0, console_log_colors_1.greenBright)(info.vod_name)}】是否边下边播？`,
        });
        baseOpts.play = p.play;
        try {
            cache.latestSearchDL = {
                ...cache.latestSearchDL,
                info,
                urls,
                dlOptions: { filename: info.vod_name.replaceAll(' ', '_'), ...baseOpts },
            };
            storage_js_1.stor.save({ latestSearchDL: cache.latestSearchDL });
            const r = await (0, m3u8_batch_download_js_1.m3u8BatchDownload)(cache.latestSearchDL.urls, cache.latestSearchDL.dlOptions);
            if (r)
                storage_js_1.stor.set({ latestSearchDL: null });
        }
        catch (error) {
            utils_js_1.logger.info('cachel download');
        }
    };
    if (cache.latestSearchDL?.urls) {
        const p = await (0, enquirer_1.prompt)({
            type: 'confirm',
            name: 'k',
            initial: true,
            message: `存在上次未完成的下载【${(0, console_log_colors_1.greenBright)(cache.latestSearchDL.info.vod_name)}】，是否继续？`,
        });
        if (p.k) {
            await doDownload(cache.latestSearchDL.info, cache.latestSearchDL.urls);
        }
        else {
            storage_js_1.stor.set({ latestSearchDL: null });
        }
    }
    const vs = new VideoSearch();
    await vs.updateOptions({ api: options.url || [], force: baseOpts.force, remoteConfigUrl: options.remoteConfigUrl });
    const apis = vs.api;
    let apiUrl = options.url?.length ? { url: options.url[0] } : apis[0];
    if (!options.url && apis.length > 0) {
        await (0, enquirer_1.prompt)({
            type: 'select',
            name: 'k',
            message: '请选择 API 站点',
            choices: apis.map(d => ({ name: d.url, message: d.desc })),
            validate: value => value.length >= 1,
        }).then(v => (apiUrl = apis.find(d => d.url === v.k)));
    }
    await (0, enquirer_1.prompt)({
        type: 'input',
        name: 'k',
        message: '请输入关键字',
        validate: value => value.length > 1,
        initial: keyword,
    }).then(v => (keyword = v.k));
    const sRes = await vs.search(keyword, apiUrl);
    utils_js_1.logger.debug(sRes);
    if (!sRes.total) {
        console.log(console_log_colors_1.color.green(`[${keyword}]`), `没有搜到结果`);
        return VideoSerachAndDL(keyword, options, baseOpts);
    }
    const choices = sRes.list.map((d, idx) => ({
        name: d.vod_id,
        message: `${idx + 1}. [${d.type_name}] ${d.vod_name}`,
        hint: `${d.vod_remarks}(${d.vod_time})`,
    }));
    const answer1 = await (0, enquirer_1.prompt)({
        type: 'select',
        name: 'vid',
        pointer: '👉',
        message: `查找到了 ${console_log_colors_1.color.greenBright(sRes.list.length)} 条结果，请选择：`,
        choices: choices.concat({ name: -1, message: (0, console_log_colors_1.greenBright)('重新搜索'), hint: '' }),
    });
    if (answer1.vid === -1)
        return VideoSerachAndDL(keyword, options, baseOpts);
    const vResult = await vs.getVideoList(answer1.vid, apiUrl);
    if (!vResult.list?.length) {
        utils_js_1.logger.error('获取视频信息失败!', vResult.msg);
        return VideoSerachAndDL(keyword, options, baseOpts);
    }
    else {
        const info = vResult.list[0];
        if (!info.vod_play_url) {
            utils_js_1.logger.error('未获取到播放地址信息', info);
            return VideoSerachAndDL(keyword, options, baseOpts);
        }
        if (!info.vod_play_note || !String(info.vod_play_url).includes(info.vod_play_note)) {
            ['#', '$'].some(d => {
                if (info.vod_play_url.includes(d)) {
                    info.vod_play_note = d;
                    return true;
                }
                return true;
            });
        }
        const urls = info.vod_play_url
            .split(info.vod_play_note || '$')
            .find(d => d.includes('.m3u8'))
            .split('#');
        utils_js_1.logger.debug(info, urls);
        const r = (key, desc) => (info[key] ? `  [${desc}] ${(0, console_log_colors_1.greenBright)(info[key])}` : '');
        console.log([
            `\n  [名称] ${(0, console_log_colors_1.cyanBright)(info.vod_name)}`,
            r('vod_sub', '别名'),
            `  [更新] ${(0, console_log_colors_1.greenBright)(info.vod_remarks)}(${(0, console_log_colors_1.gray)(info.vod_time)})`,
            r('vod_total', '总集数'),
            r('type_name', '分类'),
            r('vod_class', '类别'),
            r('vod_writer', '作者'),
            r('vod_area', '地区'),
            r('vod_lang', '语言'),
            r('vod_year', '年份'),
            r('vod_douban_score', '评分'),
            r('vod_pubdate', '上映日期'),
            `\n${(0, console_log_colors_1.green)((info.vod_content || info.vod_blurb).replace(/<\/?.+?>/g, ''))}\n`, // 描述
        ]
            .filter(Boolean)
            .join('\n'), '\n');
        const answer = await (0, enquirer_1.prompt)({
            type: 'select',
            name: 'url',
            choices: [
                { name: '1', message: (0, console_log_colors_1.green)('全部下载') },
                { name: '-1', message: (0, console_log_colors_1.cyanBright)('重新搜索') },
            ].concat(urls.map((d, i) => ({ name: d, message: `${i + 1}. ${d}` }))),
            message: `获取到了 ${console_log_colors_1.color.magentaBright(urls.length)} 条视频下载地址，请选择：`,
        });
        if (answer.url !== '-1') {
            await doDownload(info, answer.url === '1' ? urls : [answer.url]);
        }
        return VideoSerachAndDL(keyword, options, baseOpts);
    }
}
exports.VideoSerachAndDL = VideoSerachAndDL;
