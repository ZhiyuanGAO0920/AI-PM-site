// 构建产物死链检查：扫描 dist/**/*.html 的 href / src 引用，验证目标文件存在
// 用法：node scripts/check-links.mjs   （需先 npm run build）
// 退出码：0 = 全部有效；1 = 存在死链（CI 中作为门禁）
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize, extname } from 'node:path';

const DIST = 'dist';

// 收集所有 html 页面（跳过 pagefind 生成的索引片段）
function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '_pagefind') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// 解析引用目标：存在即有效；目录形式补 index.html 判断
function resolveTarget(basePage, raw) {
  const p = raw.startsWith('/')
    ? normalize(join(DIST, raw))
    : normalize(join(dirname(basePage), raw));
  if (existsSync(p)) return p;
  if (existsSync(join(p, 'index.html'))) return join(p, 'index.html');
  // 无扩展名的裸路径（如 /about）也可能是目录页
  if (!extname(p) && existsSync(join(p + '/index.html'))) return p + '/index.html';
  return null;
}

const pages = walkHtml(DIST);
const problems = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const raw of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(raw)) continue;
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('#')) continue;
    if (!resolveTarget(page, clean)) {
      problems.push(`${page.replace(/\\/g, '/')} -> ${raw}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`[check-links] 发现 ${problems.length} 个死链：`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`[check-links] OK：${pages.length} 个页面，全部链接有效`);
