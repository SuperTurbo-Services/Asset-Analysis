import type { Dashboard } from "./types";

/**
 * Where the finished dashboard lives between the daily cron run and the next
 * visitor. Blob is used when a store exists, a local file in development, and
 * nothing at all otherwise, in which case the page generates on demand.
 */
const KEY = "macro-dashboard.json";
const LOCAL = ".cache/macro-dashboard.json";

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const isServerless = () => Boolean(process.env.VERCEL);

export async function readDashboard(): Promise<Dashboard | null> {
  if (hasBlob()) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: KEY, limit: 1 });
      if (!blobs.length) return null;
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Dashboard;
    } catch (err) {
      console.error("blob read failed", err);
      return null;
    }
  }
  if (isServerless()) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(LOCAL, "utf8")) as Dashboard;
  } catch {
    return null;
  }
}

export async function writeDashboard(d: Dashboard): Promise<string> {
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
  if (isServerless()) return "not stored, no blob store is configured";
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(".cache", { recursive: true });
  await writeFile(LOCAL, JSON.stringify(d, null, 2));
  return LOCAL;
}
