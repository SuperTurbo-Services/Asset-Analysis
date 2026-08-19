import { NextResponse } from 'next/server';
import { readDashboard } from '@/lib/macro/store';

export const dynamic = 'force-static';

/** 当前这一版看板的原始数据，中英两份。 */
export async function GET() {
  const bundle = await readDashboard();
  if (!bundle) {
    return NextResponse.json({ error: 'no dashboard has been generated yet' }, { status: 503 });
  }
  return NextResponse.json(bundle);
}
