---
title: RAG 架构：从分块到溯源的工程决策
description: 标准 RAG 流程 + EIA（Enterprise Insight Agent）三个真实工程决策——本地 BGE-M3 零成本 Embedding、客户 Schema 动态适配 2h→30min、知识库过期导致 30 门店错答。不是教 RAG 是什么，是教你 RAG 落地时踩什么坑。
order: 3
updated: '2026-08-20'
tags: ['RAG', '向量检索', 'Embedding']
eyebrow: REFERENCE
---

> RAG 的核心不是"用了什么 Embedding 模型"，而是"检索回来的内容对不对、够不够、新不新"。标准流程人人都知道，落地时踩的坑才是分水岭。

数据来源：EIA 项目向量记忆模块（BGE-M3 + pgvector）+ 真实运行数据 + 客户接入经验。

---

## 一、标准 RAG 流程

```
用户查询
    │
    ▼
查询理解（重写/扩展）
    │
    ▼
向量检索（Embedding → Vector DB）
    │
    ▼
文档召回（Top-K）
    │
    ▼
重排序（Rerank）
    │
    ▼
上下文组装
    │
    ▼
LLM 生成回答
    │
    ▼
输出 + 引用
```

这个流程是标准答案，每个 RAG 教程都讲。但真正落地的三个工程决策，教程里不会讲——下面用 EIA 的真实经验补上。

## 二、EIA 的三个 RAG 工程决策

### 决策 1：本地 BGE-M3 而非 OpenAI Embedding

**AI 建议**：用 OpenAI `text-embedding-3-small`，1536 维，"质量最高"。

**我为什么否决**：Embedding 调用量与分析量 1:1 绑定，长期累积成本不可忽视。远程 API 延迟 200-500ms，本地 < 50ms——10 倍延迟差。BGE-M3 在中文 C-MTEB 基准上排名前列，实测中文检索效果优于 OpenAI。

**结果**：Embedding 成本归零，检索延迟 < 50ms，相似分析匹配准确率约 79%。

> 详见 [决策案例 D05](/cases/decision-cases/)。

### 决策 2：客户 Schema 动态适配

**问题**：不同客户数据库表名不同（`orders` vs `t_sales_order`），V3 需要手动改写每个 Agent 的 Prompt。接入新客户平均 2 小时。

**根因**：Prompt 中硬编码了业务 Schema——表名、列名。每个客户需要单独维护一份 Prompt。

**方案**：`PromptBuilder` 根据 `customer_schema.yaml` 动态生成每个 Agent 的 System Prompt。3 级 fallback 机制：

```
app/tools/prompt_loader.py
  1. customer_schema（客户定制 Prompt，优先级最高）
  2. yaml（标准 Prompt 模板）
  3. python（硬编码兜底，确保 YAML 损坏时不崩）
```

**结果**：修改 YAML → 所有 Agent Prompt 自动替换。接入新客户从 2 小时 → 30 分钟。

> **教训**：Prompt 中硬编码业务 Schema 是 AI 产品最隐蔽的扩展瓶颈。表面看 Prompt 通用，实际上每个客户有一份独特的数据库字典。

### 决策 3：知识库过期导致 30 门店错答

**问题**：用户问"华东区门店经营情况"，Agent 返回的门店数据只有 70 家——实际有 100 家。根因是向量记忆库里的历史数据过期了，但 RAG 仍在检索旧的嵌入。

**根因**：RAG 检索的是"历史相似分析"的嵌入，而不是"实时数据库"的数据。知识库没有同步机制。

**修复**：给记忆库加 `updated_at` 时间戳，检索时过滤超过 7 天的旧记录。同时建立知识库刷新机制，与数据库同步更新。

> **教训**：RAG 不是"建好就不管了"。知识库的数据会过期，过期的检索结果比没有检索更危险——因为用户会信任"AI 查到了"的结果。

## 三、分块策略

| 策略 | 方法 | 适用场景 |
|------|------|---------|
| 固定大小 | 256/512 tokens | 通用文档 |
| 语义分段 | 按 Markdown 标题层级切分 | 结构化文档 |
| 递归分割 | 分层递归 | 长文档 |
| 语义聚类 | 相似度聚类 | 非结构化文本 |

**EIA 的选择**：语义分段（按 Markdown 标题层级）+ 重叠 10%。因为 EIA 的知识库主要是结构化的分析报告，按标题切分能保持语义完整性。

## 四、检索优化

### Query 重写
- 将模糊查询转为精确查询（"最近生意怎么样" → "近 30 天各门店销售额趋势"）
- 拆解复合问题为子问题
- 添加领域术语扩展

### Hybrid Search
- 向量检索（语义相似）+ 关键词检索（精确匹配）加权融合
- EIA 用 BGE-M3 做向量检索，BM25 做关键词检索

### Rerank
- Cross-Encoder 重排序提升 Top-K 准确率
- 推荐 BGE-Reranker（中文效果好、开源免费）

## 五、RAG 评估指标

| 指标 | 说明 | EIA 目标 | EIA 实测 |
|------|------|---------|---------|
| Recall@K | 召回率 | > 0.85 | ~0.79 |
| Precision@K | 精确率 | > 0.7 | 持续优化中 |
| 幻觉率 | 编造数据比例 | < 2% | 0%（有溯源） |

> EIA 的召回率 0.79 低于 0.85 目标，但通过数据溯源标记弥补——用户可以验证每个数据的来源，即使检索不完美，信任度仍达 4.5/5。详见 [AI 交互设计](/reference/ai-interaction/)。

## 六、常见问题速查

| 问题 | 根因 | 修复方向 |
|------|------|---------|
| 检索不到 | Chunk 过大/过小 | 调 Chunk Size（256-512 tokens） |
| 检索不准 | Embedding 不匹配 | 换中文优化的 Embedding（BGE-M3） |
| 回答幻觉 | 上下文不足 | 加 Rerank + 引用机制 |
| 数据过期 | 知识库未同步 | 加时间戳过滤 + 定期刷新 |
| 客户接入慢 | Schema 硬编码 | 动态 Schema 适配 |

<div class="callout">相关实战：<a href="/cases/decision-cases/">决策案例 D05</a>（BGE-M3 选型）；<a href="/reference/prompt-design/">Prompt 工程</a>迭代 4（Schema 动态适配）；<a href="/reference/eval-system/">AI 评估体系</a>（RAG 检索质量评估）。</div>
