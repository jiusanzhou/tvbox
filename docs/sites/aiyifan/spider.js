// site2source-ext — 通用 SiteModel T3 spider
// Generated: 2026-08-06T15:36:42.363Z
// Site: 爱壹帆 (aiyifan)
// URL: https://www.aiyifan.tv
// 签名模式: cert / timestamp
//
// 这份 spider 是**引擎 + SiteModel 内联**的产物。改站点行为不用改代码，改 SiteModel。
// 生成器在 lib/model-generator.ts。SiteModel 定义在 lib/site-model.ts。

import * as cheerio from 'assets://js/lib/cat.js';

// ====== SiteModel（内联）======
var SITE = {
  "name": "aiyifan",
  "display_name": "爱壹帆",
  "site_url": "https://www.aiyifan.tv",
  "bases": {
    "api": "https://m10.aiyifan.tv",
    "rank": "https://rankv21.aiyifan.tv"
  },
  "signing": {
    "default_strategy": "auto",
    "modes": [
      {
        "name": "cert",
        "vars": {
          "pub": {
            "kind": "bootstrap",
            "path": "publicKey"
          },
          "query_lower": {
            "kind": "query_lower"
          },
          "pk": {
            "kind": "bootstrap",
            "path": "privateKey[0]"
          }
        },
        "formula": "{pub}&{query_lower}&{pk}",
        "algorithm": "md5",
        "attach": {
          "vv": "{sign}",
          "pub": "{pub}"
        }
      },
      {
        "name": "timestamp",
        "vars": {
          "pub": {
            "kind": "timestamp"
          },
          "query_lower": {
            "kind": "query_lower"
          },
          "pk": {
            "kind": "key_table",
            "table": [
              "version001",
              "vers1on001",
              "vers1on00i",
              "bersion001",
              "vcrsion001",
              "versi0n001",
              "versio_001",
              "version0o1"
            ],
            "index": "Number(pub) % 8"
          }
        },
        "formula": "{pub}&{query_lower}&{pk}",
        "algorithm": "md5",
        "attach": {
          "vv": "{sign}",
          "pub": "{pub}"
        }
      }
    ]
  },
  "bootstrap": {
    "endpoint": "config",
    "extract": {
      "publicKey": "info[0].pConfig.publicKey",
      "privateKey": "info[0].pConfig.privateKey"
    },
    "transforms": [
      {
        "field": "privateKey",
        "op": "as_array"
      }
    ]
  },
  "endpoints": [
    {
      "name": "config",
      "base": "api",
      "path": "v3/home/config",
      "query": "cinema=1",
      "sign_mode": "timestamp"
    },
    {
      "name": "home",
      "base": "api",
      "path": "v3/home/getAllVideo",
      "query": "cinema=1&page=1&size=100&region=SG",
      "sign_mode": "auto",
      "response": {
        "item": {
          "path": "info[0]"
        }
      }
    },
    {
      "name": "detail",
      "base": "api",
      "path": "v3/video/detail",
      "query": "cinema=1&device=1&player=CkPlayer&tech=HLS&lang=cns&v=1&id={id}&region=SG",
      "sign_mode": "auto",
      "response": {
        "item": {
          "path": "info[0]"
        }
      }
    },
    {
      "name": "episodes",
      "base": "api",
      "path": "v3/video/languagesplaylist",
      "query": "cinema=1&vid={id}&lsk=1&taxis=0&cid={cid}",
      "sign_mode": "auto",
      "response": {
        "episodes": {
          "path": "info[0].playList"
        }
      }
    },
    {
      "name": "play",
      "base": "api",
      "path": "v3/video/play",
      "query": "cinema=1&id={id}&a=0&lang=none&usersign=1&region=SG&device=1&isMasterSupport=1",
      "sign_mode": "cert",
      "response": {
        "play_url": {
          "priority": [
            {
              "path": "info[0].clarity",
              "first_where": "isEnabled=true",
              "field": "path.result"
            },
            {
              "path": "info[0].flvPathList",
              "first_where": "isHls=true",
              "field": "result"
            },
            {
              "path": "info[0].hlsPathList",
              "first_where": "isHls=true",
              "field": "result"
            },
            {
              "path": "info[0].flvPathList",
              "first_where": "isHls=true",
              "field": "result"
            }
          ],
          "exclude": [
            {
              "host_regex": "s1-a1\\.global-cdn\\.me"
            }
          ]
        }
      }
    },
    {
      "name": "search",
      "base": "rank",
      "path": "v3/list/briefsearch",
      "query": "tags={wd}&orderby=4&page={page}&size=20&desc=0&isserial=-1&istitle=true",
      "sign_mode": "auto",
      "response": {
        "list": {
          "path": "info[0].result"
        }
      }
    }
  ],
  "mappings": {
    "vod_id": [
      "key",
      "contxt",
      "id"
    ],
    "vod_name": [
      "title",
      "name"
    ],
    "vod_pic": [
      "image",
      "imgPath",
      "cover",
      "pic"
    ],
    "vod_year": [
      "year",
      "post_Year"
    ],
    "vod_area": [
      "regional",
      "area"
    ],
    "vod_actor": [
      "starring",
      "stars",
      "actor"
    ],
    "vod_director": [
      "directed",
      "directors",
      "director"
    ],
    "vod_content": [
      "shortDes",
      "contxt",
      "desc"
    ],
    "vod_remarks": [
      "lastName",
      "score",
      "rating"
    ],
    "ep_name": [
      "name",
      "title"
    ],
    "ep_id": [
      "key",
      "id"
    ]
  },
  "categories": [
    {
      "kind": "static",
      "id": "filmList",
      "name": "电影",
      "source_field": "info[0].filmList"
    },
    {
      "kind": "static",
      "id": "tvList",
      "name": "剧集",
      "source_field": "info[0].tvList"
    },
    {
      "kind": "static",
      "id": "varietyList",
      "name": "综艺",
      "source_field": "info[0].varietyList"
    },
    {
      "kind": "static",
      "id": "animeList",
      "name": "动漫",
      "source_field": "info[0].animeList"
    },
    {
      "kind": "static",
      "id": "shortList",
      "name": "短剧",
      "source_field": "info[0].shortList"
    },
    {
      "kind": "static",
      "id": "documentaryList",
      "name": "纪录片",
      "source_field": "info[0].documentaryList"
    },
    {
      "kind": "static",
      "id": "sportList",
      "name": "体育",
      "source_field": "info[0].sportList"
    }
  ],
  "play_result": {
    "on_hit": {
      "parse": 0
    },
    "on_miss": {
      "parse": 1,
      "url_template": "{site_url}/play/{id}"
    }
  },
  "paging": {
    "strategy": "local",
    "page_size": 30
  },
  "proxy": {
    "base": "https://notes-edge.pages.dev",
    "mode": "query",
    "headers": {
      "Authorization": "Bearer -sLLUu7d2IaCDt3-jH_RqyprAJwC0sBW"
    },
    "only": [
      "api",
      "rank"
    ],
    "proxy_media": false
  }
};

