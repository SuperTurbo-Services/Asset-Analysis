import { renderPage } from '@/lib/macro/page';

// 数据来自仓库里的文件，请求里不生成任何东西，所以整页可以预渲染
export const dynamic = 'force-static';

export function GET() {
  return renderPage('en');
}
