// site2source-ext — aiyifan API 型 T3 spider
// Generated: 2026-08-02T07:23:59.623Z
//
// 完整签名双模:
//   1. timestamp: pub=Date.now(), pk=PKS_TS[pub%8], vv=md5(pub+'&'+q+'&'+pk)
//   2. cert:      pub=pConfig.publicKey, pk=pConfig.privateKey[0], 同公式
// video/play 用集 key 时必须 cert; 其他端点两者都行, 但 cert 更稳。
//
// 剧集列表: v3/video/languagesplaylist?cinema=1&vid={key}&lsk=1&taxis=0&cid={cid}
// 每集 play: v3/video/play?cinema=1&id={集key}&a=0&lang=none&usersign=1&region=SG&device=1&isMasterSupport=1

import * as cheerio from 'assets://js/lib/cat.js';

var API = 'https://m10.aiyifan.tv';
var RANK = 'https://rankv21.aiyifan.tv';
var SITE = 'https://www.aiyifan.tv';

// timestamp 模式的 8 个混淆密钥（形近字符攻击式命名）
var PKS_TS = [
  'version001', 'vers1on001', 'vers1on00i', 'bersion001',
  'vcrsion001', 'versi0n001', 'versio_001', 'version0o1',
];

var HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Referer': SITE + '/',
  'Origin': SITE,
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

var CATS = [
  { id: 'filmList', name: '电影', cid: '0,1,3' },
  { id: 'tvList', name: '剧集', cid: '0,1,4' },
  { id: 'varietyList', name: '综艺', cid: '0,1,5' },
  { id: 'animeList', name: '动漫', cid: '0,1,6' },
  { id: 'shortList', name: '短剧', cid: '0,1,8' },
  { id: 'documentaryList', name: '纪录片', cid: '0,1,7' },
  { id: 'sportList', name: '体育', cid: '0,1,9' },
];

// pConfig 缓存: 首次 bootstrap 后长期有效
var PCONFIG = null;
// 首页聚合缓存（10 分钟）
var CACHE = null;
var CACHE_AT = 0;
// detail 缓存（key -> {cid, title, ...}）—— languagesplaylist 要 cid
var DETAIL_CACHE = {};

// 用 timestamp 模式签一个 URL（不需要 pConfig, 用于 bootstrap）
function signedUrlTS(base, path, query) {
  var pub = '' + Date.now();
  var pk = PKS_TS[Number(pub) % PKS_TS.length];
  var vv = md5X(pub + '&' + query.toLowerCase() + '&' + pk);
  return base + '/' + path + '?' + query + '&vv=' + vv + '&pub=' + pub;
}

// 用 cert 模式签一个 URL（pConfig 已就绪）
function signedUrlCert(base, path, query) {
  var pub = PCONFIG.publicKey;
  var pk = PCONFIG.privateKey[0];
  var vv = md5X(pub + '&' + query.toLowerCase() + '&' + pk);
  return base + '/' + path + '?' + query + '&vv=' + vv + '&pub=' + pub;
}

// bootstrap: 拿 pConfig（幂等）
function ensureBootstrap() {
  if (PCONFIG) return true;
  var url = signedUrlTS(API, 'v3/home/config', 'cinema=1');
  try {
    var res = req(url, { headers: HDR });
    var body = res.content || res;
    var j = typeof body === 'string' ? JSON.parse(body) : body;
    var info = j && j.data && j.data.info;
    var pc = info && info[0] && info[0].pConfig;
    if (pc && pc.publicKey && pc.privateKey && pc.privateKey.length) {
      // pConfig.privateKey 有时是字符串, 有时是数组, 统一成数组
      var pkArr = typeof pc.privateKey === 'string' ? [pc.privateKey] : pc.privateKey;
      PCONFIG = { publicKey: pc.publicKey, privateKey: pkArr };
      console.log('[s2s] bootstrap 完成，pConfig 已获取');
      return true;
    }
    console.log('[s2s] bootstrap 失败: pConfig 缺失，code=' + (j && j.data && j.data.code) + ' msg=' + (j && j.data && j.data.msg));
  } catch (e) {
    console.log('[s2s] bootstrap 异常: ' + e.message);
  }
  return false;
}

// 通用 API 调用: mode='auto' 优先 cert, 失败退 timestamp
function apiGet(base, path, query, mode) {
  var useCert = (mode !== 'ts') && ensureBootstrap();
  var url = useCert ? signedUrlCert(base, path, query) : signedUrlTS(base, path, query);
  var res, body, j;
  try {
    res = req(url, { headers: HDR });
    body = res.content || res;
    j = typeof body === 'string' ? JSON.parse(body) : body;
    if (j && j.data && j.data.code === 0) return j.data.info;
    // cert 失败 → 试 timestamp（很少见, 保险起见）
    if (useCert && j && j.data && j.data.code !== 0) {
      console.log('[s2s] cert 失败, 试 timestamp: ' + path + ' msg=' + j.data.msg);
      var url2 = signedUrlTS(base, path, query);
      var res2 = req(url2, { headers: HDR });
      var body2 = res2.content || res2;
      var j2 = typeof body2 === 'string' ? JSON.parse(body2) : body2;
      if (j2 && j2.data && j2.data.code === 0) return j2.data.info;
      console.log('[s2s] api ' + path + ' 两种模式都失败: cert msg=' + j.data.msg + ' ts msg=' + (j2 && j2.data && j2.data.msg));
    } else {
      console.log('[s2s] api ' + path + ' code=' + (j && j.data && j.data.code) + ' msg=' + (j && j.data && j.data.msg));
    }
  } catch (e) {
    console.log('[s2s] api ' + path + ' 异常: ' + e.message);
  }
  return null;
}

