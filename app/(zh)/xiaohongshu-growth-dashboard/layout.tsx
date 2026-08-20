import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '笔记涨粉诊断台 · SuperTurbo',
  description:
    '上传小红书创作者后台的导出表，得到一份把「为什么不涨粉」定位到具体环节的诊断看板。',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
