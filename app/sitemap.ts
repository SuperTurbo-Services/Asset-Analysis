import type { MetadataRoute } from 'next';

const site = 'https://superturbo.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site, alternates: { languages: { 'zh-Hans': site, en: `${site}/en` } } },
    { url: `${site}/en`, alternates: { languages: { 'zh-Hans': site, en: `${site}/en` } } },
    { url: `${site}/xiaohongshu-growth-dashboard` },
    {
      url: `${site}/asset-analysis`,
      alternates: { languages: { en: `${site}/asset-analysis`, 'zh-Hans': `${site}/asset-analysis/zh` } },
    },
    {
      url: `${site}/asset-analysis/zh`,
      alternates: { languages: { en: `${site}/asset-analysis`, 'zh-Hans': `${site}/asset-analysis/zh` } },
    },
  ];
}
