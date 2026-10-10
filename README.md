# ୨୧ Jasmine ┆ Discord Recommendation Studio 🌸🧋

> **An aesthetic community curation studio for Discord. Create, format, and share recommendations for Anime, Manga, Novels, Movies, Games, and Cafés through pastel Discord embeds with AI-assisted drafting.**

> 🍡 **Palette & Mood**: Baby pink (`#fce7f3`), Ayato pastel blue (`#c0c8ff`), Milktea boba (`#ffd2af`), Dango mochi (`#9cf8b5`), and Sakura blossoms 🌸

> 💭 *this has been a project ive been wanting to make since college*

[![Add Jasmine to Discord](https://img.shields.io/badge/Discord-Add%20Jasmine%20🌸-f472b6?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1557445475685113886)
[![Web Portal](https://img.shields.io/badge/Web_Portal-rec.jizellecasia.site-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://rec.jizellecasia.site)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌸 Quick Links

- 🌐 **Live Web Studio**: [rec.jizellecasia.site](https://rec.jizellecasia.site)
- 🌸 **Add Jasmine to Discord**: [Universal Bot Invite Link](https://discord.com/oauth2/authorize?client_id=1557445475685113886)
  - **Guild Install**: Add Jasmine to your Discord server channels.
  - **User Install**: Add Jasmine to your personal Discord account to use `/rec` anywhere.

---

## ✨ Features

- 🌸 **Dual Curation Modes**:
  - **Web Studio**: Live side-by-side Discord embed preview, drag-and-drop mosaic gallery (up to 9 images), and 1:1 square canvas icon cropper.
  - **In-Discord Bot (`/rec`)**: Fast slash command with up to 4 image attachments + URLs, routing embeds to whatever channel it's called in.
- 🤖 **AI-Assisted Drafting**: One-click metadata generation (synopsis, tags, platforms, creators) powered by your reverse proxy or OpenAI-compatible endpoint.
- 🍡 **Dynamic Categories**: Fully customizable categories with built-in flower icons (`/movie.png`, `/anime.png`, `/manga.png`, etc.) synced across devices via Upstash Redis.
- 👑 **Google SSO Admin Portal**: Isolated `/admin` dashboard protected by Google OAuth with cryptographic HMAC session tokens.
- ⚙️ **Custom Webhook Destination**: Public visitors can optionally send recommendations to their own server's webhook, backed by strict URL validation and permission checks.
- 🤍 **100% Free Hosting ($0/mo)**: Runs completely serverless on Vercel Hobby + Upstash Redis free tier. Zero background worker required for slash commands or webhooks.

---

## 💬 In-Discord Usage

Use the `/rec` slash command anywhere Jasmine is installed:

```
/rec title: [Required] category: [Required] description: [Optional] notes: [Optional] image: [Upload] ...
```

- **Required Fields**: `title` and `category` (with live autocomplete choices like `🌸 Anime`, `🎬 Movies`, `🍃 Others`).
- **Optional Fields**: `description` (synopsis), `notes` (quote), `tags`, `platform`, `duration`, `creator`, and up to 4 direct image attachments (`image`, `image_2`, `image_3`, `image_4`).
- **Message Context Menu**: Right-click any message in Discord &rarr; `Apps` &rarr; `Turn into Rec` to convert chat messages into recommendation cards.

---

## Quick Start (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/jijishub/discord-rec-bot.git
cd discord-rec-bot
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Key variables to fill in:
```env
# Discord Server & Webhook
DISCORD_GUILD_ID=your_guild_id
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Discord Application (from https://discord.com/developers/applications)
DISCORD_APPLICATION_ID=your_application_id
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_BOT_TOKEN=your_bot_token

# AI Reverse Proxy (Optional)
AI_API_BASE_URL=https://your-ai-endpoint.example/v1
AI_API_KEY=your_key_here
AI_DEFAULT_MODEL=gpt-5.6-luna

# Upstash Redis (Optional - for cross-device cloud persistence)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Admin Portal (Google SSO)
ADMIN_EMAIL=your_email@gmail.com
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 3. Register Slash Commands
```bash
npm run register-commands
```
Registers `/rec` and the `Turn into Rec` context menu globally and to your primary guild.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✧ Free Deployment to Vercel

1. **Deploy to Vercel**: Import this repository to [Vercel](https://vercel.com) and add your environment variables from `.env.local`.
2. **Set Interactions Endpoint**:
   - In the [Discord Developer Portal](https://discord.com/developers/applications) &rarr; your application &rarr; **General Information**.
   - Set **Interactions Endpoint URL** to:
     `https://your-domain.vercel.app/api/interactions`
3. *(Optional)* **Custom Domain**: Connect your domain (e.g. `rec.yourdomain.com`) in Vercel Project Settings &rarr; **Domains**.

---

## 🧋 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | **Next.js 15 (App Router) & React 19** | Full-stack serverless UI & API routes |
| **Styling** | **Tailwind CSS** | Soft pastel theme, responsive cards, glassmorphic modals |
| **Database** | **Upstash Redis (REST)** | Serverless cloud persistence for categories & persona |
| **Security** | **Google OAuth SSO & discord-interactions** | Admin dashboard security & Ed25519 signature verification |
| **AI Curator** | **OpenAI-Compatible Proxy** | AI auto-fill (`gpt-5.6-luna`, Gemini Pro, etc.) |
| **Deployment** | **Vercel & Cloudflare** | Free serverless edge deployment with custom SSL |

---

## ୨୧ License

MIT License. Designed with care for aesthetic Discord curation 🌸🧋🍡
