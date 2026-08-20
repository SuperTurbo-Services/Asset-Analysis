import type { Metadata } from 'next';
import SiteHead from '@/components/SiteHead';
import { COPY, HTML_LANG } from '@/lib/site/home';
import '../globals.css';

// 中文那半个站的根布局。英文首页在 app/(en) 里，有自己的 <html lang>。
export const metadata: Metadata = {
  metadataBase: new URL('https://superturbo.app'),
  title: COPY.title.zh,
  description: COPY.description.zh,
};

export default function ZhRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG.zh}>
      <head>
        <SiteHead />
      </head>
      <body>{children}</body>
    </html>
  );
}
