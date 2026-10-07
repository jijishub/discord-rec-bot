import { Category, BotPersona } from "@/types";

export const DEFAULT_BOT_PERSONA: BotPersona = {
  username: "Ayato ┆ ˚ ༘ ๋",
  avatarUrl: "https://i.imgur.com/K1b5T3v.png", // Ayato pastel avatar fallback
  footerText: "Rec by {source}",
  footerIconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f338.png", // 🌸
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "movie",
    name: "Movie",
    emoji: "💠",
    color: "#7983d4",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1faab.png", // lotus / forget-me-not blue
  },
  {
    id: "novel",
    name: "Novel",
    emoji: "🌼",
    color: "#f59e0b",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f33c.png", // daisy
  },
  {
    id: "anime",
    name: "Anime / Manga",
    emoji: "🌸",
    color: "#f472b6",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f338.png", // cherry blossom
  },
  {
    id: "music",
    name: "Music",
    emoji: "🎵",
    color: "#34d399",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3b5.png", // musical note
  },
  {
    id: "game",
    name: "Game",
    emoji: "🎮",
    color: "#38bdf8",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3ae.png", // video game
  },
  {
    id: "cafe",
    name: "Café & Tea",
    emoji: "🍵",
    color: "#fb923c",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f375.png", // teacup without handle
  },
  {
    id: "tech",
    name: "Tech & Tools",
    emoji: "💻",
    color: "#60a5fa",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f4bb.png", // laptop
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    emoji: "🌿",
    color: "#a3e635",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f33f.png", // herb
  },
];
