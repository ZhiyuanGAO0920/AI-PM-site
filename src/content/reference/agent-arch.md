---
title: Agent 架构：什么时候不该用 Agent
description: 从 EIA 的 10-Agent 真实架构出发——Supervisor 并行扇出、Aggregator 零 Token 聚合、Reflection 质检循环。不是教你怎么搭 Agent，是教你什么时候别上 Agent。
order: 4
updated: '2026-08-20'
tags: ['Agent', '架构', 'Multi-Agent']
eyebrow: REFERENCE
---

> Agent = LLM + 能调用工具 + 有记忆 + 会规划。但**不是所有任务都该上 Agent**——简单任务上 Agent 只会徒增延迟和成本。先判断"要不要 Agent"，再谈"怎么搭"。

数据来源：EIA 项目 `graph.py`（190 行编排中枢）+ `supervisor_agent.py`（137 行路由决策）+ `reflection_agent.py`（168 行质检）+ 真实运行数据。

---

## 一、先问：要不要用 Agent

在跳进 Agent 架构之前，先过这个决策树：

```
你的任务需要多步推理或多工具协作？
├─ No → 直接调 LLM（一次调用搞定）
└─ Yes → 步骤是固定的还是动态的？
    ├─ 固定流程 → 用流水线（Prompt Chaining），不需要 Agent
    └─ 动态决策 → 需要几个领域协作？
        ├─ 1 个领域 → 单 Agent + 工具
        └─ 多个领域 → Multi-Agent（Supervisor + Worker）
```

**EIA 的选择**：经营分析需要 Sales/CRM/Finance/Inventory/SupplyChain 五个领域协作，步骤是动态的（用户问什么就激活什么 Agent），所以用 Multi-Agent。

> **反面案例**：如果你只是做"用户输入问题 → 查知识库 → 生成回答"，这是 RAG，不是 Agent。别给 RAG 套 Agent 壳——多一次 LLM 调用做"路由决策"，白白多 8 秒延迟和一倍 Token 成本。

## 二、EIA 的 10-Agent 架构（真实落地）

```
用户提问
   │
   ▼
Supervisor（路由决策，temperature=0）
   │── Send ──┐
   │          │
   ▼          ▼
Sales    CRM    Finance    Inventory    SupplyChain
（并行）  （并行）（并行）   （并行）       （并行）
   │          │          │            │            │
   └──────────┴──────────┴────────────┴────────────┘
                     │
                     ▼
              Aggregator（纯 Python，零 Token）
                     │
                     ▼
              Report Agent（生成报告 + 提取追问）
                     │
                     ▼
              Reflection Agent（4 维质检）
                     │
                ┌────┴────┐
                ▼         ▼
            通过→保存   不通过→重试 1 次→仍不通过→标注输出
```

### 为什么是并行而不是串行

V1 用串行执行：Supervisor 依次调用 Sales → CRM → Finance，每个 Agent 耗时 8-15 秒，三个串行就是 24-45 秒。用户等不及。

V2 改用 LangGraph 的 `StateGraph` + `Send` API：Supervisor 决策后，用 `Send` 创建多个并行执行分支，每个 Agent 独立查数据库，完成后汇合到 Aggregator。

```python
# graph.py 核心逻辑（简化）
def route_to_agents(state):
    decision = supervisor_agent.invoke(state)
    # Send 创建并行分支——每个 Agent 独立执行
    return [
        Send(agent, state) for agent in decision.activated_agents
    ]
```

**结果**：三 Agent 并行查询，总耗时从 45s 降到 15s。五个 Agent 并行时优势更大——串行 75s vs 并行 15s。

### Aggregator：零 Token 聚合

Aggregator 不是一个 LLM Agent——它是纯 Python 函数，把各 Agent 的结果拼接成结构化数据。**零 Token 消耗**。

为什么不让 LLM 做聚合？因为跨领域聚合不需要"理解"——Sales Agent 已经返回了销售数据，Finance Agent 已经返回了财务数据，聚合只是"把两部分拼在一起"。用 LLM 做这件事，既慢又贵还可能引入幻觉。

