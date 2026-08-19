import type { Bundle } from "./generate";

/**
 * Where the finished dashboard lives between the daily cron run and the next
 * visitor. Blob is used when a store exists, a local file in development, and
 * nothing at all otherwise, in which case the page generates on demand.
 */
const KEY = "macro-dashboard.json";
const LOCAL = ".cache/macro-dashboard.json";

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const isBundle = (v: unknown): v is Bundle =>
  Boolean(v && typeof v === "object" && "en" in (v as object) && "zh" in (v as object));

export async function readDashboard(): Promise<Bundle | null> {
  if (hasBlob()) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: KEY, limit: 1 });
      if (!blobs.length) return null;
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (!res.ok) return null;
      const parsed = await res.json();
      return isBundle(parsed) ? parsed : null;
    } catch (err) {
      console.error("blob read failed", err);
      return null;
    }
  }
  // No blob store, so fall back to a file. On Vercel the filesystem is read
  // only and this simply misses, which is the intended behaviour. Do not gate
  // this on process.env.VERCEL: `vercel env pull` writes VERCEL=1 into
  // .env.local, so that check is true on a laptop too.
  try {
    const { readFile } = await import("node:fs/promises");
    const parsed = JSON.parse(await readFile(LOCAL, "utf8"));
    return isBundle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeDashboard(d: Bundle): Promise<string> {
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(KEY, JSON.stringify(d), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return res.url;
  }
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(".cache", { recursive: true });
    await writeFile(LOCAL, JSON.stringify(d, null, 2));
    return LOCAL;
  } catch {
    return "not stored, there is no blob store and the filesystem is read only";
  }
}
