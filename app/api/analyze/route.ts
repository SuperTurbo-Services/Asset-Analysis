import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM, buildUserPrompt } from '@/lib/prompt';
import { extractJson, validate } from '@/lib/validate';
import type { Analysis, Report } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * AI 解读。API key 只存在于这个文件运行的服务端进程里：
 *  - 从环境变量读取，永远不会出现在返回体、日志或错误信息里
 *  - 客户端只发送算好的指标，不发原始导出文件
 * 换服务商只要改 DEEPSEEK_BASE_URL / DEEPSEEK_MODEL 两个环境变量。
 */
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const MAX_ATTEMPTS = 3;
const MAX_NOTES = 60;

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function callModel(messages: { role: string; content: string }[], signal: AbortSignal) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('MISSING_KEY');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  if (!res.ok) {
    // 只透出状态码，绝不回传服务商的响应体（可能带请求回显）
    throw new Error(`UPSTREAM_${res.status}`);
  }
  const json = (await res.json()) as ChatResponse;
  const text = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('EMPTY_RESPONSE');
  return { text, usage: json.usage };
}

export async function POST(req: NextRequest) {
  let report: Report;
  try {
    report = (await req.json()) as Report;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  // 形状校验：缺任何一块都直接拒绝，不要让下游在解引用时崩成 500
  const missing = (['acc', 'meta', 'agg'] as const).filter((k) => !report?.[k]);
  if (!Array.isArray(report?.notes) || missing.length) {
    return NextResponse.json(
      { error: `请求体不是完整的报告对象（缺少 ${missing.join('、') || 'notes'}）` },
      { status: 400 },
    );
  }

  const scored = report.notes.filter((n) => n?.structK !== 'pending');
  if (!scored.length) {
    return NextResponse.json({ error: '没有可分析的笔记' }, { status: 400 });
  }
  if (scored.length > MAX_NOTES) {
    return NextResponse.json(
      { error: `单次最多分析 ${MAX_NOTES} 篇，当前 ${scored.length} 篇。请缩短统计窗口。` },
      { status: 413 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 280_000);

  let lastIssues: string[] = [];

  try {
    const messages = [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildUserPrompt(report) },
    ];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let parsed: Analysis;
      try {
        const { text } = await callModel(messages, controller.signal);
        parsed = extractJson(text) as Analysis;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'MISSING_KEY') {
          return NextResponse.json(
            { error: 'AI 解读暂不可用：服务端未配置模型凭证。' },
            { status: 503 },
          );
        }
        if (attempt === MAX_ATTEMPTS) {
          return NextResponse.json(
            { error: `AI 解读失败（${msg}）。基础报告不受影响，可以稍后再试。` },
            { status: 502 },
          );
        }
        continue;
      }

      const issues = validate(parsed, scored);
      if (!issues.length) {
        return NextResponse.json({ ...parsed, attempts: attempt });
      }

      lastIssues = issues.slice(0, 25).map((i) => `${i.where}：${i.what}`);
      if (attempt === MAX_ATTEMPTS) break;

      // 把校验失败原样喂回去让它自己修，比重新生成便宜
      messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
      messages.push({
        role: 'user',
        content: `上面的输出没有通过格式校验，问题如下：\n${lastIssues.join('\n')}\n\n请只修正这些问题，其余内容保持不变，重新输出完整的 JSON。`,
      });
    }

    return NextResponse.json(
      {
        error: '生成结果多次未通过格式校验，已放弃以免给出不合规范的诊断。',
        issues: lastIssues,
      },
      { status: 422 },
    );
  } catch {
    // 兜底：绝不把内部异常信息外泄（可能含请求内容或环境细节）
    return NextResponse.json({ error: 'AI 解读遇到内部错误，基础报告不受影响。' }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
