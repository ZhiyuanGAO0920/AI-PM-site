---
title: EIA 项目概览
description: EIA（AI 运营分析助手）是什么、作者担任什么角色、解决什么问题、核心数据成果和技术栈一览。招聘方 1 分钟可读完的入口摘要。
order: 0
updated: '2026-08-20'
tags: ['EIA', '项目概览', '求职作品']
eyebrow: CASES
---

> 这是 EIA（Enterprise Insight Agent）项目的入口概览。详细的决策、架构、踩坑见下方链接，这里是 1 分钟版。

## EIA 是什么

EIA（AI 运营分析助手）是一个面向美业门店的 AI 产品，核心能力是用自然语言查询经营数据、生成运营建议、自动归类用户反馈。不是聊天机器人——它有状态机、有权限隔离、有成本控制。

**产品形态**：Web 应用（非小程序）
**目标用户**：美业连锁门店运营人员、区域经理
**作者角色**：产品经理（PM），负责需求定义、模型选型决策、Agent 架构设计、Prompt 工程、评估体系搭建

## 核心数据成果

| 维度 | 数据 |
|------|------|
| 需求总量 | 800+ 条需求，主动拒绝 100+ 条 |
| 单次推理成本 | ¥0.03（DeepSeek V4 Flash） |
| 成本差异 | 选对模型 vs 选错 = 差 15 倍以上 |
| 响应速度 | 45s → 15s（V1→V2 重构后） |
| 信任度 | AI 判断与人工一致率 +80% |
| 决策记录 | 13 条产品决策，其中 8 条否决了 AI 的"建议" |

## 技术栈

| 层 | 选型 | 决策原因 |
|----|------|----------|
| 主模型 | DeepSeek V4 Flash | 性价比之王，成本 $0.14/$0.28 |
| 复杂推理 | DeepSeek V4 Pro | 需要更强推理时 fallback |
| Agent 框架 | LangGraph | 状态机可控、非 AgentExecutor |
| Embedding | BGE-M3 本地化 | 不依赖外部 API，零边际成本 |
| 前端 | Web 应用 | 比小程序更灵活，交互不受限 |
| 架构 | V1 → V2 推倒重构 | V1 的死循环问题根因是架构，非 Prompt |

## 核心设计原则

EIA 的 7 条 AI 产品设计原则：

1. **够好就行** — 不追最强模型，追性价比最高的
2. **灰度开关** — 每个 AI 能力都可开关，可回退
3. **成本一级约束** — 成本是产品设计的一级约束，不是运维的事
4. **规则 vs AI 分工** — 确定性事务交给代码，模糊判断交给 AI
5. **反馈闭环** — 没有 feedback 的 AI 功能不算上线
6. **权限隔离** — Agent 的权限和数据范围严格隔离
7. **可验证** — 每个决策标数据来源和核验日期

详见 [EIA 七条 AI 产品设计原则](/cases/eia-seven-principles)。

## 深入了解

| 想看什么 | 去哪看 |
|----------|--------|
| 13 条产品决策（含 8 条否决 AI 建议） | [决策案例](/cases/decision-cases) |
| 架构选型与模式 | [架构模式](/cases/architecture-patterns) |
| 踩过的坑和复盘 | [BadCase 复盘库](/cases/badcase-library) |
| RLS 注入跨系统边界 | [BadCase-001](/cases/badcase-001-rls-injection) |
| Reflection 死循环修复 | [BadCase-004](/cases/badcase-004-reflection-loop) |
| 七条设计原则 | [EIA 七原则](/cases/eia-seven-principles) |
| 成本结构怎么决定产品定位 | [EIA 商业思考](/cases/eia-business-thinking) |
| 6 年 B 端 PM 怎么转 AI PM | [转型记录](/cases/transition-record) |

---

> 这站本身也是 EIA 产品观的实践：每篇标核验日期，数据标来源，决策标真实场景。你可以验证，而不只是听我说。
