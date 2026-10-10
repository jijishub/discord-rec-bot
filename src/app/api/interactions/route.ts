import { NextRequest, NextResponse, after } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "@/lib/categories";
import { getStoredCategories, getStoredPersona } from "@/lib/redis";
import { buildDiscordEmbeds } from "@/lib/discord";
import { enhanceRecWithAI } from "@/lib/ai";
import { resolveSubEmbed, extractUrls } from "@/lib/url-metadata";

export const maxDuration = 180;

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
        const aiOption = options.find(
          (opt: { name: string }) =>
            opt.name === "ai-instructions" || opt.name === "ai_instructions"
        );
        const aiInstructions = ((aiOption?.value as string) || "").trim();
        const descriptionOption = options.find((opt: { name: string }) => opt.name === "description");
        const categoryOption = options.find((opt: { name: string }) => opt.name === "category");
        const notesOption = options.find((opt: { name: string }) => opt.name === "notes");
        const channelOption = options.find((opt: { name: string }) => opt.name === "channel");
        const tagsOption = options.find((opt: { name: string }) => opt.name === "tags");
        const platformOption = options.find((opt: { name: string }) => opt.name === "platform");
        const durationOption = options.find((opt: { name: string }) => opt.name === "duration");
        const creatorOption = options.find((opt: { name: string }) => opt.name === "creator");
        const imageOption = options.find((opt: { name: string }) => opt.name === "image_url");
        const videoOption = options.find((opt: { name: string }) => opt.name === "video_url");

        const title = ((titleOption?.value as string) || "").trim();
        const description = ((descriptionOption?.value as string) || "").trim();
        const rawCategoryInput = ((categoryOption?.value as string) || "").trim();
        const categoryId = rawCategoryInput.toLowerCase();
        const notes = ((notesOption?.value as string) || "").trim();
        const channel = ((channelOption?.value as string) || "").trim();
        const tags = ((tagsOption?.value as string) || "").trim();
        const platform = ((platformOption?.value as string) || "").trim();
        const duration = ((durationOption?.value as string) || "").trim();
        const creator = ((creatorOption?.value as string) || "").trim();
        const imageUrl = ((imageOption?.value as string) || "").trim();
        let finalVideoUrl = ((videoOption?.value as string) || "").trim();

        const finalImages: string[] = [];

        // 1. Extract uploaded attachments (categorize images vs videos)
        if (interaction.data.resolved?.attachments) {
          const attachments = Object.values(interaction.data.resolved.attachments) as {
            url?: string;
            content_type?: string;
            filename?: string;
          }[];
          for (const att of attachments) {
            if (!att?.url) continue;
            const isVideo =
              att.content_type?.startsWith("video/") ||
              /\.(mp4|webm|mov|mkv)$/i.test(att.filename || "") ||
              /\.(mp4|webm|mov|mkv)$/i.test(att.url);
            if (isVideo) {
              if (!finalVideoUrl) finalVideoUrl = att.url;
            } else if (att.content_type?.startsWith("image/") && !finalImages.includes(att.url)) {
              finalImages.push(att.url);
            }
          }
        }

        // 2. Extract URLs from image_url option
        if (imageUrl) {
          const urls = imageUrl.split(/[\s,]+/);
          for (const u of urls) {
            if (u.startsWith("http") && !finalImages.includes(u)) {
              finalImages.push(u);
            }
          }
        }

        // Only a configured category may be selected; never turn a title into a new category.
        const category = activeCategories.find(
          c => c.id.toLowerCase() === categoryId || c.name.toLowerCase() === categoryId
        ) || DEFAULT_CATEGORIES.find(
          c => c.id.toLowerCase() === categoryId || c.name.toLowerCase() === categoryId
        );
        if (!category) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "Please select a category from the category suggestions. Put the item name in title, or leave title empty for AI.", flags: 64 },
          });
        }

        const authorName =
          interaction.member?.nick ||
          interaction.member?.user?.global_name ||
          interaction.member?.user?.username ||
          interaction.user?.global_name ||
          interaction.user?.username ||
          "Jasmine";

        // Check if there are external URLs in input (e.g. Twitter / web threads)
        const combinedInputText = `${title} ${description} ${notes}`.trim();
        const detectedUrls = extractUrls(combinedInputText);
        const shouldRunAi = Boolean(aiInstructions || !title);
        const hasExternalUrl = detectedUrls.length > 0;

        // If AI is requested/needed OR external URLs must be resolved for sub-embeds, defer and process asynchronously
        if (shouldRunAi || hasExternalUrl) {
          const applicationId =
            interaction.application_id || process.env.DISCORD_APPLICATION_ID;
          const token = interaction.token;

          after(async () => {
            try {
              let aiData: any = null;

              if (shouldRunAi) {
                const aiResult = await enhanceRecWithAI({
                  title: title || undefined,
                  category: category.name,
                  prompt:
                    aiInstructions ||
                    (!title
                      ? "Identify the exact title with release year (YYYY) if media, and summarize details"
                      : "Auto-format title with year (YYYY) if media"),
                  rawInput: combinedInputText,
                  description, tags, platform, duration, creator,
                  personalNotes: notes,
                  channel,
                  images: finalImages,
                });
                if (aiResult.success && aiResult.data) {
                  aiData = aiResult.data;
                } else if (aiResult.disposition || (!title && !description && !finalImages.length)) {
                  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: aiResult.disposition ? aiResult.error : `Jasmine could not complete this request: ${aiResult.error || 'AI generation failed.'} Please try again.`, embeds: [], allowed_mentions: { parse: [] } }),
                  });
                  return;
                }
              }

              // Resolve Sub-Embed (Twitter / thread or web preview)
              const urlToResolve =
                aiData?.sourceUrl || (detectedUrls.length > 0 ? detectedUrls[0] : null);
              let subEmbed: any = null;

              if (urlToResolve) {
                const subResult = await resolveSubEmbed(urlToResolve);
                if (subResult.subEmbed) {
                  subEmbed = subResult.subEmbed;
                }
                if (subResult.videoUrl && !finalVideoUrl) {
                  finalVideoUrl = subResult.videoUrl;
                }
              }

              const finalTitle = aiData?.title || title || `${category.name} recommendation`;
              const finalDescription =
                aiData?.description ??
                description;
              const finalNotes = aiData?.personalNotes ?? notes;
              const finalChannel = aiData?.channel ?? channel;

              const recData = {
                categoryId: category.id,
                title: finalTitle,
                description: finalDescription,
                personalNotes: finalNotes,
                tags: aiData?.tags ?? tags,
                platform: aiData?.platform ?? platform,
                duration: aiData?.duration ?? duration,
                creator: aiData?.creator ?? creator,
                channel: finalChannel || undefined,
                source: authorName,
                images: finalImages,
                videoUrl: finalVideoUrl || undefined,
                subEmbed: subEmbed || undefined,
              };

              const { embeds } = buildDiscordEmbeds(recData, category, activePersona, {
                isInteraction: true,
              });

              const patchUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
              const patchResponse = await fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: finalVideoUrl || undefined,
                  embeds,
                  allowed_mentions: { parse: [] },
                }),
              });
              if (!patchResponse.ok) throw new Error(`Discord rejected recommendation (${patchResponse.status})`);
            } catch (err) {
              console.error("Background processing in /rec failed:", err);
              const fallbackRecData = {
                categoryId: category.id,
                title: title || `${category.name} recommendation`,
                description: description || "",
                personalNotes: notes,
                tags: tags || "",
                platform: platform || "",
                duration: duration || "",
                creator: creator || "",
                channel: channel || undefined,
                source: authorName,
                images: finalImages,
                videoUrl: finalVideoUrl || undefined,
              };
              const { embeds } = buildDiscordEmbeds(fallbackRecData, category, activePersona, {
                isInteraction: true,
              });
              const patchUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
              const patchResponse = await fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: finalVideoUrl || undefined,
                  embeds,
                  allowed_mentions: { parse: [] },
                }),
              });
              if (!patchResponse.ok) throw new Error(`Discord rejected recommendation (${patchResponse.status})`);
            }
          });

          return NextResponse.json({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          });
        }

        // Instant response when no AI or external URLs to resolve
        const recData = {
          categoryId: category.id,
          title: title || `${category.name} recommendation`,
          description: description || "",
          personalNotes: notes,
          tags: tags || "",
          platform: platform || "",
          duration: duration || "",
          creator: creator || "",
          channel: channel || undefined,
          source: channel || authorName,
          images: finalImages,
          videoUrl: finalVideoUrl || undefined,
        };

        const { embeds } = buildDiscordEmbeds(recData, category, activePersona, {
          isInteraction: true,
        });

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: finalVideoUrl || undefined,
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
          const imageUrls: string[] = [];
          let detectedVideoUrl = "";

          for (const att of attachments) {
            const isVideo =
              att.content_type?.startsWith("video/") ||
              /\.(mp4|webm|mov|mkv)$/i.test(att.filename || "") ||
              /\.(mp4|webm|mov|mkv)$/i.test(att.url);
            if (isVideo && !detectedVideoUrl) {
              detectedVideoUrl = att.url;
            } else if (!isVideo && att.url && att.content_type?.startsWith("image/")) {
              imageUrls.push(att.url);
            }
          }

          // Context menus have no selected category: preserve a source embed category, otherwise use Others.
          const sourceCategoryName = targetMessage.embeds?.[0]?.author?.name?.replace(/^[^\p{L}\p{N}]+/u, "").trim().toLowerCase();
          const category = activeCategories.find(c => c.name.toLowerCase() === sourceCategoryName) ||
            activeCategories.find(c => c.id === "others" || c.name.toLowerCase() === "others") || DEFAULT_CATEGORIES.find(c => c.id === "others")!;
          const authorName =
            targetMessage.author?.global_name ||
            targetMessage.author?.username ||
            "Discord";

          const detectedUrls = extractUrls(rawContent);
          const hasUrls = detectedUrls.length > 0;

          // Defer to resolve rich sub-embeds and AI title/description
          const applicationId =
            interaction.application_id || process.env.DISCORD_APPLICATION_ID;
          const token = interaction.token;

          after(async () => {
            try {
              let subEmbed: any = null;
              if (hasUrls) {
                const subRes = await resolveSubEmbed(detectedUrls[0]);
                if (subRes.subEmbed) subEmbed = subRes.subEmbed;
                if (subRes.videoUrl && !detectedVideoUrl) detectedVideoUrl = subRes.videoUrl;
              }

              const aiResult = await enhanceRecWithAI({
                category: category.name,
                prompt: "Auto-format title with year (YYYY) if media, and summarize details cleanly",
                rawInput: rawContent,
                images: imageUrls,
              });

              const aiData = aiResult.success ? aiResult.data : undefined;
              if (aiResult.disposition) {
                await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: aiResult.error, embeds: [], allowed_mentions: { parse: [] } }),
                });
                return;
              }

              const recData = {
                categoryId: category.id,
                title: aiData?.title || rawContent.split("\n")[0]?.slice(0, 80) || "Recommendation",
                description: aiData?.description ?? rawContent,
                personalNotes: aiData?.personalNotes ?? "",
                tags: aiData?.tags ?? "",
                platform: aiData?.platform ?? "",
                duration: aiData?.duration ?? "",
                creator: aiData?.creator ?? "",
                channel: aiData?.channel ?? undefined,
                source: authorName,
                images: imageUrls,
                videoUrl: detectedVideoUrl || undefined,
                subEmbed: subEmbed || undefined,
              };

              const { embeds } = buildDiscordEmbeds(recData, category, activePersona, {
                isInteraction: true,
              });

              const patchUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
              const patchResponse = await fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: detectedVideoUrl || undefined,
                  embeds,
                  allowed_mentions: { parse: [] },
                }),
              });
              if (!patchResponse.ok) throw new Error(`Discord rejected recommendation (${patchResponse.status})`);
            } catch (err) {
              console.error("Turn into Rec error:", err);
              const fallbackRecData = {
                categoryId: category.id,
                title: rawContent.split("\n")[0]?.slice(0, 80) || "Recommendation",
                description: rawContent,
                images: imageUrls,
                source: authorName,
                videoUrl: detectedVideoUrl || undefined,
              };
              const { embeds } = buildDiscordEmbeds(fallbackRecData, category, activePersona, {
                isInteraction: true,
              });
              const patchUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
              const patchResponse = await fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: detectedVideoUrl || undefined,
                  embeds,
                  allowed_mentions: { parse: [] },
                }),
              });
              if (!patchResponse.ok) throw new Error(`Discord rejected recommendation (${patchResponse.status})`);
            }
          });

          return NextResponse.json({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
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
