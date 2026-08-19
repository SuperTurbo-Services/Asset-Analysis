'use client';

import { useEffect } from 'react';

/**
 * 模板自带的渲染脚本是一段普通 DOM 脚本。
 * 用 next/script 只会在首次加载时执行一次，从站内再次进入这个路由时
 * 标记是新的、脚本却不会重跑，页面就是空的。所以改成每次挂载都执行，
 * 顺便把 const D 关在函数作用域里，避免重复声明。
 */
export default function MacroRender({ source }: { source: string }) {
  useEffect(() => {
    try {
      new Function(source)();
    } catch (err) {
      console.error('macro dashboard render failed', err);
    }
  }, [source]);

  return null;
}
