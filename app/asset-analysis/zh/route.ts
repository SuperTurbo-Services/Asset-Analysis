import { renderPage } from '@/lib/macro/page';

export const dynamic = 'force-static';

export function GET() {
  return renderPage('zh');
}
