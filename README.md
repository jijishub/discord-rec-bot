# ୨୧ Jasmine ┆ Discord Recommendation Studio 🌸🧋

> **An aesthetic community curation studio for Discord. Create, format, and share recommendations for Anime, Manga, Novels, Movies, Games, and Cafés through pastel Discord embeds with AI-assisted drafting.**

> 🍡 **Palette & Mood**: Baby pink (`#fce7f3`), Ayato pastel blue (`#c0c8ff`), Ayato's milktea boba (`#ffd2af`), Dango mochi (`#9cf8b5`), and Japanese sakura blossoms 🌸🧋

> 💭 *this has been a project ive been wanting to make since college*

[![Add Jasmine to Discord](https://img.shields.io/badge/Discord-Add%20Jasmine%20🌸-f472b6?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1557445475685113886)
[![Web Portal](https://img.shields.io/badge/Web_Portal-rec.jizellecasia.site-c0c8ff?style=for-the-badge&logo=vercel&logoColor=white)](https://rec.jizellecasia.site)
[![License: MIT](https://img.shields.io/badge/License-MIT-fce7f3?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌸 Quick Links

- **Live Web Studio**: [rec.jizellecasia.site](https://rec.jizellecasia.site)
- 🌸 **Add Jasmine to Discord**: [Universal Bot Invite Link](https://discord.com/oauth2/authorize?client_id=1557445475685113886)
  - **Guild Install**: Add Jasmine to your Discord server channels.
  - **User Install**: Add Jasmine to your personal Discord account to use `/rec` anywhere.

---

## ✨ Features

- 🌸 **Dual Curation Modes**:
  - **Web Studio**: Live side-by-side Discord embed preview, drag-and-drop mosaic gallery (up to 9 images), and 1:1 square canvas icon cropper.
  - **In-Discord Bot (`/rec`)**: Fast slash command with up to 4 image attachments + URLs, routing embeds to whatever channel it's called in.
- 🌸 **AI-Assisted Drafting**: Review and complete titles, descriptions, genres, platforms, creators, and other details from notes, links, and screenshots through your OpenAI-compatible endpoint. Your selected category stays locked, and personal notes preserve your own opinion.
- ✧ **Recommendation Lists**: Ask for five anime or another numbered selection. Jasmine puts the full list in **one embed**, with numbered titles and short explanations, and checks the requested count before accepting the response.
- 🧋 **Threads & Links**: Keep recommendation URLs in the description, including multiple links. The first gets a rich preview when available, with a visible source link. A recommended thread is described by its topic rather than replaced with an individual work mentioned inside it.
- 🍡 **Dynamic Categories**: Fully customizable categories with built-in flower icons (`/movie.png`, `/anime.png`, `/manga.png`, etc.) synced across devices via Upstash Redis.
- ୨୧ **Google SSO Admin Portal**: Isolated `/admin` dashboard protected by Google OAuth with cryptographic HMAC session tokens.
- ✧ **Custom Webhook Destination**: Public visitors can optionally send recommendations to their own server's webhook, backed by strict URL validation and permission checks.
- 🤍 **Serverless Hosting**: Slash commands and webhooks run on Vercel without a background worker. Upstash Redis is optional for cloud persistence; hosting and AI costs depend on your providers and usage.

---

## 🌸 In-Discord Usage

Use the `/rec` slash command anywhere Jasmine is installed:

```
/rec category: Anime title: [Optional] ai-instructions: [Optional] description: [Optional] notes: [Optional] image: [Upload] ...
```

- **Required Field**: `category`, selected from the live autocomplete choices.
- **Optional Title**: Supply the item name, or leave it empty for AI to draft from your input. AI also runs when you provide `ai-instructions`.
- **Optional Fields**: `ai-instructions`, `description` (synopsis or recommendation links), `notes` (your personal thoughts, displayed as a quote), `tags`, `platform`, `duration`, `creator`, and `channel` (discovery account or shop).
- **Images & Video**: Up to 4 direct image attachments (`image`, `image_2`, `image_3`, `image_4`), additional links through `image_url`, and a video attachment or `video_url`. Image galleries support up to 9 images.
- **Web Video Upload**: Both the public studio and admin view accept an MP4, WebM or MOV file up to 3 MB, posted as a Discord attachment. Use a video URL for larger clips.
- **Message Context Menu**: Right-click any message in Discord &rarr; `Apps` &rarr; `Turn into Rec` to convert chat messages into recommendation cards.

For a list in one embed:

```text
/rec category: Anime ai-instructions: recommend me 5 anime like The Apothecary Diaries and Black Butler
```

The embed uses a collective title and five numbered entries, each with a short explanation. It avoids assigning one anime's studio or episode count to the whole list. If the AI returns fewer items, Jasmine retries once rather than accepting an incomplete list.

For a thread recommendation:

```text
/rec category: Novel description: https://x.com/account/status/123 ai-instructions: recommend this thread about mystery books; keep the link and describe its topic
```

You can put several URLs in `description`; they stay together there, and only the first receives a preview. A URL alone does not provide the AI with the page contents, so add the topic or supporting text when needed.

---

## Quick Start (Local Setup)

### 1. Clone & Install

```bash
git clone https://github.com/jijishub/discord-rec-bot.git
cd discord-rec-bot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (the command-registration script loads this file, and Next.js also reads it):

```bash
cp .env.example .env
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
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Reverse Proxy (Optional)
AI_API_BASE_URL=https://your-ai-endpoint.example/v1
AI_API_KEY=your_key_here
AI_DEFAULT_MODEL=gpt-5.6-luna
# Optional: comma-separated model IDs to show as quick picks
# Leave empty to discover models from your configured provider's /models endpoint
AI_MODELS=

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

## ✧ Deployment to Vercel

1. **Deploy to Vercel**: Import this repository to [Vercel](https://vercel.com) and add your environment variables from `.env`. Set `NEXT_PUBLIC_APP_URL` to your public domain so Discord can load the flower icons.
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
| **AI Curator** | **OpenAI-Compatible Proxy** | Screenshot and text drafting, single-embed recommendation lists |
| **Deployment** | **Vercel & Cloudflare** | Serverless hosting with a custom domain |

---

## ୨୧ License

MIT License. Designed with care for aesthetic Discord curation 🌸🧋🍡

# Future Pipeline

```
1. End users must be able to modify embed icons and category labels based on their personal aesthetics and preferences. JSON import/export backup.
```
