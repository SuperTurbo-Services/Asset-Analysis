import { NextRequest, NextResponse } from "next/server";
import { getAssetContext } from "@/lib/macro/asset-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
    const context = await getAssetContext(symbol);
    return NextResponse.json(context, {
      headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset context failed";
    const status = message.includes("invalid symbol") ? 400 : message.includes("No public source") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
