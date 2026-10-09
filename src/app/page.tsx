"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Category, RecFormData, BotPersona } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "@/lib/categories";
import DiscordEmbedPreview from "@/components/DiscordEmbedPreview";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UploadCloud,
  ExternalLink,
  GitFork,
  Lock,
} from "lucide-react";

export default function Home() {
  // Categories & Persona state with localStorage persistence
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCatId, setSelectedCatId] = useState<string>("movie");
  const [persona, setPersona] = useState<BotPersona>(DEFAULT_BOT_PERSONA);
  const [destinationMode, setDestinationMode] = useState<"jizelle" | "custom">("jizelle");
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
    recipientName?: string;
    repoUrl?: string;
    recipientPronoun?: string;
  } | null>(null);

  // Recipient info & Repo source link (Configurable for forks)
  const recipientName =
    serverConfig?.recipientName ||
    process.env.NEXT_PUBLIC_RECIPIENT_NAME ||
    "Jizelle";
  const repoUrl =
    serverConfig?.repoUrl ||
    process.env.NEXT_PUBLIC_REPO_URL ||
    "https://github.com/jijishub/discord-rec-bot";
  const recipientPronoun =
    serverConfig?.recipientPronoun ||
    process.env.NEXT_PUBLIC_RECIPIENT_PRONOUN ||
    (recipientName.toLowerCase() === "jizelle" ? "her" : "their");

  // Rec Form State (source defaults to empty for public visitors)
  const [formData, setFormData] = useState<RecFormData>({
    categoryId: "movie",
    title: "",
    description: "",
    personalNotes: "",
    tags: "",
    platform: "",
    duration: "",
    creator: "",
    source: "",
    channel: "",
    videoUrl: "",
    subEmbed: undefined,
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

      // Load saved visitor recommender handle
      const savedRecommender = localStorage.getItem("jasmine_recommender");
      if (savedRecommender) {
        setFormData((prev) => ({ ...prev, source: savedRecommender }));
      }
    } catch (e) {
      console.error("Error loading localStorage settings", e);
    }
  }, []);

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
        const rawBase64 = event.target?.result as string;
        if (!rawBase64) return;

        // Auto-scale to max 1280px and compress to JPEG to keep payloads compact and avoid 413 errors
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.82);
            setFormData((prev) => {
              if (prev.images.length >= 9) return prev;
              return {
                ...prev,
                images: [...prev.images, compressed],
              };
            });
          } else {
            setFormData((prev) => {
              if (prev.images.length >= 9) return prev;
              return {
                ...prev,
                images: [...prev.images, rawBase64],
              };
            });
          }
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // AI Auto-fill trigger
  const handleTriggerAi = async () => {
    if (!formData.title && !formData.description && !formData.personalNotes && (!formData.images || formData.images.length === 0)) {
      alert("Please provide at least a title, notes, or an image for AI auto-fill.");
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
          personalNotes: formData.personalNotes,
          channel: formData.channel,
          prompt: aiCustomInstruction,
          images: formData.images,
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
      let detectedSub = null;
      let detectedVid = aiData.videoUrl || "";

      if (aiData.sourceUrl) {
        try {
          const subRes = await fetch(`/api/subembed?url=${encodeURIComponent(aiData.sourceUrl)}`).then((r) => r.json());
          if (subRes.success && subRes.subEmbed) {
            detectedSub = subRes.subEmbed;
            if (subRes.videoUrl && !detectedVid) detectedVid = subRes.videoUrl;
          }
        } catch {
          // ignore subembed resolution error
        }
      }

      setFormData((prev) => ({
        ...prev,
        title: aiData.title || prev.title,
        description: aiData.description || prev.description,
        tags: aiData.tags || prev.tags,
        platform: aiData.platform || prev.platform,
        duration: aiData.duration || prev.duration,
        creator: aiData.creator || prev.creator,
        personalNotes: aiData.personalNotes || prev.personalNotes,
        channel: aiData.channel || prev.channel,
        videoUrl: detectedVid || prev.videoUrl,
        subEmbed: detectedSub || prev.subEmbed,
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

    if (destinationMode === "custom") {
      if (!webhookUrl.trim()) {
        alert("Please enter your Discord Webhook URL to send to your channel.");
        return;
      }
      const isValidWebhook = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
        webhookUrl.trim()
      );
      if (!isValidWebhook) {
        alert("Please enter a valid Discord Webhook URL (format: https://discord.com/api/webhooks/{id}/{token})");
        return;
      }
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
          webhookUrl: destinationMode === "custom" && webhookUrl.trim() ? webhookUrl.trim() : undefined,
        }),
      });

      let json: { success?: boolean; error?: string; message?: string } | null = null;
      try {
        json = await res.json();
      } catch {
        // Not valid JSON
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("Attached images exceed upload limits. Please remove or link large files via URL.");
        }
        throw new Error(json?.error || `Server returned ${res.status}: ${res.statusText || "Request failed"}`);
      }

      const dest = destinationMode === "custom" ? "your Discord channel" : `#❋・recs in ${recipientName}'s Space`;
      setStatusMessage({
        type: "success",
        text: `✨ Recommendation successfully posted to ${dest}! 🌸`,
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
        videoUrl: "",
        subEmbed: undefined,
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
              ◜― ✿ {recipientName}&apos;s Space ✿
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200/60 shadow-xs transition"
            title="Admin Login"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header / Recommendation Notice Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4.5 sm:px-5 py-3.5 rounded-2xl bg-white/80 border border-pink-100/80 shadow-xs backdrop-blur-xs text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">💌</span>
            <p className="leading-relaxed">
              Send your recommendations to{" "}
              <strong className="font-semibold text-slate-800">{recipientName}</strong>, directly on {recipientPronoun} Discord rec channel.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <a
              href="https://discord.com/oauth2/authorize?client_id=1557445475685113886"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-pink-700 transition"
              title="Add Jasmine Bot to your server or account"
            >
              <span>+ Add to Discord 🌸</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition"
              title="Fork this repository on GitHub"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Fork</span>
            </a>
          </div>
        </div>

        {/* 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
            {/* Top Destination Selector Tabs */}
            <div className="space-y-3">
              <div className="flex p-1 bg-pink-100/60 rounded-2xl border border-pink-200/60">
                <button
                  type="button"
                  onClick={() => setDestinationMode("jizelle")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    destinationMode === "jizelle"
                      ? "bg-white text-slate-800 shadow-xs border border-pink-100/80"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  }`}
                >
                  <span>💌</span>
                  <span>Send Rec to {recipientName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDestinationMode("custom")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    destinationMode === "custom"
                      ? "bg-white text-pink-700 shadow-xs border border-pink-200/80"
                      : "text-slate-500 hover:text-pink-600 hover:bg-white/40"
                  }`}
                >
                  <span>🌸</span>
                  <span>Send Rec to My Custom Webhook</span>
                </button>
              </div>

              {/* Custom Webhook Destination Panel (Active when 'custom' tab is selected) */}
              {destinationMode === "custom" && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 via-white to-rose-50/40 border border-pink-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🌸</span>
                      <span>Your Discord Channel Webhook URL</span>
                      <span className="text-[10px] text-rose-500 font-normal">*required</span>
                    </label>
                    {webhookUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setWebhookUrl("");
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("jasmine_webhook_url");
                          }
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-medium transition"
                      >
                        Clear URL
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={webhookUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWebhookUrl(val);
                        if (typeof window !== "undefined") {
                          if (val) {
                            localStorage.setItem("jasmine_webhook_url", val);
                          } else {
                            localStorage.removeItem("jasmine_webhook_url");
                          }
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 transition ${
                        webhookUrl &&
                        !/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
                          webhookUrl.trim()
                        )
                          ? "border-rose-300 text-rose-700"
                          : "border-pink-200 text-slate-700"
                      }`}
                    />
                    {webhookUrl &&
                      /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
                        webhookUrl.trim()
                      ) && (
                        <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                  </div>

                  {webhookUrl &&
                    !/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
                      webhookUrl.trim()
                    ) && (
                      <p className="text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Must be a valid Discord Webhook URL starting with https://discord.com/api/webhooks/...
                      </p>
                    )}

                  {/* Short & Simple Webhook Mini-Guide */}
                  <div className="p-3 rounded-xl bg-white/90 border border-pink-100/90 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                    <p className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                      <span>💡</span>
                      <span>How to get your Webhook URL (3 quick steps):</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-500">
                      <li>In Discord, right-click your channel → <strong>Edit Channel ⚙️</strong></li>
                      <li>Go to <strong>Integrations → Webhooks → New Webhook</strong></li>
                      <li>Click <strong>Copy Webhook URL</strong> and paste it above!</li>
                    </ol>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      🔒 <strong>Permissions:</strong> Standard <em>Send Messages</em> and <em>Embed Links</em> permissions are all that&apos;s needed (enabled by default for webhooks).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Category Selection */}
            <div>
              <div className="mb-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Category
                </label>
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

              {/* Field 3: Channel / Source & Video */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Field 3 (Channel / Source &amp; Video)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Channel / Source thread
                    </label>
                    <input
                      type="text"
                      placeholder="@rafiqahakhdar on TikTok, Twitter thread, Shopee..."
                      value={formData.channel || ""}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Playable Video URL (mp4, YouTube, clip)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... (plays inline in Discord)"
                      value={formData.videoUrl || ""}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recommender / Source (Footer)
                </label>

                {formData.source && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, source: "" }))}
                    className="text-[11px] text-slate-400 hover:text-slate-600 px-1 py-0.5 transition"
                    title="Clear source"
                  >
                    Clear
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Your name or Discord handle (leave blank for Anonymous)"
                value={formData.source}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, source: val });
                  if (typeof window !== "undefined") {
                    localStorage.setItem("jasmine_recommender", val);
                  }
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your name will appear as &ldquo;Rec by {formData.source?.trim() || "Anonymous"}&rdquo; in the Discord embed footer.
              </p>
            </div>

            {/* Post to Discord Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {destinationMode === "custom" ? (
                  <>Destination: <strong className="text-pink-600">Your Discord Channel Webhook</strong></>
                ) : (
                  <>Destination: <strong className="text-slate-600">#❋・recs in {recipientName}&apos;s Space</strong></>
                )}
              </span>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitRec}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-500 via-rose-400 to-sky-400 hover:from-pink-600 hover:to-sky-500 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting to Discord...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {destinationMode === "custom"
                        ? "Send Rec to My Discord 🌸"
                        : `Send Rec to ${recipientName} 💌`}
                    </span>
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
                <span>Live Discord Webhook</span>
              </p>
              <p className="leading-relaxed">
                {destinationMode === "custom" ? (
                  <>Recommendations submitted will be sent directly to <strong>your Discord channel</strong> using your custom webhook!</>
                ) : (
                  <>Recommendations submitted will be posted directly to <strong>#❋・recs</strong> in {recipientName}&apos;s Space!</>
                )}
              </p>
            </div>

            {/* Universal Bot Install Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 via-white to-sky-50/60 border border-pink-100/90 shadow-xs text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🌸</span>
                  <span>Add Jasmine to Your Discord</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-600 bg-pink-100/70 px-2 py-0.5 rounded-full">
                  Slash /rec
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Install Jasmine to your Discord server or user profile to share aesthetic recommendations anywhere with <code className="bg-pink-100/60 text-pink-700 px-1 py-0.5 rounded">/rec</code>!
              </p>
              <a
                href="https://discord.com/oauth2/authorize?client_id=1557445475685113886"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-2xs hover:shadow-xs transition"
              >
                <span>Add Jasmine (Universal Invite Link)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
}
