---
title: 架构模式
description: EIA 落地的架构模式——版本演进、Multi-Agent 扇出扇入、Reflection 质检、流式优先、三层 Prompt 加载、质量监控。每个模式都附真实坑与数据。
order: 5
updated: '2026-08-20'
tags: ['架构', '模式', 'EIA']
eyebrow: CASES
---

> 这些不是教科书架构图，是一个真实 B 端 AI 产品从 V1 到 V4 踩出来的模式。每条都附**真实数据**和**踩过的坑**——这是通用教程没有的颗粒度。

数据来源：EIA 知识库《架构模式》系列（共 9 篇，此处取核心 6 个）。

---

## 一、版本演进哲学：解决当前最痛的限制

| 版本 | 主题 | 形态 |
|------|------|------|
| V1 | 能不能做（Can we build it） | 2000 行，1 个 Agent |
| V2 | 好不好用（并行提速） | 多 Agent 并行 |
| V3 | 爱不爱用（体验） | 流式、交互打磨 |
| V4 | 企业级（多租户） | **11 节点、多租户、192 测试** |

驱动力是"解决当前最痛的一个限制"，**不是加功能**。V1 推倒重来（见[决策案例 D06](/cases/decision-cases/)）就是因为这点。

## 二、Multi-Agent 扇出扇入模式

- **链路**：Supervisor（temperature=0）→ LangGraph `Send` 并行扇出 → 5 个领域 Agent → Aggregator（纯 Python，**零 Token**）→ Chart Advisor → Report（SSE 流式）
- **价值**：3 个 Agent 串行约 **45s**，并行约 **15s**（提速 3 倍）；故障隔离；每个 Agent 的 Prompt 可独立迭代
- **兜底**：Supervisor 若 LLM 失败，用关键词匹配（"销售"→sales）兜底，不整体崩

## 三、Reflection 质检架构

- **4 维质检**：一致性 / 逻辑性 / 可操作性 / 完整性
- **重试上限 1 次**：第 1 次修复覆盖 **80%**，第 2 次仅额外 **10%**；即便未完全通过也输出（标注"未完全通过"）
- **成本**：每次 Reflection 约 **3000–5000 token**
- 详见 <a href="/cases/badcase-004-reflection-loop/">BadCase-004：死循环成本爆炸</a>

## 四、流式优先架构（含一个真实坑）

- 95%+ 的查询是新问题，缓存命中极低 → **流式优先**（SSE）
- **坑**：节点内非流式 LLM 调用单步 40–75s 无事件，前端 45s 看门狗误判"分析超时"；整体实测 **165–246s 必超时**
- **修复**：`_with_heartbeat` 每 **20s** 发 `{"type":"heartbeat"}`，最大静默不超过 20s

## 五、三层 Prompt 加载（配置化 > 定制化）

- **优先级**：`customer_schema.yaml` → `prompts/*.yaml` → Python 硬编码兜底
- **热重载**：`POST /api/v1/prompts/reload`，Feature Flag `FEATURE_PROMPT_YAML=true`，自动用客户表名替换占位符
- 这是"配置化吸收差异、不写定制代码"原则的直接落地——不同客户的数据库结构不同，靠 YAML 定义映射，而非强制 Schema

## 六、质量监控体系（V4.1 真实数据）

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| SQL 准确率 | 85% | **90%** |
| Reflection 通过率 | 85% | **90%** |
| P50 延迟 | 45s | **30s**（超 30s 焦虑、超 60s 关页面） |
| 幻觉率 | 0% | **< 2%** |
| 单次成本 | ¥0.04 | **¥0.03** |

> **真实成本追踪的坑**：原本用全局 `CostTracker` 报固定 ¥0.04，实际是假象；改成 `ContextVar` per-task 后才是真值 ¥0.03。评估集从 20 条扩到 **102 条**。

---

<div class="callout">和踩坑对照看：<a href="/cases/badcase-library/">BadCase 库</a>。和决策对应看：<a href="/cases/decision-cases/">13 条决策案例</a>。</div>
