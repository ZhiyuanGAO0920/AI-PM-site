// 全站集中配置 —— 改品牌名/导航只动这里
export const SITE = {
  // 品牌名，求职作品集用真实署名更有辨识度
  title: '高志远的 AI PM 笔记',
  shortTitle: '高志远的 AI PM 笔记',
  // 一句话定位
  tagline: '6 年 B 端产品人转 AI PM 的真实路径 + 经过项目验证的经验库',
  // 副标题/简介
  intro:
    '不堆 AI 资讯，不教玄学。20+ 篇内容 + 1 个可体验的 AI 求职工具，全部来自三个真实 AI 产品验证：通用 AI 知识科普（LLM/RAG/Agent/Prompt/评估）+ AI 产品转型实战（EIA（Enterprise Insight Agent，企业洞察智能体）13 条决策 + 求职 Agent 设计决策 + Copilot 8 Agent 系统 + 7 条 BadCase + 成本结构）。每篇标核验日期，数据标来源——你可以验证。',
  author: '高志远',
  email: '934594418@qq.com',
  github: 'https://github.com/ZhiyuanGAO0920/ai-pm-site',
  // 最后整体核验日期，体现"信任来自可验证"
  verified: '2026-08-20',
};

// 顶部导航
export const NAV = [
  { label: '首页', href: '/' },
  { label: '教程', href: '/learn/' },
  { label: '参考库', href: '/reference/' },
  { label: '实战案例', href: '/cases/' },
  { label: '求职工具', href: '/agent/' },
  { label: '关于', href: '/about/' },
  { label: '搜索', href: '/search/' },
];

// 三条路径的入口卡片（首页用）
export const PATHS = [
  {
    key: 'learn',
    label: '教程',
    title: '从 B 端 PM 到 AI PM 的 12 周路线',
    desc: '线性学习路径：技术认知 → Prompt 工程 → 实战方法论 → 作品集。含吴恩达课程精读笔记和 9 个 Prompt 模板，每周有产出要求。',
    href: '/learn/',
  },
  {
    key: 'reference',
    label: '参考库',
    title: '随时查阅的 AI 产品知识地图',
    desc: 'LLM 选型、RAG、Agent、Prompt、评估体系、AI 交互设计——7 篇深度参考文章，每篇附 EIA 项目实测数据和工程代码。',
    href: '/reference/',
  },
  {
    key: 'cases',
    label: '实战案例',
    title: '三个真实 AI 产品的完整决策与踩坑',
    desc: 'EIA 项目 + 求职 Agent + AI PM Copilot：七条设计原则、13 条产品决策、8 Agent 系统架构、O1-O12 项目治理、7 条 BadCase 复盘、架构模式、商业思考——13 个页面。',
    href: '/cases/',
  },
  {
    key: 'agent',
    label: '求职工具',
    title: 'AI 求职 Agent · 在线工作台',
    desc: '四维加权评分、Honesty Rule 禁止虚构、Human-in-the-loop 绝不自动投递。示例模式开箱即用，可直接体验评估/定制/面试全流程。',
    href: '/agent/',
  },
];

// 首页统计：内容派生项（总篇数 / BadCase 数）由 index.astro 在 build 时从 content collection 计算；
// 这里集中管理语义固定的项，更新内容时改这一处即可
export const STATS = {
  products: 3,
  decisions: 13,
  badcases: 7,
  tools: 1,
};
