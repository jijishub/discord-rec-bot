"use client";

import React, { useState, useEffect, useRef } from "react";
import { BotPersona } from "@/types";
import { X, Check, Save, Sparkles, CheckCircle2, UploadCloud } from "lucide-react";

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
  serverConfig?: {
    hasWebhook: boolean;
    hasAi: boolean;
    hasRedis?: boolean;
    defaultModel: string;
    defaultPersona?: BotPersona;
  };
}

const COMMON_MODELS = [
  "gpt-5.6-luna",
  "gemini-1.5-pro",
  "gemini-2.0-flash-exp",
  "deepseek/deepseek-chat:free",
];

export default function SettingsModal({
  isOpen,
  onClose,
  persona,
  onSavePersona,
  webhookUrl,
  onSaveWebhookUrl,
  aiSettings,
  onSaveAiSettings,
  serverConfig,
}: Props) {
  const [activeTab, setActiveTab] = useState<"persona" | "webhook" | "ai">("ai");

  // Local states
  const [username, setUsername] = useState(persona.username);
  const [avatarUrl, setAvatarUrl] = useState(persona.avatarUrl);
  const [footerText, setFooterText] = useState(persona.footerText);
  const [footerIconUrl, setFooterIconUrl] = useState(persona.footerIconUrl || "");

  const [currentWebhook, setCurrentWebhook] = useState(webhookUrl);

  const [aiBaseUrl, setAiBaseUrl] = useState(aiSettings.baseUrl);
  const [aiKey, setAiKey] = useState(aiSettings.apiKey);
  const [aiModel, setAiModel] = useState(aiSettings.model || serverConfig?.defaultModel || "gpt-5.6-luna");

  const [savedNotice, setSavedNotice] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an avatar under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - minDim) / 2;
          const sy = (img.naturalHeight - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          setAvatarUrl(canvas.toDataURL("image/png"));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!aiSettings.model && serverConfig?.defaultModel) {
      setAiModel(serverConfig.defaultModel);
    }
  }, [serverConfig, aiSettings.model]);

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
      model: aiModel.trim() || serverConfig?.defaultModel || "gpt-5.6-luna",
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
              <h2 className="text-lg font-bold text-slate-800">Bot &amp; System Settings</h2>
              <p className="text-xs text-slate-500">
                Configure your Webhook, Persona, and AI Reverse Proxy overrides
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
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "ai"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ✨ AI Reverse Proxy
          </button>
          <button
            type="button"
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
            type="button"
            onClick={() => setActiveTab("persona")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "persona"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🌸 Bot Persona
          </button>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSaveAll} className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Server Env Banner */}
              {serverConfig?.hasAi && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">AI is automatically configured from your server environment (.env / Vercel)!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      You do <strong>not</strong> need to enter your API URL or Key here. Leave them blank to use your server credentials automatically.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Active Model
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="e.g. gpt-5.6-luna, gemini-1.5-pro"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 mr-1 self-center">Quick pick:</span>
                  {COMMON_MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAiModel(m)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        aiModel === m
                          ? "bg-pink-100 border-pink-300 text-pink-800 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reverse Proxy API Base URL <span className="text-slate-400 font-normal">(Optional Override)</span>
                </label>
                <input
                  type="url"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder={serverConfig?.hasAi ? "Using server environment URL (leave blank)" : "https://your-ai-endpoint.example/v1"}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  API Key <span className="text-slate-400 font-normal">(Optional Override)</span>
                </label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder={serverConfig?.hasAi ? "•••••••••••• (Using server environment key)" : "Bearer token or API Key"}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          )}

          {activeTab === "webhook" && (
            <div className="space-y-4">
              {serverConfig?.hasWebhook && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Webhook is active from your server environment (.env / Vercel)!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Posting to <strong>#❋・recs</strong> works automatically without entering a URL here.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Channel ❋・recs Webhook URL <span className="text-slate-400 font-normal">(Optional Override)</span>
                </label>
                <input
                  type="url"
                  value={currentWebhook}
                  onChange={(e) => setCurrentWebhook(e.target.value)}
                  placeholder={serverConfig?.hasWebhook ? "Using server environment webhook (leave blank)" : "https://discord.com/api/webhooks/..."}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          )}

          {activeTab === "persona" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200/80 text-xs text-pink-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  Live Preview &amp; Sender Customization
                </p>
                <p className="text-[11px] text-pink-700 mt-1 leading-relaxed">
                  Modifying your name and avatar here updates the live Discord preview card{serverConfig?.hasRedis ? " and automatically syncs to Upstash Redis across all your devices!" : " and saves permanently to your browser localStorage."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Webhook Bot Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Jasmine 🌸"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bot Avatar Profile Picture
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 bg-white shadow-xs shrink-0">
                    <img
                      src={avatarUrl || serverConfig?.defaultPersona?.avatarUrl || "/maomao.png"}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 w-full">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-100 hover:bg-pink-200 text-pink-700 transition"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Avatar (PNG/JPG)</span>
                      </button>
                      <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      {avatarUrl && avatarUrl.startsWith("data:") && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl(serverConfig?.defaultPersona?.avatarUrl || "/maomao.png")}
                          className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-300 bg-white"
                    />
                  </div>
                </div>
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
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 rounded-xl shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Overrides
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
