"use client";

import React from "react";
import { Category, RecFormData, BotPersona } from "@/types";

interface Props {
  data: RecFormData;
  category: Category;
  persona: BotPersona;
}

export default function DiscordEmbedPreview({ data, category, persona }: Props) {
  const images = (data.images || []).filter((img) => img && img.trim().length > 0);
  const embedColor = data.customColor || category.color || "#7983d4";

  return (
    <div className="w-full bg-[#313338] text-[#dbdee1] p-4 sm:p-5 rounded-2xl shadow-xl font-sans text-[14px] leading-relaxed border border-slate-800 selection:bg-[#5865F2] selection:text-white">
      {/* Discord Message Header */}
      <div className="flex items-start gap-3.5 mb-2">
        <img
          src={persona.avatarUrl || "https://i.imgur.com/K1b5T3v.png"}
          alt={persona.username}
          className="w-10 h-10 rounded-full object-cover shrink-0 select-none shadow"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-[15px] hover:underline cursor-pointer">
              {persona.username || "Ayato ┆ ˚ ༘ ๋"}
            </span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center leading-none">
              APP
            </span>
            <span className="text-[12px] text-[#949ba4] ml-1">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Discord Embed Box */}
          <div
            className="mt-1.5 rounded-lg bg-[#2b2d31] p-4 relative max-w-xl shadow-md border-l-[4px]"
            style={{ borderLeftColor: embedColor }}
          >
            {/* Top Right Thumbnail */}
            {category.iconUrl && (
              <div className="absolute top-4 right-4 w-14 h-14 sm:w-16 sm:h-16 shrink-0 select-none">
                <img
                  src={category.iconUrl}
                  alt={category.name}
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
            )}

            <div className={`space-y-3 ${category.iconUrl ? "pr-16 sm:pr-20" : ""}`}>
              {/* Category Author Header */}
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {category.iconUrl ? (
                  <img
                    src={category.iconUrl}
                    alt={category.name}
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="text-base">{category.emoji || "🌸"}</span>
                )}
                <span>{category.name}</span>
              </div>

              {/* Title */}
              <h4 className="text-[16px] font-bold text-white hover:underline cursor-pointer leading-snug">
                {data.title || "Title of Recommendation"}
              </h4>

              {/* Description Synopsis */}
              {data.description && (
                <div className="text-[13px] text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </div>
              )}

              {/* Personal Notes (Discord Blockquote Style) */}
              {data.personalNotes && (
                <div className="border-l-4 border-[#4e5058] pl-3 py-0.5 text-[13px] text-[#b5bac1] italic space-y-1">
                  {data.personalNotes.split("\n").map((line, i) => (
                    <p key={i} className="not-italic">
                      {line.startsWith(">") ? line.replace(/^>\s*/, "") : line}
                    </p>
                  ))}
                </div>
              )}

              {/* Inline Metadata Fields */}
              {(data.tags || data.platform || data.duration || data.creator) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[13px]">
                  {/* Field 1 */}
                  {(data.tags || data.platform) && (
                    <div className="space-y-0.5">
                      <div className="font-bold text-white leading-tight">
                        {data.tags || "Tags"}
                      </div>
                      <div className="text-[#b5bac1]">
                        {data.platform || "Platform"}
                      </div>
                    </div>
                  )}

                  {/* Field 2 */}
                  {(data.duration || data.creator) && (
                    <div className="space-y-0.5">
                      <div className="font-bold text-white leading-tight">
                        {data.duration || "Duration"}
                      </div>
                      <div className="text-[#b5bac1]">
                        {data.creator || "Creator / Author"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Images Gallery */}
            {images.length > 0 && (
              <div className="mt-3.5">
                {images.length === 1 ? (
                  <div className="rounded-lg overflow-hidden max-h-72 bg-black/20">
                    <img
                      src={images[0]}
                      alt="Attachment 1"
                      className="w-full h-auto object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className={`grid gap-1.5 rounded-lg overflow-hidden ${
                    images.length === 2
                      ? "grid-cols-2"
                      : images.length === 3
                      ? "grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3"
                  }`}>
                    {images.slice(0, 9).map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video sm:aspect-square bg-black/30 rounded overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-3 pt-1 text-[12px] text-[#949ba4]">
              {persona.footerIconUrl ? (
                <img
                  src={persona.footerIconUrl}
                  alt="Footer Icon"
                  className="w-4 h-4 rounded-full object-contain"
                />
              ) : (
                <span>🌸</span>
              )}
              <span>
                {data.source
                  ? `Rec by ${data.source}`
                  : persona.footerText.replace("{source}", "Jizelle")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
