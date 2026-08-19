export type Band = 'good' | 'mid' | 'weak';
export type StructKind = 'core' | 'leak' | 'ext' | 'thin' | 'pending';

export interface Note {
  title: string;
  date: string;        // YYYY-MM-DD
  hour: number;
  fmt: string;         // 图文 / 视频
  age: number;         // 距导出日的天数
  imp: number;         // 曝光
  views: number;       // 观看量
  fol: number;         // 涨粉
  like: number;
  cmt: number;
  save: number;
  shr: number;
  dwell: number;       // 人均观看时长（秒）
  clicks: number;      // 平台点击率 × 曝光
  gap: number;         // 观看 − 点击
  covR: number;        // 平台封面点击率 %
  linkR: number;       // 观看 ÷ 曝光 %（链路口径）
  conR: number;        // 涨粉 ÷ 观看 %
  fanR: number;        // 涨粉 ÷ 曝光 %
  ratio: number;       // linkR ÷ covR
  structK: StructKind;
  struct: string;
  structRead: string;
  covS: number;
  conS: number;
  fanS: number;
  covBc: Band;
  conBc: Band;
  fanBc: Band;
}

export interface Acc {
  imp: number;
  clicks: number;
  views: number;
  fol: number;
  covR: number;
  linkR: number;
  conR: number;
  fanR: number;
  ratio: number;
  covS: number;
  conS: number;
  fanS: number;
  covB: string;
  conB: string;
  fanB: string;
  covBc: Band;
  conBc: Band;
  fanBc: Band;
  identity: number;
  viewPerFol: number;
}

export interface TrendPoint {
  date: string;
  imp: number;
  views: number;
  ctr: number;
  dwell: number;
  finish: number;
}

/** 近30日观看数据.xlsx 里的账号级信息（可选文件） */
export interface AccountTrend {
  totals: Record<string, number>;
  daily: TrendPoint[];
  /** 最后一天未结算，画图时应虚化或剔除 */
  unsettledDate: string | null;
}

export interface Dropped {
  date: string;
  imp: number;
  fol: number;
}

export interface Meta {
  exportDate: string;
  start: string;
  end: string;
  nScored: number;
  nPending: number;
  nDropped: number;
  droppedImp: number;
  droppedFol: number;
  hasAccountTrend: boolean;
}

export interface Report {
  meta: Meta;
  acc: Acc;
  notes: Note[];        // 含 pending
  dropped: Dropped[];
  agg: Record<string, number>;
  trend: AccountTrend | null;
}

/** LLM 产出：逐篇九宫格 */
export interface NoteAnalysis {
  fanAlgo: string[]; fanBlog: string[]; fanFix: string[];
  covAlgo: string[]; covBlog: string[]; covFix: string[];
  conAlgo: string[]; conBlog: string[]; conFix: string[];
}

/** LLM 产出：总建议 */
export interface Suggestion {
  h: string;
  t: string;
  p: string[];
  s: string;
}

export interface Analysis {
  analysis: Record<string, NoteAnalysis>;
  suggestions: Suggestion[];
}
