/// <reference types="node" />
/// <reference types="node" />
import { NLogger, Request } from '@lzwme/fe-utils';
export declare const request: Request;
export declare const getRetry: <T = string>(url: string, retries?: number) => Promise<{
    data: T;
    buffer: Buffer;
    headers: import("http").IncomingHttpHeaders;
    response: import("http").IncomingMessage;
}>;
export declare const logger: NLogger;
export declare function isSupportFfmpeg(): boolean;
