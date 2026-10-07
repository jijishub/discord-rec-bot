# ୨୧ Jasmine ┆ Discord Recommendation Studio & Gateway 🌸🧋

> 🍡 **Aesthetic Japanese Café & Milktea Curator for Discord**  
> 🎐 **Palette & Mood**: Baby pink (`#fce7f3`), Ayato pastel blue (`#c0c8ff`), Milktea boba (`#ffd2af`), Dango mochi (`#9cf8b5`), and Sakura blossoms 🌸

---

## 🍡 Introduction

**Jasmine 🌸** is a lightweight, aesthetic recommendation studio designed for Discord communities. It pairs a self-hosted web curation studio with Discord webhooks and slash commands, letting you curate, organize, and publish beautiful recommendations for Anime, Manga, Novels, Movies, Games, Cafés, and more.

### 🍵 The Two Halves of Jasmine:
1. **The Web Studio (`rec.jizellecasia.site`)**:
   - A clean pastel desktop/mobile interface to create recommendations.
   - Live side-by-side Discord embed preview card.
   - Built-in 1:1 square canvas image cropper for custom flower icons and badges.
   - Multi-image drag-and-drop mosaic gallery support (up to 9 images).
   - AI Assistant auto-fill powered by your reverse proxy (`gpt-5.6-luna`, Gemini Pro).
   - Dynamic category manager with cross-device cloud persistence via Upstash Redis.
2. **The In-Discord Bot (`Jasmine#6656`)**:
   - Direct Discord slash command (`/rec`) to post recommendations from inside Discord.
   - Right-click message context menu (`Apps -> Turn into Rec`) to instantly convert any message or photo in chat into an aesthetic recommendation embed in `#✻・recs`.
   - Lightweight 24/7 gateway worker to display a permanent green **🟢 Online** status.

---

## 🌸 Key Features

- 🍡 **Dynamic Categories & 1:1 Icon Uploads**:
  - Add, edit, or customize any category (name, emoji, border accent color, thumbnail icon) directly in the web UI.
  - No hardcoding: update categories and flower icons anytime without redeploying code.
  - Automatically syncs to Upstash Redis across all devices.

- 🧋 **Multi-Image Mosaic Galleries**:
  - Drag-and-drop or link up to 9 images per recommendation.
  - Automatically formatted into a Discord media mosaic gallery.

- 🎐 **Live Discord Dark Mode Preview**:
  - Real-time side-by-side preview reproducing your server's exact Discord embed layout (category header, title, synopsis, blockquote personal notes, 2-column inline metadata, top-right category icon, and custom footer).

- 🍵 **Category-Aware AI Auto-Fill**:
  - Connects to your reverse proxy (`https://your-ai-endpoint.example/v1`, supporting `gpt-5.6-luna`, `gemini-1.5-pro`, etc.).
  - Reads the active category to provide format-specific details (e.g. distinguishing an anime adaptation from its original manga publication).
  - Auto-expanding instruction box that smoothly adapts to multi-line input.

- 🤍 **100% Serverless on Vercel**:
  - Zero always-on server costs. Runs on-demand via Vercel Serverless Functions.
  - Deployable under a custom domain via Cloudflare DNS.

- 🎀 **In-Discord Slash Commands & Context Menu**:
  - Serverless Discord Interactions endpoint (`/api/interactions`) supporting `/rec` slash commands and right-click message context menu (`Apps -> Turn into Rec`).

---

## ✿ Category & Icon Customization

Customize categories and flower icons directly from the web interface:
1. Open your web studio.
2. Click **Categories & Icons 🎨** in the top navigation.
3. You can:
   - Add new categories with custom emojis and accent colors.
   - Upload 1:1 square flower icons (automatically cropped and previewed).
   - Export and import JSON backups.
   - Changes automatically sync across devices when Upstash Redis is connected.

---

## ✻ Quick Setup & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/discord-rec-bot.git
cd discord-rec-bot
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Discord Server Details
DISCORD_GUILD_ID=your_guild_id
DISCORD_RECS_CHANNEL_ID=your_recs_channel_id

