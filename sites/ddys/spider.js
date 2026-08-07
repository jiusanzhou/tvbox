// ddys (低端影视) 静态镜像 spider —— fongmi/CatVod JS T3
//
// 数据源: https://ddys.lat/data/
//   /manifest.json  -> {totalMovies, chunkSize, totalChunks}
//   /list.json      -> [{id, ti, yr, rt, rg, tp}]  轻量列表（首页/分类用）
//   /search.json    -> [{id, t, y, r, v}]         搜索索引
//   /id-map.json    -> {id: chunkNum}             id → 属于哪个 chunk
//   /movies-N.json  -> [{id, ti, te, sl, yr, rt, rg, tp, tn, dr, ac, ge, in, ol, dl, ua}]
//
// 播放地址在 detail 的 ol[]:
//   movie/anime/variety: ol = [{n, u, q, f}]           u 是单个 m3u8 URL
//   series:              ol = [{n, u, q, f}]           u 是 "第01集$URL#第02集$URL#..."
//
// 注意事项:
// - 无签名、无 CORS、无 referer 限制（m3u8 CDN 直接可播）
// - 镜像是快照（生成时间在 manifest.generated），不含最新几十条，但覆盖 4557 部足够
// - 静态站，首页排序按 id 倒序（越大越新）
//
// Author: navigator (tvbox aggregator)

var BASE = 'https://ddys.lat';
var UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
var HDR = { 'User-Agent': UA, 'Referer': BASE + '/', 'Accept': 'application/json,text/plain,*/*' };

// 分类定义：id 必须和 tp 字段值对应
var CATS = [
  { id: 'movie', name: '电影' },
  { id: 'series', name: '剧集' },
  { id: 'anime', name: '动漫' },
  { id: 'variety', name: '综艺' },
  { id: 'documentary', name: '纪录片' },
];

// 缓存（每次 spider 冷启动都从 0 开始，但 fongmi 里 spider 实例常驻）
var LIST_CACHE = null;         // 全量轻量列表（list.json）
var LIST_AT = 0;
var SEARCH_CACHE = null;       // 全量搜索索引
var SEARCH_AT = 0;
var ID_MAP = null;             // id -> chunk
var CHUNK_CACHE = {};          // chunk num -> movies-N.json 内容（懒加载）
var CACHE_TTL_MS = 15 * 60 * 1000;

function log(msg) { try { console.log('[ddys] ' + msg); } catch (_) {} }

function fetchJson(path) {
  try {
    var res = req(BASE + path, { headers: HDR });
    // res 可能是 { content: '...', status: 200 } 或直接返 body 字符串
    // 注意: res.content 可能是 空字符串 "" (falsy 但有意义), 不能用 || 兜底成 res 本身
    var body;
    if (res && typeof res === 'object' && 'content' in res) {
      body = res.content;  // 明确取 content, 即使是空字符串
    } else {
      body = res;
    }
    if (!body) return null;  // 空响应 (还没就绪 or 真的空) → null, 不要返 {content:""}
    return typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    log('fetch fail ' + path + ': ' + e);
    return null;
  }
}

function ensureList() {
  if (LIST_CACHE && Date.now() - LIST_AT < CACHE_TTL_MS) return LIST_CACHE;
  var arr = fetchJson('/data/list.json');
  if (arr && arr.length) {
    LIST_CACHE = arr;
    LIST_AT = Date.now();
    log('list.json loaded, ' + arr.length + ' items');
  }
  return LIST_CACHE || [];
}

function ensureSearch() {
  if (SEARCH_CACHE && Date.now() - SEARCH_AT < CACHE_TTL_MS) return SEARCH_CACHE;
  var arr = fetchJson('/data/search.json');
  if (arr && arr.length) {
    SEARCH_CACHE = arr;
    SEARCH_AT = Date.now();
    log('search.json loaded, ' + arr.length + ' items');
  }
  return SEARCH_CACHE || [];
}

function ensureIdMap() {
  if (ID_MAP) return ID_MAP;
  var m = fetchJson('/data/id-map.json');
  if (m) {
    ID_MAP = m;
    log('id-map.json loaded, ' + Object.keys(m).length + ' entries');
  }
  return ID_MAP || {};
}

function getChunk(n) {
  if (CHUNK_CACHE[n]) return CHUNK_CACHE[n];
  var arr = fetchJson('/data/movies-' + n + '.json');
  if (arr && arr.length) {
    CHUNK_CACHE[n] = arr;
    log('chunk ' + n + ' loaded (' + arr.length + ' items)');
  }
  return CHUNK_CACHE[n] || [];
}

function findById(id) {
  id = Number(id);
  var map = ensureIdMap();
  var chunk = map[id];
  if (!chunk) {
    log('id ' + id + ' not in id-map');
    return null;
  }
  var arr = getChunk(chunk);
  for (var i = 0; i < arr.length; i++) if (Number(arr[i].id) === id) return arr[i];
  return null;
}

