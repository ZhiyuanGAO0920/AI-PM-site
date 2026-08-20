---
title: AI PM Copilot：一个帮产品经理做 AI 产品的 Meta-Agent 系统
description: 不是"用 AI 写 PRD"——是 8 个专业子 Agent + Supervisor 路由 + 13 个知识库 + 回归测试 + 项目治理（O1-O12 目标闭环）的完整多 Agent 系统。3 天在 Dify 上从 0 到部署。本页记录它的架构决策、路由设计、评估框架和项目治理过程。
order: 10
updated: '2026-08-20'
tags: ['Multi-Agent', 'Dify', 'Supervisor 路由', '项目治理', '回归测试']
eyebrow: CASES
---

> 这是我在转型 AI PM 过程中做的第三个 AI 产品。和 EIA（Enterprise Insight Agent，企业级 B 端）不同，和求职 Agent（个人级 C 端）也不同——这是一个 **Meta 级 AI 产品**：一个帮产品经理做 AI 产品决策的 Agent 系统。它不解决某个具体业务问题，它解决"怎么把 AI 产品方法论工程化"的问题。

## 这是什么

Enterprise AI Product Copilot 是一套部署在 Dify 上的多 Agent 系统，包含：

| 组件 | 数量 | 作用 |
|------|------|------|
| 子 Agent | 8 个 | 覆盖 AI 产品全生命周期：机会→方案→架构→RAG→Prompt→评估→BadCase→运营 |
| Supervisor | 1 个 | 意图识别 + 路由分发，把用户问题分发给对应子 Agent |
| 记忆工具 | 2 个 | 查询/记录产品决策，跨会话保持上下文 |
| 知识库 | 13 个 | 从 AI-PM-Brain 的 10 个知识域导入，为 Agent 提供 RAG 检索 |
| 测试集 | ~79 条 | 真实 58 + 合成 21，覆盖 8 个 Agent 的核心场景 |

**建设数据**：3 天（2026-07-20 ~ 07-22）从 0 到全链路部署。技术栈：Dify 1.13.3 + DeepSeek V4（Pro/Flash）+ Qwen3-Rerank（Tongyi）+ BGE-M3（本地 Embedding）。

![Dify Studio 全貌：11 个应用已发布](/dify-screenshots/studio-all.png)
*Dify Studio 全貌：8 个子 Agent + Supervisor + 2 个记忆工具，全部已发布*

![Dify Studio 概览页](/dify-screenshots/studio-overview.png)
*Studio 概览页：可以看到所有应用的状态和模型配置*

## 为什么需要这个

做 EIA 项目时我发现一个反复出现的问题：**AI 产品方法论散落在文档、聊天记录、脑子里**。每次遇到新场景——"这个业务该不该上 AI？""这个 Prompt 怎么优化？""这个 BadCase 根因是什么？"——都要重新查资料、重新推理。

如果把这些方法论固化成 Agent，就能：
1. **标准化决策**：每个 Agent 有固定的分析框架（6 维度评分、5 维度 Prompt 评审、根因因果链），不依赖人当时的状态
2. **知识库驱动**：Obsidian 知识库做 RAG，Agent 回答有据可查，不是凭空生成
3. **全生命周期覆盖**：从机会判断到运营监控，8 个 Agent 串成闭环

这和 EIA 的 [七原则](/cases/eia-seven-principles/) 里的"配置化 > 定制化"一脉相承——用一套参数化 Agent 系统吸收 AI PM 工作的差异性，而不是每个场景从零开始。

## 系统架构

### Supervisor 路由：意图识别 + 条件分支

Supervisor 是整个系统的入口。它不做业务分析，只做一件事：**理解用户在问什么，路由到对应的子 Agent**。

```
用户输入
  │
  ▼
意图识别（DeepSeek V4 Pro）
  │
  ▼
条件分支 CASE 1~10 + ELSE
  │
  ├── CASE 1 → 机会分析 Agent 🔍
  ├── CASE 2 → 方案设计 Agent 🏗️
  ├── CASE 3 → 架构设计 Agent 🏛️
  ├── CASE 4 → RAG 设计 Agent 📚
  ├── CASE 5 → Prompt 优化 Agent ✍️
  ├── CASE 6 → 评估 Agent 📊
  ├── CASE 7 → BadCase 分析 Agent 🔎
  ├── CASE 8 → 运营分析 Agent 📈
  ├── CASE 9 → 查询决策记忆 🔍
  ├── CASE 10 → 记录决策 📝
  └── ELSE → 默认回复
```

Supervisor 的 System Prompt 核心是**能力路由表**——每个 Agent 的触发条件、能力范围、输出格式、关键词都明确定义：

