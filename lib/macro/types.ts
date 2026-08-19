/** The payload shape the dashboard template renders. Mirrors the skill's data-schema.md. */

export type Factor = { s: "up" | "down"; h: string; b: string };

export type Asset = {
  emoji: string;
  name: string;
  verdict: "BULLISH" | "BEARISH";
  dir: "bull" | "bear";
  cap: "" | "capped" | "bottoming";
  one: string;
  qual: string;
  factors: Factor[];
};

export type MatrixRow = { f: string; r: string; c: ("p" | "n" | "z")[] };

export type Tile = {
  lab: string; val: string; src: string;
  lo: number; hi: number; v: number;
  mark: number; markLab: string;
  spark: number[]; read: string;
};

export type Calc = {
  lab: string; left: string; op: string; right: string; res: string; note: string;
};

export type BarChart = {
  title: string; sub: string; unit: string;
  min: number; max: number; ticks: number[];
  note: string; itemHeader: string; valueHeader: string;
  data: { label: string; value: number }[];
};

export type LineChart = {
  title: string; sub: string; seriesName: string;
  min: number; max: number; ticks: number[];
  refLine: number; refLabel: string;
  itemHeader: string; valueHeader: string;
  data: { label: string; value: number }[];
};

export type Dashboard = {
  title: string;
  stamp: string;
  regime: string;
  banner: string;
  assets: Asset[];
  matrix: MatrixRow[];
  tiles: Tile[];
  calcs: Calc[];
  barChart?: BarChart;
  lineChart?: LineChart;
  sources: [string, string][];
  /** Not rendered. Kept so the page can show how old the run is. */
  meta: { generatedAt: string; model: string; missing: string[]; lang: string };
};