function toVod(it) {
  // getAllVideo 用 key/image/rating(评分字符串)
  // briefsearch 用 contxt/imgPath/score+rating(热度数字)
  var id = it.key || it.contxt || '';
  var pic = it.image || it.imgPath || '';
  var score = it.score || (typeof it.rating === 'string' ? it.rating : '');
  var remarks = it.lastName ? ('更新至' + it.lastName) : (it.cid || it.atypeName || '');
  if (score) remarks = remarks ? (remarks + ' · ' + score) : score;
  if (it.vipResource) remarks = remarks + ' ' + it.vipResource;
  return {
    vod_id: id,
    vod_name: it.title,
    vod_pic: pic,
    vod_year: it.year ? ('' + it.year) : '',
    vod_area: it.regional || '',
    vod_remarks: remarks,
  };
}

function init(cfg) {
  console.log('[s2s] aiyifan api spider init (cert+timestamp 双模)');
  ensureBootstrap();
}

function home(filter) {
  var classes = CATS.map(function (c) { return { type_id: c.id, type_name: c.name }; });
  return JSON.stringify({ class: classes });
}

function homeVod() {
  var agg = loadAll();
  var list = (agg && agg.filmList ? agg.filmList : []).slice(0, 20).map(toVod);
  return JSON.stringify({ list: list });
}

function loadAll() {
  var now = Date.now();
  if (CACHE && now - CACHE_AT < 600000) return CACHE;
  // size=100 = 约 460KB，size=1000 = 4.6MB 会挂 QuickJS
  var info = apiGet(API, 'v3/home/getAllVideo', 'cinema=1&page=1&size=100&region=SG');
  var agg = info && info[0] ? info[0] : null;
  if (agg) { CACHE = agg; CACHE_AT = now; }
  return agg;
}

function category(tid, pg, filter, extend) {
  if (!pg) pg = 1;
  var PAGE = 30;
  // 找到 CATS 里对应的 cid
  var cid = '';
  for (var i = 0; i < CATS.length; i++) {
    if (CATS[i].id === tid) { cid = CATS[i].cid; break; }
  }
  if (!cid) {
    // 未知 tid → 回退到聚合缓存分页
    var agg0 = loadAll();
    var all0 = (agg0 && agg0[tid]) ? agg0[tid] : [];
    var st = (pg - 1) * PAGE;
    return JSON.stringify({ list: all0.slice(st, st+PAGE).map(toVod), page: pg, pagecount: Math.max(1, Math.ceil(all0.length/PAGE)), limit: PAGE, total: all0.length });
  }
  // list/Search 支持真正翻页
  var q = 'cinema=1&page=' + pg + '&size=' + PAGE +
    '&orderby=0&desc=1&cid=' + cid + '&isserial=-1&isIndex=-1&isfree=-1';
  var info = apiGet(API, 'api/list/Search', q);
  var list = [];
  var total = 0;
  var maxpage = 1;
  if (info && info[0]) {
    list = (info[0].result || []).map(toVod);
    total = info[0].recordcount || list.length;
    maxpage = info[0].maxpage || Math.max(1, Math.ceil(total / PAGE));
  }
  return JSON.stringify({
    list: list, page: pg, pagecount: maxpage, limit: PAGE, total: total,
  });
}

