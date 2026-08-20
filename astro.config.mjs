import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 站点部署到腾讯云 CloudBase 静态托管，输出纯静态文件
// site 用于生成 sitemap 绝对链接 + OG 分享图绝对地址；资源引用仍走根路径，不受 site 影响
// 上线后若绑定自有域名，改这一处即可
export default defineConfig({
  output: 'static',
  site: 'https://ai-pm-site-d0g2id0usfe50d5ab-1471526534.tcloudbaseapp.com',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
