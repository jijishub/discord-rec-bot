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

export async function enhanceRecWithAI(
  req: AIEnhanceRequest
): Promise<{ success: boolean; data?: AIEnhanceResult; error?: string }> {
  const baseUrl = req.apiBaseUrl || process.env.AI_API_BASE_URL;
  const apiKey = req.apiKey || process.env.AI_API_KEY || "dummy";
  const model = req.model || process.env.AI_DEFAULT_MODEL || "gemini-1.5-pro";

  if (!baseUrl) {
    return {
      success: false,
      error: "AI_API_BASE_URL is not configured. Please set your reverse proxy URL.",
    };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const systemPrompt = `You are Jasmine 🌸, an aesthetic, gentle, and organized curator for a personal Discord recommendations channel.
Given a recommendation title or notes in the "${req.category || "General"}" category, your job is to organize and fill in details matching our aesthetic format:
- Short, engaging synopsis (description) without spoilers.
- Tags/Genres (comma-separated, e.g. "Sci-fi, Adventure, Drama, Comedy").
- Where to watch/read (platform, e.g. "Netflix", "Crunchyroll", "Steam", "Kindle", "Other sites").
- Duration/Length (e.g. "2h 20m", "12 Episodes", "350 pages").
- Creator/Author/Director/Studio.
- Optional personal note / quote formatted gently.

You must respond with valid JSON strictly conforming to this schema:
{
  "title": "Clean Title with Year if applicable",
  "description": "Engaging 2-3 sentence synopsis",
  "tags": "Genre1, Genre2, Genre3",
  "platform": "Platform or Where to find",
  "duration": "Length / Runtime / Episodes",
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

    const json = await res.json();
    const rawContent = json.choices?.[0]?.message?.content || "";

    // Parse JSON safely (removing markdown code blocks if present)
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: AIEnhanceResult = JSON.parse(cleanedJson);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