> **教训**：不是所有"看起来需要智能"的环节都该用 LLM。聚合是确定性任务，用代码做——零成本、零延迟、零幻觉。

### Supervisor 兜底：LLM 失败时不断服务

Supervisor 用 `tool_choice="supervisor_decision"` 强制 LLM 返回结构化 JSON。但 LLM 偶尔会超时或返回格式错误。这时不能让整个系统崩掉：

```python
# supervisor_agent.py 兜底逻辑（简化）
if llm_response_failed:
    # 关键词匹配兜底
    if any(kw in user_query for kw in ["销售", "门店", "营收"]):
        activated = ["sales_agent"]
    elif any(kw in user_query for kw in ["库存", "缺货"]):
        activated = ["inventory_agent"]
    else:
        activated = ALL_AGENTS  # 最保守：全部激活
```

**结果**：Supervisor LLM 调用失败时，系统仍能正确路由。关键词匹配准确率约 95%，误触率 < 2%。

### Reflection：质检但不死循环

Reflection Agent 检查报告的四个维度：一致性、逻辑性、可操作性、完整性。发现问题就打回重写。

关键设计：**最多重试 1 次**。实测数据——第一次重试修复 80% 的问题，第二次只额外修复 10%，第三次几乎无改善。用 45 秒换 2% 的改善不值。

如果仍未通过，标注"质检未完全通过"但仍输出报告——把判断权交回用户。

> 详见 [决策案例 D03](/cases/decision-cases/) 和 [BadCase-004：Reflection 死循环](/cases/badcase-004-reflection-loop/)。

## 三、四种 Agent 模式速览

| 模式 | 结构 | 适用场景 | 代价 |
|------|------|---------|------|
| **单 Agent** | 用户 → Agent → 工具 → 输出 | 单一领域、简单任务 | 实现简单，复杂任务能力不足 |
| **Supervisor + Worker** | Supervisor 拆解 → Worker 并行 → 聚合 | 多领域协作（EIA 选择） | 协调成本高，需要状态管理 |
| **流水线** | A → B → C → D | 固定流程、可预测 | 灵活性低，一个环节卡住全链卡 |
| **评审循环** | 生成 → 评审 → 优化（循环） | 强质量控制 | 成本高、延迟大，需设重试上限 |

## 四、Agent 核心组件

1. **系统提示词** — 角色、能力边界、行为约束、输出格式。EIA 用 YAML 外部化 + 热重载，改 Prompt 不用重启服务。
2. **工具定义** — Function Calling、API、知识库检索。EIA 每个领域 Agent 有独立的 SQL 工具集。
3. **记忆** — 对话历史 + 向量记忆（BGE-M3 + pgvector）。EIA 的相似分析匹配准确率约 79%。
4. **规划** — Supervisor 做任务分解，决定激活哪些 Agent。
5. **反思** — Reflection Agent 做 4 维质检，但重试上限 1 次。

## 五、设计五原则（EIA 验证版）

1. **单一职责** — 每个 Agent 只做一件事。EIA 的 Sales Agent 只查销售数据，不做财务推断。
2. **明确边界** — 清晰的输入输出。各领域 Agent 先独立产出，再由 Aggregator 汇总——**隔离了就消灭一类 bug**。
3. **可观测** — 所有决策可追溯。Supervisor 返回 `reasoning` 字段记录决策理由。
4. **有约束** — 限制权限和范围。RLS 行级权限注入确保租户间数据不串。
5. **可评估** — 每个 Agent 有指标。SQL 准确率 85%、Reflection 通过率 95%、P95 延迟 45s。

<div class="callout">相关实战：<a href="/cases/decision-cases/">决策案例 D01/D03/D12</a>（LangGraph 选型、Reflection 重试、Aggregator 设计）；<a href="/cases/architecture-patterns/">架构模式</a>；反面教材 <a href="/cases/badcase-004-reflection-loop/">Reflection 死循环</a>。</div>
