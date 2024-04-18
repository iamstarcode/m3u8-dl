import { WorkerPool } from './worker_pool';
import type { M3u8DLOptions, TsItemInfo, WorkerTaskInfo } from '../types/m3u8';
export declare const workPoll: WorkerPool<WorkerTaskInfo, {
    success: boolean;
    info: TsItemInfo;
}>;
export declare function preDownLoad(url: string, options: M3u8DLOptions): Promise<void>;
export declare function m3u8Download(url: string, options?: M3u8DLOptions): Promise<{
    options: M3u8DLOptions;
    m3u8Info: {
        manifest: any;
        tsCount: number;
        durationSecond: number;
        data: TsItemInfo[];
        crypto: import("../types/m3u8").M3u8Crypto;
    };
    filepath: string;
}>;
