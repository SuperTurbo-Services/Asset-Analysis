import type { NextConfig } from 'next';
import path from 'node:path';

// 应用挂在 superturbo.app/xiaohongshu-growth-dashboard，用真实路由目录实现，
// 不用 basePath —— 根路径留给 SuperTurbo 落地页和后续工具。
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
