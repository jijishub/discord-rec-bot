"use client";

import React, { useState, useRef } from "react";
import { Category } from "@/types";
import { X, Plus, Trash2, Edit2, RotateCcw, Download, Upload, UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategories: (updated: Category[]) => void;
  onResetCategories: () => void;
}

const PASTEL_PRESETS = [
  "#7983d4", // Ayato Blue
  "#f472b6", // Baby Pink
  "#f59e0b", // Daisy Cream Amber
  "#34d399", // Mint Green
  "#c084fc", // Lavender
  "#38bdf8", // Sky Cyan
  "#fb923c", // Warm Peach
  "#60a5fa", // Soft Azure
  "#a3e635", // Sage Leaf
  "#e879f9", // Blossom Fuchsia
];

export default function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  onResetCategories,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌸");
  const [color, setColor] = useState("#7983d4");
  const [iconUrl, setIconUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingId("new");
    setName("");
    setEmoji("🌸");
    setColor("#f472b6");
    setIconUrl("");
    setUploadError(null);
    setUploadNotice(null);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setEmoji(cat.emoji || "🌸");
    setColor(cat.color);
    setIconUrl(cat.iconUrl || "");
    setUploadError(null);
    setUploadNotice(null);
  };

  // Process 1:1 image upload with HTML5 Canvas auto-crop & ratio check
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadNotice(null);

    // Limit file size (max 1.5MB for fast localStorage)
    if (file.size > 1.5 * 1024 * 1024) {
      setUploadError("Image is too large. Please select an icon under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // Auto-center-crop to exact 1:1 square canvas (256x256 max)
        const canvas = document.createElement("canvas");
        const targetSize = Math.min(Math.max(width, height), 256);
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setUploadError("Could not process image on canvas.");
          return;
        }

        // Calculate 1:1 square center crop coordinates
        const minDim = Math.min(width, height);
        const sx = (width - minDim) / 2;
        const sy = (height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        const squareBase64 = canvas.toDataURL("image/png");
        setIconUrl(squareBase64);

        if (width === height) {
          setUploadNotice(`✨ Perfect 1:1 square icon (${width}x${height}px) uploaded!`);
        } else {
          setUploadNotice(`✨ Auto-cropped to 1:1 square (${targetSize}x${targetSize}px) without distortion!`);
        }
      };
      img.onerror = () => {
        setUploadError("Invalid image file format.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId === "new") {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: name.trim(),
        emoji: emoji.trim() || "🌸",
        color: color.trim() || "#7983d4",
        iconUrl: iconUrl.trim() || undefined,
      };
      onSaveCategories([...categories, newCat]);
    } else {
      const updated = categories.map((cat) =>
        cat.id === editingId
          ? {
              ...cat,
              name: name.trim(),
              emoji: emoji.trim() || "🌸",
              color: color.trim() || "#7983d4",
              iconUrl: iconUrl.trim() || undefined,
            }
          : cat
      );
      onSaveCategories(updated);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (categories.length <= 1) {
      alert("You must keep at least one category.");
      return;
    }
    if (confirm("Are you sure you want to delete this category?")) {
      onSaveCategories(categories.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "jasmine-categories.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onSaveCategories(parsed);
          alert("Categories successfully imported! 🌸");
        } else {
          alert("Invalid categories JSON format.");
        }
      } catch (err) {
        alert("Could not parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 via-white to-sky-50">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Customize Categories &amp; 1:1 Icons</h2>
              <p className="text-xs text-slate-500">
                Upload your custom 1:1 flower icons &amp; badges without hardcoding
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add / Edit Form */}
          {editingId ? (
            <form
              onSubmit={handleSaveItem}
              className="p-5 rounded-2xl bg-pink-50/50 border border-pink-200/80 space-y-4"
            >
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <span>{editingId === "new" ? "✨ Add New Category" : "✏️ Edit Category"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Movie, Novel, Anime, K-Drama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                  />
                </div>

                {/* Border Color */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Embed Accent Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-pink-200 p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-24 px-3 py-2 text-xs font-mono rounded-xl border border-pink-200 bg-white"
                    />
                    <div className="flex gap-1 flex-1 flex-wrap">
                      {PASTEL_PRESETS.slice(0, 6).map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setColor(c)}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-full border border-white shadow-xs hover:scale-110 transition"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 1:1 Badge Icon Upload */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700">
                      1:1 Square Badge Icon / Flower Image
                    </label>
                    <span className="text-[11px] text-pink-600 font-medium">
                      Exact 1:1 Aspect Ratio Limit
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-white border border-pink-200">
                    {/* Live 1:1 Icon Preview */}
                    <div className="relative w-14 h-14 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt="1:1 Icon"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">{emoji || "🌸"}</span>
                      )}
                    </div>

                    {/* Upload button & URL fallback */}
                    <div className="flex-1 space-y-1.5 w-full">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-100 hover:bg-pink-200 text-pink-700 transition"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload 1:1 Icon (PNG/JPG)</span>
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                        {iconUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setIconUrl("");
                              setUploadNotice(null);
                            }}
                            className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <input
                        type="url"
                        placeholder="Or paste direct image URL (https://...)"
                        value={iconUrl.startsWith("data:") ? "" : iconUrl}
                        onChange={(e) => setIconUrl(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-300 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {uploadNotice && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      {uploadNotice}
                    </p>
                  )}
                  {uploadError && (
                    <p className="text-xs text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 hover:bg-slate-200/60 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm transition"
                >
                  Save Category 🌸
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">
                {categories.length} Categories configured
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>
          )}

          {/* Categories List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-pink-200 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs border overflow-hidden p-1 bg-white"
                    style={{ borderColor: cat.color }}
                  >
                    {cat.iconUrl ? (
                      <img
                        src={cat.iconUrl}
                        alt={cat.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-lg">{cat.emoji}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-800">{cat.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: cat.color }}
                        title={cat.color}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                      {cat.iconUrl ? "1:1 Custom Icon" : "Emoji fallback"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              <Download className="w-3 h-3" /> Backup JSON
            </button>
            <label className="flex items-center gap-1 text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
              <Upload className="w-3 h-3" /> Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <button
            onClick={() => {
              if (confirm("Reset categories to default presets?")) {
                onResetCategories();
              }
            }}
            className="flex items-center gap-1 text-rose-500 hover:text-rose-700 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
