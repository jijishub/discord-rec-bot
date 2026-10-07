"use client";

import React, { useState, useEffect } from "react";
import { Category, RecFormData, BotPersona } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA, SERVER_LEGEND_COLORS } from "@/lib/categories";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import SettingsModal from "@/components/SettingsModal";
import DiscordEmbedPreview from "@/components/DiscordEmbedPreview";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Image as ImageIcon,
  Settings,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UploadCloud,
} from "lucide-react";

export default function Home() {
  // Categories & Persona state with localStorage persistence
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCatId, setSelectedCatId] = useState<string>("movie");
  const [persona, setPersona] = useState<BotPersona>(DEFAULT_BOT_PERSONA);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [aiSettings, setAiSettings] = useState({
    baseUrl: "",
    apiKey: "",
    model: "gpt-5.6-luna",
  });
  const [serverConfig, setServerConfig] = useState<{
    hasWebhook: boolean;
    hasAi: boolean;
    hasRedis?: boolean;
    defaultModel: string;
    defaultPersona?: BotPersona;
  } | null>(null);

  // Modal open states
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Rec Form State
  const [formData, setFormData] = useState<RecFormData>({
    categoryId: "movie",
    title: "",
    description: "",
    personalNotes: "",
    tags: "",
    platform: "",
    duration: "",
    creator: "",
    source: "Jizelle",
    images: [],
  });

  // Image input helper
  const [imageUrlInput, setImageUrlInput] = useState("");

  // AI Prompt helper
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiCustomInstruction, setAiCustomInstruction] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Submit / Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load server config, cloud Upstash data, and saved configurations from localStorage on mount
  useEffect(() => {
    // 1. Fetch server environment status
    fetch("/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        setServerConfig(cfg);
        if (cfg?.defaultModel) {
          setAiSettings((prev) => ({
            ...prev,
            model: prev.model || cfg.defaultModel,
          }));
        }
        if (cfg?.defaultPersona && !cfg?.hasRedis) {
          const savedPersona = localStorage.getItem("jasmine_persona");
          if (!savedPersona) {
            setPersona(cfg.defaultPersona);
          } else {
            try {
              const parsed = JSON.parse(savedPersona);
              if (parsed.username === "Ayato ┆ ˚ ༘ ๋" || parsed.avatarUrl === "https://i.imgur.com/K1b5T3v.png") {
                setPersona(cfg.defaultPersona);
                localStorage.setItem("jasmine_persona", JSON.stringify(cfg.defaultPersona));
              }
            } catch {
              setPersona(cfg.defaultPersona);
            }
          }
        }
      })
      .catch((e) => console.error("Could not fetch server config", e));

    // 2. Fetch categories from Upstash Cloud if available
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          if (data.isCloud) {
            setCategories(data.categories);
            localStorage.setItem("jasmine_categories", JSON.stringify(data.categories));
            setSelectedCatId((prev) =>
              data.categories.some((c: Category) => c.id === prev) ? prev : data.categories[0].id
            );
          }
        }
      })
      .catch((e) => console.error("Could not fetch cloud categories", e));

    // 3. Fetch persona from Upstash Cloud if available
    fetch("/api/persona")
      .then((res) => res.json())
      .then((data) => {
        if (data?.persona && data.isCloud) {
          setPersona(data.persona);
          localStorage.setItem("jasmine_persona", JSON.stringify(data.persona));
        }
      })
      .catch((e) => console.error("Could not fetch cloud persona", e));

    // 4. Load localStorage settings as immediate local cache
    try {
      const savedCats = localStorage.getItem("jasmine_categories");
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
          setSelectedCatId(parsed[0].id);
        }
      }

      const savedPersona = localStorage.getItem("jasmine_persona");
      if (savedPersona) {
        const parsed = JSON.parse(savedPersona);
        if (parsed.username !== "Ayato ┆ ˚ ༘ ๋" && parsed.avatarUrl !== "https://i.imgur.com/K1b5T3v.png") {
          setPersona(parsed);
        }
      }

      const savedWebhook = localStorage.getItem("jasmine_webhook_url");
      if (savedWebhook) {
        setWebhookUrl(savedWebhook);
      }

      const savedAi = localStorage.getItem("jasmine_ai_settings");
      if (savedAi) {
        const parsedAi = JSON.parse(savedAi);
        setAiSettings((prev) => ({
          ...prev,
          ...parsedAi,
          model: parsedAi.model || prev.model,
        }));
      }
    } catch (e) {
      console.error("Error loading localStorage settings", e);
    }
  }, []);

  // Save changes to localStorage and Upstash Redis
  const handleSaveCategories = (updated: Category[]) => {
    setCategories(updated);
    localStorage.setItem("jasmine_categories", JSON.stringify(updated));
    if (!updated.some((c) => c.id === selectedCatId)) {
      setSelectedCatId(updated[0]?.id || "");
    }
    fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: updated }),
    }).catch((e) => console.error("Could not sync categories to cloud", e));
  };

  const handleResetCategories = () => {
    setCategories(DEFAULT_CATEGORIES);
    setSelectedCatId(DEFAULT_CATEGORIES[0].id);
    localStorage.setItem("jasmine_categories", JSON.stringify(DEFAULT_CATEGORIES));
    fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: DEFAULT_CATEGORIES }),
    }).catch((e) => console.error("Could not reset categories in cloud", e));
  };

  const handleSavePersona = (updated: BotPersona) => {
    setPersona(updated);
    localStorage.setItem("jasmine_persona", JSON.stringify(updated));
    fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: updated }),
    }).catch((e) => console.error("Could not sync persona to cloud", e));
  };

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem("jasmine_webhook_url", url);
  };

  const handleSaveAiSettings = (settings: { baseUrl: string; apiKey: string; model: string }) => {
    setAiSettings(settings);
    localStorage.setItem("jasmine_ai_settings", JSON.stringify(settings));
  };

  // Current active category
  const activeCategory =
    categories.find((c) => c.id === selectedCatId) || categories[0] || DEFAULT_CATEGORIES[0];

  // Image handlers
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    if (formData.images.length >= 9) {
      alert("Discord embeds support a maximum of 9 images.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, imageUrlInput.trim()],
    }));
    setImageUrlInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 9 - formData.images.length;
    if (remainingSlots <= 0) {
      alert("Maximum 9 images already reached.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, base64],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // AI Auto-fill trigger
  const handleTriggerAi = async () => {
    if (!formData.title && !formData.description) {
      alert("Please provide at least a title or some rough notes for AI auto-fill.");
      return;
    }

    setIsAiLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          rawInput: `${formData.description}\n${formData.personalNotes}`,
          category: activeCategory.name,
          prompt: aiCustomInstruction,
          model: aiSettings.model || serverConfig?.defaultModel || "gpt-5.6-luna",
          apiKey: aiSettings.apiKey ? aiSettings.apiKey.trim() : undefined,
          apiBaseUrl: aiSettings.baseUrl ? aiSettings.baseUrl.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to auto-fill with AI");
      }

      const aiData = json.data;
      setFormData((prev) => ({
        ...prev,
        title: aiData.title || prev.title,
        description: aiData.description || prev.description,
        tags: aiData.tags || prev.tags,
        platform: aiData.platform || prev.platform,
        duration: aiData.duration || prev.duration,
        creator: aiData.creator || prev.creator,
        personalNotes: aiData.personalNotes || prev.personalNotes,
      }));

      setStatusMessage({
        type: "success",
        text: "🌸 Jasmine AI organized your recommendation details!",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: `AI error: ${msg}. Check reverse proxy settings in Bot Settings ⚙️`,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Form submission (Post to Discord Webhook)
  const handleSubmitRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please provide a title for the recommendation.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/webhook/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...formData,
            categoryId: activeCategory.id,
          },
          category: activeCategory,
          persona: persona,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to send webhook to Discord");
      }

      setStatusMessage({
        type: "success",
        text: "✨ Recommendation successfully posted to #❋・recs in Discord!",
      });

      // Clear non-essential fields after posting
      setFormData((prev) => ({
        ...prev,
        title: "",
        description: "",
        personalNotes: "",
        tags: "",
        platform: "",
        duration: "",
        creator: "",
        images: [],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: `Could not post to Discord: ${msg}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f9] text-slate-800 flex flex-col font-sans">
      {/* Top Aesthetic Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-pink-100/80 shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl animate-pulse">🌸</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">
                Jasmine <span className="text-pink-400 font-normal">┆ Rec Studio</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200/80 text-pink-600 font-medium hidden sm:inline-block">
                #❋・recs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ◜― ✿ Jizelle&apos;s Space ✿
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200/60 shadow-xs transition"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Categories & Icons</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/60 shadow-xs transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recommendation Composer Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm shadow-sm transition ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-pink-100/80 space-y-6">
            {/* 1. Category Selection */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="text-xs text-pink-500 hover:text-pink-600 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Manage / Add
                </button>
              </div>

              {/* Dynamic Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = cat.id === activeCategory.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? "shadow-sm scale-102"
                          : "bg-white text-slate-600 border-slate-200 hover:border-pink-200 hover:bg-pink-50/30"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${cat.color}20`,
                              borderColor: cat.color,
                              color: cat.color,
                            }
                          : {}
                      }
                    >
                      {cat.iconUrl ? (
                        <img
                          src={cat.iconUrl}
                          alt={cat.name}
                          className="w-4 h-4 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span>{cat.emoji || "🌸"}</span>
                      )}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Embed Accent Color Customizer */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-500" />
                  Embed Border Color
                </label>
                {formData.customColor && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customColor: undefined })}
                    className="text-[11px] text-pink-500 hover:text-pink-700 underline font-medium"
                  >
                    Reset to {activeCategory.name} default
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Active Color Swatch & Hex input */}
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                  <input
                    type="color"
                    value={formData.customColor || activeCategory.color}
                    onChange={(e) => setFormData({ ...formData, customColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                    title="Pick custom embed border color"
                  />
                  <input
                    type="text"
                    value={formData.customColor || activeCategory.color}
                    onChange={(e) => setFormData({ ...formData, customColor: e.target.value })}
                    className="w-20 text-xs font-mono font-semibold text-slate-700 bg-transparent focus:outline-none"
                    placeholder="#c0c8ff"
                  />
                </div>

                {/* Quick-pick Palette from Server Legend */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  <span className="text-[11px] text-slate-400 mr-0.5">Legend:</span>
                  {SERVER_LEGEND_COLORS.map((leg) => {
                    const activeHex = (formData.customColor || activeCategory.color).toLowerCase();
                    const isCurrent = activeHex === leg.hex.toLowerCase();
                    return (
                      <button
                        key={leg.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, customColor: leg.hex })}
                        title={`${leg.label} (${leg.hex})`}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] transition transform hover:scale-115 ${
                          isCurrent
                            ? "ring-2 ring-pink-400 ring-offset-1 scale-110 border-white shadow-xs"
                            : "border-black/10 hover:border-black/30"
                        }`}
                        style={{ backgroundColor: leg.hex }}
                      >
                        {leg.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Title & AI Auto-fill trigger */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Title &amp; Work
                </label>

                {/* AI Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAiHelper(!showAiHelper)}
                  className="text-xs flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  {showAiHelper ? "Hide AI Auto-Fill" : "🌸 Auto-Fill with AI"}
                </button>
              </div>

              <input
                type="text"
                placeholder="e.g. Everything Everywhere All at Once (2022)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm font-medium bg-slate-50/30"
              />

              {/* Optional AI helper panel */}
              {showAiHelper && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50/70 via-rose-50/30 to-sky-50/50 border border-pink-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                      Jasmine AI Assistant
                      <span className="bg-pink-100 text-pink-800 text-[11px] px-2 py-0.5 rounded-full font-medium border border-pink-200">
                        Targeting {activeCategory.emoji} {activeCategory.name}
                      </span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Model: {aiSettings.model || serverConfig?.defaultModel || "gpt-5.6-luna"}
                    </span>
                  </div>

                  <textarea
                    rows={1}
                    placeholder={`Optional instruction for ${activeCategory.name}: e.g. 'Extract tags and runtime', 'Make it concise'`}
                    value={aiCustomInstruction}
                    onChange={(e) => {
                      setAiCustomInstruction(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 38), 180)}px`;
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none min-h-[38px] max-h-[180px] overflow-y-auto leading-relaxed"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={handleTriggerAi}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 shadow-sm transition disabled:opacity-50"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-filling...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Organize with AI 🌸
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Description (Synopsis) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Synopsis / Description
              </label>
              <textarea
                rows={3}
                placeholder="A brief overview or synopsis of the recommendation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm bg-slate-50/30 leading-relaxed"
              />
            </div>

            {/* 4. Personal Notes (Discord Quote) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Personal Notes / Quotes (Rendered as &gt; blockquote)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Michelle Yeoh is here again <333&#10;Not on Netflix"
                value={formData.personalNotes}
                onChange={(e) => setFormData({ ...formData, personalNotes: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm bg-slate-50/30 leading-relaxed font-mono text-xs"
              />
            </div>

            {/* 5. Two-column Metadata Fields (Matching Reference) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Tags & Platform */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Field 1 (Tags &amp; Availability)
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tags / Genres
                  </label>
                  <input
                    type="text"
                    placeholder="Sci-fi, Adventure, Comedy, Drama..."
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Platform / Where to watch or read
                  </label>
                  <input
                    type="text"
                    placeholder="Other sites, Netflix, Crunchyroll..."
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              {/* Field 2: Duration & Creator */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Field 2 (Duration &amp; Creators)
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Duration / Length
                  </label>
                  <input
                    type="text"
                    placeholder="2h 20m, 12 Episodes, 340 pages..."
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Director / Author / Creator
                  </label>
                  <input
                    type="text"
                    placeholder="Dan Kwan, Daniel Scheinert..."
                    value={formData.creator}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>
            </div>

            {/* 6. Multi-Image Attachments (Up to 9 images) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  Images / Posters ({formData.images.length}/9)
                </label>
                <span className="text-[11px] text-slate-400">
                  Multiple images form a Discord mosaic gallery
                </span>
              </div>

              {/* Upload & URL input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste image link (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Add URL
                  </button>
                </div>

                {/* File picker */}
                <label className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 cursor-pointer transition">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image Previews Grid */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2">
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100"
                    >
                      <img
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4 text-rose-300" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Recommender / Source */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Recommender / Source (Footer)
              </label>
              <input
                type="text"
                placeholder="e.g. social media, Rafa Ela, Jizelle"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            {/* Post to Discord Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Posts to <strong className="text-slate-600">#❋・recs</strong> webhook
              </span>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitRec}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-500 via-rose-400 to-sky-400 hover:from-pink-600 hover:to-sky-500 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting to Discord...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post to #❋・recs 🌸</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Discord Dark Mode Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Live Discord Embed Preview
              </span>
              <span className="text-[11px] text-slate-400">
                Updates in real-time
              </span>
            </div>

            {/* The Discord Message Card */}
            <DiscordEmbedPreview
              data={formData}
              category={activeCategory}
              persona={persona}
            />

            {/* Helper Hint */}
            <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-xs text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <span>💡 Tip:</span>
                <span>Custom Category Icons</span>
              </p>
              <p className="leading-relaxed">
                Click <strong>Categories &amp; Icons 🎨</strong> in the top header to change any category’s name, accent color, or top-right flower icon anytime.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategories}
        onResetCategories={handleResetCategories}
        isCloudConnected={!!serverConfig?.hasRedis}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        persona={persona}
        onSavePersona={handleSavePersona}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        aiSettings={aiSettings}
        onSaveAiSettings={handleSaveAiSettings}
        serverConfig={serverConfig || undefined}
      />
    </div>
  );
}
