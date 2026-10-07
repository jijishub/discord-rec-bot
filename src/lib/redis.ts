import { Redis } from "@upstash/redis";
import { Category, BotPersona } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "./categories";

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url,
      token,
    });
  }

  return redisInstance;
}

const CATEGORIES_KEY = "jasmine_categories";
const PERSONA_KEY = "jasmine_persona";

export async function getStoredCategories(): Promise<{ categories: Category[]; isCloud: boolean }> {
  const redis = getRedis();
  if (!redis) {
    return { categories: DEFAULT_CATEGORIES, isCloud: false };
  }

  try {
    const data = await redis.get<Category[]>(CATEGORIES_KEY);
    if (data && Array.isArray(data) && data.length > 0) {
      return { categories: data, isCloud: true };
    }
  } catch (err) {
    console.error("Failed to read categories from Upstash Redis:", err);
  }

  return { categories: DEFAULT_CATEGORIES, isCloud: true };
}

export async function saveStoredCategories(categories: Category[]): Promise<{ success: boolean; isCloud: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return { success: false, isCloud: false, error: "Upstash Redis not configured" };
  }

  try {
    await redis.set(CATEGORIES_KEY, categories);
    return { success: true, isCloud: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to save categories to Upstash Redis:", msg);
    return { success: false, isCloud: true, error: msg };
  }
}

export async function getStoredPersona(): Promise<{ persona: BotPersona; isCloud: boolean }> {
  const redis = getRedis();
  if (!redis) {
    return { persona: DEFAULT_BOT_PERSONA, isCloud: false };
  }

  try {
    const data = await redis.get<BotPersona>(PERSONA_KEY);
    if (data && typeof data === "object") {
      return { persona: data, isCloud: true };
    }
  } catch (err) {
    console.error("Failed to read persona from Upstash Redis:", err);
  }

  return { persona: DEFAULT_BOT_PERSONA, isCloud: true };
}

export async function saveStoredPersona(persona: BotPersona): Promise<{ success: boolean; isCloud: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return { success: false, isCloud: false, error: "Upstash Redis not configured" };
  }

  try {
    await redis.set(PERSONA_KEY, persona);
    return { success: true, isCloud: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to save persona to Upstash Redis:", msg);
    return { success: false, isCloud: true, error: msg };
  }
}
