import { DiscordEmbed } from "@/types";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    // Only globally routable unicast IPv6; excludes mapped IPv4 and local ranges.
    return /^[23][0-9a-f]{3}:/i.test(address) && !address.toLowerCase().startsWith("2001:db8:");
  }
  const [a, b] = address.split(".").map(Number);
  return isIP(address) === 4 && a !== 0 && a !== 10 && a !== 127 &&
    !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && b === 168) && !(a === 100 && b >= 64 && b <= 127) && a < 224;
}

async function fetchPublicPage(input: string): Promise<Response> {
  let url = new URL(input);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        (url.port && !["80", "443"].includes(url.port))) throw new Error("Unsupported URL");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new Error("Private network URLs are not supported");
    }
    const response = await fetch(url, {
      redirect: "manual", signal: AbortSignal.timeout(2500),
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "JasmineDiscordBot/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Missing redirect URL");
      url = new URL(location, url);
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects");
}

/**
 * Extracts all HTTP/HTTPS URLs from a given text block.
 */
export function extractUrls(text?: string | null): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Detects if a URL is a Twitter / X link and extracts status ID.
 */
export function parseTwitterUrl(url: string): { tweetId: string; username?: string } | null {
  try {
    const match = url.match(
      /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com)\/(?:#!\/)?([a-zA-Z0-9_]+)\/status\/(\d+)/i
    );
    if (match) {
      return {
        username: match[1],
        tweetId: match[2],
      };
    }
  } catch {
    // Ignore parsing error
  }
  return null;
}

/**
 * Fetches rich Tweet metadata via the public FixTweet API.
 */
export async function fetchTwitterSubEmbed(
  url: string
): Promise<{ embed: DiscordEmbed; videoUrl?: string } | null> {
  const parsed = parseTwitterUrl(url);
  if (!parsed) return null;

  try {
    const apiUrl = `https://api.fxtwitter.com/status/${parsed.tweetId}`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "JasmineDiscordBot/1.0",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 200 || !data.tweet) return null;

    const tweet = data.tweet;

    // Check for tweet media (photos/videos)
    const photoUrl = tweet.media?.photos?.[0]?.url || undefined;
    const videoUrl = tweet.media?.videos?.[0]?.url || undefined;

    const likes = tweet.likes ? tweet.likes.toLocaleString() : "0";
    const retweets = tweet.retweets ? tweet.retweets.toLocaleString() : "0";

    const subEmbed: DiscordEmbed = {
      author: {
        name: `${tweet.author.name} (@${tweet.author.screen_name})`,
        icon_url: tweet.author.avatar_url,
        url: tweet.url,
      },
      description: tweet.text?.slice(0, 2000) || undefined,
      color: 0x1da1f2, // Twitter Blue
      image: photoUrl ? { url: photoUrl } : undefined,
      footer: {
        text: `Twitter / X • ❤️ ${likes} • 🔁 ${retweets}`,
        icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
      },
      timestamp: tweet.created_at ? new Date(tweet.created_at).toISOString() : undefined,
    };

    return { embed: subEmbed, videoUrl };
  } catch (err) {
    console.warn("Could not fetch Twitter sub-embed:", err);
    return null;
  }
}

/**
 * Parses OpenGraph metadata for generic links (articles, blogs, websites)
 */
export async function fetchGenericUrlSubEmbed(url: string): Promise<DiscordEmbed | null> {
  try {
    const parsedUrl = new URL(url);
    const res = await fetchPublicPage(url);

    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.includes("text/html")) {
      await res.body?.cancel();
      return null;
    }
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512_000) break;
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const html = Buffer.concat(chunks).toString("utf8");

    const getMeta = (prop: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
      return match ? match[1].trim() : undefined;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = getMeta("og:title") || (titleMatch ? titleMatch[1].trim() : parsedUrl.hostname);
    const description = getMeta("og:description") || getMeta("description");
    const siteName = getMeta("og:site_name") || parsedUrl.hostname;
    const ogImage = getMeta("og:image");

    let resolvedImage: string | undefined = ogImage;
    if (resolvedImage && !resolvedImage.startsWith("http")) {
      resolvedImage = new URL(resolvedImage, url).toString();
    }

    const favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

    const subEmbed: DiscordEmbed = {
      author: {
        name: siteName,
        icon_url: favicon,
        url: url,
      },
      title: title.slice(0, 250),
      url: url,
      description: description ? description.slice(0, 1000) : undefined,
      color: 0x5865f2,
      image: resolvedImage ? { url: resolvedImage } : undefined,
      footer: {
        text: parsedUrl.hostname,
        icon_url: favicon,
      },
    };

    return subEmbed;
  } catch (err) {
    console.warn("Could not fetch OpenGraph sub-embed for URL:", err);
    return null;
  }
}

/**
 * Detects URLs in input and resolves an appropriate sub-embed (Twitter/X or general OpenGraph).
 */
export async function resolveSubEmbed(
  input: string | undefined | null
): Promise<{ subEmbed: DiscordEmbed | null; videoUrl?: string; detectedUrl?: string }> {
  if (!input) return { subEmbed: null };

  const urls = extractUrls(input);
  if (urls.length === 0) return { subEmbed: null };

  const firstUrl = urls[0];

  // 1. Try Twitter / X
  if (parseTwitterUrl(firstUrl)) {
    const twitterResult = await fetchTwitterSubEmbed(firstUrl);
    if (twitterResult) {
      return {
        subEmbed: twitterResult.embed,
        videoUrl: twitterResult.videoUrl,
        detectedUrl: firstUrl,
      };
    }
  }

  // 2. Fall back to generic OpenGraph sub-embed
  const genericEmbed = await fetchGenericUrlSubEmbed(firstUrl);
  if (genericEmbed) {
    return {
      subEmbed: genericEmbed,
      detectedUrl: firstUrl,
    };
  }

  return { subEmbed: null, detectedUrl: firstUrl };
}
