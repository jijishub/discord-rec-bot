export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // Hex color string, e.g. "#7aa2f7" or "#fbcfe8"
  iconUrl?: string; // Top right thumbnail icon URL (e.g. flower image or custom icon)
}

export interface RecFormData {
  categoryId: string;
  title: string;
  description: string;
  personalNotes?: string;
  tags?: string; // Genres / Tags (e.g. "Sci-fi, Adventure, Comedy...")
  platform?: string; // Platform / Where to watch / read (e.g. "Other sites", "Netflix")
  duration?: string; // Duration / Pages / Episodes (e.g. "2h 20m", "320 pages")
  creator?: string; // Director / Author / Studio (e.g. "Dan Kwan, Daniel Scheinert")
  source?: string; // Footer source (e.g. "social media", "Rafa Ela", "Jizelle")
  images: string[]; // Up to 9 image URLs or Base64 / uploaded URLs
}

export interface BotPersona {
  username: string; // e.g. "Ayato ┆ ˚ ༘ ๋" or "Jasmine 🌸"
  avatarUrl: string; // Webhook avatar URL
  footerText: string; // e.g. "Rec by {source}"
  footerIconUrl?: string;
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbedAuthor {
  name: string;
  icon_url?: string;
  url?: string;
}

export interface DiscordEmbedThumbnail {
  url: string;
}

export interface DiscordEmbedImage {
  url: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: DiscordEmbedAuthor;
  thumbnail?: DiscordEmbedThumbnail;
  image?: DiscordEmbedImage;
  footer?: DiscordEmbedFooter;
  fields?: DiscordEmbedField[];
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}