```markdown
# 角色
你是一位资深的 AI 产品负责人，管理着 8 个 AI 产品专家 Agent 组成的团队。
你的任务是根据用户的问题，判断应该调用哪个 Agent 的能力来回答。

# 能力路由

## Agent 1：AI机会分析专家
触发条件：用户询问某个业务场景是否适合用 AI
能力：判断 AI 适配度、推荐技术路线、评估 ROI、分析风险
输出：Go/No-Go 决策 + 6 维度分析报告

## Agent 2：AI方案设计专家
触发条件：已经有了 AI 方向，需要具体的技术方案
能力：模型选型、RAG 方案设计、Agent 架构、成本估算、实施计划
输出：完整的技术方案文档
```

### 关键决策：contains 匹配替代精确匹配

最初的路由用精确匹配（`tool_name 是 机会分析`），但实际使用时发现"帮我分析一下机会"这种带追问问法会掉到默认分支。O1 修复改为 `contains` 包含匹配，路由 prompt 也做了强化。

这个坑说明一个道理：**Agent 的路由层是整个系统最脆弱的部分**——模型理解差一点，整个链路就断了。和 EIA 的经验一致：不确定的事务要加确定性保障（这里用 contains 匹配 + 11 条路由契约回归测试）。

![Supervisor 真实路由回答](/dify-screenshots/supervisor-answer.png)
*Supervisor 接收自然语言提问，识别意图后路由到对应子 Agent，8 个工具全部挂载*

### 子 Agent：每个都有知识库挂载

每个子 Agent 不是纯 LLM 调用，而是 **LLM + RAG** 的组合——知识库检索节点挂载了对应的 AI-PM-Brain 知识域：

| Agent | 挂载知识库 | 模型 |
|-------|-----------|------|
| 机会分析 | AI产品方法论、LLM与RAG技术、企业业务规则 | DeepSeek V4 Pro |
| 方案设计 | AI产品方法论、LLM与RAG技术、Agent架构 | DeepSeek V4 Pro |
| 架构设计 | Agent架构、Prompt工程 | DeepSeek V4 Pro |
| RAG 设计 | RAG技术、LLM选型 | DeepSeek V4 Flash |
| Prompt 优化 | Prompt工程、BadCase库 | DeepSeek V4 Flash |
| 评估 | 评估体系、BadCase库 | DeepSeek V4 Flash |
| BadCase 分析 | BadCase库、AI产品案例 | DeepSeek V4 Flash |
| 运营分析 | AI产品案例、企业业务规则 | DeepSeek V4 Flash |

模型选型逻辑和 EIA 一致：推理重的用 Pro，轻量的用 Flash——成本差 2 倍，不浪费。

## Agent 深挖：机会分析 Agent

以 Agent 1（AI 机会分析）为例，展示一个子 Agent 的完整设计。

### 6 维度分析框架

机会分析 Agent 不是"让 LLM 自由发挥"，而是有一个固定的 6 维度框架：

1. **问题理解**：业务背景、核心痛点、当前方案不足、干系人影响
2. **AI 适配度评估**：5 维度打分（高频重复性、知识密集度、人工成本、数据可用性、规则明确性），加权算总分
3. **技术路线推荐**：纯 LLM / RAG / Agent / Multi-Agent / 不需要 AI
4. **ROI 分析**：当前成本、AI 方案成本、节省预估、回本周期
5. **风险分析**：技术风险、业务风险、数据风险、实施风险
6. **推荐行动**：Go / No-Go 决策 + 优先级 + 下一步 + 成功标准

### Dify 实际部署（4 节点）

设计蓝图是多阶段分析，但实际部署为**单 LLM 承载全部阶段**（4 节点模板）：

| 节点 | 类型 | 配置 |
|------|------|------|
| 用户输入 | start | business_context（必）、pain_points（必）、current_cost（选） |
| 知识库检索 | knowledge-retrieval | 混合检索 + qwen3-rerank 重排，top_k=5；挂载 3 库 |
| AI 机会分析 | llm | DeepSeek V4 Pro，temperature 0.5；6 维度分析框架注入 Prompt |
| 输出 | end | text |

这是一个工程判断：多阶段拆成多个 LLM 节点会增加延迟和成本，单 LLM 承载全部阶段（在 Prompt 里把 6 维度框架写死）更经济，且输出质量可控——因为框架是确定性的，模型只需要"填空"。

![Prompt 优化 Agent 的 Workflow](/dify-screenshots/promptopt-workflow.png)
*Prompt 优化 Agent 的 Dify Workflow 编排：知识库检索 → LLM 分析 → 输出*