function detail(id) {
  // 1. 先拉 detail 拿元数据 + cid（languagesplaylist 需要 cid）
  var meta = null;
  var detailQ = 'cinema=1&device=1&player=CkPlayer&tech=HLS&lang=cns&v=1&id=' + id + '&region=SG';
  var dInfo = apiGet(API, 'v3/video/detail', detailQ);
  if (dInfo && dInfo[0]) {
    meta = dInfo[0];
    // cid 是 "0,1,4,137" 这种真实路径, publishNavKey 是 "今年" 这种标签, 用 cid
    var cid = meta.cid || '0,1,4';
    DETAIL_CACHE[id] = { cid: cid, meta: meta };
  } else {
    // detail 失败: 用聚合缓存兜底
    var agg = loadAll();
    if (agg) {
      for (var i = 0; i < CATS.length && !meta; i++) {
        var arr = agg[CATS[i].id] || [];
        for (var k = 0; k < arr.length; k++) {
          if (arr[k].key === id || arr[k].contxt === id) { meta = arr[k]; break; }
        }
      }
    }
  }

  // 2. 拉剧集列表
  var epList = [];
  var cidForEp = (DETAIL_CACHE[id] && DETAIL_CACHE[id].cid) || (meta && meta.cid) || '0,1,4';
  var lplQ = 'cinema=1&vid=' + id + '&lsk=1&taxis=0&cid=' + cidForEp;
  var lplInfo = apiGet(API, 'v3/video/languagesplaylist', lplQ);
  if (lplInfo && lplInfo[0] && lplInfo[0].playList) {
    epList = lplInfo[0].playList;
  }

  // 3. 组装 vod_play_url: "名称$集key#名称$集key#..."
  var vodPlayUrl;
  if (epList.length) {
    var parts = epList.map(function (e) { return e.name + '$' + e.key; });
    vodPlayUrl = parts.join('#');
  } else {
    // 单集/电影: 用专辑 key 播
    vodPlayUrl = '正片$' + id;
  }

  var vod = {
    vod_id: id,
    vod_name: meta ? meta.title : id,
    vod_pic: meta ? (meta.image || meta.imgPath || '') : '',
    vod_year: meta && (meta.year || meta.post_Year) ? ('' + (meta.year || meta.post_Year)) : '',
    vod_area: meta ? (meta.regional || '') : '',
    vod_actor: meta ? (meta.starring || (meta.stars && meta.stars.join(',')) || '') : '',
    vod_director: meta ? (meta.directed || (meta.directors && meta.directors.join(',')) || '') : '',
    vod_content: meta ? (meta.shortDes || meta.contxt || '') : '',
    vod_remarks: meta && meta.serialCount ? ('共' + meta.serialCount + '集 更新至' + meta.lastName) : '',
    type_name: meta ? (meta.channel || meta.videoType || '') : '',
    vod_play_from: 'aiyifan',
    vod_play_url: vodPlayUrl,
  };
  return JSON.stringify({ list: [vod] });
}

function search(wd, quick, pg) {
  if (!pg) pg = 1;
  var q = 'tags=' + encodeURIComponent(wd) +
    '&orderby=4&page=' + pg + '&size=20&desc=0&isserial=-1&istitle=true';
  var info = apiGet(RANK, 'v3/list/briefsearch', q);
  var list = [];
  if (info && info[0] && info[0].result) {
    list = info[0].result.map(toVod);
  }
  return JSON.stringify({ list: list });
}

function play(flag, id, flags) {
  // 切集时 a=0, 首播 a=1 —— 但 a=0 更保险（都能通）
  var q = 'cinema=1&id=' + id +
    '&a=0&lang=none&usersign=1&region=SG&device=1&isMasterSupport=1';
  var info = apiGet(API, 'v3/video/play', q);
  var url = '';
  var isHls = false;
  if (info && info[0]) {
    var d = info[0];
    // flvPathList[0] 通常是广告 mp4, [1] 是真 m3u8。
    // 优先级: clarity(enabled=true) → 任 List 里 isHls=true → 任意非空
    var pickReal = function (arr) {
      if (!arr || !arr.length) return null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].result && arr[i].isHls === true) return arr[i];
      }
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].result) return arr[j];
      }
      return null;
    };
    var picked = null;
    if (d.clarity && d.clarity.length) {
      for (var k = 0; k < d.clarity.length; k++) {
        var c = d.clarity[k];
        if (c && c.isEnabled && c.path && c.path.result) { picked = c.path; break; }
      }
    }
    if (!picked) picked = pickReal(d.hlsPathList) || pickReal(d.flvPathList) || pickReal(d.mp4PathList);
    if (picked) { url = picked.result; isHls = !!picked.isHls; }
  }
  if (url) {
    console.log('[s2s] play 命中(' + (isHls ? 'HLS' : 'MP4') + '): ' + url.substring(0, 80));
    // Warmup: CDN 边缘首次冷启动可能 520, 预热一次让 ExoPlayer 拿到 200
    if (isHls) {
      try {
        var warmHdr = { 'User-Agent': HDR['User-Agent'], 'Referer': SITE + '/' };
        for (var w = 0; w < 3; w++) {
          var wr = req(url, { headers: warmHdr });
          var wc = (wr && (wr.code || wr.status)) || 0;
          console.log('[s2s] warmup ' + (w+1) + ': HTTP ' + wc);
          if (wc >= 200 && wc < 400) break;
        }
      } catch (e) { console.log('[s2s] warmup skip: ' + e); }
    }
    return JSON.stringify({
      parse: 0, url: url,
      header: { 'User-Agent': HDR['User-Agent'], 'Referer': SITE + '/' },
    });
  }
  // API 没给地址（配额耗尽/临时错误）→ 退回前端页嗅探
  console.log('[s2s] play API 无地址, 退回嗅探');
  return JSON.stringify({
    parse: 1,
    url: SITE + '/play/' + id,
    header: { 'User-Agent': HDR['User-Agent'], 'Referer': SITE + '/' },
  });
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