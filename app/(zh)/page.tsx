import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { ALTERNATES, COPY, HOME_URL } from '@/lib/site/home';

export const metadata: Metadata = {
  title: COPY.title.zh,
  description: COPY.description.zh,
  alternates: { canonical: HOME_URL.zh, ...ALTERNATES },
  openGraph: {
    title: COPY.title.zh,
    description: COPY.description.zh,
    url: HOME_URL.zh,
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function Page() {
  return <HomePage lang="zh" />;
}
