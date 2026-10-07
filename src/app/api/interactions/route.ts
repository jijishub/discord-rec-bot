import { NextRequest, NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "@/lib/categories";
import { getStoredCategories, getStoredPersona } from "@/lib/redis";
import { buildDiscordEmbeds } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");
    const rawBody = await req.text();

    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey) {
      console.error("DISCORD_PUBLIC_KEY not configured");
      return NextResponse.json(
        { error: "DISCORD_PUBLIC_KEY not configured on server" },
        { status: 500 }
      );
    }

    // Verify Discord signature
    if (!signature || !timestamp) {
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    }

    const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // 1. Handle PING from Discord Developer Portal
    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // Fast parallel fetch for categories & persona (capped at 800ms to stay safely under Discord's 3-second limit)
    const [catResult, personaResult] = await Promise.all([
      Promise.race([
        getStoredCategories(),
        new Promise<{ categories: typeof DEFAULT_CATEGORIES; isCloud: boolean }>((res) =>
          setTimeout(() => res({ categories: DEFAULT_CATEGORIES, isCloud: false }), 800)
        ),
      ]),
      Promise.race([
        getStoredPersona(),
        new Promise<{ persona: typeof DEFAULT_BOT_PERSONA; isCloud: boolean }>((res) =>
          setTimeout(() => res({ persona: DEFAULT_BOT_PERSONA, isCloud: false }), 800)
        ),
      ]),
    ]);

    const activeCategories =
      catResult.categories && catResult.categories.length > 0
        ? catResult.categories
        : DEFAULT_CATEGORIES;
    const activePersona = personaResult.persona || DEFAULT_BOT_PERSONA;

    // 2. Handle Slash Command Autocomplete (Live dynamic choices from studio)
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const options = interaction.data?.options || [];
      const focusedOption = options.find((opt: { focused?: boolean }) => opt.focused);
      const query = ((focusedOption?.value as string) || "").toLowerCase().trim();

      const choices = activeCategories
        .filter(
          (c) =>
            !query ||
            c.name.toLowerCase().includes(query) ||
            (c.emoji && c.emoji.includes(query)) ||
            c.id.toLowerCase().includes(query)
        )
        .slice(0, 25)
        .map((c) => ({
          name: `${c.emoji || "🌸"} ${c.name}`.slice(0, 100),
          value: c.id,
        }));

      return NextResponse.json({
        type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
        data: {
          choices,
        },
      });
    }

    // 3. Handle Application Commands (Slash commands or Message Context Menus)
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;

      // --- Slash command: /rec ---
      if (name === "rec") {
        const options = interaction.data.options || [];
        const titleOption = options.find((opt: { name: string }) => opt.name === "title");
        const categoryOption = options.find((opt: { name: string }) => opt.name === "category");
        const notesOption = options.find((opt: { name: string }) => opt.name === "notes");
        const imageOption = options.find((opt: { name: string }) => opt.name === "image_url");
        const attachmentOption = options.find((opt: { name: string }) => opt.name === "image");

        const title = titleOption?.value as string;
        const categoryId = ((categoryOption?.value as string) || "movies").toLowerCase();
        const notes = notesOption?.value as string;
        const imageUrl = imageOption?.value as string;

        // Extract uploaded image attachment if present (Discord Type 11 ATTACHMENT)
        let uploadedAttachmentUrl: string | undefined;
        if (attachmentOption && interaction.data.resolved?.attachments) {
          const attachment = interaction.data.resolved.attachments[attachmentOption.value];
          if (attachment?.url) {
            uploadedAttachmentUrl = attachment.url;
          }
        }

        const finalImages: string[] = [];
        if (uploadedAttachmentUrl) finalImages.push(uploadedAttachmentUrl);
        if (imageUrl && !finalImages.includes(imageUrl)) finalImages.push(imageUrl);

        const category =
          activeCategories.find(
            (c) =>
              c.id.toLowerCase() === categoryId ||
              c.name.toLowerCase() === categoryId
          ) ||
          activeCategories[0] ||
          DEFAULT_CATEGORIES[0];

        const authorName =
          interaction.member?.nick ||
          interaction.member?.user?.global_name ||
          interaction.member?.user?.username ||
          interaction.user?.global_name ||
          interaction.user?.username ||
          "Jasmine";

        const recData = {
          categoryId: category.id,
          title: title || "New Recommendation",
          description: "",
          personalNotes: notes,
          images: finalImages,
          source: authorName,
        };

        const { embeds } = buildDiscordEmbeds(recData, category, activePersona, { isInteraction: true });

        // Post embed directly to the server and channel where the command was called!
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds,
          },
        });
      }

      // --- Message Context Menu: "Turn into Rec" ---
      if (name === "Turn into Rec") {
        const targetMessageId = interaction.data.target_id;
        const messages = interaction.data.resolved?.messages;
        const targetMessage = messages?.[targetMessageId];

        if (targetMessage) {
          const rawContent = targetMessage.content || "";
          const attachments = targetMessage.attachments || [];
          const imageUrls = attachments.map((att: { url: string }) => att.url);

          const category = activeCategories[0] || DEFAULT_CATEGORIES[0];
          const authorName =
            targetMessage.author?.global_name ||
            targetMessage.author?.username ||
            "Discord";

          const recData = {
            categoryId: category.id,
            title: rawContent.split("\n")[0]?.slice(0, 80) || "Recommendation",
            description: rawContent,
            images: imageUrls,
            source: authorName,
          };

          const { embeds } = buildDiscordEmbeds(recData, category, activePersona, { isInteraction: true });

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds,
            },
          });
        }
      }
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "🌸 Jasmine received your command!",
        flags: 64,
      },
    });
  } catch (err: unknown) {
    console.error("❌ Interaction error:", err);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `🌸 Jasmine couldn't process this recommendation: ${err instanceof Error ? err.message : String(err)}`,
        flags: 64,
      },
    });
  }
}
