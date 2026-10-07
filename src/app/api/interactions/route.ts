import { NextRequest, NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "@/lib/categories";
import { getStoredCategories, getStoredPersona } from "@/lib/redis";
import { buildDiscordEmbeds, sendWebhook } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
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

  // Handle PING from Discord Developer Portal
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Handle Slash Command Autocomplete (Live dynamic choices from studio)
  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    const options = interaction.data?.options || [];
    const focusedOption = options.find((opt: { focused?: boolean }) => opt.focused);
    const query = ((focusedOption?.value as string) || "").toLowerCase().trim();

    const { categories } = await getStoredCategories();
    const activeCategories =
      categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

    const choices = activeCategories
      .filter((c) =>
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

  // Handle Application Commands (Slash commands or Message Context Menus)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    // 1. Slash command: /rec
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

      const { categories } = await getStoredCategories();
      const { persona } = await getStoredPersona();
      const activeCategories =
        categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

      const category =
        activeCategories.find(
          (c) =>
            c.id.toLowerCase() === categoryId ||
            c.name.toLowerCase() === categoryId
        ) ||
        activeCategories[0] ||
        DEFAULT_CATEGORIES[0];

      // Build and send to webhook
      const recData = {
        categoryId: category.id,
        title: title || "New Recommendation",
        description: "",
        personalNotes: notes,
        images: finalImages,
        source: interaction.member?.user?.username || interaction.user?.username || "Jasmine",
      };

      const { embeds, fileAttachments } = buildDiscordEmbeds(recData, category, persona);

      await sendWebhook({
        username: persona.username,
        avatar_url: persona.avatarUrl,
        embeds,
      }, undefined, fileAttachments);

      const webUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rec.jizellecasia.site";

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🌸 Posted **${recData.title}** to the recs channel!\n> Want to add more images, details, or use AI? Visit [Jasmine Rec Studio](${webUrl})`,
          flags: 64, // Ephemeral (visible only to user)
        },
      });
    }

    // 2. Message Context Menu: "Turn into Rec"
    if (name === "Turn into Rec") {
      const targetMessageId = interaction.data.target_id;
      const messages = interaction.data.resolved?.messages;
      const targetMessage = messages?.[targetMessageId];

      if (targetMessage) {
        const rawContent = targetMessage.content || "";
        const attachments = targetMessage.attachments || [];
        const imageUrls = attachments.map((att: { url: string }) => att.url);

        const { categories } = await getStoredCategories();
        const { persona } = await getStoredPersona();
        const category = categories[0] || DEFAULT_CATEGORIES[0];
        const recData = {
          categoryId: category.id,
          title: rawContent.split("\n")[0]?.slice(0, 80) || "Recommendation",
          description: rawContent,
          images: imageUrls,
          source: targetMessage.author?.username || "Discord",
        };

        const { embeds, fileAttachments } = buildDiscordEmbeds(recData, category, persona);
        await sendWebhook({
          username: persona.username,
          avatar_url: persona.avatarUrl,
          embeds,
        }, undefined, fileAttachments);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🌸 Successfully converted message into a recommendation in the recs channel!`,
            flags: 64,
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
}
