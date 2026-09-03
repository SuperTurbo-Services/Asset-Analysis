import { renderPage } from '@/lib/macro/page';

// The report reads repository data and performs no request-time generation,
// so the complete page can be prerendered.
export const dynamic = 'force-static';

export function GET() {
  return renderPage('en');
}
