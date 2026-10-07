import { Category, RecFormData, BotPersona, DiscordEmbed, DiscordWebhookPayload } from "@/types";

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

export function buildDiscordEmbeds(
  data: RecFormData,
  category: Category,
  persona: BotPersona
): { embeds: DiscordEmbed[]; fileAttachments: { blob: Blob; filename: string }[] } {
  const embeds: DiscordEmbed[] = [];
  const fileAttachments: { blob: Blob; filename: string }[] = [];
  const embedColor = hexToDecimal(category.color);

  // Check if category icon is an uploaded base64 image
  let resolvedIconUrl = category.iconUrl;
  if (category.iconUrl && category.iconUrl.startsWith("data:")) {
    const parsedIcon = parseBase64DataUrl(category.iconUrl);
    if (parsedIcon) {
      const iconFilename = `cat_icon_${parsedIcon.filename}`;
      fileAttachments.push({ blob: parsedIcon.blob, filename: iconFilename });
      resolvedIconUrl = `attachment://${iconFilename}`;
    }
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

  // Build metadata fields
  const fields = [];

  // Field 1: Tags & Platform
  if (data.tags || data.platform) {
    fields.push({
      name: data.tags?.trim() || "Tags",
      value: data.platform?.trim() || "Available everywhere",
      inline: true,
    });
  }

  // Field 2: Duration & Creator
  if (data.duration || data.creator) {
    fields.push({
      name: data.duration?.trim() || "Duration / Length",
      value: data.creator?.trim() || "Creator / Author",
      inline: true,
    });
  }

  const sharedUrl = "https://rec.jizellecasia.site";

  // Primary Embed
  const primaryEmbed: DiscordEmbed = {
    title: data.title || "Recommendation",
    url: sharedUrl,
    description: descriptionParts.join("\n") || undefined,
    color: embedColor,
    author: {
      name: category.name,
      icon_url: resolvedIconUrl || undefined,
    },
    thumbnail: resolvedIconUrl ? { url: resolvedIconUrl } : undefined,
    footer: {
      text: data.source
        ? `Rec by ${data.source}`
        : persona.footerText.replace("{source}", "Jizelle"),
      icon_url: persona.footerIconUrl || resolvedIconUrl || undefined,
    },
    fields: fields.length > 0 ? fields : undefined,
  };

  // Process recommendation images (up to 9 images)
  const validImages = (data.images || []).filter((img) => img && img.trim().length > 0);
  const resolvedImageUrls: string[] = [];

  validImages.slice(0, 9).forEach((img, idx) => {
    if (img.startsWith("data:")) {
      const parsedImg = parseBase64DataUrl(img);
      if (parsedImg) {
        const imgFilename = `rec_img_${idx}_${parsedImg.filename}`;
        fileAttachments.push({ blob: parsedImg.blob, filename: imgFilename });
        resolvedImageUrls.push(`attachment://${imgFilename}`);
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
  const webhookUrl = customWebhookUrl || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      error: "No Discord Webhook URL configured. Please configure it in .env or the Settings panel.",
    };
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
      const errText = await res.text();
      return {
        success: false,
        error: `Discord Webhook error (${res.status}): ${errText}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
