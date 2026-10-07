# ୨୧ Jasmine ┆ Discord Recommendation Studio & Gateway

> ✿ Minimalist pastel recommendation curator for Discord  
> ❀ Aesthetic: Baby pink, Sakura blossoms, and clean typography

---

## ✿ Features

- ✧ **Dynamic Categories & Custom Icons**:
  - Add, edit, or customize any category (name, emoji, border accent color, thumbnail icon) directly in the web UI.
  - No hardcoding: update categories and flower icons anytime without redeploying code.
  - Optional cloud persistence via Upstash Redis or local storage backup.

- ✧ **Multi-Image Mosaic Galleries**:
  - Drag-and-drop or link up to 9 images per recommendation.
  - Automatically formatted into a Discord media mosaic gallery.

- ✧ **Live Discord Dark Mode Preview**:
  - Real-time side-by-side preview reproducing your server's exact Discord embed layout (category header, title, synopsis, blockquote personal notes, 2-column inline metadata, top-right category icon, and custom footer).

- ✧ **AI Auto-Fill & Aesthetic Curator**:
  - Connects to any OpenAI-compatible reverse proxy (e.g. `https://your-ai-endpoint.example/v1`, supporting `gpt-5.6-luna`, `gemini-1.5-pro`, etc.).
  - Reads the active category to provide format-specific details (e.g. distinguishing an anime adaptation from its original manga publication).

- ✧ **100% Serverless on Vercel**:
  - Zero always-on server costs. Runs on-demand via Vercel Serverless Functions.
  - Deployable under a custom domain via Cloudflare DNS.

- ✧ **In-Discord Slash Commands & Context Menu**:
  - Serverless Discord Interactions endpoint (`/api/interactions`) supporting `/rec` slash commands and right-click message context menu (`Apps -> Turn into Rec`).

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

## ✦ Keeping Jasmine Online 24/7 (Gateway)

### Why is Jasmine marked as "Offline" by default?
- Our web studio and Discord commands run **100% Serverless on Vercel** via Discord's modern **HTTP Interactions Endpoint**.
- Serverless functions execute instantly when called, without keeping an idle background connection open.
- The green "Online" dot in Discord's server member sidebar is controlled by an active **Gateway WebSocket connection** (`wss://gateway.discord.gg`).
- Slash commands and webhooks work completely even when the bot appears offline.

### How to show Jasmine as "Online":
If you'd like Jasmine to display the green "Online" dot and custom activity status (`Watching ✻・recs`):
```bash
npm run bot
```
*(You can run this locally or host `scripts/bot-gateway.ts` on any free background worker like Render, Railway, fly.io, or a VPS).*

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

## ୨୧ License

MIT License. Designed with care for aesthetic Discord curation.
