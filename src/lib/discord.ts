import { Category, RecFormData, BotPersona, DiscordEmbed, DiscordWebhookPayload } from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export function hexToDecimal(hex: string): number {
  const cleanHex = hex.replace("#", "");
  return parseInt(cleanHex, 16) || 0x7983d4;
}

function parseBase64DataUrl(dataUrl: string): { blob: Blob; filename: string } | null {
  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    let ext = "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
    else if (mimeType.includes("webp")) ext = "webp";
    else if (mimeType.includes("gif")) ext = "gif";

    const blob = new Blob([buffer], { type: mimeType });
    const filename = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    return { blob, filename };
  } catch {
    return null;
  }
}

function sanitizeFieldName(raw: string | undefined | null, fallback: string): string {
  if (!raw) return fallback;
  // Discord strictly rejects masked links [text](url) in field.name
  let cleaned = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip raw URLs from field names as Discord rejects links in names
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, "").trim();
  // Strip dangling empty parens left behind by citations: ()
  cleaned = cleaned.replace(/\(\s*\)/g, "").trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  if (cleaned.length > 256) {
    return cleaned.slice(0, 250) + "...";
  }
  return cleaned;
}

function sanitizeFieldValue(raw: string | undefined | null, fallback: string): string {
  if (!raw) return fallback;
  let cleaned = raw.trim();
  if (!cleaned) return fallback;
  if (cleaned.length > 1024) {
    return cleaned.slice(0, 1020) + "...";
  }
  return cleaned;
}

export function buildDiscordEmbeds(
  data: RecFormData,
  category: Category,
  persona: BotPersona,
  options?: { isInteraction?: boolean }
): { embeds: DiscordEmbed[]; fileAttachments: { blob: Blob; filename: string }[] } {
  const embeds: DiscordEmbed[] = [];
  const fileAttachments: { blob: Blob; filename: string }[] = [];
  const embedColor = hexToDecimal(data.customColor || category.color);

  // Resolve category flower icon (always use authentic flower icons, never generic twemoji)
  let resolvedIconUrl = category.iconUrl;

  // If no iconUrl or base64 data URL, find matching clean flower icon from DEFAULT_CATEGORIES
  if (!resolvedIconUrl || resolvedIconUrl.startsWith("data:")) {
    const defaultCat = DEFAULT_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === category.id.toLowerCase() ||
        c.name.toLowerCase() === category.name.toLowerCase()
    );
    if (defaultCat?.iconUrl && !defaultCat.iconUrl.startsWith("data:")) {
      resolvedIconUrl = defaultCat.iconUrl;
    } else if (!options?.isInteraction && category.iconUrl?.startsWith("data:")) {
      const parsedIcon = parseBase64DataUrl(category.iconUrl);
      if (parsedIcon) {
        const iconFilename = `cat_icon_${parsedIcon.filename}`;
        fileAttachments.push({ blob: parsedIcon.blob, filename: iconFilename });
        resolvedIconUrl = `attachment://${iconFilename}`;
      }
    } else {
      resolvedIconUrl = "/others.png";
    }
  }

  // Resolve relative URLs (e.g. /movie.png, /anime.png, /novels.png) to absolute public URLs for Discord
  if (resolvedIconUrl && resolvedIconUrl.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rec.jizellecasia.site";
    resolvedIconUrl = `${baseUrl.replace(/\/+$/, "")}${encodeURI(resolvedIconUrl)}`;
  }

  // Build description content
  const descriptionParts: string[] = [];

  if (data.description && data.description.trim()) {
    descriptionParts.push(data.description.trim());
  }

  if (data.personalNotes && data.personalNotes.trim()) {
    const formattedNotes = data.personalNotes
      .trim()
      .split("\n")
      .map((line) => (line.startsWith(">") ? line : `> ${line}`))
      .join("\n");

    if (descriptionParts.length > 0) {
      descriptionParts.push("");
    }
    descriptionParts.push(formattedNotes);
  }

  // Build metadata fields with strict Discord validation
  const fields = [];

  // Field 1: Tags & Platform
  if (data.tags || data.platform) {
    fields.push({
      name: sanitizeFieldName(data.tags, "Tags / Genres"),
      value: sanitizeFieldValue(data.platform, "Available everywhere"),
      inline: true,
    });
  }

  // Field 2: Duration & Creator
  if (data.duration || data.creator) {
    fields.push({
      name: sanitizeFieldName(data.duration, "Duration / Length"),
      value: sanitizeFieldValue(data.creator, "Author / Director / Studio"),
      inline: true,
    });
  }

  const sharedUrl = "https://rec.jizellecasia.site";

  let fullDescription = descriptionParts.join("\n").trim();
  if (fullDescription.length > 4096) {
    fullDescription = fullDescription.slice(0, 4090) + "...";
  }

  let title = (data.title || "Recommendation").trim();
  if (title.length > 256) {
    title = title.slice(0, 250) + "...";
  }

  let footerText = (data.source?.trim()
    ? `Rec by ${data.source.trim()}`
    : persona.footerText.replace("{source}", "Anonymous")).trim();
  if (footerText.length > 2048) {
    footerText = footerText.slice(0, 2040) + "...";
  }

  // Primary Embed
  const primaryEmbed: DiscordEmbed = {
    title: title,
    url: sharedUrl,
    description: fullDescription || undefined,
    color: embedColor,
    author: {
      name: category.name,
      icon_url: resolvedIconUrl || undefined,
    },
    thumbnail: resolvedIconUrl ? { url: resolvedIconUrl } : undefined,
    footer: {
      text: footerText,
      icon_url: persona.footerIconUrl || resolvedIconUrl || undefined,
    },
    fields: fields.length > 0 ? fields : undefined,
  };

  // Process recommendation images (up to 9 images)
  const validImages = (data.images || []).filter((img) => img && img.trim().length > 0);
  const resolvedImageUrls: string[] = [];

  validImages.slice(0, 9).forEach((img, idx) => {
    if (img.startsWith("data:")) {
      if (!options?.isInteraction) {
        const parsedImg = parseBase64DataUrl(img);
        if (parsedImg) {
          const imgFilename = `rec_img_${idx}_${parsedImg.filename}`;
          fileAttachments.push({ blob: parsedImg.blob, filename: imgFilename });
          resolvedImageUrls.push(`attachment://${imgFilename}`);
        }
      }
    } else {
      resolvedImageUrls.push(img);
    }
  });

  if (resolvedImageUrls.length > 0) {
    primaryEmbed.image = { url: resolvedImageUrls[0] };
  }

  embeds.push(primaryEmbed);

  // Additional embeds for multi-image gallery
  for (let i = 1; i < resolvedImageUrls.length; i++) {
    embeds.push({
      url: sharedUrl,
      image: { url: resolvedImageUrls[i] },
    });
  }

  return { embeds, fileAttachments };
}