// list 里的一条 -> vod card
function listToCard(item) {
  return {
    vod_id: '' + item.id,
    vod_name: item.ti || item.t || '',
    vod_pic: '',                          // 镜像不含封面 URL，前端会自动占位
    vod_year: item.yr || item.y || '',
    vod_area: item.rg || item.r || '',
    vod_remarks: (item.rt || item.v) ? ('★ ' + (item.rt || item.v)) : '',
  };
}

// full detail item -> vod object
function detailToVod(m) {
  var v = {
    vod_id: '' + m.id,
    vod_name: m.ti || '',
    vod_pic: '',
    vod_year: m.yr || '',
    vod_area: m.rg || '',
    vod_remarks: m.rt ? ('★ ' + m.rt) : '',
    vod_actor: m.ac || '',
    vod_director: m.dr || '',
    type_name: m.tn || '',
    vod_content: cleanHtml(m.in || ''),
    vod_lang: '',
  };
  if (m.te) v.vod_name = v.vod_name + ' (' + m.te + ')';
  if (m.ge && m.ge.length) v.vod_class = m.ge.join(',');

  // 组装播放
  var flags = [], urls = [];
  if (m.ol && m.ol.length) {
    for (var i = 0; i < m.ol.length; i++) {
      var s = m.ol[i];
      if (!s || !s.u) continue;
      var name = s.n || ('线路' + (i + 1));
      // series 类型: u = "第01集$URL#第02集$URL#..."
      // 单集: u 是纯 URL, 我们包装成 "正片$URL"
      var url = s.u;
      if (url.indexOf('$') < 0 && url.indexOf('#') < 0) {
        url = '正片$' + url;
      }
      flags.push(name);
      urls.push(url);
    }
  }
  // 附加下载线路（网盘），fongmi 会渲染成"下载"按钮但没法直接播
  // 这里不展示，避免用户点了播不出
  if (flags.length) {
    v.vod_play_from = flags.join('$$$');
    v.vod_play_url = urls.join('$$$');
  }
  return v;
}

function cleanHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, '\'').replace(/&quot;/g, '"').trim();
}

// ============================================================
// tvbox API 实现
// ============================================================

function init(cfg) {
  log('init called');
  return '{}';
}

function home(filter) {
  log('home filter=' + filter);
  var classes = [];
  for (var i = 0; i < CATS.length; i++) {
    classes.push({ type_id: CATS[i].id, type_name: CATS[i].name });
  }
  // 首页列表：所有分类打乱后取前 24（这里简单取 list.json 前 24 条）
  var list = ensureList();
  var videos = [];
  for (var j = 0; j < Math.min(24, list.length); j++) {
    videos.push(listToCard(list[j]));
  }
  return JSON.stringify({
    class: classes,
    list: videos,
  });
}

function homeVod() {
  var list = ensureList();
  var videos = [];
  for (var j = 0; j < Math.min(24, list.length); j++) {
    videos.push(listToCard(list[j]));
  }
  return JSON.stringify({ list: videos });
}

function category(tid, pg, filter, extend) {
  var page = Number(pg) || 1;
  var pageSize = 24;
  log('category tid=' + tid + ' pg=' + page);
  var list = ensureList();
  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].tp === tid) filtered.push(list[i]);
  }
  var start = (page - 1) * pageSize;
  var slice = filtered.slice(start, start + pageSize);
  var videos = [];
  for (var j = 0; j < slice.length; j++) videos.push(listToCard(slice[j]));
  var pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  return JSON.stringify({
    page: page,
    pagecount: pageCount,
    limit: pageSize,
    total: filtered.length,
    list: videos,
  });
}

function detail(ids) {
  var id = ids;
  if (Array.isArray(ids)) id = ids[0];
  if (typeof id === 'string' && id.indexOf(',') >= 0) id = id.split(',')[0];
  log('detail id=' + id);
  var m = findById(id);
  if (!m) return JSON.stringify({ list: [] });
  return JSON.stringify({ list: [detailToVod(m)] });
}

function search(wd, quick) {
  log('search wd=' + wd + ' quick=' + quick);
  var idx = ensureSearch();
  var q = String(wd || '').toLowerCase().trim();
  if (!q) return JSON.stringify({ list: [] });
  var hits = [];
  for (var i = 0; i < idx.length && hits.length < 50; i++) {
    var it = idx[i];
    var t = String(it.t || '').toLowerCase();
    if (t.indexOf(q) >= 0) hits.push(listToCard(it));
  }
  return JSON.stringify({ list: hits });
}

function play(flag, id, flags) {
  // id 就是集内 URL（tvbox 会把 vod_play_url 里 $ 右边的部分传进来）
  log('play flag=' + flag + ' id=' + String(id).slice(0, 80));
  return JSON.stringify({
    parse: 0,
    playUrl: '',
    url: id,
    header: JSON.stringify({ 'User-Agent': UA }),
  });
}

function isVideoFormat(url) { return /\.(m3u8|mp4|flv|mkv|ts)(\?|$)/i.test(url); }
function manualVideoCheck() { return false; }

// fongmi/CatVod 入口 — 必须 export __jsEvalReturn 返回 API 对象
export function __jsEvalReturn() {
  return {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    play: play,
    search: search,
    isVideoFormat: isVideoFormat,
    manualVideoCheck: manualVideoCheck,
  };
}
