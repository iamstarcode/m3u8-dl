import type { M3u8Crypto, TsItemInfo } from '../types/m3u8';
export declare function parseM3U8(content: string, url?: string, cacheDir?: string): Promise<{
    manifest: any;
    /** ts 文件数量 */
    tsCount: number;
    /** 总时长 */
    durationSecond: number;
    data: TsItemInfo[];
    /** 加密相关信息 */
    crypto: M3u8Crypto;
}>;
