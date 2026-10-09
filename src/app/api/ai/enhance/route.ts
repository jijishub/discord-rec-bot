import { NextRequest, NextResponse } from "next/server";
import { enhanceRecWithAI, AIEnhanceRequest } from "@/lib/ai";

// Identification and enrichment each have a 60-second request timeout.
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body: AIEnhanceRequest = await req.json();

    const result = await enhanceRecWithAI(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
