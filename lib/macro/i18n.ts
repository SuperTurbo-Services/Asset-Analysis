import type { TemplateParts } from './template';

export type Lang = 'en' | 'zh';
export const LANGS: Lang[] = ['en', 'zh'];

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday'];
const WEEKDAYS_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * Observation dates. Never an ISO string on the page, the dashboard forbids the
 * hyphen character in visible text.
 */
export function formatDate(iso: string, monthly: boolean, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  if (lang === 'zh') return monthly ? `${m} 月` : `${m} 月 ${d} 日`;
  return monthly ? MONTHS_EN[m - 1] : `${MONTHS_EN[m - 1]} ${d}`;
}

export function formatStamp(
  p: { y: number; m: number; d: number; weekday: number },
  lang: Lang,
): string {
  if (lang === 'zh') {
    return `截至 ${p.y} 年 ${p.m} 月 ${p.d} 日，${WEEKDAYS_ZH[p.weekday]}。`;
  }
  return `As of ${WEEKDAYS_EN[p.weekday]}, ${MONTHS_EN[p.m - 1]} ${p.d}, ${p.y}.`;
}

/** Everything the deterministic half of the payload puts on the page. */
export const S = {
  title: { en: 'Macro Impact Dashboard', zh: '宏观影响看板' },
  assets: {
    'US Stocks': { en: 'US Stocks', zh: '美股' },
    'US Cash': { en: 'US Cash', zh: '美元现金' },
    Gold: { en: 'Gold', zh: '黄金' },
    Crypto: { en: 'Crypto', zh: '加密资产' },
  } as Record<string, { en: string; zh: string }>,
  metrics: {
    real10: { en: '10 year real yield', zh: '10 年期实际利率' },
    nom10: { en: '10 year nominal yield', zh: '10 年期名义利率' },
    be10: { en: '10 year breakeven', zh: '10 年期盈亏平衡通胀' },
    hyoas: { en: 'High yield OAS', zh: '高收益债利差' },
    bill3m: { en: '3 month T bill', zh: '3 个月国库券' },
    ffr: { en: 'Fed funds effective', zh: '联邦基金有效利率' },
    coreCpi: { en: 'Core CPI, year over year', zh: '核心 CPI 同比' },
    headlineCpi: { en: 'Headline CPI, year over year', zh: '整体 CPI 同比' },
    growth: { en: 'Industrial production, year over year', zh: '工业产出同比' },
    vix: { en: 'VIX', zh: 'VIX 波动率' },
    spx: { en: 'S&P 500', zh: '标普 500' },
    btc: { en: 'Bitcoin', zh: '比特币' },
    gold: { en: 'Gold', zh: '黄金' },
    dxy: { en: 'Dollar index', zh: '美元指数' },
  } as Record<string, { en: string; zh: string }>,
  marks: {
    target: { en: 'target', zh: '目标' },
    coreCpi: { en: 'core CPI', zh: '核心 CPI' },
    bp400: { en: '400 bp', zh: '400 个基点' },
    high52: { en: '52 week high', zh: '52 周高点' },
    ma200: { en: '200d', zh: '200 日线' },
  },
  calcs: {
    real10: {
      en: '10 year real yield, from the nominal and the breakeven',
      zh: '10 年期实际利率，由名义利率与盈亏平衡通胀得出',
    },
    matches: {
      en: (v: string) => `Matches FRED DFII10, which prints the same yield at ${v} percent.`,
      zh: (v: string) => `与 FRED DFII10 一致，那边同样是 ${v}%。`,
    },
    crossCheck: {
      en: (v: string, bp: number) =>
        `Cross checks against FRED DFII10 at ${v} percent, a gap of ${bp} basis points from the different observation dates.`,
      zh: (v: string, bp: number) =>
        `与 FRED DFII10 的 ${v}% 相互印证，${bp} 个基点的差来自观测日期不同。`,
    },
    noCross: {
      en: 'FRED DFII10 was unavailable this run, so there is no cross check.',
      zh: '这次跑的时候 FRED DFII10 取不到，所以没有交叉印证。',
    },
    carryCore: {
      en: 'Real carry on cash, against core CPI',
      zh: '现金的实际收益，对核心 CPI',
    },
    carryCoreNote: {
      en: (month: string) =>
        `What a 3 month T bill pays after core inflation, for taking no duration and no credit risk. Core CPI is the ${month} print.`,
      zh: (month: string) =>
        `不承担久期和信用风险的前提下，3 个月国库券扣掉核心通胀还剩多少。核心 CPI 取的是 ${month} 那期。`,
    },
    carryHeadline: {
      en: 'Real carry on cash, against headline CPI',
      zh: '现金的实际收益，对整体 CPI',
    },
    carryHeadlineNote: {
      en: 'Headline includes food and energy, so this is the number a household actually feels.',
      zh: '整体 CPI 含食品和能源，所以这个数字才是一个家庭真正感受到的。',
    },
    btc200: { en: 'Bitcoin against its 200 day average', zh: '比特币与它的 200 日均线' },
    btc200Note: {
      en: 'The 200 day line is the trend filter the framework uses for crypto.',
      zh: '200 日均线是这套框架给加密资产用的趋势过滤器。',
    },
    gold200: { en: 'Gold against its 200 day average', zh: '黄金与它的 200 日均线' },
    gold200Note: {
      en: 'Gold rejecting or reclaiming this line has capped every advance this cycle.',
      zh: '这轮周期里，黄金每一次上攻都卡在这条线上。',
    },
    against: { en: 'against', zh: '对比' },
    minus: { en: 'minus', zh: '减' },
    percent: { en: (v: string) => `${v} percent`, zh: (v: string) => `${v}%` },
    above: { en: 'above', zh: '高于' },
    below: { en: 'below', zh: '低于' },
    pctAboveBelow: {
      en: (v: string, up: boolean) => `${v} percent ${up ? 'above' : 'below'}`,
      zh: (v: string, up: boolean) => `${up ? '高出' : '低于'} ${v}%`,
    },
  },
  charts: {
    barTitle: { en: 'Five session change, by asset', zh: '最近五个交易日的涨跌，按资产' },
    barSub: {
      en: 'Percent change over the last five sessions. The zero line separates what is working from what is not.',
      zh: '最近五个交易日的百分比变化。零线把有效的和无效的分开。',
    },
    barNote: {
      en: (v: string) => `The 10 year nominal yield sits at ${v} over the same window.`,
      zh: (v: string) => `同一段时间里，10 年期名义利率在 ${v}。`,
    },
    barItem: { en: 'Asset', zh: '资产' },
    barValue: { en: 'Change, percent', zh: '涨跌，%' },
    lineTitle: {
      en: 'Core CPI, year over year, last 12 months',
      zh: '核心 CPI 同比，最近 12 个月',
    },
    lineSub: {
      en: (v: string) => `The latest print is ${v} percent. The line at 2 is the Federal Reserve's target.`,
      zh: (v: string) => `最新一期是 ${v}%。2 那条线是美联储的目标。`,
    },
    lineSeries: { en: 'Core CPI, year over year', zh: '核心 CPI 同比' },
    lineRef: { en: '2, the target', zh: '2，目标' },
    lineItem: { en: 'Month', zh: '月份' },
    lineValue: { en: 'Percent', zh: '百分比' },
    months: {
      en: (short: string) => short,
      // "Jul 25" is July of 2025, so the year has to lead in Chinese or it
      // reads as the twenty fifth of July
      zh: (short: string) => {
        const i = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
          'Oct', 'Nov', 'Dec'].indexOf(short.slice(0, 3));
        if (i < 0) return short;
        const year = short.slice(4).trim();
        return year ? `${year} 年 ${i + 1} 月` : `${i + 1} 月`;
      },
    },
  },
  waiting: {
    en: 'Nothing to show yet. This page rebuilds itself once a day.',
    zh: '还没有内容。这个页面每天自动重建一次。',
  },
  switchTo: { en: '中文', zh: 'English' },
} as const;

