import type { NextConfig } from 'next';
import path from 'node:path';

// The production project serves several SuperTurbo routes from one Next.js app.
// Asset Analysis uses real route directories rather than a basePath.
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // The route reads the dashboard template at runtime, so include its template
  // and generated data in the server function bundle.
  outputFileTracingIncludes: {
    '/asset-analysis': ['./template/**', './data/**'],
    '/asset-analysis/zh': ['./template/**', './data/**'],
  },
  // Preserve existing shared links and redirect the former product name to
  // Asset Analysis.
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
