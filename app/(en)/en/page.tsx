import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { ALTERNATES, COPY, HOME_URL } from '@/lib/site/home';

export const metadata: Metadata = {
  title: COPY.title.en,
  description: COPY.description.en,
  alternates: { canonical: HOME_URL.en, ...ALTERNATES },
  openGraph: {
    title: COPY.title.en,
    description: COPY.description.en,
    url: HOME_URL.en,
    type: 'website',
    locale: 'en_US',
  },
};

export default function Page() {
  return <HomePage lang="en" />;
}