/**
 * The template's own chrome is hardcoded English. Rather than fork the file, the
 * Chinese page rewrites these exact strings. Every entry is asserted to match,
 * so if the skill's template changes upstream the build fails loudly instead of
 * quietly serving half a translation.
 */
const ZH_TEMPLATE: [string, string][] = [
  // header and tabs
  ['Regime: ', '当前状态：'],
  ['&#9888; Not financial advice', '&#9888; 不构成投资建议'],
  ['>Verdicts<', '>结论<'],
  ['>Signals<', '>指标<'],
  ['"Dark mode"', '"深色模式"'],
  ['"Light mode"', '"浅色模式"'],
  ['type="button">Dark mode<', 'type="button">深色模式<'],
  // verdicts tab
  ['What is driving each call', '每个结论背后是什么'],
  ['Three factors per asset, usually two that confirm the verdict plus one offset that argues against it.',
    '每类资产三个因子，通常两个支持结论，一个反过来提出异议。'],
  ['Factor grid', '因子网格'],
  ['One row per factor, one column per asset. A factor only scores where the framework says it drives that asset, so blanks are deliberate.',
    '一行一个因子，一列一类资产。只有框架认为这个因子驱动那类资产时才打分，空白是有意留的。'],
  ['bullish for that asset', '对该资产看多'],
  ['bearish for that asset', '对该资产看跌'],
  ['not a driver of that asset', '不是该资产的驱动因素'],
  // signals tab
  ['Master signals', '主要指标'],
  ['The shared inputs, each shown against the band it has traded in. The tick on the track marks the level that flips the signal.',
    '共用的输入，每个都放在它自己的波动区间里看。轨道上的刻度是信号翻转的位置。'],
  ['Calculation steps', '计算过程'],
  ['Every derived number on this page, worked out.', '这个页面上每一个推导出来的数字，都算给你看。'],
  ['>Sources<', '>数据来源<'],
  ['Primary series first, price and flow reads second.', '先列原始序列，再列价格和资金面的读数。'],
  ['Table view', '表格视图'],
  // rendered by the script
  ['net ${NET[i] > 0 ? "+" : ""}${NET[i]} on the factor grid',
    '因子网格净分 ${NET[i] > 0 ? "+" : ""}${NET[i]}'],
  ['<span class="b-word">${a.verdict}</span>',
    '<span class="b-word">${a.verdict === "BULLISH" ? "看多" : "看跌"}</span>'],
  ['<span class="b-qual">${a.cap}</span>',
    '<span class="b-qual">${a.cap === "capped" ? "受限" : "筑底"}</span>'],
  ['<span class="verdict ${a.dir}">${a.dir === "bull" ? "▲" : "▼"} ${a.verdict}</span>',
    '<span class="verdict ${a.dir}">${a.dir === "bull" ? "▲ 看多" : "▼ 看跌"}</span>'],
  ['style="font-size:11px">${a.verdict}</span>',
    'style="font-size:11px">${a.verdict === "BULLISH" ? "看多" : "看跌"}</span>'],
  ['const title = { p: "bullish", n: "bearish", z: "not a driver" };',
    'const title = { p: "看多", n: "看跌", z: "不驱动" };'],
  ['title="${r.f}, ${title[c]} for ${D.assets[i].name}"',
    'title="${r.f}，对${D.assets[i].name}${title[c]}"'],
  ['<th class="rowh">Factor</th><th class="readh">Current reading</th>',
    '<th class="rowh">因子</th><th class="readh">当前读数</th>'],
  ['<td class="rowl">Net score</td><td class="readl">bullish factors minus bearish</td>',
    '<td class="rowl">净分</td><td class="readl">看多因子减看跌因子</td>'],
  ['<td class="rowl">Verdict</td><td class="readl">one word, plus a qualifier where true</td>',
    '<td class="rowl">结论</td><td class="readl">一个词，成立时再加一个限定语</td>'],
  ['C.itemHeader || "Item"', 'C.itemHeader || "项目"'],
  ['C.valueHeader || "Value"', 'C.valueHeader || "数值"'],
  ['C.itemHeader || "Period"', 'C.itemHeader || "区间"'],
  // the disclaimer, unreviewed boilerplate in both languages
  ['>Not financial advice<', '>不构成投资建议<'],
  ['This dashboard is personal research and general market commentary. It is not financial, investment, tax, or legal advice, and it is not a recommendation, offer, or solicitation to buy or sell any security, commodity, digital asset, or other instrument.',
    '这个看板是个人研究和一般性的市场评论。它不是财务、投资、税务或法律建议，也不构成买入或卖出任何证券、商品、数字资产或其他工具的推荐、要约或邀约。'],
  ["Nothing here is tailored to anyone's financial situation, objectives, risk tolerance, or time horizon.",
    '这里的内容没有针对任何人的财务状况、目标、风险承受能力或时间期限做过调整。'],
  ['The author is not a registered investment adviser, broker dealer, or financial planner, and no adviser or fiduciary relationship is created by reading this. Anyone acting on this material does so entirely at their own risk and should consult a licensed professional first.',
    '作者不是注册投资顾问、券商或理财规划师，阅读本文不构成任何顾问或受托关系。任何人据此行动，风险完全自负，并且应当先咨询有执照的专业人士。'],
  ['This analysis is AI generated and may contain errors.', '本分析由 AI 生成，可能有错。'],
  ['Figures are drawn from third party sources believed to be reliable but are not independently verified, are point in time as of the timestamp above, and go stale quickly. Verify every number against the linked primary source before relying on it.',
    '数字取自被认为可靠的第三方来源，但没有经过独立核实，只代表上方时间戳那一刻，并且很快就会过时。依赖任何一个数字之前，请对照链接的原始来源核对。'],
  ['The verdicts shown are a mechanical score of a fixed factor framework at one moment. They are not forecasts. Markets can move against every factor listed here. Past performance and current positioning do not predict future results, and all trading involves the risk of loss, up to and including total loss of capital. No representation or warranty, express or implied, is made as to accuracy or completeness, and no liability is accepted for any loss arising from use of this material.',
    '页面上的结论只是一套固定因子框架在某一刻的机械打分，不是预测。市场完全可以和这里列出的每一个因子对着走。过往表现和当前仓位都不能预示未来结果，任何交易都有亏损风险，直至本金全部亏光。对于准确性或完整性，不作任何明示或默示的陈述或保证，也不对因使用本材料而产生的任何损失承担责任。'],
];

