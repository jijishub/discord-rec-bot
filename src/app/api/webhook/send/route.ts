import { NextRequest, NextResponse } from "next/server";
import { Category, RecFormData, BotPersona } from "@/types";
import { buildDiscordEmbeds, sendWebhook } from "@/lib/discord";
import { DEFAULT_BOT_PERSONA } from "@/lib/categories";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      data,
      category,
      persona = DEFAULT_BOT_PERSONA,
      webhookUrl,
    }: {
      data: RecFormData;
      category: Category;
      persona?: BotPersona;
      webhookUrl?: string;
    } = body;

    if (!data || !category) {
      return NextResponse.json(
        { error: "Missing required data or category" },
        { status: 400 }
      );
    }

    if (!data.title?.trim()) {
      return NextResponse.json(
        { error: "Recommendation title is required" },
        { status: 400 }
      );
    }

    const { embeds, fileAttachments } = buildDiscordEmbeds(data, category, persona);

    let avatarUrl = persona.avatarUrl || process.env.BOT_AVATAR_URL || "/maomao.png";
    if (avatarUrl && avatarUrl.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rec.jizellecasia.site";
      avatarUrl = `${baseUrl.replace(/\/+$/, "")}${avatarUrl}`;
    }

    const payload = {
      username: persona.username || process.env.BOT_USERNAME || "Jasmine 🌸",
      avatar_url: avatarUrl || undefined,
      embeds: embeds,
    };

    const result = await sendWebhook(payload, webhookUrl, fileAttachments);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Recommendation posted to Discord! 🌸" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
