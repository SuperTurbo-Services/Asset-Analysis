import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The dashboard's look is the skill's template, used unmodified. It is split
 * into its three parts here so Next can serve the markup and let the original
 * vanilla renderer draw into it from the JSON payload.
 */
export type TemplateParts = { css: string; body: string; script: string };

let cache: TemplateParts | null = null;

export async function templateParts(): Promise<TemplateParts> {
  if (cache) return cache;

  const html = await readFile(
    path.join(process.cwd(), "template", "macro-dashboard.html"),
    "utf8",
  );

  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const body = html.match(/<body>([\s\S]*?)<script id="payload"/)?.[1];
  const script = html.match(
    /<script id="payload"[^>]*>__DATA__<\/script>\s*<script>([\s\S]*?)<\/script>/,
  )?.[1];

  if (!css || !body || !script) {
    throw new Error(
      "template/macro-dashboard.html no longer has the expected style, body and script blocks",
    );
  }

  cache = { css, body, script };
  return cache;
}

/** Same guard build.py applies: the payload must not close its own script tag. */
export function embedPayload(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}
