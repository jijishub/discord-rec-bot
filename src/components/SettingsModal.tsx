"use client";

import React, { useState } from "react";
import { BotPersona } from "@/types";
import { X, Check, Save } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  persona: BotPersona;
  onSavePersona: (updated: BotPersona) => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
  aiSettings: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  onSaveAiSettings: (settings: { baseUrl: string; apiKey: string; model: string }) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  persona,
  onSavePersona,
  webhookUrl,
  onSaveWebhookUrl,
  aiSettings,
  onSaveAiSettings,
}: Props) {
  const [activeTab, setActiveTab] = useState<"persona" | "webhook" | "ai">("persona");

  // Local states
  const [username, setUsername] = useState(persona.username);
  const [avatarUrl, setAvatarUrl] = useState(persona.avatarUrl);
  const [footerText, setFooterText] = useState(persona.footerText);
  const [footerIconUrl, setFooterIconUrl] = useState(persona.footerIconUrl || "");

  const [currentWebhook, setCurrentWebhook] = useState(webhookUrl);

  const [aiBaseUrl, setAiBaseUrl] = useState(aiSettings.baseUrl);
  const [aiKey, setAiKey] = useState(aiSettings.apiKey);
  const [aiModel, setAiModel] = useState(aiSettings.model);

  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePersona({
      username: username.trim(),
      avatarUrl: avatarUrl.trim(),
      footerText: footerText.trim(),
      footerIconUrl: footerIconUrl.trim() || undefined,
    });
    onSaveWebhookUrl(currentWebhook.trim());
    onSaveAiSettings({
      baseUrl: aiBaseUrl.trim(),
      apiKey: aiKey.trim(),
      model: aiModel.trim(),
    });

    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-pink-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 via-white to-sky-50">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bot & System Settings</h2>
              <p className="text-xs text-slate-500">
                Configure your Webhook, Bot Persona, and AI Reverse Proxy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-pink-100/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/50 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("persona")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "persona"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🌸 Bot Persona
          </button>
          <button
            onClick={() => setActiveTab("webhook")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "webhook"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🔗 Discord Webhook
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "ai"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ✨ AI Reverse Proxy
          </button>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSaveAll} className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === "persona" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Webhook Bot Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Ayato ┆ ˚ ༘ ๋ or Jasmine 🌸"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Avatar Profile Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://... (Ayato / Jasmine avatar)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                {avatarUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                    <span>Avatar preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Footer Text Template
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Rec by {source}"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Use <code>&#123;source&#125;</code> where the recommender name should appear.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Footer Icon URL
                </label>
                <input
                  type="url"
                  value={footerIconUrl}
                  onChange={(e) => setFooterIconUrl(e.target.value)}
                  placeholder="https://... (Flower icon for footer)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          )}

          {activeTab === "webhook" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Channel ❋・recs Webhook URL
                </label>
                <input
                  type="url"
                  value={currentWebhook}
                  onChange={(e) => setCurrentWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  To get this: In Discord, go to channel <code>#❋・recs</code> (ID: 954007611689304114) &rarr;
                  Edit Channel &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy Webhook URL.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Reverse Proxy API Base URL
                </label>
                <input
                  type="url"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="https://your-reverse-proxy.site/v1"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="Bearer token or API Key"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            {savedNotice && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 rounded-xl shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
