import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/macro/asset-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 8);
    const results = await searchAssets(query, limit);
    return NextResponse.json({ query, results, source: "Yahoo Finance", generated_at: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset search failed";
    const status = message.includes("required") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
