import { NextRequest, NextResponse } from "next/server";
import { Category, RecFormData, BotPersona } from "@/types";
import { buildDiscordEmbeds, sendWebhook } from "@/lib/discord";
import { DEFAULT_BOT_PERSONA } from "@/lib/categories";
import { resolveSubEmbed } from "@/lib/url-metadata";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      data,
      formData,
      category,
      persona = DEFAULT_BOT_PERSONA,
      webhookUrl,
    }: {
      data?: RecFormData;
      formData?: RecFormData;
      category: Category;
      persona?: BotPersona;
      webhookUrl?: string;
    } = body;

    const recData = data || formData;

    if (!recData || !category) {
      return NextResponse.json(
        { error: "Missing required data or category" },
        { status: 400 }
      );
    }

    if (!recData.title?.trim()) {
      return NextResponse.json(
        { error: "Recommendation title is required" },
        { status: 400 }
      );
    }

    if (!recData.subEmbed) {
      const linked = await resolveSubEmbed(`${recData.title} ${recData.description} ${recData.personalNotes || ""}`);
      if (linked.subEmbed) recData.subEmbed = linked.subEmbed;
      if (linked.videoUrl && !recData.videoUrl) recData.videoUrl = linked.videoUrl;
    }
    const { embeds, fileAttachments } = buildDiscordEmbeds(recData, category, persona);

    let avatarUrl = persona.avatarUrl || process.env.BOT_AVATAR_URL || "/maomao.png";
    if (avatarUrl && avatarUrl.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rec.jizellecasia.site";
      avatarUrl = `${baseUrl.replace(/\/+$/, "")}${avatarUrl}`;
    }

    const payload = {
      username: persona.username || process.env.BOT_USERNAME || "Jasmine 🌸",
      avatar_url: avatarUrl || undefined,
      content: recData.videoUrl || undefined,
      embeds: embeds,
      allowed_mentions: { parse: [] },
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
