# ai-pm-site 项目说明（给 Claude Code 的工作约定）

个人求职作品集站：B 端 PM 转 AI PM 的经验库。Astro 5 静态站，部署于腾讯云 CloudBase（无自有域名，勿提绑定需求）。站内定位是"信任来自可验证"——每篇文章必须带核验日期、数据必须有出处，禁止虚构数据。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发 |
| `npm run build` | 完整构建 = `python scripts/gen-og.py`（需 PIL）+ `astro build` + pagefind |
| `node scripts/check-links.mjs` | 死链门禁，扫 dist 内链，有死链退出码 1（CI 里作为门禁） |
| `npm run sync:agent` | 从兄弟目录 `../ai-job-agent-generic/web` 同步求职 Agent 逻辑文件 |
| `npm run deploy` | 手动部署 `tcb hosting deploy dist`（CI 已自动部署，一般不用） |

## 内容管理

三个 content collection 共用同一 frontmatter schema（[src/content/config.ts](src/content/config.ts)）：

- `title` / `description`（必填，description 兼作页面 lead 和 meta description）
- `order`（排序，越小越靠前，默认 999）
- `updated`（**必填**，最后核验日期，站点"可验证"卖点的一部分）
- `tags` / `eyebrow` / `draft`（draft=true 不发布）

新增文章后手动检查：

1. `npm run build` + `node scripts/check-links.mjs` 通过
2. 页面引用计数是否要同步（见下）

## 数字一致性（本项目最大的坑）

部分数字是 **build 时动态计算**（单一事实源），部分是**手写**（会漂移）：

| 位置 | 类型 | 说明 |
|---|---|---|
| 首页 `totalDocs`、about 页篇数 | ✅ 动态 | 从 content collection 计算，改内容不用管 |
| `consts.ts` 的 `STATS`（products/decisions/badcases） | ⚠️ 手写 | 新增/删减对应内容时需手动核对 |
| `PATHS` 描述里的篇数/页面数 | ⚠️ 手写 | 同上 |
| README 篇数 | ⚠️ 手写 | 已注明"以站内为准"，改内容不必强求同步 |
| "7 条 BadCase"口径 | 固定约定 | badcase-library（6 编号）+ badcase-004 深度页 = 7；新增编号 BadCase 时更新 `STATS.badcases` |

## 工程约定与已知坑

- **Nav current 传参**：页面组件给 `<BaseLayout current>` 传值统一带尾斜杠（如 `current="/about/"`）；Nav 已兼容无尾斜杠，但新代码别引入不一致。
- **求职 Agent（public/agent/）**：`app.js` / `profile.js` / `sample-data.js` 必须用 `npm run sync:agent` 同步，**禁止手改**（源仓库是唯一事实源）；`index.html` / `styles.css` 是作品集适配版，手动维护，**不能被同步脚本覆盖**。
- **首页视频 `ai-pm-site-intro.mp4`**：12MB 是正常体积（272s @ 371kbps，moov 已前置可流式播放），**不要压缩转码**；它被 .gitignore 排除，重建时从 `assets/` 重新生成。
- **邮箱防爬**：Footer 与 about 页用 `mail-reveal` 模式（`data-u`/`data-d` 拼接），新增联系入口沿用此模式，不要直接写死邮箱文本。
- **OG 图**：`gen-og.py` 只生成全局默认图 `og-default.png`；各页面共用，未做 per-page 图（有意取舍，勿自行扩展）。
- **域名**：`site` 配置在 [astro.config.mjs](astro.config.mjs) 与 [public/agent/index.html](public/agent/index.html) 头部的 canonical/OG 绝对地址各有一处，若绑定自定义域名需两处同步（agent 文件内有注释说明）。

## 部署与 CI

- 已配置 GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）：push master → build → 死链门禁 → `tcb hosting deploy dist`。
- CI 认证走 GitHub Secrets（`CLOUDBASE_SECRET_ID`/`CLOUDBASE_SECRET_KEY`，或环境 API Key 方式），密钥由用户管理，不需要也无法代配。
- 线上地址：https://ai-pm-site-d0g2id0usfe50d5ab-1471526534.tcloudbaseapp.com
