# aiyifan (爱壹帆)

- **数据源**: https://www.aiyifan.tv
- **API 主机**: m10.aiyifan.tv
- **签名**: cert + timestamp 双模，MD5(pub + '&' + query.toLowerCase() + '&' + pk)
- **CDN**: sss111-e1.pipecdn.vip (HLS), s1-a1.global-cdn.me (MP4 广告)
- **签名生成器**: `lib/aiyifan-api-spider.ts` @ jiusanzhou/site2source-ext

## 支持能力

- ✅ 分类列表（8 分类，每分类真正翻页，总量最多 14882/30 页）
- ✅ 搜索（快速搜索开启）
- ✅ 剧集选集（完整列出，无 1080P 单集问题）
- ✅ HLS 播放（含 CDN warmup 防冷启动 520）
- ⚠️  出口 IP 限制：签名 URL 编码了生成时 IP，跨地域访问可能失败

## 已知坑位

见 [docs/SPIDER-PITFALLS.md](../../docs/SPIDER-PITFALLS.md) at site2source-ext.

## 更新方式

从 `site2source-ext/test-output/spider_aiyifan_api_t3.js` 同步过来。
