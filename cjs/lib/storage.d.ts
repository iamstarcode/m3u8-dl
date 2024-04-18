import { LiteStorage } from '@lzwme/fe-utils';
import { type VSOptions } from './video-search';
import type { M3u8DLOptions, VideoDetails } from '../types';
export interface M3u8StorConfig extends VSOptions {
    /** 播放地址缓存 */
    api?: string[];
    /** 远程加载的配置信息 */
    remoteConfig?: {
        /** 最近一次更新的时间。默认缓存1小时 */
        updateTime?: number;
        /** 远程配置缓存 */
        data?: {
            apiSites: {
                url: string;
                desc?: string;
                enable?: 0 | 1 | boolean;
                remote?: boolean;
            }[];
        };
    };
    /** 最近一次搜索下载的信息缓存 */
    latestSearchDL?: {
        keyword: string;
        urls: string[];
        info: VideoDetails;
        dlOptions: M3u8DLOptions;
    };
}
export declare const stor: LiteStorage<M3u8StorConfig>;
