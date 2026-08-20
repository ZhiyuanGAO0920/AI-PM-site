---
title: Prompt 工程：迭代方法论比写得好重要
description: EIA（Enterprise Insight Agent）项目 8 次 Prompt 迭代全记录——INNER JOIN 改 LEFT JOIN 修复 95→100 行、追问点击率 40%→100%、补货可执行率 60%→100%、客户接入 2h→30min。不是教你写 Prompt，是教你迭代 Prompt。
order: 5
updated: '2026-08-20'
tags: ['Prompt', '迭代方法论', '工程化']
eyebrow: REFERENCE
---

> AI PM 的 Prompt 设计不是"告诉 LLM 做什么"，而是"告诉 LLM 怎么做才算好"。越模糊的指令，LLM 的输出越不可控。**迭代方法论比初稿写得好重要 10 倍。**

数据来源：EIA 项目《Prompt 迭代日志》8 次完整迭代记录，每次含"动了什么、为什么动、修改前后、验证数据"。

---

## 一、为什么"迭代"比"写得好"重要

很多人以为 Prompt 工程是"写一个好 Prompt 一次成功"。实际上，EIA 的每个 Prompt 都经历了 3-8 轮迭代才稳定。初稿只是起点——你不可能在第一次就预见到 LLM 的所有"奇怪行为"。

EIA 的 8 次迭代覆盖了四类问题：

| 问题类型 | 迭代次数 | 典型案例 |
|---------|---------|---------|
| LLM 的默认行为与业务需求冲突 | 3 次 | INNER JOIN 丢数据、自动加 LIMIT 截断、补货建议太模糊 |
| 指令不够具体导致输出不可控 | 2 次 | 追问建议与报告弱相关、输出格式不分场景 |
| 工程化瓶颈 | 2 次 | 改 Prompt 要重启、客户 Schema 硬编码 |
| 系统扩展 | 1 次 | Supervisor 路由从 3 Agent 扩展到 5 Agent |

## 二、四迭代深挖

### 迭代 1：INNER JOIN → LEFT JOIN（修复 95→100 行）

**问题**：用户问"各门店销售额排名"，但结果只有 95 行——5 家没有订单的新店被过滤掉了。连锁零售老板需要看到完整的 100 家门店排名。

**根因**：LLM 写 SQL 时倾向于用 `INNER JOIN`（因为更简洁），但 INNER JOIN 会过滤掉没有匹配记录的行。

**修复**：

```sql
-- 修改前：INNER JOIN，丢掉无订单门店
SELECT s.store_name, COUNT(o.order_id) FROM store s
JOIN orders o ON s.id = o.store_id GROUP BY s.store_name

-- 修改后：LEFT JOIN + COALESCE，保留全部门店
SELECT s.store_name, COUNT(o.order_id) FROM store s
LEFT JOIN orders o ON s.id = o.store_id GROUP BY s.store_name
```

**验证**：离线评估 Q01"各门店销售额排名"返回行数从 95 → 100。

**教训**：LLM 写 SQL 时倾向于用 INNER JOIN（因为更简洁），但 B 端分析场景需要完整数据视图。AI PM 需要在 Prompt 中显式纠正 LLM 的这种倾向。

### 迭代 2：追问建议从泛化改为约束（点击率 40%→100%）

**问题**：Report Agent 在报告末尾生成 3 个追问建议，但用户几乎不点。分析发现追问与报告内容弱相关——分析销售数据时追问"会员有多少人"，完全跑偏。

**根因**：Prompt 指令太模糊——"在报告末尾生成 3 个建议追问问题"只告诉了 LLM 做什么，没告诉它怎么做才算好。

**修复**：

```
-- 修改前：
在报告末尾生成 3 个建议追问问题

-- 修改后：
在报告末尾生成 3 个建议追问问题。要求：
1. 至少 1 个问题基于当前报告中的具体数据提出
2. 至少 1 个问题涉及报告中提到的"异常"或"风险"的深层原因
3. 问题之间不重复，覆盖不同分析维度
```

**验证**：追问点击率从 40% 提升到 100%，不相关追问比例从 4/10 降至 1/10。

**教训**：AI PM 的 Prompt 设计不是"告诉 LLM 做什么"，而是"告诉 LLM 怎么做才算好"。越模糊的指令，LLM 的输出越不可控。

### 迭代 3：补货建议从定性改为定量（可执行率 60%→100%）

**问题**：库存 Agent 给出的补货建议是"建议尽快补货"——店长看完不知道补多少。

**根因**：Prompt 只说"缺货商品要给出补货建议"，没有定义什么是"可执行的"建议。

**修复**：

```
-- 修改前：
缺货商品要给出补货建议

-- 修改后：
缺货商品要给出补货建议，格式：
- 建议补货量 = 安全库存 × 2 - 当前库存
- 如果当前库存为 0，标注"🚨 紧急补货"
- 如果当前库存 < 安全库存的 50%，标注"⚠️ 预警补货"
```