export async function sendWebhook(
  payload: DiscordWebhookPayload,
  customWebhookUrl?: string,
  fileAttachments: { blob: Blob; filename: string }[] = []
): Promise<{ success: boolean; error?: string }> {
  const isCustom = Boolean(customWebhookUrl && customWebhookUrl.trim().length > 0);
  const webhookUrl = isCustom
    ? customWebhookUrl!.trim()
    : process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      error: "No Discord Webhook URL configured. Please configure it in .env or the Settings panel.",
    };
  }

  // Strict validation for Discord Webhook URLs
  const isValidDiscordWebhook =
    /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
      webhookUrl
    );

  if (!isValidDiscordWebhook) {
    return {
      success: false,
      error:
        "Invalid Discord Webhook URL format. It must look like: https://discord.com/api/webhooks/{id}/{token}",
    };
  }

  // Ensure relative avatar URL is resolved to absolute URL
  if (payload.avatar_url && payload.avatar_url.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rec.jizellecasia.site";
    payload.avatar_url = `${baseUrl.replace(/\/+$/, "")}${payload.avatar_url}`;
  }

  try {
    let res: Response;

    if (fileAttachments.length > 0) {
      // Use Multipart FormData to upload local files directly to Discord CDN for free!
      const formData = new FormData();
      formData.append("payload_json", JSON.stringify(payload));

      fileAttachments.forEach((att, idx) => {
        formData.append(`files[${idx}]`, att.blob, att.filename);
      });

      res = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });
    } else {
      // Standard JSON request when all images are URLs
      res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      let errDetails = "";
      try {
        const json = await res.json();
        errDetails = json.message || JSON.stringify(json);
      } catch {
        errDetails = await res.text();
      }

      if (res.status === 404 || res.status === 401) {
        return {
          success: false,
          error: "Discord Webhook not found or token expired. Please verify your Webhook URL.",
        };
      }
      if (res.status === 403) {
        return {
          success: false,
          error: "Discord Webhook missing permissions to send messages to that channel.",
        };
      }

      return {
        success: false,
        error: `Discord Webhook error (${res.status}): ${errDetails}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
