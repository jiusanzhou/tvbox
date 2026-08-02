#!/usr/bin/env node
// scripts/validate.mjs — 单独跑校验(不写文件), CI 里用于 PR 检查
// 内部就是复用 build.mjs, 靠 exit code 判断

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync('node', [path.join(__dirname, 'build.mjs'), '--out=/tmp/tvbox-check.json'], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
