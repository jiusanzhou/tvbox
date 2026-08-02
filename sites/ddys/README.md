# 🎞 低端影视 (ddys) 静态镜像 Spider

**数据源**: `https://ddys.lat/data/`（静态 JSON 快照镜像）  
**类型**: fongmi/CatVod T3 JS Spider  
**签名**: 无  
**验证码**: 无  
**Referer 限制**: 无

## 为什么用镜像

主站 `ddys.app`（含 `ddys.tv` 302）用了 `ddys-protect` 插件：
- 4 位密码（`ddys`）
- Altcha PoW（Worker 里能算，78ms）
- **依次点击 3 个图形验证码**（Worker 里无法自动通过）

主站 `ddys.io`（官方 desktop 客户端硬编码的 API host）从大陆 IP 访问 `39.109.122.128` 已不通。

`ddys.lat` 是官方维护的**静态离线镜像**：
- `manifest.json` — 生成时间 + chunk 数
- `list.json` — 4557 部片轻量列表 `[{id, ti, yr, rt, rg, tp}]`
- `search.json` — 全量搜索索引
- `id-map.json` — id → chunk 编号
- `movies-{1..10}.json` — 每 chunk 500 部完整数据（含 `ol` 播放地址 + `dl` 网盘 + `in` 简介）

## 播放格式

单集片（movie/anime/variety）：
```json
"ol": [{"n": "播放源 1", "u": "https://v.lzcdn27.com/xxx/index.m3u8", "q": "1080P", "f": "m3u8"}]
```

多集剧（series）：
```json
"ol": [{"n": "播放源 1", "u": "第01集$https://v.lzcdn25.com/.../index.m3u8#第02集$https://...", ...}]
```

spider 单集会包装为 `正片$URL`，多集直接透传（tvbox 原生支持 `#` 分隔）。

## m3u8 CDN

`v.lzcdn**.com` — Access-Control-Allow-Origin: *，无 Referer 限制，任何设备可播。

## 局限

- **快照数据**（`manifest.generated` 记录时间，通常滞后主站几天到一两周）
- 不含**封面图片 URL**（前端会占位显示，不影响使用）
- 无筛选（filterable=0）
- 网盘下载线路暂不展示（避免用户点了不能播）

## 主动更新

镜像本身由官方定时刷新，无需我们维护。想追新片可直接访问 `ddys.app` 用浏览器手动过 gate 看。
