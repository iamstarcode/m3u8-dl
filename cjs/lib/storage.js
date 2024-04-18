"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stor = void 0;
const fe_utils_1 = require("@lzwme/fe-utils");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
exports.stor = fe_utils_1.LiteStorage.getInstance({ uuid: 'm3u8dl', filepath: (0, node_path_1.resolve)((0, node_os_1.homedir)(), '.liteStorage/m3u8dl.json') });
