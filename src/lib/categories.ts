import { Category, BotPersona } from "@/types";

export const DEFAULT_BOT_PERSONA: BotPersona = {
  username: "Ayato ┆ ˚ ༘ ๋",
  avatarUrl: "https://i.imgur.com/K1b5T3v.png", // Ayato pastel avatar
  footerText: "Rec by {source}",
  footerIconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f338.png", // 🌸
};

// Exact server legend palette from Jizelle's Space
export const SERVER_LEGEND_COLORS = [
  { hex: "#c0c8ff", label: "Movies", emoji: "💠" },
  { hex: "#fcc4c4", label: "Anime", emoji: "🌸" },
  { hex: "#ddb652", label: "Manga / Manhua", emoji: "🌼" },
  { hex: "#f8f5eb", label: "Novel", emoji: "💮" },
  { hex: "#9cf8b5", label: "Web Novels", emoji: "💐" },
  { hex: "#a6f5eb", label: "TV Shows", emoji: "🌺" },
  { hex: "#4c8b38", label: "Games", emoji: "🌹" },
  { hex: "#f0c7c7", label: "Apps", emoji: "🌷" },
  { hex: "#810808", label: "Websites", emoji: "🥀" },
  { hex: "#ffd2af", label: "Drinks", emoji: "🧋" },
  { hex: "#f5e3a9", label: "Food", emoji: "🥟" },
  { hex: "#fffafa", label: "Products", emoji: "🤍" },
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "movies",
    name: "Movies",
    emoji: "💠",
    color: "#c0c8ff",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1faab.png",
  },
  {
    id: "anime",
    name: "Anime",
    emoji: "🌸",
    color: "#fcc4c4",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f338.png",
  },
  {
    id: "manga",
    name: "Manga / Manhua",
    emoji: "🌼",
    color: "#ddb652",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f33c.png",
  },
  {
    id: "novel",
    name: "Novel",
    emoji: "💮",
    color: "#f8f5eb",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4ae.png",
  },
  {
    id: "web-novels",
    name: "Web Novels",
    emoji: "💐",
    color: "#9cf8b5",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f490.png",
  },
  {
    id: "tv-shows",
    name: "TV Shows",
    emoji: "🌺",
    color: "#a6f5eb",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f33a.png",
  },
  {
    id: "games",
    name: "Games",
    emoji: "🌹",
    color: "#4c8b38",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f339.png",
  },
  {
    id: "apps",
    name: "Apps",
    emoji: "🌷",
    color: "#f0c7c7",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f337.png",
  },
  {
    id: "websites",
    name: "Websites",
    emoji: "🥀",
    color: "#810808",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f940.png",
  },
  {
    id: "drinks",
    name: "Drinks",
    emoji: "🧋",
    color: "#ffd2af",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f9cb.png",
  },
  {
    id: "food",
    name: "Food",
    emoji: "🥟",
    color: "#f5e3a9",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f95f.png",
  },
  {
    id: "products",
    name: "Products",
    emoji: "🤍",
    color: "#fffafa",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f90d.png",
  },
];