# Discord Webhook (Channel: ✻・recs)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token

# Discord Application Credentials (https://discord.com/developers/applications)
DISCORD_APPLICATION_ID=your_application_id
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_BOT_TOKEN=your_bot_token

# Web Portal Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Bot Persona Defaults
BOT_USERNAME="Jasmine 🌸"
BOT_AVATAR_URL="/maomao.png"
BOT_FOOTER="Rec by {source}"

# AI Configuration (Optional OpenAI-compatible Reverse Proxy)
AI_API_BASE_URL=https://your-ai-endpoint.example/v1
AI_API_KEY=your_api_key_here
AI_DEFAULT_MODEL=gpt-5.6-luna

# Upstash Redis (Optional - for cross-device cloud persistence)
UPSTASH_REDIS_REST_URL=https://your-upstash-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ❀ Registering Discord Commands

To register the `/rec` slash command and `Turn into Rec` context menu in your Discord server:

```bash
npm run register-commands
```
This registers the commands specifically to your server (`DISCORD_GUILD_ID`) instantly without the 1-hour delay of global commands.

---

## ✦ Keeping Jasmine Online 24/7 (Gateway Worker)

### Why is Jasmine marked as "Offline" by default?
- The web studio and Discord commands run **100% Serverless on Vercel** via Discord's modern **HTTP Interactions Endpoint**.
- Serverless functions execute instantly when called, without keeping an idle background connection open.
- The green "Online" circle in Discord's server member sidebar is controlled by an active **Gateway WebSocket connection** (`wss://gateway.discord.gg`).
- Slash commands and webhooks work completely even when the bot appears offline.

### How to show Jasmine as "Online":
If you'd like Jasmine to display the green "Online" dot and custom activity status (`Watching ✻・recs`):
```bash
npm run bot
```
*(You can also host `gateway-standalone/bot.js` alongside `your-ai-endpoint.example` on Google Cloud or any 24/7 background worker. See [JASMINE.md](./JASMINE.md) for step-by-step instructions).*

> 💡 **Phase 2 Note (Always-On VM)**: In Phase 2, we will look into moving Jasmine's standalone gateway worker from bare-metal Google Cloud to a dedicated lightweight Cloud VM so that the green 🟢 Online indicator is always on. Note that this is purely an aesthetic quality-of-life (QOL) visual touch and is not strictly necessary—Jasmine functions completely and dispatches all recommendations without the green circle!

---

## ✧ Deploying to Vercel & Custom Domain

