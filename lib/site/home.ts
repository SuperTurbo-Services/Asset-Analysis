import type { Lang } from '@/lib/macro/i18n';

export type { Lang };
export const LANGS: Lang[] = ['zh', 'en'];

/** 首页每种语言一个静态路径，和宏观看板同一套约定。 */
export const HOME_PATH: Record<Lang, string> = {
  zh: '/',
  en: '/en',
};

export const HOME_URL: Record<Lang, string> = {
  zh: 'https://superturbo.app',
  en: 'https://superturbo.app/en',
};

/** 切换按钮上的字，永远写自己那门语言，不翻译。 */
export const LANG_LABEL: Record<Lang, string> = {
  zh: '中文',
  en: 'English',
};

export const HTML_LANG: Record<Lang, string> = {
  zh: 'zh-CN',
  en: 'en',
};

/** hreflang 用的标签，和宏观看板的 <link rel="alternate"> 写法保持一致。 */
export const HREF_LANG: Record<Lang, string> = {
  zh: 'zh-Hans',
  en: 'en',
};

export const ALTERNATES = {
  languages: { 'zh-Hans': HOME_URL.zh, en: HOME_URL.en, 'x-default': HOME_URL.zh },
};

type Tool = {
  /** 中英各指向工具自己的语言版本，没有的就都指中文。 */
  href: Record<Lang, string>;
  name: Record<Lang, string>;
  blurb: Record<Lang, string>;
  /** 界面只有中文时挂一条提示，英文读者点进去之前先知道。 */
  zhOnly?: boolean;
};

export const TOOLS: Tool[] = [
  {
    href: {
      zh: '/xiaohongshu-growth-dashboard',
      en: '/xiaohongshu-growth-dashboard',
    },
    name: {
      zh: '小红书涨粉诊断台',
      en: 'Xiaohongshu Growth Diagnostic',
    },
    blurb: {
      zh: '上传创作者中心的「笔记列表明细表」，得到三项百分制评分、四段漏斗、流量结构分类和逐篇诊断。把「为什么不涨粉」定位到具体环节。表格在你自己的浏览器里解析，原始文件不会上传。',
      en: 'Upload the note level export from the Xiaohongshu creator dashboard and get three scores out of 100, a four stage funnel, a traffic mix classification and a note by note diagnosis. It puts "why is this account not growing" on a specific stage. The spreadsheet is parsed inside your own browser, the file itself is never uploaded.',
    },
    zhOnly: true,
  },
  {
    href: {
      zh: '/macro-dashboard/zh',
      en: '/macro-dashboard',
    },
    name: {
      zh: '宏观影响看板',
      en: 'Macro Impact Dashboard',
    },
    blurb: {
      zh: '美股、现金、黄金、加密四类资产，在当下的宏观环境里是看多还是看跌。每天自动重建一次，数字全部来自 FRED 和市场行情，模型只负责打分和写判断。',
      en: 'Whether the current macro environment is bullish or bearish for US stocks, cash, gold and crypto. Rebuilt once a day. Every number comes from FRED and market data, the model only scores them and writes the verdict.',
    },
  },
];

export const COPY = {
  // 标签页标题和大标题保持一致。别的页是「工具名 · SuperTurbo」，首页标题里已经有
  // SuperTurbo 了，再缀一次是重复。
  title: {
    zh: 'SuperTurbo 工具合集',
    en: 'SuperTurbo Tool Set',
  },
  description: {
    zh: '一组自用的分析工具。每个工具只做一件小事，把后台导出的表变成能动手的诊断。',
    en: 'A small collection of analysis tools. Each one does a single thing, and turns an exported spreadsheet into a diagnosis you can act on.',
  },
  headline: {
    zh: 'SuperTurbo 工具合集',
    en: 'SuperTurbo Tool Set',
  },
  lead: {
    zh: '一组自用的分析工具。每个工具只做一件小事，打开就能用。',
    en: 'A small collection of analysis tools built for my own use. Each one does a single thing, and works the moment you open it.',
  },
  langNav: {
    zh: '切换语言',
    en: 'Change language',
  },
  zhOnly: {
    zh: '界面为中文',
    en: 'Chinese interface',
  },
  aboutTerm: {
    zh: '关于。',
    en: 'About.',
  },
  about: {
    zh: 'SuperTurbo 是 Turbo 的个人工具集。',
    en: "SuperTurbo is Turbo's personal collection of tools.",
  },
} as const;
