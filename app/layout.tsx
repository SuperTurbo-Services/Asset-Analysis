import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '笔记涨粉诊断台 · SuperTurbo',
  description:
    '上传小红书创作者后台的导出表，得到一份把「为什么不涨粉」定位到具体环节的诊断看板。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
