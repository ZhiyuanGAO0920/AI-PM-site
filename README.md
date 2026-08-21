# 高志远的 AI PM 笔记

[![CI](https://github.com/ZhiyuanGAO0920/AI-PM-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/ZhiyuanGAO0920/AI-PM-site/actions/workflows/deploy.yml)

一个 B 端产品人转 AI PM 的真实记录 + 经过项目验证的经验库。

## 网站

线上地址：https://ai-pm-site-d0g2id0usfe50d5ab-1471526534.tcloudbaseapp.com

## 内容

- **24 篇 AI PM 学习内容**：科普文章 + 转型指南 + 决策案例 + BadCase 复盘（篇数随内容更新，以站内为准）
- **3 个真实 AI 产品案例**：EIA Copilot（8 Agent 系统）/ 求职 Agent / 架构模式
- **在线 AI 求职工具**：四维加权评分、Honesty Rule、Human-in-the-loop
- **参考库**：LLM 选型、RAG、Agent 架构、Prompt 工程、评估体系

## 技术栈

- [Astro](https://astro.build/) — 静态站点生成
- 部署于腾讯云 CloudBase
- 前端功能：深色模式切换、图片灯箱、阅读进度条、回到顶部（带进度环）、JSON-LD、Pagefind 全文搜索

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建到 dist/
```

## 目录结构

```
src/
├── components/    # Nav, Footer, ContentLayout 等
├── content/       # Markdown 内容
│   ├── cases/     # 实战案例（13篇）
│   ├── learn/     # 教程（4篇）
│   └── reference/ # 参考库（7篇）
├── layouts/       # BaseLayout
├── pages/         # 路由页面
└── styles/        # global.css
public/
└── agent/         # AI 求职 Agent（独立 SPA）
```

## License

MIT
