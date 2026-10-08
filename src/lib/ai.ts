export interface AIEnhanceRequest {
  title?: string;
  rawInput?: string;
  category?: string;
  prompt?: string;
  model?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  images?: string[];
}

export interface AIEnhanceResult {
  title: string;
  description: string;
  tags?: string;
  platform?: string;
  duration?: string;
  creator?: string;
  personalNotes?: string;
  channel?: string;
  sourceUrl?: string;
  videoUrl?: string;
}

/**
 * Normalizes model name aliases for the reverse proxy
 */
function normalizeModelName(modelName: string): string {
  const trimmed = modelName.trim();
  if (trimmed === "5.6-luna") return "gpt-5.6-luna";
  if (trimmed === "5.6-sol") return "gpt-5.6-sol";
  if (trimmed === "5.6-terra") return "gpt-5.6-terra";
  if (trimmed === "6-luna") return "gpt-6-luna";
  return trimmed;
}

/**
 * Extracts the accumulated text content whether the proxy returns
 * Server-Sent Events (SSE) streaming lines ("data: {...}") or standard JSON.
 */
function extractContentFromResponseText(text: string): string {
  const trimmed = text.trim();

  // Check if response is an SSE stream (lines starting with 'data:')
  if (trimmed.startsWith("data:") || trimmed.includes("\ndata:")) {
    const lines = trimmed.split("\n");
    let accumulated = "";

    for (const line of lines) {
      const l = line.trim();
      if (!l || l === "data: [DONE]" || l === "[DONE]") continue;

      if (l.startsWith("data:")) {
        const jsonStr = l.slice(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const delta =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.message?.content ||
            parsed.choices?.[0]?.text ||
            "";
          accumulated += delta;
        } catch {
          // Skip invalid chunk lines
        }
      }
    }

    if (accumulated.trim()) {
      return accumulated;
    }
  }

  // Otherwise try standard JSON object
  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed.choices?.[0]?.message?.content ||
      parsed.choices?.[0]?.text ||
      parsed.content ||
      trimmed
    );
  } catch {
    return trimmed;
  }
}

function cleanCitationLinks(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^\)]+\)\)/gi, "")
    .replace(/\s*\[[^\]]+\]\(https?:\/\/[^\)]*utm_source=[^\)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Robust JSON extractor from model output (handles markdown blocks, raw text, etc.)
 */
function parseRecommendationJson(rawContent: string): AIEnhanceResult {
  let cleaned = rawContent.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // If there's commentary before or after the JSON { ... }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }
  }

  const result: AIEnhanceResult = JSON.parse(cleaned);

  return {
    ...result,
    title: cleanCitationLinks(result.title),
    tags: cleanCitationLinks(result.tags),
    duration: cleanCitationLinks(result.duration),
    creator: cleanCitationLinks(result.creator),
    platform: cleanCitationLinks(result.platform),
    description: cleanCitationLinks(result.description),
    personalNotes: cleanCitationLinks(result.personalNotes),
    channel: cleanCitationLinks(result.channel),
    sourceUrl: cleanCitationLinks(result.sourceUrl),
    videoUrl: cleanCitationLinks(result.videoUrl),
  };
}