### 实跑证据

在 Dify 内真实运行，输入"某美业连锁 500+ 门店，区域经理每周手动分析数据耗时 3 天"：

- AI 适配度：**4.6/5**（非常适合 AI）
- 推荐方案：SQL Agent + RAG + Reflection
- ROI：效率提升 70%，3 个月回本
- 决策：**Go，P0 优先级**

![机会分析 Agent 真实运行输出](/dify-screenshots/opp-done.png)
*机会分析 Agent 实跑：美业连锁50家门店场景，90秒出报告，AI适配度4.6/5*

## 评估框架

### 测试集

| 类型 | 数量 | 来源 |
|------|------|------|
| 真实样本 | 58 条 | 运营分析 50 条 + BadCase 5 个 + ADR-001 + portfolio 3 案例 |
| 合成样本 | 21 条 | 缺测试集的 6 个 Agent 基于真实业务背景合理合成 |
| 总计 | ~79 条 | 覆盖 8 个 Agent 核心场景 |

### 评估结果

8 条真实样本经 DeepSeek 实跑 + 同构评估 rubric 打分：

| 评分 | 数值 | 说明 |
|------|------|------|
| 全样本 | **B(75.4)** | 8 条真实样本 |
| 排除 MEM 单测局限 | **B(79.0)** | 去掉记忆工具测试的局限性后 |

诚实标注：首批实跑 8 条验证框架有效性，评估框架支持一键全量 79 条。不夸大覆盖率——这和 [EIA 的数据观](/cases/eia-overview/) 一致：标真实数据，不标最好数据。

![成果数据汇总看板](/dify-screenshots/summary-dashboard.png)
*成果数据卡：11 应用 / 13 知识库 / 79 测试集 / B 级 75.4 分*

### 回归测试

建了 `route_regression.py`：双变体静态校验 + 11 条路由契约 + 可选 `--live` Dify API。改一处路由就跑一遍，离线全绿才算过。

```python
# 路由契约回归：11 条用例覆盖 8 个子 Agent + 2 个记忆工具 + 默认分支
route_cases = [
    {"input": "这个业务适合用AI吗？", "expect": "opportunity"},
    {"input": "帮我设计技术方案", "expect": "solution"},
    {"input": "多Agent怎么协作", "expect": "architecture"},
    # ... 11 条
]
```

## 项目治理：O1-O12 目标闭环

这个项目最有价值的部分可能不是 Agent 本身，而是**项目治理过程**。建完 8 个 Agent 后，做了一轮独立审计，发现 12 个优化点（O1-O12），全部闭环：

| # | 优化点 | 状态 | 关键动作 |
|---|--------|------|---------|
| O1 | Supervisor 路由精确匹配脆弱 | ✅ | 精确匹配 → contains 包含匹配 + 路由 prompt 强化 |
| O2 | 双 Supervisor 变体并存 | ✅ | ADR-003 明确主从定位：advanced-chat 生产入口 + Chatflow 轻量预览 |
| O3 | 模型口径 V3 残留 | ✅ | 8 个活跃文档 DeepSeek V3 → V4 |
| O4 | 重排模型单供应商依赖 | ✅ | ADR-004 记录风险 + 降级方案（向量相似度兜底） |
| O5 | 案例库空置 | ✅ | 3 个真实案例 + README 迁移说明 |
| O6 | 测试集单薄 | ✅ | D 级（合成）→ B 级（真实 79 条） |
| O7 | 缺回归测试 | ✅ | route_regression.py + 11 条路由契约 |
| O8 | 技术档案缺三篇 | ✅ | 补 data-flow / api-design / deployment |
| O9 | 工具关联手动维护 | ✅ | 运维手册 + rebind_supervisor_tools.py 脚本 |
| O10 | 量化断言缺证据 | ✅ | 量化断言证据对照.md + 4 处断言精确化 |
| O11 | 缺 Demo 录屏 | ✅ | demo-e2e.mp4（4m37s，1600×900） |
| O12 | memory 层薄弱 | ✅ | ADR 增至 4 条 + session 样例 |

### 审计还发现了两个安全问题

1. **9 个脚本明文硬编码 API Key**（DeepSeek `sk-eb...`、阿里 `sk-4a...`）——已全部改为 `os.environ.get()` 环境变量读取
2. **8 个活跃文档仍写 DeepSeek V3**（yml 实际部署 V4）——已全部修正

这两个发现说明：**项目审计不是走形式**。如果没做审计，作品集被分享就泄露了 API Key，面试被问模型版本就露怯。

