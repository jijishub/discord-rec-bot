import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const hasWebhook = !!process.env.DISCORD_WEBHOOK_URL;
  const hasAi = !!process.env.AI_API_BASE_URL;
  const hasRedis = !!getRedis();
  const defaultModel = process.env.AI_DEFAULT_MODEL || "gpt-5.6-luna";

  const defaultPersona = {
    username: process.env.BOT_USERNAME || "Jasmine 🌸",
    avatarUrl: process.env.BOT_AVATAR_URL || "/maomao.png",
    footerText: process.env.BOT_FOOTER || "Rec by {source}",
    footerIconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f338.png",
  };

  const recipientName = process.env.NEXT_PUBLIC_RECIPIENT_NAME || "Jizelle";
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/jijishub/discord-rec-bot";
  const recipientPronoun = process.env.NEXT_PUBLIC_RECIPIENT_PRONOUN || (recipientName.toLowerCase() === "jizelle" ? "her" : "their");

  return NextResponse.json({
    hasWebhook,
    hasAi,
    hasRedis,
    defaultModel,
    defaultPersona,
    recipientName,
    repoUrl,
    recipientPronoun,
  });
}