export async function enhanceRecWithAI(
  req: AIEnhanceRequest
): Promise<{ success: boolean; data?: AIEnhanceResult; error?: string }> {
  const baseUrl = (req.apiBaseUrl && req.apiBaseUrl.trim()) || process.env.AI_API_BASE_URL;
  const apiKey = (req.apiKey && req.apiKey.trim()) || process.env.AI_API_KEY || "dummy";
  const rawModel = (req.model && req.model.trim()) || process.env.AI_DEFAULT_MODEL || "gpt-5.6-luna";
  const model = normalizeModelName(rawModel);

  if (!baseUrl) {
    return {
      success: false,
      error: "AI_API_BASE_URL is not configured. Please set your reverse proxy URL in .env or Settings.",
    };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const categoryContext = (req.category || "General").trim();

  const systemPrompt = `You are Jasmine 🌸, an aesthetic, gentle, and organized curator for a personal Discord recommendations channel.

CRITICAL INSTRUCTION - TARGET CATEGORY & FORMAT DISAMBIGUATION:
The user is specifically recommending this item under the "${categoryContext}" category.
You MUST tailor all details, tags, synopsis, duration, creator, and platform strictly to the "${categoryContext}" format and NOT confuse it with adaptations in other media (e.g. if a franchise exists as a manga, novel, anime, game, or movie):
- If "${categoryContext}" is "Anime":
  • You MUST provide details for the ANIME adaptation (e.g. animation studio like CloverWorks/Mappa/BONES/Wit Studio/BUG FILMS, anime director, streaming/broadcast platform like Crunchyroll/Netflix, episode count, season, or premiere year). Do NOT describe the manga serialization, chapters, or publisher.
- If "${categoryContext}" is "Manga", "Manga / Manhua", or "Manhwa":
  • You MUST focus on the MANGA/MANHUA publication (original mangaka/author/illustrator, serialized magazine, volumes/chapters, reading platform like Kodansha/MANGA Plus/Shonen Jump). Do NOT describe the anime broadcast.
- If "${categoryContext}" is "Novel" or "Web Novels":
  • You MUST focus on the written NOVEL / book series (author, illustrator, volume count, publisher/web novel platform like Syosetu/Kakuyomu/Yen Press).
- If "${categoryContext}" is "Movies":
  • You MUST focus on the FILM (film director, film runtime in hours and minutes like "2h 15m", film distributor/theatrical release).
- If "${categoryContext}" is "TV Shows" or "Drama":
  • You MUST focus on the television series (network/platform like HBO/Netflix, showrunner, seasons/episodes).
- If "${categoryContext}" is "Games":
  • You MUST focus on the VIDEO GAME (game developer, publisher, platforms like PC/Steam/Switch/PS5, playtime like "~30-40 Hours").
- If "${categoryContext}" is "Drinks" or "Food":
  • Focus on the beverage/culinary item/recipe (flavor notes, ingredients, origin, where to find/try).
- If "${categoryContext}" is "Apps", "Websites", or "Products":
  • Focus on the software tool, site, or physical product, its key utility, developer/brand, and supported platforms.

CRITICAL TITLE FORMATTING AND RELEASE YEAR RULES:
- Never invent a year. Omit it if you cannot confidently establish the correct release year.
- For media categories (Movies, Anime, TV Shows / Drama, Books / Novels, Manga / Manhwa, Games, Music / Albums):
  • You MUST include the release or publication year in parentheses, e.g. "Everything Everywhere All at Once (2022)", "Spirited Away (2001)", "Frieren: Beyond Journey's End (2023)".
  • If the user provided a title without a year, identify the accurate release year for that medium and append it in parentheses "(YYYY)".
  • If the user's title already has the year, keep and polish it.
  • If the user did not provide a title (or gave a link, notes, or image), identify the title and release year from the input or image.
- For non-media categories (Products, Food, Drinks, Apps, Websites):
  • Keep the title clean and recognizable without unnecessary release years unless it is a specific dated version/vintage (e.g. "Best Fragrances", "Ariana Grande Cloud Inspired Perfume").

CRITICAL SHORT DESCRIPTION & URL RULES:
- Provide an engaging, short synopsis (2-3 sentences max) without spoilers.
- If the user's notes, description, or input contains URLs (e.g. Twitter/X links, article links, TikTok, etc.):
  • Do NOT leave raw, ugly URLs in the description text.
  • Extract the core takeaway or hook for the description.
  • Return the extracted URL in the "sourceUrl" field so Jasmine can generate a rich sub-embed for it.

VISION & MULTIMODAL INSTRUCTION:
- You have Vision capabilities. If images are attached, carefully inspect any posters, covers, screenshots, tweets, or labels to identify the title, release year, creator, and category.

CRITICAL METADATA FIELDS:
- "channel": Where this recommendation was discovered or sourced from, e.g. "@rafiqahakhdar on TikTok", "Twitter thread by @username", "Shopee", "Netflix", "r/books on Reddit".
- "tags": Concise comma-separated genres or tags (under 80 characters, e.g. "Sci-fi, Adventure, Comedy").
- "platform": Platform or shop (e.g. "Netflix", "Shopee", "Crunchyroll", "Steam", "Other sites").
- "duration": Concise duration, length, or price (under 80 characters, e.g. "2h 20m", "12 eps", "Php 105", "320 pages").
- "creator": Director, author, studio, or creator (e.g. "Dan Kwan, Daniel Scheinert", "Jasmine Warga").
- "personalNotes": Any personal thoughts, review quotes, or notes formatted cleanly for quote blocks (without raw URLs).

You must respond with valid JSON strictly conforming to this schema:
{
  "title": "Clean Title with Year if applicable (e.g. Everything Everywhere All at Once (2022))",
  "description": "Engaging 2-3 sentence synopsis without raw URLs",
  "sourceUrl": "Extracted primary URL if present in input, or empty string",
  "channel": "Discovered Channel / Source (e.g. @rafiqahakhdar on TikTok, Twitter thread, Shopee) or empty string",
  "tags": "Genre1, Genre2, Genre3",
  "platform": "Platform or Where to find",
  "duration": "Concise Length / Runtime / Episodes / Price",
  "creator": "Creator / Author / Studio / Director",
  "personalNotes": "Optional sweet note or leave empty"
}
Output only raw JSON, no markdown codeblocks, no commentary.`;

  const userPrompt = `Target Category: ${categoryContext}
Title/Topic: ${req.title || "Not provided"}
Raw notes/details: ${req.rawInput || "None"}
Additional user instruction: ${req.prompt || `Auto-fill missing details aesthetically for the ${categoryContext} format`}

REMINDER: This recommendation is specifically for the "${categoryContext}" medium (e.g. if "${categoryContext}" is Anime, output the anime's studio, episodes, and streaming service, NOT the manga).`;

  // Multimodal Vision support: if image URLs or base64 are provided, pass them to the model
  let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = userPrompt;
  if (req.images && req.images.length > 0) {
    const validImages = req.images.filter(
      (img) => img && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:image/"))
    );
    if (validImages.length > 0) {
      userContent = [
        { type: "text", text: userPrompt },
        ...validImages.slice(0, 3).map((url) => ({
          type: "image_url",
          image_url: { url },
        })),
      ];
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `AI API returned status ${res.status}: ${errText}`,
      };
    }

    const responseText = await res.text();
    const rawContent = extractContentFromResponseText(responseText);

    if (!rawContent || !rawContent.trim()) {
      return {
        success: false,
        error: "AI model returned an empty response.",
      };
    }

    const parsed = parseRecommendationJson(rawContent);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
