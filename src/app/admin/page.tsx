"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Category, RecFormData, BotPersona } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from "@/lib/categories";
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
  LogOut,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

export default function AdminPage() {
  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name?: string; picture?: string } | null>(null);
  const [hasGoogleOauth, setHasGoogleOauth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Categories & Persona state
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCatId, setSelectedCatId] = useState<string>("movies");
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
    recipientName?: string;
  } | null>(null);

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Admin Rec Form State (Defaults to Admin/Jizelle)
  const [formData, setFormData] = useState<RecFormData>({
    categoryId: "movies",
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

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiCustomInstruction, setAiCustomInstruction] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check auth status on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(!!data.isAuthenticated);
        if (data.user) setAdminUser(data.user);
        if (typeof data.hasGoogleOauth === "boolean") setHasGoogleOauth(data.hasGoogleOauth);
      })
      .catch((e) => console.error("Auth check failed:", e))
      .finally(() => setAuthLoading(false));

    // Check for query error parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err === "unauthorized_email") {
        setLoginError("Access Denied: Your Google account is not authorized as an admin.");
      } else if (err === "missing_google_credentials") {
        setLoginError("Google OAuth credentials are not configured in Vercel yet.");
      } else if (err) {
        setLoginError(`Authentication error: ${err}`);
      }
    }
  }, []);

  // Fetch server config, categories, and persona once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch("/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        setServerConfig(cfg);
        if (cfg?.defaultModel) {
          setAiSettings((prev) => ({ ...prev, model: prev.model || cfg.defaultModel }));
        }
        if (cfg?.defaultPersona && !cfg?.hasRedis) {
          setPersona(cfg.defaultPersona);
        }
      })
      .catch((e) => console.error("Could not fetch server config", e));

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          setSelectedCatId(data.categories[0].id);
        }
      })
      .catch((e) => console.error("Could not fetch categories", e));

    fetch("/api/persona")
      .then((res) => res.json())
      .then((data) => {
        if (data?.persona) {
          setPersona(data.persona);
        }
      })
      .catch((e) => console.error("Could not fetch persona", e));
  }, [isAuthenticated]);

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Save changes to categories (Protected)
  const handleSaveCategories = async (updated: Category[]) => {
    setCategories(updated);
    if (!updated.some((c) => c.id === selectedCatId)) {
      setSelectedCatId(updated[0]?.id || "");
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updated }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save categories");
      }
    } catch (e) {
      console.error("Could not sync categories to cloud", e);
    }
  };

  const handleResetCategories = async () => {
    setCategories(DEFAULT_CATEGORIES);
    setSelectedCatId(DEFAULT_CATEGORIES[0].id);
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: DEFAULT_CATEGORIES }),
      });
    } catch (e) {
      console.error("Could not reset categories in cloud", e);
    }
  };

  const handleSavePersona = async (updated: BotPersona) => {
    setPersona(updated);
    try {
      await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: updated }),
      });
    } catch (e) {
      console.error("Could not sync persona to cloud", e);
    }
  };

  const activeCategory =
    categories.find((c) => c.id === selectedCatId) || categories[0] || DEFAULT_CATEGORIES[0];

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

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 9 - formData.images.length;
    if (remainingSlots <= 0) {
      alert("You have reached the maximum limit of 9 images.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          setFormData((prev) => {
            if (prev.images.length >= 9) return prev;
            return {
              ...prev,
              images: [...prev.images, base64Url],
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleTriggerAiEnhance = async () => {
    if (!formData.title.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter a title or work name before running AI Auto-fill.",
      });
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
          categoryName: activeCategory.name,
          customInstruction: aiCustomInstruction,
          apiConfig: aiSettings.baseUrl ? aiSettings : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate recommendation");
      }

      const rec = data.recommendation;
      setFormData((prev) => ({
        ...prev,
        title: rec.title || prev.title,
        description: rec.description || prev.description,
        personalNotes: prev.personalNotes || rec.personalNotes || "",
        tags: rec.tags || prev.tags,
        platform: rec.platform || prev.platform,
        duration: rec.duration || prev.duration,
        creator: rec.creator || prev.creator,
      }));

      setStatusMessage({
        type: "success",
        text: `✨ Successfully auto-filled details for "${rec.title}"!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: `AI Assistant Error: ${msg}`,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitRec = async () => {
    if (!formData.title.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide a title for the recommendation.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/webhook/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: {
            ...formData,
            categoryId: activeCategory.id,
          },
          category: activeCategory,
          persona: persona,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to post recommendation to Discord");
      }

      setStatusMessage({
        type: "success",
        text: `🌸 Successfully posted "${formData.title}" to #❋・recs!`,
      });

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

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
          <p className="text-xs text-slate-500">Checking admin session...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (If not authenticated)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf8f9] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-pink-100/80 space-y-6">
          <div className="text-center space-y-1.5">
            <span className="text-3xl animate-pulse inline-block">🌸</span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Jasmine ┆ Admin Portal
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sign in with your authorized admin account to manage categories, flower icons, and Discord configs.
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-snug">{loginError}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <div>
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition transform hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </a>
          </div>

          <div className="pt-2 text-center border-t border-slate-100">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-600 transition inline-flex items-center gap-1"
            >
              ← Back to Public Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN STUDIO
  return (
    <div className="min-h-screen bg-[#faf8f9] text-slate-800 flex flex-col font-sans">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-pink-100/80 shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl animate-pulse">🌸</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">
                Jasmine <span className="text-pink-500 font-normal">┆ Admin Studio</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                👑 Admin Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Logged in as {adminUser?.name || "Jizelle"} ({adminUser?.email || "Admin"})
            </p>
          </div>
        </div>

        {/* Admin Action Buttons */}
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

          <Link
            href="/"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            title="View Public Site"
          >
            <span className="hidden sm:inline">Public View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-50 transition"
            title="Log out of Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Admin Status Notice */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 rounded-2xl bg-pink-50/60 border border-pink-200/50 text-xs sm:text-sm text-pink-800">
          <div className="flex items-center gap-2">
            <span>👑</span>
            <p>
              <strong>Admin Mode Active</strong>: Changes made to Categories & Icons are permanently synced to Upstash Cloud and protected from public resets.
            </p>
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition transform hover:scale-102 ${
                          isSelected
                            ? "bg-pink-500 text-white shadow-xs font-semibold"
                            : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                        }`}
                      >
                        {cat.iconUrl ? (
                          <img
                            src={cat.iconUrl}
                            alt=""
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

                  <button
                    type="button"
                    onClick={() => setShowAiHelper(!showAiHelper)}
                    className="text-xs flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>{showAiHelper ? "Hide AI Auto-Fill" : "AI Auto-Fill"}</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="e.g. Witch Hat Atelier, Frieren, Everything Everywhere..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
                />

                {/* AI Assistant Expandable Drawer */}
                {showAiHelper && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 to-sky-50/60 border border-pink-100/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-pink-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Recommendation Curator ({activeCategory.name})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Powered by {aiSettings.model || "gpt-5.6-luna"}
                      </span>
                    </div>

                    <div>
                      <textarea
                        rows={1}
                        placeholder={`Instructions for ${activeCategory.name} (e.g. "Focus on anime adaptation without manga spoilers")...`}
                        value={aiCustomInstruction}
                        onChange={(e) => {
                          setAiCustomInstruction(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                        }}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none transition-[height] overflow-y-auto min-h-[38px] max-h-[180px]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={handleTriggerAiEnhance}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Curating details for {formData.title || "work"}...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Metadata &amp; Synopsis</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Synopsis / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Synopsis / Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Short engaging hook or plot summary..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-y"
                />
              </div>

              {/* 4. Personal Review / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Personal Review / Thoughts
                </label>
                <textarea
                  rows={2}
                  placeholder="Why do you recommend this? Favorite moments, vibe, or quotes..."
                  value={formData.personalNotes}
                  onChange={(e) => setFormData({ ...formData, personalNotes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-y"
                />
              </div>

              {/* 5. Inline Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Field 1 (Tags &amp; Platform)
                  </span>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Genres / Tags
                    </label>
                    <input
                      type="text"
                      placeholder="Fantasy, Sci-Fi, Cozy..."
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Platform / Where to Experience
                    </label>
                    <input
                      type="text"
                      placeholder="Netflix, Steam, Webnovel..."
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                </div>

                <div className="space-y-3">
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

              {/* 6. Multi-Image Attachments */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                    Images / Posters ({formData.images.length}/9)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Multiple images form a Discord mosaic gallery
                  </span>
                </div>

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

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
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

              {/* 7. Recommender / Source (Defaults to Jizelle in Admin mode) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recommender / Source (Footer)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jizelle"
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
                <span className="text-[11px] text-slate-400">Updates in real-time</span>
              </div>

              <DiscordEmbedPreview
                data={formData}
                category={activeCategory}
                persona={persona}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Admin Modals */}
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
        onSaveWebhookUrl={setWebhookUrl}
        aiSettings={aiSettings}
        onSaveAiSettings={setAiSettings}
        serverConfig={serverConfig || undefined}
      />
    </div>
  );
}
