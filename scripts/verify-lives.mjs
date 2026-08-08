#!/usr/bin/env node
// scripts/verify-lives.mjs — 探活 + 加密检查本地维护的 m3u
//
// 用法:
//   node scripts/verify-lives.mjs                # 检查所有本地 m3u, 打印报告
//   node scripts/verify-lives.mjs --fix          # 自动删除死链+加密流
//   node scripts/verify-lives.mjs --only=Adult.m3u,CZ-SK.m3u
//
// 只检查本仓库自维护的 m3u (Adult / CZ-SK 等), YueChan 的不动 (它们是聚合列表)

import fs from 'node:fs';
import path from 'node:path';
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
const FIX = !!args.fix;
const ONLY = args.only ? String(args.only).split(',') : null;

// 只处理"本仓库自维护"的 m3u (排除 YueChan 和 vbskycn 的聚合列表)
const SELF_MAINTAINED = ['Adult.m3u', 'CZ-SK.m3u'];

async function checkStream(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) return { status: 'DEAD', code: res.status };
    const body = await res.text();
    if (!body.includes('#EXTM3U')) return { status: 'DEAD', code: 'not-m3u' };
    if (body.includes('EXT-X-KEY')) return { status: 'ENC', code: 'aes-128' };
    return { status: 'OK' };
  } catch (e) {
    return { status: 'DEAD', code: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function processFile(filename) {
  const p = path.join(LIVES_DIR, filename);
  if (!fs.existsSync(p)) {
    console.log(`⏭  ${filename}  (不存在, 跳过)`);
    return { ok: 0, enc: 0, dead: 0 };
  }
  const lines = fs.readFileSync(p, 'utf-8').split('\n');
  const pairs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF') && i + 1 < lines.length) {
      pairs.push([lines[i], lines[i+1], i]);
    }
  }

  console.log(`\n📡 ${filename}  (${pairs.length} channels)`);

  const results = await Promise.all(
    pairs.map(async ([ext, url]) => ({ ext, url, ...(await checkStream(url)) })),
  );

  const ok = results.filter(r => r.status === 'OK');
  const enc = results.filter(r => r.status === 'ENC');
  const dead = results.filter(r => r.status === 'DEAD');

  console.log(`   ✓ OK: ${ok.length}   🔒 ENC: ${enc.length}   ✗ DEAD: ${dead.length}`);

  if (enc.length) {
    console.log('   加密流(客户端播不了):');
    for (const r of enc.slice(0, 10)) console.log(`     🔒 ${r.url}`);
    if (enc.length > 10) console.log(`     ... +${enc.length - 10} more`);
  }
  if (dead.length) {
    console.log('   死链:');
    for (const r of dead.slice(0, 10)) console.log(`     ✗ ${r.url}  (${r.code})`);
    if (dead.length > 10) console.log(`     ... +${dead.length - 10} more`);
  }

  if (FIX && (enc.length + dead.length) > 0) {
    const newLines = ['#EXTM3U'];
    for (const r of ok) {
      newLines.push(r.ext);
      newLines.push(r.url);
    }
    fs.writeFileSync(p, newLines.join('\n') + '\n');
    console.log(`   ✏️  已删除 ${enc.length + dead.length} 条, 保留 ${ok.length} 条`);
  }

  return { ok: ok.length, enc: enc.length, dead: dead.length };
}

const targets = ONLY || SELF_MAINTAINED;
console.log(`🔍 检查 ${targets.length} 个 m3u  (fix=${FIX ? 'ON' : 'OFF'})`);

let totalOk = 0, totalEnc = 0, totalDead = 0;
for (const f of targets) {
  const r = await processFile(f);
  totalOk += r.ok; totalEnc += r.enc; totalDead += r.dead;
}

console.log(`\n📊 合计: OK=${totalOk}, ENC=${totalEnc}, DEAD=${totalDead}`);
if (!FIX && (totalEnc + totalDead) > 0) {
  console.log('   → 用 --fix 自动删掉不可播条目');
}
process.exit((totalEnc + totalDead) > 0 && !FIX ? 1 : 0);
