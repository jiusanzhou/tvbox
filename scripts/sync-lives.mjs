#!/usr/bin/env node
// scripts/sync-lives.mjs — 从上游拉直播源到 shared/lives/
//
// 用法:
//   node scripts/sync-lives.mjs           # 全部同步
//   node scripts/sync-lives.mjs --dry     # 只 diff, 不写盘
//   node scripts/sync-lives.mjs --only=Global.m3u,IPTV.m3u
//
// 规则:
//   - 本仓库自维护的文件 (上游已删) 不在同步列表里, 不会被覆盖
//   - 上游源默认走 jsdelivr, 拉不到再 fallback raw.githubusercontent.com

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIVES_DIR = path.join(ROOT, 'shared', 'lives');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const DRY = !!args.dry;
const ONLY = args.only ? String(args.only).split(',') : null;

// 上游源清单
// upstream: 优先 jsdelivr(有 CDN 缓存, 快), fallback raw
const SOURCES = [
  { file: 'Global.m3u', repo: 'YueChan/Live', path: 'Global.m3u' },
  { file: 'IPTV.m3u',   repo: 'YueChan/Live', path: 'IPTV.m3u'   },
  { file: 'GNTV.m3u',   repo: 'YueChan/Live', path: 'GNTV.m3u'   },
  { file: 'Hunan.txt',  repo: 'YueChan/Live', path: 'Hunan.txt'  },
  { file: 'CUTV.txt',   repo: 'YueChan/Live', path: 'CUTV.txt'   },
  { file: 'Radio.m3u',  repo: 'YueChan/Live', path: 'Radio.m3u'  },
  // Adult.m3u 上游已删, 本仓库自维护, 不同步
];

function sha8(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

async function fetchWithFallback(repo, filePath) {
  const urls = [
    `https://cdn.jsdelivr.net/gh/${repo}@main/${filePath}`,
    `https://raw.githubusercontent.com/${repo}/main/${filePath}`,
  ];
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`);
        continue;
      }
      const txt = await res.text();
      if (!txt || txt.length < 32) {
        errors.push(`${url} → too short (${txt.length}B)`);
        continue;
      }
      return { url, text: txt };
    } catch (e) {
      errors.push(`${url} → ${e.message}`);
    }
  }
  throw new Error(`所有源均失败:\n  - ${errors.join('\n  - ')}`);
}

let ok = 0, changed = 0, skipped = 0, failed = 0;
const report = [];

for (const src of SOURCES) {
  if (ONLY && !ONLY.includes(src.file)) continue;

  const local = path.join(LIVES_DIR, src.file);
  const oldBuf = fs.existsSync(local) ? fs.readFileSync(local) : null;
  const oldHash = oldBuf ? sha8(oldBuf) : '(new)';

  try {
    const { url, text } = await fetchWithFallback(src.repo, src.path);
    const newBuf = Buffer.from(text, 'utf-8');
    const newHash = sha8(newBuf);

    if (oldBuf && oldHash === newHash) {
      console.log(`= ${src.file}   (${oldHash}, ${newBuf.length}B) — 无变化`);
      skipped++;
    } else {
      if (!DRY) {
        fs.mkdirSync(LIVES_DIR, { recursive: true });
        fs.writeFileSync(local, newBuf);
      }
      const oldSize = oldBuf ? oldBuf.length : 0;
      const oldChan = oldBuf ? (oldBuf.toString().match(/^#EXTINF/gm) || []).length : 0;
      const newChan = (text.match(/^#EXTINF/gm) || []).length;
      console.log(
        `${DRY ? '?' : '✓'} ${src.file}   ${oldHash} → ${newHash}   ` +
        `${oldSize}B → ${newBuf.length}B   ` +
        `channels ${oldChan} → ${newChan}   ${DRY ? '(dry)' : ''}`,
      );
      changed++;
      report.push({ file: src.file, oldHash, newHash, oldSize, newSize: newBuf.length, oldChan, newChan });
    }
    ok++;
  } catch (e) {
    console.error(`✗ ${src.file}   FAIL: ${e.message}`);
    failed++;
  }
}

// Adult.m3u 状态检查
const adultLocal = path.join(LIVES_DIR, 'Adult.m3u');
if (fs.existsSync(adultLocal)) {
  const buf = fs.readFileSync(adultLocal);
  const ch = (buf.toString().match(/^#EXTINF/gm) || []).length;
  console.log(`\n📌 Adult.m3u — 本仓库自维护 (${buf.length}B, ${ch} channels), 不同步`);
}

console.log(`\n📊 同步完成: ${ok}/${SOURCES.length} 成功  (变更 ${changed}, 无变化 ${skipped}, 失败 ${failed})`);
if (DRY) console.log('   (dry run, 未写盘)');

// 输出简报供 CI commit message 用
if (process.env.GITHUB_OUTPUT && changed > 0) {
  const summary = report.map(r => `- ${r.file}: ${r.oldChan}→${r.newChan} 频道`).join('\n');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\nsummary<<EOF\n${summary}\nEOF\n`);
}

process.exit(failed > 0 ? 1 : 0);