## 实跑证据

16 张 Dify 浏览器实查截图，非伪造（截图 + innerText 双核对）：

| 证据 | 证明什么 |
|------|---------|
| studio-real.png | 11 个应用已发布（8 子 Agent + Supervisor + 2 记忆工具） |
| knowledge.png | 13 个知识库已建成 |
| opp-run-output.png | 机会分析 Agent 真实运行，AI 适配度 4.2/5 |
| sol-run-output.png | 方案设计 Agent 真实运行，9 维度技术方案 |
| supervisor-run.png | Supervisor 首轮路由，触发机会分析 |
| supervisor-run2.png | Supervisor 二轮路由，精确路由到方案设计 |
| kb-retrieval-hit.png | 知识库召回测试，5 个真实片段 + SCORE |
| badcase-run-output.png | BadCase 分析 Agent 真实运行，根因因果链 |
| demo-e2e.mp4 | 端到端录屏 4m37s，覆盖机会→方案→评估 + Supervisor 路由 |

关键验证：**端到端主链"机会分析 → 方案设计"在 Dify 原生内闭环验证**——机会分析输出（AI 适配度 4.2/5、Go/P0）直接作为方案设计的输入，方案设计产出 9 维度落地方案。

## 关键踩坑

### 1. DSL 版本兼容

生成 DSL 时写了 `version: 1.0.0`，Dify 1.13.3 只认 `0.6.0`。**教训**：先导出 Dify 官方 DSL 看格式，不要猜。

### 2. Chatflow 不适合结构化输入

Chatflow 的变量传递不如 Workflow 直接，做了无用功。**教训**：结构化输入 → Workflow；对话式交互 → Chatflow。最终 Supervisor 用了两个变体（advanced-chat 主版 + Chatflow 轻量版），各自适配不同场景。

### 3. Supervisor 工具注册双写

通过 `tool_workflow_providers` 表注册工具后，还需要更新 `app_model_configs.agent_mode`。**教训**：Dify 的 Agent 工具状态存两处（注册表 + 配置），都要更新。后来写了 `rebind_supervisor_tools.py` 脚本自动化。

### 4. Python 参数位置错误

`generate_dsl()` 传参时 `output_path` 传到了 `rerank_config` 位置，导致生成的 DSL 文件 reranking_model 变成文件路径。**教训**：Python 函数传参用 keyword argument，不用 positional。

## 和 EIA / 求职 Agent 的对比

| 维度 | EIA | 求职 Agent | AI PM Copilot |
|------|-----|-----------|----------------|
| 产品层次 | 具体 AI 产品 | 具体 AI 工具 | Meta 级 AI 系统 |
| 场景 | 美业门店运营 | 求职评估 | AI 产品全生命周期 |
| 用户 | B 端运营人员 | C 端求职者 | AI 产品经理 |
| 架构 | Multi-Agent + RAG + RLS | 单 Agent + 四维评分 | 8 Agent + Supervisor 路由 |
| 平台 | 自建后端 | 零依赖 Node.js | Dify 1.13.3 |
| 模型 | DeepSeek V4 Flash | DeepSeek V4 Pro / GLM | DeepSeek V4 Pro/Flash + Qwen3-Rerank |
| 评估 | 离线评估集 + A/B | 四维加权 + 确定性重算 | 79 条测试 + 回归脚本 + B 级评分 |
| 治理 | 周迭代 + BadCase 评审 | 26 项自检 | O1-O12 目标闭环 + 独立审计 |
| 建设周期 | 数月 | 数周 | 3 天 |

**共同点**：三个产品共享同一套产品哲学——AI 做预测、代码做执行、确定性事务不交给模型、人在回路、够好就行、信任来自可验证。

## 经验公式

> AI 产品搭建速度 = 知识库质量 × Agent 设计深度 / 踩坑重复次数

知识库先行（Obsidian 建好再导入 Dify 做 RAG），Agent 设计有框架（6 维度/5 维度/因果链），踩坑即沉淀（每个技术问题都转化成 knowledge）——三者乘除决定速度。

## 相关阅读

- [EIA 七条设计原则](/cases/eia-seven-principles/) — 三个产品共享同一套设计哲学
- [Agent 架构](/reference/agent-arch/) — Supervisor 路由是 Multi-Agent 的一种实现模式
- [AI 评估体系](/reference/eval-system/) — Copilot 的评估框架是评估体系的工程化实践
- [Prompt 工程](/reference/prompt-design/) — 子 Agent 的分析框架本质是结构化 Prompt
- [求职 Agent 案例](/cases/job-agent/) — 另一个 AI 产品的架构决策
