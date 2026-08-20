import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 三类内容共用同一套 frontmatter 结构
const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  // 列表/排序用，越小越靠前
  order: z.number().default(999),
  // 最后核验日期，体现"信任来自可验证"
  updated: z.string().optional(),
  // 列表里展示的小标签
  tags: z.array(z.string()).optional(),
  // 页面 eyebrow 小标题（LEARN / REFERENCE / CASES）
  eyebrow: z.string().optional(),
  // 是否草稿（true 则不发布）
  draft: z.boolean().default(false),
});

const learn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/learn' }),
  schema: pageSchema,
});

const reference = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/reference' }),
  schema: pageSchema,
});

const cases = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cases' }),
  schema: pageSchema,
});

export const collections = { learn, reference, cases };