/** Applies the Chinese chrome, and the language switch button, to the template. */
export function localizeTemplate(parts: TemplateParts, lang: Lang): TemplateParts {
  let { body, script } = parts;

  if (lang === 'zh') {
    for (const [from, to] of ZH_TEMPLATE) {
      const inBody = body.includes(from);
      const inScript = script.includes(from);
      if (!inBody && !inScript) {
        throw new Error(
          `i18n: the template no longer contains ${JSON.stringify(from.slice(0, 60))}. ` +
            'Update ZH_TEMPLATE in lib/macro/i18n.ts.',
        );
      }
      if (inBody) body = body.split(from).join(to);
      if (inScript) script = script.split(from).join(to);
    }
  }

  const other: Lang = lang === 'zh' ? 'en' : 'zh';
  const href = other === 'zh' ? '/macro-dashboard?lang=zh' : '/macro-dashboard';
  const button = `<a class="themebtn" href="${href}" hreflang="${other}" style="text-decoration:none">${S.switchTo[lang]}</a>`;
  const anchor = '<button class="themebtn" id="themebtn"';
  if (!body.includes(anchor)) {
    throw new Error('i18n: could not find the theme button to place the language switch beside');
  }
  body = body.replace(anchor, `${button}\n    ${anchor}`);

  return { ...parts, body, script };
}
