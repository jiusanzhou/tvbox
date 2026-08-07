# tvbox

个人 TVBox 配置聚合仓库。多个 site 合并成**一个订阅链接**，客户端里可切换。

## 📺 快速使用

在 FongMi TV / 影视仓 / TVBox 里导入：

```
https://zoe.im/tvbox/tvbox.json
```

备用（同一份内容，不同 CDN 路径）：
- `https://cdn.jsdelivr.net/gh/jiusanzhou/tvbox@main/tvbox.json`
- `https://raw.githubusercontent.com/jiusanzhou/tvbox/main/tvbox.json`

导入后首页顶部的 **站源** 按钮可切换 site。

👉 **面板**：<https://zoe.im/tvbox/>（含二维码 + 站源健康状态）

## 🎬 收录站点

| Key | 名字 | 类型 | 说明 |
|---|---|---|---|
| `aiyifan_api` | 🎬 爱壹帆 | API 型 spider | 全签名 + CDN warmup + 分页/选集 |
| `ddys` | 🎞 低端影视 | 静态镜像 spider | 数据源 `ddys.lat/data/*.json`，无签名/无验证码，m3u8 直播 |

## 📡 直播源

`shared/lives.json` 内置 8 组直播源，客户端里可切换：

| 名字 | 上游 | 说明 |
|---|---|---|
| 📡 央视卫视 | fanmingming/live | 央视 + 卫视 |
| 🌍 全球直播 | YueChan/Live Global.m3u | 全球主流 |
| 📺 IPTV 综合 | YueChan/Live IPTV.m3u | 综合 IPTV |
| 🇭🇰 港澳台 | YueChan/Live GNTV.m3u | 港澳台 |
| 🏞 湖南本地 | YueChan/Live Hunan.txt | 湖南 |
| 📻 广播电台 | YueChan/Live Radio.m3u | 电台 |
| 🎙 央视备用 | YueChan/Live CUTV.txt | 央视备用 |
| 🔞 Adult | 历史恢复 (35 频道) | 上游 2025 年已删除，本仓库自维护 |

YueChan 上游的 6 个源由 `.github/workflows/sync-lives.yml` **每天 UTC 06:30**（北京 14:30）自动同步，落地到 `shared/lives/` 并镜像到 GH Pages (`zoe.im/tvbox/shared/lives/*`)。

手动同步：

```bash
pnpm sync:lives:dry   # 只看 diff, 不写盘
pnpm sync:lives       # 拉最新
```

## 🛠️ 本地开发

```bash
# 从 site2source-ext 同步最新 spider 产物
pnpm sync

# 重新打包 tvbox.json
pnpm build

# 本地测试(fongmi 直连 http://10.0.2.2:8899/tvbox.json)
pnpm build:local
pnpm serve

# 冒烟测试(契约 + 依赖可达性)
pnpm smoke

# CI 版(输出 smoke.json)
pnpm smoke:ci
```

## 🔬 冒烟测试

`scripts/smoke.mjs` 干两件事：

1. **契约检查**：import 每个 `sites/*/spider.js`，验证 `__jsEvalReturn()` 返回的 API 有 9 个必需方法（`init/home/homeVod/category/detail/play/search/isVideoFormat/manualVideoCheck`）
2. **依赖可达性**：从 `meta.json` 的 `probes` 数组（或源码里 grep）拿出 http(s) URL，逐个 HEAD 探活

输出 `smoke.json`（GH Pages 上 `docs/` 展示）。

**给站点写探针**（`meta.json`）：

```json
{
  "probes": [
    "https://xxx.com/api/status"
  ]
}
```

不写的话会退化到源码 grep，可能包含 spider 不实际用的 URL。

## 🏗️ CI

两个 workflow：

- `build.yml` — push 时跑 build + smoke，重新生成 `tvbox.json`
- `smoke.yml` — 每 6 小时定时探活，只更新 `smoke.json`

## 📂 目录结构

```
tvbox/
├── tvbox.json                  # ⭐ 用户订阅入口(CI 自动生成)
├── sites/
│   └── aiyifan/
│       ├── spider.js           # spider 代码
│       ├── meta.json           # {key,name,searchable,...}
│       └── README.md           # 站点说明
├── shared/
│   ├── parses.json             # 解析器列表
│   └── lives.json              # 直播源
├── scripts/
│   ├── build.mjs               # 扫 sites/*/meta.json → 拼 tvbox.json
│   ├── validate.mjs            # 只校验不写文件
│   └── sync-from-ext.mjs       # 从 site2source-ext 同步 spider
└── .github/workflows/
    └── build.yml               # push 自动 build + commit
```

## ➕ 添加新 site

1. `mkdir sites/xxx`
2. 放 `spider.js`
3. 写 `sites/xxx/meta.json`:
   ```json
   {
     "key": "xxx",
     "name": "🎯 站点名",
     "type": 3,
     "spider": "sites/xxx/spider.js",
     "searchable": 1,
     "quickSearch": 1,
     "filterable": 1
   }
   ```
4. `pnpm build`
5. `git push` → CI 自动重新生成 tvbox.json

## ⚠️ 坑位

看 `site2source-ext/docs/SPIDER-PITFALLS.md`（8 个真实事故）。

`build.mjs` 里的 validator 会自动拦截：
- flags 含非官方 flag（P0）
- parses 数组为空
- site key 重复
- api 格式错误

## 🔗 CDN 分发

三层备份：

- **jsdelivr**（默认）: `https://cdn.jsdelivr.net/gh/jiusanzhou/tvbox@main/tvbox.json`
- **github raw**: `https://raw.githubusercontent.com/jiusanzhou/tvbox/main/tvbox.json`
- **本地**: `pnpm build:local && pnpm serve` → `http://10.0.2.2:8899/tvbox.json`

## 🔒 安全

- 仅收录**免费公开**的站点，不含付费/破解
- 所有 spider 只做协议适配，不含个人 token
- 私密配置（含 API key 的）单独放，不入本仓库
