"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const node_events_1 = require("node:events");
const node_async_hooks_1 = require("node:async_hooks");
const node_worker_threads_1 = require("node:worker_threads");
const node_os_1 = require("node:os");
const node_fs_1 = require("node:fs");
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent');
class WorkerPoolTaskInfo extends node_async_hooks_1.AsyncResource {
    callback;
    constructor(callback) {
        super('WorkerPoolTaskInfo');
        this.callback = callback;
        this.callback = callback;
    }
    done(err, result) {
        this.runInAsyncScope(this.callback, null, err, result);
        this.emitDestroy();
    }
}
class WorkerPool extends node_events_1.EventEmitter {
    processorFile;
    numThreads;
    workers = [];
    freeWorkers = [];
    workerTaskInfo = new Map();
    tasks = [];
    get totalTask() {
        return this.tasks.length;
    }
    get totalNum() {
        return this.workers.length;
    }
    get freeNum() {
        return this.freeWorkers.length;
    }
    constructor(processorFile, numThreads = 0) {
        super();
        this.processorFile = processorFile;
        this.numThreads = numThreads;
        numThreads = +numThreads || (0, node_os_1.cpus)().length;
        for (let i = 0; i < numThreads; i++)
            this.addNewWorker(processorFile);
        // 每当发出 kWorkerFreedEvent 时，调度队列中待处理的下一个任务（如果有）。
        this.on(kWorkerFreedEvent, () => {
            if (this.tasks.length > 0) {
                const item = this.tasks.shift();
                if (item)
                    this.runTask(item.task, item.callback);
            }
        });
    }
    addNewWorker(processorFile = this.processorFile) {
        if (!(0, node_fs_1.existsSync)(processorFile)) {
            throw Error(`Not Found: ${processorFile}`);
        }
        const worker = new node_worker_threads_1.Worker(processorFile);
        worker.on('message', (result) => {
            // 如果成功：调用传递给`runTask`的回调，删除与Worker关联的`TaskInfo`，并再次将其标记为空闲。
            const r = this.workerTaskInfo.get(worker);
            if (r) {
                this.workerTaskInfo.delete(worker);
                this.freeWorkers.push(worker);
                this.emit(kWorkerFreedEvent);
                r.done(null, result);
            }
        });
        worker.on('error', err => {
            console.error('worker error', err);
            // 如果发生未捕获的异常：调用传递给 `runTask` 并出现错误的回调。
            const r = this.workerTaskInfo.get(worker);
            if (r) {
                r.done(err, null);
                this.workerTaskInfo.delete(worker);
            }
            else
                this.emit('error', err);
            // 从列表中删除 Worker 并启动一个新的 Worker 来替换当前的 Worker
            this.workers.splice(this.workers.indexOf(worker), 1);
            this.addNewWorker();
        });
        this.workers.push(worker);
        this.freeWorkers.push(worker);
        this.emit(kWorkerFreedEvent);
        if (this.numThreads < this.workers.length)
            this.numThreads = this.workers.length;
    }
    runTask(task, callback) {
        if (this.freeWorkers.length === 0) {
            this.tasks.push({ task, callback });
            return;
        }
        const worker = this.freeWorkers.pop();
        if (worker) {
            this.workerTaskInfo.set(worker, new WorkerPoolTaskInfo(callback));
            worker.postMessage(task);
        }
    }
    close() {
        for (const worker of this.workers)
            worker.terminate();
    }
}
exports.WorkerPool = WorkerPool;