1. **Deploy to Vercel**:
   - Push this repository to GitHub.
   - In [Vercel](https://vercel.com), import the repository.
   - Add your environment variables from `.env.local`.
   - Click **Deploy**.

2. **Connect Custom Domain**:
   - In Vercel Project Settings &rarr; **Domains**, add your domain (e.g. `rec.yourdomain.com`).
   - In Cloudflare DNS, add a `CNAME` record pointing `rec` to `cname.vercel-dns.com` (DNS only / SSL Full).

3. **Configure Discord Interactions Endpoint**:
   - In the [Discord Developer Portal](https://discord.com/developers/applications) &rarr; your application &rarr; **General Information**.
   - Set **Interactions Endpoint URL** to:
     `https://your-domain.com/api/interactions`

---

## 🍧 Project Roadmap

- 🌸 **Phase 1 (Current & Production-Ready)**:
  - Full-stack Web Studio deployed on Vercel (`rec.jizellecasia.site`).
  - Serverless Discord slash commands (`/rec`) and message context menu (`Apps -> Turn into Rec`) via HTTP Interactions endpoint.
  - Category-aware AI recommendation auto-fill via reverse proxy (`your-ai-endpoint.example`).
  - Upstash Redis cloud persistence for custom 1:1 flower icons, categories, and bot persona.
  - Multi-image mosaic gallery embeds (up to 9 images per recommendation).

- 🍡 **Phase 2 (Planned QOL & Infrastructure)**:
  - **Bare Metal to Cloud VM Migration**: Migrate the standalone gateway background worker (`gateway-standalone/`) from bare-metal Google Cloud to a dedicated cloud VM so Jasmine's green 🟢 Online presence status stays permanently active 24/7 in the server member list. *(Aesthetic QOL only—all webhook dispatches, web studio curation, and slash commands continue to work seamlessly without the green circle).*
  - **Interactive Community Reactions**: Explore Discord button interactions for community bookmarking and reaction threads.

---

## 🧋 Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend Framework** | **Next.js 15 (App Router)** | Modern React server & client components with streaming |
| **UI Library** | **React 19 & Tailwind CSS** | Soft pastel theme, responsive grid, glassmorphic modals |
| **Icons & Symbols** | **Lucide Icons & Coolsymbols** | Clean UI icons paired with Japanese dango / sakura typography |
| **Image Processing** | **HTML5 Canvas API** | 1:1 square auto-centering cropper with client-side compression |
| **Cloud Database** | **Upstash Redis (REST)** | Serverless key-value persistence for categories, icons & persona |
| **Local Cache** | **Browser localStorage** | Zero-flicker instant offline state fallback |
| **Security & Auth** | **discord-interactions** | Ed25519 cryptographic signature verification for HTTP commands |
| **Bot Gateway** | **Node.js Native WebSocket** | Zero-dependency 24/7 background worker for Discord Presence |
| **AI Curator** | **OpenAI-Compatible Proxy** | Reverse proxy endpoint (`gpt-5.6-luna`, `gemini-1.5-pro`, etc.) |
| **Hosting & DNS** | **Vercel & Cloudflare** | Free serverless edge deployment with custom CNAME SSL |

---

## ✿ System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          🌐 Cloudflare DNS & SSL            │
                       │           rec.jizellecasia.site              │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │             ☁️ Vercel Serverless Platform                   │
               │                                                             │
               │  ┌───────────────────────┐   ┌───────────────────────────┐  │
               │  │  🌸 Web Studio UI     │   │  ⚡ Route Handlers (API)  │  │
               │  │  Next.js 15 App Router│◄──┤  • /api/webhook/send      │  │
               │  │  React 19 + Tailwind  │   │  • /api/interactions      │  │
               │  │  1:1 Canvas Cropper   │   │  • /api/categories        │  │
               │  │  Live Embed Preview   │   │  • /api/persona           │  │
               │  └───────────────────────┘   │  • /api/ai/enhance        │  │
               │                              └───────┬───────────┬───────┘  │
               └──────────────────────────────────────┼───────────┼──────────┘
                                                      │           │
                     ┌────────────────────────────────┘           └────────────────────────────────┐
                     ▼                                                                             ▼
      ┌─────────────────────────────┐                                               ┌─────────────────────────────┐
      │   🍵 Upstash Redis Cloud    │                                               │   🌸 AI Reverse Proxy       │
      │   Zero-latency serverless   │                                               │   your-ai-endpoint.example/v1  │
      │   sync for categories, 1:1  │                                               │   gpt-5.6-luna, Gemini Pro  │
      │   icons, and bot persona    │                                               │   Category-aware curation   │
      └─────────────────────────────┘                                               └─────────────────────────────┘
                     ▲
                     │
                     ▼
      ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
      │                                            💬 Discord Platform                                            │
      │                                                                                                           │
      │   1. Webhook Dispatch ───────────────► Embeds + Multipart Images uploaded to cdn.discordapp.com           │
      │   2. HTTP Slash Commands (/rec) ─────► Verified via Ed25519 (TweetNaCl) without Gateway overhead          │
      │   3. 24/7 Gateway Presence Worker ───► Connected via wss://gateway.discord.gg (Google Cloud Host)         │
      │                                        Displays 🟢 Online & "Watching ✻・recs" in Member Sidebar          │
      └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ୨୧ License

MIT License. Designed with care for aesthetic Discord curation 🌸🧋🍡
