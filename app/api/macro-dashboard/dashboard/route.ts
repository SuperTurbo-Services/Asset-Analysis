import { NextResponse } from 'next/server';
import { readDashboard } from '@/lib/macro/store';

/** 当前这一版看板的原始数据。 */
export async function GET() {
  const bundle = await readDashboard();
  if (!bundle) {
    return NextResponse.json(
      { error: 'no dashboard has been generated yet' },
      { status: 503 },
    );
  }
  return NextResponse.json(bundle, {
    headers: { 'cache-control': 'public, max-age=300' },
  });
}
