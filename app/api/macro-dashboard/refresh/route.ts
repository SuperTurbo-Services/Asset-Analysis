import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { generateDashboard } from '@/lib/macro/generate';
import { writeDashboard } from '@/lib/macro/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * 每日重建。Vercel Cron 按 vercel.json 的时间调用，并带上 CRON_SECRET。
 * 只有校验通过的新看板才会覆盖旧的，所以失败的一次跑不会把页面弄坏。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ error: 'AI_GATEWAY_API_KEY is not set' }, { status: 500 });
  }

  const started = Date.now();
  try {
    const { dashboard, attempts, warnings } = await generateDashboard();
    const stored = await writeDashboard(dashboard);
    revalidatePath('/macro-dashboard');
    return NextResponse.json({
      ok: true,
      attempts,
      warnings,
      stored,
      seconds: Math.round((Date.now() - started) / 1000),
      verdicts: dashboard.assets.map((a) => `${a.name} ${a.verdict}`),
    });
  } catch (err) {
    console.error('macro refresh failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
