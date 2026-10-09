import type { Category, DiscordEmbedField, RecFormData } from "@/types";

type Labels = [string, string, string, string, string];

const categoryLabels: Record<string, Labels> = {
  movies: ["Genres", "Where to watch", "Runtime", "Director / Studio", "Source"],
  anime: ["Genres", "Where to watch", "Episodes / Runtime", "Studio", "Source"],
  "tv-shows": ["Genres", "Where to watch", "Seasons / Episodes", "Creator / Studio", "Source"],
  manga: ["Genres", "Where to read", "Chapters / Volumes", "Author / Artist", "Source"],
  novel: ["Genres", "Where to read", "Pages / Volumes", "Author", "Source"],
  "web-novels": ["Genres", "Where to read", "Chapters", "Author", "Source"],
  games: ["Genres", "Platforms", "Playtime", "Developer / Publisher", "Source"],
  apps: ["Tags", "Platforms", "Details", "Developer", "Source"],
  websites: ["Tags", "Website", "Details", "Creator / Organization", "Source"],
  products: ["Tags", "Where to buy", "Product details", "Brand", "Shop / Source"],
  food: ["Tags", "Where to find", "Serving / Details", "Restaurant / Brand", "Shop / Source"],
  drinks: ["Tags", "Where to find", "Size / Details", "Brand / Cafe", "Shop / Source"],
};

export function buildRecFields(data: RecFormData, category: Category): DiscordEmbedField[] {
  // Match default names too, so categories with a customized ID keep suitable labels.
  const name = category.name.toLowerCase().replace(/\s+/g, "-");
  const labels = categoryLabels[category.id.toLowerCase()] || categoryLabels[name] ||
    (name === "manga-/-manhua" ? categoryLabels.manga : undefined) ||
    ["Tags", "Where to find", "Details", "Creator", "Source"];
  const values = [data.tags, data.platform, data.duration, data.creator,
    data.channel !== data.platform && data.channel !== data.source ? data.channel : undefined];

  return values.flatMap((raw, index) => {
    const value = raw?.trim();
    if (!value) return [];
    return [{ name: labels[index], value: value.length > 1024 ? value.slice(0, 1020) + "..." : value, inline: true }];
  });
}
