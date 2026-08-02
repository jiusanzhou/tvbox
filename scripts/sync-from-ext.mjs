#!/usr/bin/env node
// scripts/sync-from-ext.mjs — 从 site2source-ext/test-output 同步 spider 产物到 sites/
//
// 用法:
//   node scripts/sync-from-ext.mjs
//   node scripts/sync-from-ext.mjs --ext=/path/to/site2source-ext

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);

const EXT_ROOT = args.ext || path.resolve(ROOT, '../site2source-ext');
const OUT_DIR = path.join(EXT_ROOT, 'test-output');

if (!fs.existsSync(OUT_DIR)) {
  console.error(`❌ 找不到 ${OUT_DIR}`);
  console.error('   用 --ext=/path/to/site2source-ext 指定');
  process.exit(1);
}

// site 名 → spider 文件名 (test-output 里)
const MAP = {
  aiyifan: 'spider_aiyifan_api_t3.js',
};

let updated = 0;
for (const [site, srcName] of Object.entries(MAP)) {
  const src = path.join(OUT_DIR, srcName);
  const dst = path.join(ROOT, 'sites', site, 'spider.js');
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  跳过 ${site}: ${srcName} 不存在`);
    continue;
  }
  const before = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf-8') : '';
  const after = fs.readFileSync(src, 'utf-8');
  if (before === after) {
    console.log(`  = ${site}: 无变化`);
    continue;
  }
  fs.writeFileSync(dst, after);
  console.log(`  ✓ ${site}: 已更新 (${(after.length / 1024).toFixed(1)} KB)`);
  updated++;
}

console.log(`\n完成: ${updated} 个 site 更新`);
if (updated > 0) console.log('别忘了: node scripts/build.mjs && git commit');
