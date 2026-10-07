import { NextResponse } from "next/server";

export async function GET() {
  const hasWebhook = !!process.env.DISCORD_WEBHOOK_URL;
  const hasAi = !!process.env.AI_API_BASE_URL;
  const defaultModel = process.env.AI_DEFAULT_MODEL || "gpt-5.6-luna";

  return NextResponse.json({
    hasWebhook,
    hasAi,
    defaultModel,
  });
}
