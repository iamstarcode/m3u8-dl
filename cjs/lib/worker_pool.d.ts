/// <reference types="node" />
import { EventEmitter } from 'node:events';
export declare class WorkerPool<T = unknown, R = unknown> extends EventEmitter {
    private processorFile;
    numThreads: number;
    private workers;
    private freeWorkers;
    private workerTaskInfo;
    private tasks;
    get totalTask(): number;
    get totalNum(): number;
    get freeNum(): number;
    constructor(processorFile: string, numThreads?: number);
    addNewWorker(processorFile?: string): void;
    runTask(task: T, callback: (err: Error | null, result: R) => void): void;
    close(): void;
}
