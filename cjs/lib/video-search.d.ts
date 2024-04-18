import type { VideoListResult, VideoSearchResult, CliOptions } from '../types';
export interface VSOptions {
    /** 播放地址缓存 */
    api?: string[];
    force?: boolean;
    /** 远程配置的请求地址 */
    remoteConfigUrl?: string;
}
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
export declare class VideoSearch {
    protected options: VSOptions;
    apiMap: Map<string, {
        url: string;
        desc?: string;
        enable?: boolean | 0 | 1;
        remote?: boolean;
    }>;
    get api(): {
        url: string;
        desc?: string;
        enable?: boolean | 0 | 1;
        remote?: boolean;
    }[];
    constructor(options?: VSOptions);
    updateOptions(options: VSOptions): Promise<this>;
    search(wd: string, api?: {
        url: string;
        desc?: string;
        enable?: boolean | 0 | 1;
        remote?: boolean;
    }): Promise<VideoSearchResult>;
    getVideoList(ids: number | string | (number | string)[], api?: {
        url: string;
        desc?: string;
        enable?: boolean | 0 | 1;
        remote?: boolean;
    }): Promise<VideoListResult>;
    private formatUrl;
    private loadRemoteConfig;
    updateApiFromRemote(force?: boolean): Promise<void>;
}
export declare function VideoSerachAndDL(keyword: string, options: {
    url?: string[];
    remoteConfigUrl?: string;
}, baseOpts: CliOptions): Promise<void>;
