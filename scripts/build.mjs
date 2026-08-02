#!/usr/bin/env node
// scripts/build.mjs — 扫描 sites/*/meta.json, 合并成一个 tvbox.json
//
// 用法:
//   node scripts/build.mjs                    # 输出 tvbox.json (jsdelivr CDN)
//   node scripts/build.mjs --base=raw         # 用 raw.githubusercontent.com
//   node scripts/build.mjs --base=local       # 本地路径 (fongmi 直连 file://)
//   node scripts/build.mjs --out=tvbox-cn.json --tag=cn  # 过滤 tag=cn 的 site

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 拿 git commit 短 hash (CI/本地都能跑)
function gitShort() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'dev';
  }
}
function fileHash(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

// ---------- CLI ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);

const REPO = process.env.TVBOX_REPO || 'jiusanzhou/tvbox';
const BRANCH = process.env.TVBOX_BRANCH || 'main';
const BASE_MODE = args.base || 'pages';

// local 默认用 emulator 反向映射地址 10.0.2.2 (真机换 --host)
const LOCAL_HOST = args.host || 'http://10.0.2.2:8899';
const BASES = {
  jsdelivr: `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}`,
  raw: `https://raw.githubusercontent.com/${REPO}/${BRANCH}`,
  pages: 'https://zoe.im/tvbox',   // GH Pages via zoe.im (推荐, 用户端 URL 无外部依赖)
  local: LOCAL_HOST,
};
const BASE = BASES[BASE_MODE];
if (BASE === undefined) {
  console.error(`未知 base: ${BASE_MODE} (可选 jsdelivr/raw/local)`);
  process.exit(1);
}

const resolveUrl = (relPath) => `${BASE}/${relPath}`;

// ---------- 官方 flag 白名单 (P0 坑位, 详见 site2source-ext/docs/SPIDER-PITFALLS.md) ----------
const TVBOX_OFFICIAL_FLAGS = [
  'youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu',
  'tudou', 'pptv', 'mgtv', 'wasu', 'bilibili', 'renrenmi',
];

// ---------- 扫描 sites ----------
const sitesDir = path.join(ROOT, 'sites');
const dirs = fs.readdirSync(sitesDir).filter(d => {
  const meta = path.join(sitesDir, d, 'meta.json');
  return fs.statSync(path.join(sitesDir, d)).isDirectory() && fs.existsSync(meta);
});

if (dirs.length === 0) {
  console.error('❌ sites/ 下没有可用的 site (需要 meta.json)');
  process.exit(1);
}

const tagFilter = args.tag ? String(args.tag).split(',') : null;

const sites = [];
const siteMeta = []; // 只给 _meta 用，不进 sites[]
for (const d of dirs) {
  const meta = JSON.parse(fs.readFileSync(path.join(sitesDir, d, 'meta.json'), 'utf-8'));

  // Tag filter
  if (tagFilter && !meta.tags?.some(t => tagFilter.includes(t))) continue;

  // 校验必填
  if (!meta.key || !meta.name || !meta.spider) {
    console.error(`❌ sites/${d}/meta.json 缺 key/name/spider`);
    process.exit(1);
  }

  const spiderPath = path.join(sitesDir, d, path.basename(meta.spider));
  const spiderRel = path.relative(ROOT, spiderPath);
  if (!fs.existsSync(spiderPath)) {
    console.error(`❌ ${spiderRel} 不存在`);
    process.exit(1);
  }

  sites.push({
    key: meta.key,
    name: meta.name,
    type: meta.type ?? 3,
    api: resolveUrl(spiderRel.split(path.sep).join('/')),
    searchable: meta.searchable ?? 1,
    quickSearch: meta.quickSearch ?? 1,
    filterable: meta.filterable ?? 0,
    ...(meta.ext ? { ext: meta.ext } : {}),
    ...(meta.categories ? { categories: meta.categories } : {}),
  });
  siteMeta.push({
    key: meta.key,
    hash: fileHash(spiderPath),
    tags: meta.tags || [],
    updated_at: fs.statSync(spiderPath).mtime.toISOString(),
  });
}

// ---------- 拼配置 ----------
const parses = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/parses.json'), 'utf-8'));
const lives = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/lives.json'), 'utf-8'));

const cfg = {
  // fongmi/tvbox 不认的字段, 但 GH Pages / 前端 dashboard 能读
  _meta: {
    repo: REPO,
    branch: BRANCH,
    base: BASE_MODE,
    commit: gitShort(),
    generated_at: new Date().toISOString(),
    site_count: sites.length,
    sites: siteMeta,
  },
  spider: '',
  wallpaper: 'https://picsum.photos/1920/1080',
  sites,
  parses,
  lives,
  flags: TVBOX_OFFICIAL_FLAGS,
  ijk: [],
  ads: [],
};

// ---------- Validator ----------
const warnings = [];
const nonOfficial = cfg.flags.filter(f => !TVBOX_OFFICIAL_FLAGS.includes(f));
if (nonOfficial.length) {
  warnings.push(`P0: flags 含非官方 ${JSON.stringify(nonOfficial)} → 会触发 error_play_parse`);
}
if (!cfg.parses.length) warnings.push('P0: parses 数组为空');
for (const s of cfg.sites) {
  if (!s.api) warnings.push(`site ${s.key} 缺 api`);
  if (s.type === 3 && !/^https?:\/\/|^csp_/.test(s.api)) {
    warnings.push(`site ${s.key} api 格式不对: ${s.api}`);
  }
}
// site key 唯一
const keys = cfg.sites.map(s => s.key);
const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupKeys.length) warnings.push(`site key 重复: ${JSON.stringify([...new Set(dupKeys)])}`);

if (warnings.length) {
  console.error('❌ 校验失败:');
  warnings.forEach(w => console.error('  ⚠️  ' + w));
  process.exit(1);
}

// ---------- 写出 ----------
const outFile = args.out || 'tvbox.json';
const outPath = path.join(ROOT, outFile);
fs.writeFileSync(outPath, JSON.stringify(cfg, null, 2) + '\n');

console.log(`✅ 打包完成`);
console.log(`   ${sites.length} 个 site: ${sites.map(s => s.key).join(', ')}`);
console.log(`   base: ${BASE_MODE} → ${BASE || '<local>'}`);
console.log(`   输出: ${outFile}`);