var HDR = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "Referer": "https://www.aiyifan.tv/",
  "Origin": "https://www.aiyifan.tv",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
};

// bootstrap 结果缓存（跨调用持久）
var BOOT = null;
// home 端点响应缓存（10 分钟）
var HOME_CACHE = null;
var HOME_AT = 0;

// ---------- 引擎：JSONPath / cheerio / md5 都是 FongMi 提供 ----------

/** 简易 JSONPath: "info[0].pConfig.publicKey" */
function jpath(obj, path) {
  if (!path) return obj;
  var parts = String(path).split(/[.\[\]]+/).filter(Boolean);
  var cur = obj;
  for (var i = 0; i < parts.length; i++) {
    if (cur == null) return null;
    var p = parts[i];
    var idx = Number(p);
    cur = isFinite(idx) && String(idx) === p ? cur[idx] : cur[p];
  }
  return cur;
}

/** 从若干字段候选里挑第一个非空的 */
function pickField(obj, candidates) {
  if (!obj) return '';
  var arr = Array.isArray(candidates) ? candidates : [candidates];
  for (var i = 0; i < arr.length; i++) {
    var v = jpath(obj, arr[i]);
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return '';
}

/** 表达式对比: "isEnabled=true" or "path.result=xxx" */
function matchCond(item, cond) {
  if (!cond) return true;
  var m = String(cond).match(/^([\w.\[\]]+)\s*=\s*(.+)$/);
  if (!m) return true;
  var lhs = jpath(item, m[1]);
  var rhs = m[2].trim();
  if (rhs === 'true') return lhs === true;
  if (rhs === 'false') return lhs === false;
  if (/^-?\d+$/.test(rhs)) return Number(lhs) === Number(rhs);
  return String(lhs) === rhs || String(lhs) === rhs.replace(/^["']|["']$/g, '');
}

/** 挑选器：ResponsePicker → 值 */
function pickResp(data, picker) {
  if (!picker) return null;
  // priority：依次尝试
  if (picker.priority && picker.priority.length) {
    for (var i = 0; i < picker.priority.length; i++) {
      var v = pickResp(data, picker.priority[i]);
      if (v != null && v !== '') {
        if (!picker.exclude) return v;
        var s = typeof v === 'string' ? v : (v && v.result) || '';
        if (!isExcluded(s, picker.exclude)) return v;
      }
    }
    return null;
  }
  var cur = picker.path ? jpath(data, picker.path) : data;
  if (picker.first_where && Array.isArray(cur)) {
    for (var j = 0; j < cur.length; j++) {
      if (matchCond(cur[j], picker.first_where)) { cur = cur[j]; break; }
      if (j === cur.length - 1) cur = null;
    }
  }
  if (picker.field && cur != null) cur = jpath(cur, picker.field);
  if (picker.exclude) {
    var val = typeof cur === 'string' ? cur : (cur && cur.result) || '';
    if (isExcluded(val, picker.exclude)) return null;
  }
  return cur;
}

function isExcluded(url, rules) {
  if (!url || !rules) return false;
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    if (r.host_regex && new RegExp(r.host_regex).test(url)) return true;
    if (r.contains && url.indexOf(r.contains) >= 0) return true;
  }
  return false;
}

// ---------- Proxy 包装（GEO block 绕过用）----------

/**
 * 把 rawUrl 包装成经过 SITE.proxy 转发的 URL；
 * 同时把 proxy.headers（如 Authorization）合并进 hdr。
 * 无 proxy 或不适用时透传。
 */
function wrapProxy(rawUrl, epBaseKey, hdr) {
  if (!SITE.proxy || !SITE.proxy.base) return { url: rawUrl, hdr: hdr };
  if (SITE.proxy.only && SITE.proxy.only.length && SITE.proxy.only.indexOf(epBaseKey) < 0) return { url: rawUrl, hdr: hdr };
  var pmode = SITE.proxy.mode || 'query';
  var pbase = String(SITE.proxy.base).replace(/\/$/, '');
  var proxied;
  if (pmode === 'path') {
    proxied = pbase + '/' + rawUrl.replace(/^https?:\/\//, '');
  } else {
    proxied = pbase + '/?url=' + encodeURIComponent(rawUrl);
  }
  var newHdr = {}; for (var k in hdr) newHdr[k] = hdr[k];
  if (SITE.proxy.headers) for (var k2 in SITE.proxy.headers) newHdr[k2] = SITE.proxy.headers[k2];
  return { url: proxied, hdr: newHdr };
}

/** 单独给媒体 URL (m3u8/mp4) 用的 proxy 包装；受 proxy_media 开关控制 */
function wrapMediaUrl(mediaUrl) {
  if (!SITE.proxy || !SITE.proxy.proxy_media) return { url: mediaUrl, hdr: null };
  var pmode = SITE.proxy.mode || 'query';
  var pbase = String(SITE.proxy.base).replace(/\/$/, '');
  var proxied;
  if (pmode === 'path') {
    proxied = pbase + '/' + mediaUrl.replace(/^https?:\/\//, '');
  } else {
    proxied = pbase + '/?url=' + encodeURIComponent(mediaUrl);
  }
  var hdr = SITE.proxy.headers ? Object.assign({}, SITE.proxy.headers) : null;
  return { url: proxied, hdr: hdr };
}

// ---------- 签名 ----------

/** 从 SignVarSource 算值（运行时） */
function resolveVar(src, ctx) {
  switch (src.kind) {
    case 'literal': return src.value;
    case 'timestamp': return String(Date.now());
    case 'random': {
      var len = src.length || 16;
      var s = '';
      for (var i = 0; i < len; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    }
    case 'bootstrap':
      if (!BOOT) throw new Error('kind:bootstrap 需要先 bootstrap');
      var v = jpath(BOOT, src.path);
      return v == null ? '' : String(v);
    case 'key_table': {
      var pub = ctx.pub || '';
      // eslint-disable-next-line no-new-func
      var idx = 0;
      try { idx = new Function('pub', 'return (' + src.index + ');')(pub); } catch (e) { idx = 0; }
      var clamped = Math.abs(Number(idx)) % src.table.length;
      return src.table[clamped];
    }
    case 'query_lower':
      return String(ctx.query || '').toLowerCase();
    default: return '';
  }
}

function applyAlg(alg, input, hmacKey) {
  if (alg === 'md5') return md5X(input);
  // TODO: sha1/sha256/hmac 需要 FongMi 环境支持；先只做 md5
  return input;
}

function renderTpl(tpl, vals) {
  return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return vals[k] == null ? '' : vals[k]; });
}

/** 给 URL 附加签名 */
function signUrl(base, path, query, mode) {
  if (!mode) return base + '/' + path + (query ? '?' + query : '');
  var vals = { query: query };
  // 按 vars 声明顺序算（key_table 可能依赖 pub）
  var order = Object.keys(mode.vars).sort(function (a, b) {
    // pub 先算
    if (a === 'pub') return -1;
    if (b === 'pub') return 1;
    return 0;
  });
  var anyFailed = false;
  for (var i = 0; i < order.length; i++) {
    var k = order[i];
    try {
      vals[k] = resolveVar(mode.vars[k], vals);
    } catch (e) {
      // 静默失败（cert 模式 BOOT 还没就绪时会抛）
      vals[k] = '';
      anyFailed = true;
    }
  }
  if (anyFailed) return null; // 让 caller 换 mode
  var input = renderTpl(mode.formula, vals);
  var sign = applyAlg(mode.algorithm, input, mode.hmac_key ? renderTpl(mode.hmac_key, vals) : null);
  vals.sign = sign;
  // 组装 URL
  var extra = [];
  for (var attach in mode.attach) {
    extra.push(attach + '=' + renderTpl(mode.attach[attach], vals));
  }
  var q = query ? query + '&' + extra.join('&') : extra.join('&');
  return base + '/' + path + '?' + q;
}

/** 选签名模式 */
function pickMode(endpoint) {
  if (endpoint.sign_mode === 'none') return null;
  if (!SITE.signing || !SITE.signing.modes) return null;
  if (endpoint.sign_mode === 'auto') {
    var strategy = SITE.signing.default_strategy || 'first';
    if (strategy === 'auto') {
      // 优先带 bootstrap 依赖的模式（cert 类）— BOOT 就绪时用它
      if (BOOT && bootIsValid(BOOT)) {
        for (var i = 0; i < SITE.signing.modes.length; i++) {
          var m = SITE.signing.modes[i];
          var hasBoot = false;
          for (var k in m.vars) if (m.vars[k].kind === 'bootstrap') { hasBoot = true; break; }
          if (hasBoot) return m;
        }
      }
      // BOOT 未就绪 → 选无 bootstrap 依赖的模式
      for (var i2 = 0; i2 < SITE.signing.modes.length; i2++) {
        var m2 = SITE.signing.modes[i2];
        var hasBoot2 = false;
        for (var k2 in m2.vars) if (m2.vars[k2].kind === 'bootstrap') { hasBoot2 = true; break; }
        if (!hasBoot2) return m2;
      }
    }
    return SITE.signing.modes[0];
  }
  for (var j = 0; j < SITE.signing.modes.length; j++) {
    if (SITE.signing.modes[j].name === endpoint.sign_mode) return SITE.signing.modes[j];
  }
  return null;
}

// ---------- bootstrap ----------
function ensureBoot() {
  // 完整成功过一次就不再重跑
  if (BOOT && bootIsValid(BOOT)) return true;
  if (!SITE.bootstrap) { BOOT = {}; return true; } // 无 bootstrap
  var ep = null;
  for (var i = 0; i < SITE.endpoints.length; i++) {
    if (SITE.endpoints[i].name === SITE.bootstrap.endpoint) { ep = SITE.endpoints[i]; break; }
  }
  if (!ep) { console.log('[s2s] bootstrap endpoint 未找到'); return false; }
  var raw = callEndpointRaw(ep, {});
  if (!raw) { console.log('[s2s] bootstrap 请求失败(无响应)'); return false; }
  // bootstrap extract 路径跟业务端点保持一致 — 从 data 层开始
  // (callEndpointRaw 返回完整 { ret, data, msg }, bootstrap.extract path 里
  //  写的是 "info[0].pConfig.publicKey" 而不是 "data.info[0].pConfig.publicKey")
  var payload = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
  var extracted = {};
  for (var k in SITE.bootstrap.extract) {
    extracted[k] = jpath(payload, SITE.bootstrap.extract[k]);
  }
  // 后处理
  if (SITE.bootstrap.transforms) {
    for (var t = 0; t < SITE.bootstrap.transforms.length; t++) {
      var trs = SITE.bootstrap.transforms[t];
      var v = extracted[trs.field];
      if (trs.op === 'as_array' && typeof v === 'string') extracted[trs.field] = [v];
      else if (trs.op === 'as_string' && Array.isArray(v)) extracted[trs.field] = v[0] || '';
      else if (trs.op === 'first_item' && Array.isArray(v)) extracted[trs.field] = v[0];
    }
  }
  if (!bootIsValid(extracted)) {
    console.log('[s2s] bootstrap 提取值全空, 保留 BOOT=null 稍后重试');
    return false;
  }
  BOOT = extracted;
  console.log('[s2s] bootstrap ok, keys=' + Object.keys(extracted).join(','));
  return true;
}

/** 判断 bootstrap 提取的值有效（至少一个字段非空）*/
function bootIsValid(b) {
  if (!b) return false;
  for (var k in b) {
    var v = b[k];
    if (v == null) continue;
    if (typeof v === 'string' && !v) continue;
    if (Array.isArray(v) && !v.length) continue;
    return true;
  }
  return false;
}

// ---------- API 调用 ----------
function fillTemplate(tpl, params) {
  return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) {
    if (params[k] == null) return '';
    var v = String(params[k]);
    // 只 encode 会破坏 URL 语法的字符: 空格/#/? 等；保留逗号/斜杠/字母数字
    return v.replace(/[\s#?&+%]/g, function (c) { return encodeURIComponent(c); });
  });
}

function callEndpointRaw(endpoint, params) {
  var base = SITE.bases[endpoint.base];
  if (!base) { console.log('[s2s] endpoint ' + endpoint.name + ' base ' + endpoint.base + ' 未定义'); return null; }
  var query = fillTemplate(endpoint.query, params);
  var mode = pickMode(endpoint);
  var url = signUrl(base, endpoint.path, query, mode);
  if (url == null) {
    // 签名依赖没就绪（例 cert 模式 BOOT 缺）→ 换个 mode
    if (SITE.signing && SITE.signing.modes) {
      for (var mi = 0; mi < SITE.signing.modes.length; mi++) {
        var m2 = SITE.signing.modes[mi];
        if (m2 === mode) continue;
        var url2 = signUrl(base, endpoint.path, query, m2);
        if (url2) { url = url2; break; }
      }
    }
    if (url == null) return null;
  }
  var hdr = HDR;
  if (endpoint.headers) { hdr = {}; for (var k in HDR) hdr[k] = HDR[k]; for (var k2 in endpoint.headers) hdr[k2] = endpoint.headers[k2]; }
  // 应用 proxy（GEO block 绕过）
  var wrapped = wrapProxy(url, endpoint.base, hdr);
  url = wrapped.url; hdr = wrapped.hdr;
  var opt = { headers: hdr };
  if (endpoint.method === 'POST') { opt.method = 'POST'; opt.body = fillTemplate(endpoint.body || '', params); }
  try {
    var res = req(url, opt);
    var body = (res && res.content) || res;
    var j = typeof body === 'string' ? JSON.parse(body) : body;
    return j;
  } catch (e) {
    console.log('[s2s] ' + endpoint.name + ' 异常: ' + e.message);
    return null;
  }
}

/** 高级 API 调用：auto 模式在首选失败时试 fallback */
function callEndpoint(endpoint, params) {
  var raw = callEndpointRaw(endpoint, params);
  // 判定成功：优先看 data.code === 0（多数 API 结构）；
  // 兼容 data 顶层就是数据的情况：只要 data 存在就算成功
  if (raw && raw.data) {
    if (raw.data.code === 0 || raw.data.code === undefined) return raw.data;
  }
  // 失败：auto 模式尝试用其他签名模式
  if (endpoint.sign_mode === 'auto' && SITE.signing && SITE.signing.modes.length > 1) {
    // 找当前用的是哪个 mode，试下一个
    var curMode = pickMode(endpoint);
    var altMode = null;
    for (var mi = 0; mi < SITE.signing.modes.length; mi++) {
      if (SITE.signing.modes[mi] !== curMode) { altMode = SITE.signing.modes[mi]; break; }
    }
    if (altMode) {
      // 临时改 endpoint 的 sign_mode 指定为 alt
      var epAlt = {}; for (var k in endpoint) epAlt[k] = endpoint[k];
      epAlt.sign_mode = altMode.name;
      console.log('[s2s] ' + endpoint.name + ' 首选失败(code=' + (raw && raw.data && raw.data.code) + '), 试 ' + altMode.name);
      var raw2 = callEndpointRaw(epAlt, params);
      if (raw2 && raw2.data && (raw2.data.code === 0 || raw2.data.code === undefined)) return raw2.data;
      console.log('[s2s] ' + endpoint.name + ' fallback 也失败: code=' + (raw2 && raw2.data && raw2.data.code) + ' msg=' + (raw2 && raw2.data && raw2.data.msg));
    }
  } else if (raw && raw.data) {
    console.log('[s2s] ' + endpoint.name + ' code=' + raw.data.code + ' msg=' + raw.data.msg);
  } else {
    console.log('[s2s] ' + endpoint.name + ' 无响应');
  }
  return null;
}

/** 找 endpoint 对象 */
function findEndpoint(name) {
  for (var i = 0; i < SITE.endpoints.length; i++) {
    if (SITE.endpoints[i].name === name) return SITE.endpoints[i];
  }
  return null;
}

// ---------- vod 映射 ----------
function itemToVod(item, mappings) {
  var m = mappings || SITE.mappings;
  var id = pickField(item, m.vod_id);
  var name = pickField(item, m.vod_name);
  var pic = pickField(item, m.vod_pic);
  return {
    vod_id: id ? String(id) : '',
    vod_name: name ? String(name) : '',
    vod_pic: pic ? String(pic) : '',
    vod_year: pickField(item, m.vod_year) + '',
    vod_area: pickField(item, m.vod_area) + '',
    vod_actor: joinIfArr(pickField(item, m.vod_actor)),
    vod_director: joinIfArr(pickField(item, m.vod_director)),
    vod_content: pickField(item, m.vod_content) + '',
    vod_remarks: pickField(item, m.vod_remarks) + '',
  };
}

function joinIfArr(v) {
  if (Array.isArray(v)) return v.join(',');
  return v == null ? '' : String(v);
}


// ---------- T3 接口 ----------

function init(cfg) {
  console.log('[s2s] init: aiyifan (爱壹帆)');
  ensureBoot();
}

function home(filter) {
  var classes = SITE.categories.map(function (c) { return { type_id: c.id, type_name: c.name }; });
  return JSON.stringify({ class: classes });
}

function loadHome() {
  var now = Date.now();
  if (HOME_CACHE && now - HOME_AT < 600000) return HOME_CACHE;
  var ep = findEndpoint('home');
  if (!ep) return null;
  var d = callEndpoint(ep, {});
  if (!d) return null;
  HOME_CACHE = d; HOME_AT = now;
  return d;
}

function homeVod() {
  var d = loadHome();
  if (!d) return JSON.stringify({ list: [] });
  var firstCat = SITE.categories[0];
  var list = extractCategoryList(d, firstCat).slice(0, 20).map(function (it) { return itemToVod(it); });
  return JSON.stringify({ list: list });
}

/** 从 home 响应里拿某个分类的列表 */
function extractCategoryList(homeData, cat) {
  if (cat.kind === 'static') {
    var arr = jpath(homeData, cat.source_field);
    return Array.isArray(arr) ? arr : [];
  }
  return []; // endpoint 类别在 category() 里处理
}

function category(tid, pg, filter, extend) {
  pg = Number(pg) || 1;
  var PAGE = 30;
  var cat = null;
  for (var i = 0; i < SITE.categories.length; i++) if (SITE.categories[i].id === tid) cat = SITE.categories[i];
  if (!cat) return JSON.stringify({ list: [], page: pg, pagecount: 1, limit: PAGE, total: 0 });

  var list = [];
  var total = 0;
  var pagecount = 1;

  if (cat.kind === 'static') {
    // 从 home 缓存切片
    var d = loadHome();
    var all = d ? extractCategoryList(d, cat) : [];
    total = all.length;
    pagecount = Math.max(1, Math.ceil(all.length / PAGE));
    var start = (pg - 1) * PAGE;
    list = all.slice(start, start + PAGE).map(function (it) { return itemToVod(it); });
  } else {
    // endpoint 类别：调对应端点
    var ep = findEndpoint(cat.endpoint);
    if (ep) {
      var params = {};
      if (cat.params) for (var k in cat.params) params[k] = cat.params[k];
      params.page = pg; params.pg = pg;
      var d2 = callEndpoint(ep, params);
      if (d2 && ep.response && ep.response.list) {
        var raw = pickResp(d2, ep.response.list);
        if (Array.isArray(raw)) list = raw.map(function (it) { return itemToVod(it); });
      }
    }
  }

  return JSON.stringify({ list: list, page: pg, pagecount: pagecount, limit: PAGE, total: total });
}

function detail(id) {
  var epD = findEndpoint('detail');
  var epE = findEndpoint('episodes');
  var meta = null;
  var epCid = '';
  if (epD) {
    var d = callEndpoint(epD, { id: id });
    if (d && epD.response && epD.response.item) {
      meta = pickResp(d, epD.response.item);
      // 尝试从 meta 里抓 cid（episodes 端点可能需要）
      epCid = (meta && (meta.publishNavKey || meta.cid || '')) || '';
      // publishNavKey 可能是名字, 不是路径, 优先 cid 字段
      if (meta && meta.cid) epCid = meta.cid;
    }
  }

  var epList = [];
  if (epE) {
    var d2 = callEndpoint(epE, { id: id, vid: id, cid: epCid });
    if (d2 && epE.response && epE.response.episodes) {
      var raw = pickResp(d2, epE.response.episodes);
      if (Array.isArray(raw)) {
        var epMap = SITE.mappings;
        epList = raw.map(function (e) {
          return {
            name: pickField(e, epMap.ep_name || ['name', 'title']),
            key: pickField(e, epMap.ep_id || ['key', 'id']),
          };
        }).filter(function (e) { return e.name && e.key; });
      }
    }
  }

  var vodPlayUrl;
  if (epList.length) {
    vodPlayUrl = epList.map(function (e) { return e.name + '$' + e.key; }).join('#');
  } else {
    vodPlayUrl = '正片$' + id;
  }

  var vod = itemToVod(meta || { key: id });
  vod.vod_id = id;
  vod.vod_play_from = SITE.name;
  vod.vod_play_url = vodPlayUrl;
  return JSON.stringify({ list: [vod] });
}

function play(flag, id, flags) {
  var ep = findEndpoint('play');
  if (!ep) return JSON.stringify({ parse: 1, url: SITE.site_url + '/play/' + id });
  var d = callEndpoint(ep, { id: id });
  var url = '';
  var isHls = false;
  if (d && ep.response && ep.response.play_url) {
    var picked = pickResp(d, ep.response.play_url);
    if (picked) {
      if (typeof picked === 'string') url = picked;
      else if (picked.result) { url = picked.result; isHls = !!picked.isHls; }
      else if (picked.path && picked.path.result) { url = picked.path.result; isHls = !!picked.path.isHls; }
    }
  }
  if (url) {
    console.log('[s2s] play 命中(' + (isHls ? 'HLS' : url.match(/\.m3u8/) ? 'HLS' : 'MP4') + '): ' + url.substring(0, 80));
    var hdr = { 'User-Agent': HDR['User-Agent'], 'Referer': SITE.site_url + '/' };
    // 播流是否也走 proxy（受 SITE.proxy.proxy_media 控制）
    var wrappedMedia = wrapMediaUrl(url);
    if (wrappedMedia.url !== url) {
      console.log('[s2s] play 走 proxy: ' + wrappedMedia.url.substring(0, 80));
      url = wrappedMedia.url;
      if (wrappedMedia.hdr) for (var mk in wrappedMedia.hdr) hdr[mk] = wrappedMedia.hdr[mk];
    }
    return JSON.stringify({ parse: 0, url: url, header: hdr });
  }
  // 兜底嗅探
  var fbUrl = SITE.play_result && SITE.play_result.on_miss ?
    SITE.play_result.on_miss.url_template
      .replace('{site_url}', SITE.site_url)
      .replace('{id}', id) :
    SITE.site_url + '/play/' + id;
  console.log('[s2s] play 无地址, 退回嗅探: ' + fbUrl);
  return JSON.stringify({ parse: 1, url: fbUrl, header: { 'User-Agent': HDR['User-Agent'], 'Referer': SITE.site_url + '/' } });
}

function search(wd, quick, pg) {
  pg = Number(pg) || 1;
  var ep = findEndpoint('search');
  if (!ep) return JSON.stringify({ list: [] });
  var d = callEndpoint(ep, { wd: wd, keyword: wd, tags: wd, page: pg, pg: pg });
  var list = [];
  if (d && ep.response && ep.response.list) {
    var raw = pickResp(d, ep.response.list);
    if (Array.isArray(raw)) list = raw.map(function (it) { return itemToVod(it); });
  }
  return JSON.stringify({ list: list });
}

function isVideoFormat(url) { return /\.(m3u8|mp4|flv|mkv|ts)(\?|$)/i.test(url); }
function manualVideoCheck() { return false; }


export function __jsEvalReturn() {
  return {
    init: init, home: home, homeVod: homeVod, category: category,
    detail: detail, play: play, search: search,
    isVideoFormat: isVideoFormat, manualVideoCheck: manualVideoCheck,
  };
}
