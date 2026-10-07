export interface AIEnhanceRequest {
  title?: string;
  rawInput?: string;
  category?: string;
  prompt?: string;
  model?: string;
  apiKey?: string;
  apiBaseUrl?: string;
}

export interface AIEnhanceResult {
  title: string;
  description: string;
  tags?: string;
  platform?: string;
  duration?: string;
  creator?: string;
  personalNotes?: string;
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

  return JSON.parse(cleaned);
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

  const systemPrompt = `You are Jasmine 🌸, an aesthetic, gentle, and organized curator for a personal Discord recommendations channel.
Given a recommendation title or notes in the "${req.category || "General"}" category, your job is to organize and fill in details matching our aesthetic format:
- Short, engaging synopsis (description) without spoilers.
- Tags/Genres (comma-separated, e.g. "Fantasy, Adventure, Magic").
- Where to watch/read (platform, e.g. "Netflix", "Kodansha", "Crunchyroll", "Steam", "BookWalker").
- Duration/Length (e.g. "2h 20m", "13 Volumes (Ongoing)", "12 Episodes").
- Creator/Author/Director/Studio.
- Optional personal note / quote formatted gently.

You must respond with valid JSON strictly conforming to this schema:
{
  "title": "Clean Title with Year/Status if applicable",
  "description": "Engaging 2-3 sentence synopsis",
  "tags": "Genre1, Genre2, Genre3",
  "platform": "Platform or Where to find",
  "duration": "Length / Runtime / Episodes / Volumes",
  "creator": "Author or Director",
  "personalNotes": "Optional sweet note or leave empty"
}
Output only raw JSON, no markdown codeblocks, no commentary.`;

  const userPrompt = `Title/Topic: ${req.title || "Not provided"}
Raw notes/details: ${req.rawInput || "None"}
Additional user instruction: ${req.prompt || "Auto-fill missing details aesthetically"}`;

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
          { role: "user", content: userPrompt },
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
