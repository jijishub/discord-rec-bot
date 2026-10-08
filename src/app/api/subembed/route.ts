import { NextRequest, NextResponse } from "next/server";
import { resolveSubEmbed } from "@/lib/url-metadata";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await resolveSubEmbed(url);
    return NextResponse.json({
      success: true,
      subEmbed: result.subEmbed,
      videoUrl: result.videoUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
