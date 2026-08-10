/**
 * 裁剪 Excalidraw 语言包：仅保留英文(en)与简体中文(zh-CN)
 * 在 npm install 后（postinstall）执行，删除多余语言包文件并清理 index.js 的动态 import 映射表，
 * 使 esbuild 打包 lazy 模块时只包含保留的语言（减小体积）。
 * 幂等：语言包目录只剩 en/zh-CN 时跳过。
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'prod');
const localesDir = path.join(distDir, 'locales');
const indexFile = path.join(distDir, 'index.js');

const KEEP_PREFIX = ['en-', 'zh-CN-'];

if (!fs.existsSync(localesDir)) {
  console.log('[trim-locales] locales 目录不存在，跳过');
  process.exit(0);
}

// 1. 删除不需要的语言包文件
const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.js'));
const remove = files.filter((f) => !KEEP_PREFIX.some((p) => f.startsWith(p)));
if (!remove.length) {
  console.log('[trim-locales] 语言包已裁剪过，跳过');
  process.exit(0);
}
for (const f of remove) fs.unlinkSync(path.join(localesDir, f));
console.log(`[trim-locales] 删除 ${remove.length} 个语言包，保留: ${files.filter((f) => !remove.includes(f)).join(', ')}`);

  // 2. 清理 index.js 中的动态 import 映射表（非 en/zh-CN 条目）
  if (fs.existsSync(indexFile)) {
    let content = fs.readFileSync(indexFile, 'utf-8');
    const before = content.length;
    // 中间项（前导逗号）——映射表键为 ./locales/{code}.json（如 en.json / zh-CN.json），
    // 负前瞻按键名匹配：保留 en./zh-CN. 开头，其余删除
    content = content.replace(/,\s*"(\.\/locales\/(?!en\.|zh-CN\.)[^"]+\.json)"\s*:\s*\(\)\s*=>\s*import\("[^"]+"\)/g, '');
    // 首项（无前导逗号，带后随逗号）
    content = content.replace(/"(\.\/locales\/(?!en\.|zh-CN\.)[^"]+\.json)"\s*:\s*\(\)\s*=>\s*import\("[^"]+"\),/g, '');
    // 唯一项（无前导/后随逗号，紧跟 })）
    content = content.replace(/"(\.\/locales\/(?!en\.|zh-CN\.)[^"]+\.json)"\s*:\s*\(\)\s*=>\s*import\("[^"]+"\)\}\)/g, '})');
    // 空对象兜底
    content = content.replace(/Qg\(\{\s*\}\)/, 'Qg({})');
    fs.writeFileSync(indexFile, content);
    console.log(`[trim-locales] index.js 映射表已清理 (${before} -> ${content.length} 字符)`);
  }
