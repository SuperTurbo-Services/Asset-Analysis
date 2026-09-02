import type { NextConfig } from 'next';
import path from 'node:path';

// 应用挂在 superturbo.app/xiaohongshu-growth-dashboard，用真实路由目录实现，
// 不用 basePath —— 根路径留给 SuperTurbo 落地页和后续工具。
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // template/macro-dashboard.html 在运行时用 fs 读取，必须打进函数包里
  outputFileTracingIncludes: {
    '/asset-analysis': ['./template/**', './data/**'],
    '/asset-analysis/zh': ['./template/**', './data/**'],
  },
  // 新旧分享链接继续能用；旧名称永久跳到新的 Asset Analysis 地址。
  async redirects() {
    return [
      {
        source: '/asset-analysis',
        has: [{ type: 'query', key: 'lang', value: 'zh' }],
        destination: '/asset-analysis/zh',
        permanent: false,
      },
      {
        source: '/macro-dashboard',
        has: [{ type: 'query', key: 'lang', value: 'zh' }],
        destination: '/asset-analysis/zh',
        permanent: true,
      },
      {
        source: '/macro-dashboard/zh',
        destination: '/asset-analysis/zh',
        permanent: true,
      },
      {
        source: '/macro-dashboard',
        destination: '/asset-analysis',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
