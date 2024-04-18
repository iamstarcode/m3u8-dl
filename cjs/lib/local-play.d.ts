/// <reference types="node" />
import { M3u8DLOptions, TsItemInfo } from '../types/m3u8';
/**
 * 边下边看
 */
export declare function localPlay(m3u8Info: TsItemInfo[], options: M3u8DLOptions): Promise<{
    port: number;
    origin: string;
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
}>;
export declare function toLocalM3u8(m3u8Info: TsItemInfo[], filepath: string, host?: string): Promise<void>;
