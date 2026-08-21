import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SiteHead from '@/components/SiteHead';
import { COPY, HTML_LANG } from '@/lib/site/home';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://superturbo.app'),
  title: COPY.title.en,
  description: COPY.description.en,
};

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG.en}>
      <head>
        <SiteHead />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
