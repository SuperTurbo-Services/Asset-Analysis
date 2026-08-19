import type { Bundle } from './generate';

/**
 * 看板的数据就是仓库里的一个文件，`data/macro-dashboard.json`。
 *
 * 页面只负责显示它，不在请求里生成任何东西，所以是纯静态的，CDN 直接发，
 * 打开就是毫秒级。要更新内容就在本地跑 `npm run macro:refresh`，
 * 它会重写这个文件，然后 commit push，Vercel 重新构建。
 *
 * 这样运行时完全不需要 AI key，也不需要 Blob store 和 cron。
 */
export const DATA_FILE = 'data/macro-dashboard.json';

const isBundle = (v: unknown): v is Bundle =>
  Boolean(v && typeof v === 'object' && 'en' in (v as object) && 'zh' in (v as object));

export async function readDashboard(): Promise<Bundle | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const raw = await readFile(path.join(process.cwd(), DATA_FILE), 'utf8');
    const parsed = JSON.parse(raw);
    return isBundle(parsed) ? parsed : null;
  } catch {
    // 还没生成过，页面会显示等待状态
    return null;
  }
}

/** 只有本地脚本会调用这个。 */
export async function writeDashboard(d: Bundle): Promise<string> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir('data', { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(d, null, 1)}\n`);
  return DATA_FILE;
}
