---
title: BadCase：RLS 注入跨系统边界，12% 首次查询直接崩
description: 一个字段名不一致让 12% 的用户首次查询就报错——store 表主键叫 id 但 RLS 注入用 store_id。根因不在任何单个子系统，而在两个子系统的交界处。
order: 6
updated: '2026-08-20'
tags: ['BadCase', 'RLS', '权限隔离', '跨系统']
eyebrow: CASES
---

> 这是 EIA 项目里最典型的"交界处 bug"。两个子系统各自都过了单元测试，但它们的交互没有被覆盖。它印证了七原则里的：**权限隔离** 和 **可验证**。

## 现象

用户是某连锁品牌的一个店长，只有 5 家门店的数据权限。他在 EIA 里问了一个最基础的问题——"我可以查询哪几家门店"。

系统返回的不是门店列表，而是一行冷冰冰的错误：

```
SQL execution failed: column "store_id" does not exist
```

这个 bug 影响了约 **12% 的首次查询**——也就是每 10 个新用户里，至少 1 个在第一次使用时就碰到报错。首次印象直接崩。

## 根因

EIA 的数据查询链路分两步：

1. **SQL 生成（Agent 子系统）**：LLLM 根据用户问题生成 SQL
2. **RLS 注入（安全子系统）**：在 SQL 执行前，自动注入行级权限过滤

问题是，`store` 表的主键列名叫 `id`，但 RLS 注入代码写死了 `store_id`：

```python
# rls_injector.py（修复前）
def inject_rls(sql, user_permissions):
    store_ids = user_permissions.allowed_stores  # ['18','19','20','21','22']
    # 无脑拼接，不管表名是什么
    return sql.replace(
        "FROM store",
        f"FROM store WHERE store_id IN ({','.join(store_ids)})"
    )
```

当 LLM 生成 `SELECT * FROM store` 时，RLS 注入后变成：

```sql
SELECT * FROM store WHERE store_id IN ('18','19','20','21','22')
```

但 `store` 表的主键叫 `id`，不叫 `store_id`。PostgreSQL 直接报错。

**关键点**：SQL 生成子系统单独测试时——RLS 关掉，SQL 能跑。RLS 注入子系统单独测试时——只测了 `orders` 表，`orders` 表的外键恰好叫 `store_id`，也能跑。**两个子系统各自都"正确"，但它们交界处的字段名不一致没人覆盖。**

## 修复

加 `_detect_store_column()` 函数，根据 SQL 中的表名动态选择正确的过滤列：

```python
# rls_injector.py（修复后）
def _detect_store_column(table_name: str) -> str:
    """根据表名动态识别权限过滤列名"""
    column_map = {
        "store": "id",           # store 表主键叫 id
        "orders": "store_id",    # orders 表外键叫 store_id
        "inventory": "store_id", # inventory 表外键叫 store_id
        "staff": "store_id",
    }
    return column_map.get(table_name, "store_id")  # 默认 store_id

def inject_rls(sql, user_permissions):
    store_ids = user_permissions.allowed_stores
    table_name = _extract_table_name(sql)  # 从 SQL 解析表名
    column = _detect_store_column(table_name)
    return sql.replace(
        f"FROM {table_name}",
        f"FROM {table_name} WHERE {column} IN ({','.join(store_ids)})"
    )
```

**结果**：修复后首次查询成功率从 88% 提升到 **99.5%**（剩余 0.5% 是其他边界 case）。

## 教训

> **AI 系统的 Bug 往往出现在"两个子系统交界处"。** RLS 注入（安全子系统）和 SQL 生成（Agent 子系统）分别都经过测试，但它们的交互没有被覆盖。

这条教训和传统软件工程里的"接口边界 bug"完全一致——但 AI 系统更难发现，因为 LLM 生成的 SQL 是非确定性的，你无法预知它会对哪张表做什么查询。传统系统可以穷举测试用例，AI 系统不行。

**产品层面的延伸**：做 AI 产品时，PM 要特别关注"AI 生成的内容"和"系统硬约束"的交界处。RLS 是硬约束，SQL 是 AI 生成——这个交界处天然脆弱。设计原则：**确定性事务交给代码，模糊判断交给 AI**——但交界处要写额外防御代码。

<div class="callout warn">
<strong>给 AI PM 的 checklist</strong>：你的系统里，哪些环节是"AI 生成的"和"系统硬约束的"交界处？列出来，每个交界处都要有防御代码 + 专门的集成测试用例。
</div>

> 更多踩坑集中在 <a href="/cases/badcase-library/">BadCase 库</a>；Reflection 死循环的修复见 <a href="/cases/badcase-004-reflection-loop/">BadCase-004</a>。
