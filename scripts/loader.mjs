// scripts/loader.mjs — Node ESM loader, 让 `import x from 'assets://...'` 不炸
// 把 assets:// 映射成一个 stub 模块（导出 cheerio-like 对象, 让 spider 加载不报错）

export function resolve(specifier, context, next) {
  if (specifier.startsWith('assets://')) {
    return { url: 'assets-stub:' + specifier, shortCircuit: true, format: 'module' };
  }
  return next(specifier, context);
}

export function load(url, context, next) {
  if (url.startsWith('assets-stub:')) {
    // 提供 cheerio 常用 API 的 stub, 让 spider 顶层代码 import 不炸
    // spider 只在实际 crawl 时才用到, 契约测试不会执行
    const stub = `
      const noop = () => {};
      const chain = new Proxy(function(){}, {
        get: () => chain,
        apply: () => chain,
      });
      export const load = () => chain;
      export const html = () => '';
      export default { load, html };
    `;
    return { format: 'module', source: stub, shortCircuit: true };
  }
  return next(url, context);
}
