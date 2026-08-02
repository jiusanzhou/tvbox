#!/usr/bin/env node
// scripts/smoke.mjs — spider 冒烟测试
//
// 三件事：
//   1) 契约: import 每个 spider.js, 检查 __jsEvalReturn() 返回的 API 是否 9 方法齐全
//   2) 可达性: 从 spider 源码里 grep 出 http(s) URL 依赖, 逐个 curl HEAD 看是否 200/2xx
//   3) 输出 smoke.json (给 CI/dashboard 用)
//
// 不做的:
//   - 不真跑 home()/category() —— fongmi 的 req() 是同步的, Node 里 shim 成 async 会导致 spider
//     里的 var arr = req(...).content 拿到 Promise 而不是内容 (改 shim 需要 deasync 太重).
//     契约 + 依赖可达性 已经能 catch 90% 的问题.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const ONLY = args.site;
const NET = args.net !== 'off';
const TIMEOUT_MS = Number(args.timeout || 10000);

// 最小 stub, 让 spider import 时不炸
if (typeof globalThis.print === 'undefined') globalThis.print = () => {};
if (typeof globalThis.local === 'undefined') globalThis.local = { get: () => '', set: () => {}, delete: () => {} };
if (typeof globalThis.req === 'undefined') globalThis.req = () => ({ code: 0, content: '{}' });

const CONTRACT = ['init', 'home', 'homeVod', 'category', 'detail', 'play', 'search', 'isVideoFormat', 'manualVideoCheck'];

async function head(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // 先试 HEAD, 有些 CDN 不支持, fallback GET
    let resp = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (resp.status >= 400) {
      resp = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    }
    return { code: resp.status };
  } catch (e) {
    return { code: 0, error: String(e.message || e).slice(0, 100) };
  } finally {
    clearTimeout(timer);
  }
}

// 从 spider 源码里提取 http(s):// URL (只保留顶级域名, 用来做可达性检测)
function extractHosts(src) {
  const urls = new Set();
  const re = /https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s"')]*)?/g;
  let m;
  while ((m = re.exec(src))) {
    // 提取到域名根 (不带 path)
    try {
      const u = new URL(m[0]);
      // 只测根 URL (path='/') 加速; 用户可以在 meta 里覆盖
      urls.add(u.origin + '/');
    } catch {}
  }
  return [...urls];
}

const sitesDir = path.join(ROOT, 'sites');
const dirs = fs.readdirSync(sitesDir).filter(d => {
  return fs.statSync(path.join(sitesDir, d)).isDirectory()
    && fs.existsSync(path.join(sitesDir, d, 'meta.json'))
    && fs.existsSync(path.join(sitesDir, d, 'spider.js'));
});

const results = [];
for (const d of dirs) {
  if (ONLY && d !== ONLY) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(sitesDir, d, 'meta.json'), 'utf-8'));
  const spiderPath = path.join(sitesDir, d, 'spider.js');
  console.log(`\n━━━ ${meta.name} (${d}) ━━━`);
  const r = { key: d, name: meta.name, ok: true, checks: {}, errors: [] };

  // 1) 契约
  try {
    const mod = await import(pathToFileURL(spiderPath).href + `?t=${Date.now()}`);
    const api = typeof mod.__jsEvalReturn === 'function' ? mod.__jsEvalReturn() : mod.default || mod;
    if (!api || typeof api !== 'object') throw new Error('spider 未导出 API 对象');
    const missing = CONTRACT.filter(m => typeof api[m] !== 'function');
    if (missing.length) {
      r.ok = false;
      r.errors.push('缺方法: ' + missing.join(','));
      r.checks.contract = false;
      console.log('  ❌ 契约: 缺 ' + missing.join(','));
    } else {
      r.checks.contract = true;
      console.log(`  ✅ 契约: ${CONTRACT.length} 方法齐全`);
    }
  } catch (e) {
    r.ok = false;
    r.errors.push('load: ' + e.message);
    r.checks.contract = false;
    console.log('  ❌ 加载失败: ' + e.message);
    results.push(r);
    continue;
  }

  // 2) 依赖可达性
  if (NET) {
    const src = fs.readFileSync(spiderPath, 'utf-8');
    // meta.probes 优先, 否则从源码里 grep
    const hosts = Array.isArray(meta.probes) && meta.probes.length
      ? meta.probes
      : extractHosts(src);
    const uniq = [...new Set(hosts)];
    r.checks.hosts = {};
    let failN = 0;
    for (const u of uniq) {
      const t0 = Date.now();
      const p = await head(u);
      const ms = Date.now() - t0;
      const ok = p.code >= 200 && p.code < 400;
      r.checks.hosts[u] = { code: p.code, ms, ok };
      if (!ok) {
        // 根路径 404/403 常见（API 不给根 GET），但至少证明"域名活着"
        // 用 code >=200 且 <500 更宽松
        if (p.code >= 200 && p.code < 500) {
          r.checks.hosts[u].ok = true;
          console.log(`  ⚠️  ${u} → ${p.code} (根路径无内容, 域名可达)`);
        } else {
          failN++;
          console.log(`  ❌ ${u} → ${p.code} ${p.error ? '(' + p.error + ')' : ''}`);
        }
      } else {
        console.log(`  ✅ ${u} → ${p.code} (${ms}ms)`);
      }
    }
    if (failN === uniq.length && uniq.length > 0) {
      r.ok = false;
      r.errors.push('所有依赖不通');
    } else if (failN > 0) {
      r.errors.push(`${failN}/${uniq.length} 依赖不通`);
    }
  }

  results.push(r);
}

// 汇总
console.log('\n━━━ 汇总 ━━━');
const okN = results.filter(r => r.ok).length;
for (const r of results) {
  const icon = r.ok ? '✅' : '❌';
  console.log(`  ${icon} ${r.key}` + (r.errors.length ? ' — ' + r.errors.join('; ') : ''));
}
console.log(`\n${okN}/${results.length} 通过`);

const out = args.json === true ? 'smoke.json' : (args.json || null);
if (out) {
  fs.writeFileSync(path.join(ROOT, out), JSON.stringify({
    generated_at: new Date().toISOString(),
    results,
  }, null, 2));
  console.log(`结果 → ${out}`);
}

process.exit(okN === results.length ? 0 : 1);