**验证**：离线评估 Q07（缺货预警）的补货建议可执行率从 60% 提升到 100%。

**教训**：AI 产品的价值不是"AI 说了什么"，而是"用户看完之后能不能立刻行动"。Prompt 设计的目标应该是输出可执行的结果，而非通用的分析。

### 迭代 4：客户 Schema 动态适配（接入 2h→30min）

**问题**：不同客户数据库表名不同（如 `orders` vs `t_sales_order`），V3 需要手动改写每个 Agent 的 Prompt。接入新客户平均耗时 2 小时。

**根因**：Prompt 中硬编码了业务 Schema（表名、列名），每个客户需要单独维护一份 Prompt。

**修复**：`PromptBuilder` 根据 `customer_schema.yaml` 动态生成每个 Agent 的 System Prompt，替换其中的表名、列名、SQL 模板为客户的物理名称。

```yaml
# customer_schema.yaml
orders:
  physical_name: "t_sales_order"
  columns:
    store_id: "shop_id"
    amount: "total_amount"
```

**验证**：修改 YAML 中的物理名称 → 所有 Agent Prompt 中自动替换。接入新客户从 2 小时 → 30 分钟。

**教训**：Prompt 中硬编码业务 Schema 是 AI 产品最隐蔽的扩展瓶颈。表面看 Prompt 通用，实际上每个客户有一份独特的数据库字典。

## 三、迭代方法论：五步迭代法

从 8 次迭代中提炼出的 Prompt 优化方法论：

```
1. 发现问题 — 从用户反馈/评估集/BadCase 中定位"输出不符合预期"
2. 定位根因 — 是指令模糊？LLM 默认行为冲突？还是缺上下文？
3. 写修复方案 — 明确改什么、为什么改、改后预期效果
4. 跑评估集 — 用固定测试集对比修改前后
5. 记录日志 — 改动/原因/修改前后/验证数据全部留痕
```

> **关键**：没有评估集的迭代是盲人摸象。EIA 用 20 条固定评估集（查询型/分析型/边界型三类），每次改动都跑一遍对比。详见 [AI 评估体系](/reference/eval-system/)。

## 四、Prompt 工程化：三个基础设施

### 1. YAML 外部化 + 热重载

V3 每次改 Prompt 需要重启服务，影响线上用户。V4 将 9 组 Prompt 从硬编码 Python 迁移到 YAML 文件，通过 `PromptLoader` 加载，支持 `POST /api/v1/prompts/reload` 热重载。

```
app/tools/prompt_loader.py（3 级 fallback）
  1. customer_schema（客户定制 Prompt）
  2. yaml（标准 Prompt 模板）
  3. python（硬编码兜底）
```

修改 YAML → 调用 reload API → 新 Prompt 立即生效，无需重启。保留 Python fallback 确保 YAML 损坏时系统不崩溃。

> **教训**：AI 产品的 Prompt 是最频繁修改的"代码"。不能用对待数据库 Schema 的方式对待 Prompt——它需要秒级更新能力。

### 2. 输出格式路由

LLM 默认行为是"多给信息"——这在 B 端场景下是双刃剑。EIA 在 Prompt 中加入三类硬性规则：

- 用户问"最""最高""最低" → SQL 用 `ORDER BY ... LIMIT 1`，输出仅一句话
- 用户问"所有""全部" → 不加 LIMIT，输出完整行数
- 用户问"排名""Top N" → `LIMIT N`，按排名格式输出

### 3. 关键词注入弥补 LLM 过度推断

LLM 频繁自作主张加 `LIMIT 10`，导致"全部门店排名"只返回 10 家。EIA 在 `analysis.py` 中注入 `inject_ranking_hint()`——检测到排名/列表类关键词时，追加系统指令要求列出全部数据行。

关键词匹配准确率 95%，误触率 < 2%。

> **教训**：对 LLM 的"最佳实践"（自动加 LIMIT）在某些场景是反模式。需要启发式规则弥补 LLM 对用户意图的"过度推断"。

## 五、Prompt 迭代检查清单

每次改 Prompt 前过一遍：

- [ ] 我能说清"输出不符合预期"的具体表现吗？
- [ ] 我定位了根因吗（指令模糊 / LLM 默认行为 / 缺上下文）？
- [ ] 修改方案有明确的"改后预期效果"吗？
- [ ] 我有评估集来验证修改效果吗？
- [ ] 我记录了修改前后的对比数据吗？

如果任何一项打不上来，先补齐再改——否则就是在"凭感觉调 Prompt"。

<div class="callout">相关实战：完整 8 次迭代日志见 EIA 项目 <code>docs/Prompt迭代日志.md</code>；YAML 模板见 <code>prompts/yaml/</code>；可直接用的模板见 <a href="/learn/prompt-templates/">Prompt 模板库</a>；评估方法见 <a href="/reference/eval-system/">AI 评估体系</a>。</div>
