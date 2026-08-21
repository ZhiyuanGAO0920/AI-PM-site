// 同步后端仓库 web/ 的前端逻辑到 Astro 站的 public/agent/
//
// 为什么需要这个脚本：
//   public/agent/ 是作品集站内的「在线工作台」静态副本，而真正可运行的工程在
//   兄弟目录 ai-job-agent-generic/web/。两者容易手工同步漂移（曾误改过另一份副本）。
//   本脚本把「逻辑文件」从源仓库同步过来，保留作品集适配版的 index.html / styles.css
//   （那两个文件含站点返回横幅与「本地自托管」引导，不能覆盖）。
//
// 用法：npm run sync:agent
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, '..', 'ai-job-agent-generic', 'web');
const DEST = resolve(root, 'public', 'agent');

// 仅同步逻辑文件；index.html / styles.css 为作品集适配版，手动维护
const FILES = ['app.js', 'profile.js', 'sample-data.js'];

if (!existsSync(SRC)) {
  console.error(`[sync:agent] 源目录不存在：${SRC}`);
  console.error('[sync:agent] 请确认 ai-job-agent-generic 与 ai-pm-site 是兄弟目录。');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });
let ok = 0;
for (const f of FILES) {
  const from = resolve(SRC, f);
  if (!existsSync(from)) {
    console.warn(`[sync:agent] 跳过（源不存在）：${f}`);
    continue;
  }
  copyFileSync(from, resolve(DEST, f));
  console.log(`[sync:agent] 已同步 ${f}`);
  ok++;
}
console.log(`[sync:agent] 完成，共同步 ${ok} 个文件。index.html / styles.css 已保留作品集版。`);
