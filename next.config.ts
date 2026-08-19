import type { NextConfig } from 'next';
import path from 'node:path';

// 应用挂在 superturbo.app/xiaohongshu-growth-dashboard，用真实路由目录实现，
// 不用 basePath —— 根路径留给 SuperTurbo 落地页和后续工具。
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // template/macro-dashboard.html 在运行时用 fs 读取，必须打进函数包里
  outputFileTracingIncludes: {
    '/macro-dashboard': ['./template/**', './data/**'],
    '/macro-dashboard/zh': ['./template/**', './data/**'],
  },
  // 分享出去过的 ?lang=zh 链接继续能用
  async redirects() {
    return [
      {
        source: '/macro-dashboard',
        has: [{ type: 'query', key: 'lang', value: 'zh' }],
        destination: '/macro-dashboard/zh',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
