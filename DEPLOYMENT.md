# 🌸 Jasmine Rec Studio & Discord Bot — Deployment Guide

> Complete, step-by-step deployment guide for **`rec.jizellecasia.site`**, Vercel, Cloudflare, and Discord.  
> Theme: Minimalist pastel baby pink, Ayato pastel blue, and Sakura blossoms 🌸

---

## 📑 Table of Contents
1. [Architecture & "Do We Need a Database?"](#-architecture--do-we-need-a-database)
2. [Prerequisites Checklist](#-prerequisites-checklist)
3. [Step 1: Discord Webhook Setup (`#❋・recs`)](#-step-1-discord-webhook-setup)
4. [Step 2: Discord Developer Application & Bot Token](#-step-2-discord-developer-application--bot-token)
5. [Step 3: Deploying to Vercel (Free Tier)](#-step-3-deploying-to-vercel-free-tier)
6. [Step 4: Configuring Custom Domain on Cloudflare (`rec.jizellecasia.site`)](#-step-4-configuring-custom-domain-on-cloudflare)
7. [Step 5: Linking Discord Interactions & Registering Commands](#-step-5-linking-discord-interactions--registering-commands)
8. [Step 6: Optional AI Reverse Proxy Configuration](#-step-6-optional-ai-reverse-proxy-configuration)
9. [Step 7: Managing Categories & 1:1 Icon Uploads](#-step-7-managing-categories--11-icon-uploads)
10. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 💡 Architecture & "Do We Need a Database?"

### Short Answer: **No, you do NOT need a database.**

Here is why this architecture is 100% database-free, zero-maintenance, and completely free to host:

1. **Discord CDN Hosts Your Images & Icons for Free**:
   - When you upload custom 1:1 category flower icons or up to 9 recommendation images, our serverless API attaches them directly as multipart files (`attachment://...`) to the Discord webhook.
   - Discord receives the files and permanently stores them on `cdn.discordapp.com` at no cost to you.
2. **Browser `localStorage` Stores Your Categories & Persona**:
   - All your custom categories, 1:1 flower icons, embed border colors, and sender settings are stored instantly in your browser's `localStorage`.
   - You can click **Backup JSON** to download a backup file (`jasmine-categories.json`) or **Import JSON** on any device.
3. **Discord Recommendations Channel Is Your Permanent Archive**:
   - The formatted embeds posted to your recommendations channel (e.g. `#✻・recs`) serve as your persistent, searchable database with Discord search, pins, and history.
4. **100% Serverless on Vercel**:
   - No 24/7 server or VPS needed. Vercel spins up only when you post a recommendation or run a Discord slash command, staying well within Vercel's generous free tier forever.

*(Note: If you ever decide in the future that you want automatic real-time category syncing across 5 different computers without clicking "Import JSON", you can optionally attach a free key-value store like Upstash Redis or Vercel KV. But for your personal server, the current zero-DB architecture is the cleanest and fastest.)*

---

## ✻ Prerequisites Checklist

Before beginning, ensure you have:
- [x] A **GitHub** account with this repository pushed.
- [x] A **Vercel** free Hobby account ([vercel.com](https://vercel.com)).
- [x] A **Cloudflare** account (if using a custom domain).
- [x] Access to your Discord Server:
  - **Server (Guild) ID**: Right-click your server icon &rarr; **Copy Server ID**
  - **Recs Channel ID**: Right-click `#✻・recs` &rarr; **Copy Channel ID**

---

## ✿ Step 1: Discord Webhook Setup

1. Open Discord on Desktop or Web.
2. In your Discord server, locate your recommendation channel (e.g. `#✻・recs`).
3. Click the **Gear icon (Edit Channel)** next to the channel.
4. Go to **Integrations** &rarr; **Webhooks** &rarr; click **New Webhook**.
5. Name it **Jasmine 🌸**.
6. Click **Copy Webhook URL**.  
   *It looks like: `https://discord.com/api/webhooks/1234567890/abc-xyz...`*
7. Save this URL securely; this will be your `DISCORD_WEBHOOK_URL`.

---

## 🤖 Step 2: Discord Developer Application & Bot Token

This step enables in-chat slash commands (`/rec`) and message context menus (`Apps -> Turn into Rec`).

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right.
3. Enter Name: **Jasmine** (or your preferred persona name) &rarr; Agree to terms &rarr; **Create**.
4. In the **General Information** tab:
   - Copy **Application ID** (save as `DISCORD_APPLICATION_ID`).
   - Copy **Public Key** (save as `DISCORD_PUBLIC_KEY`).
   - Upload your Jasmine / Ayato profile icon.
5. In the left sidebar, click **Bot**:
   - Click **Reset Token** &rarr; Copy the generated token (save as `DISCORD_BOT_TOKEN`).
   - Under **Privileged Gateway Intents**, keep defaults (no special gateway intents needed because we use serverless HTTP interactions).
6. Invite the Bot to your Discord Server:
   - In the left sidebar, click **OAuth2** &rarr; **URL Generator**.
   - Under **Scopes**, select:
     - `bot`
     - `applications.commands`
   - Under **Bot Permissions**, select:
     - `Send Messages`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
    - Copy the generated URL at the bottom, paste it into your browser, select your server, and click **Authorize**.

---

## ❀ Step 3: Deploying to Vercel

1. Go to [Vercel](https://vercel.com) and log in.
2. Click **Add New...** &rarr; **Project**.
3. Select your GitHub repository **`discord-rec-bot`** and click **Import**.
4. In the project setup screen:
   - **Framework Preset**: `Next.js` (detected automatically).
   - **Root Directory**: `./` (leave default).
5. Expand **Environment Variables** and add the following keys:

| Variable Name | Description | Example / Value |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | Webhook URL from Step 1 | `https://discord.com/api/webhooks/...` |
| `DISCORD_APPLICATION_ID` | Application ID from Step 2 | `your_app_id` |
| `DISCORD_PUBLIC_KEY` | Public Key from Step 2 | `your_public_key` |
| `DISCORD_BOT_TOKEN` | Bot Token from Step 2 | `your_bot_token` |
| `DISCORD_GUILD_ID` | Your Server ID | `your_guild_id` |
| `DISCORD_RECS_CHANNEL_ID` | Recs Channel ID | `your_recs_channel_id` |
| `NEXT_PUBLIC_APP_URL` | Your custom domain | `https://your-domain.vercel.app` |
| `BOT_USERNAME` | *(Optional)* Default persona name | `Jasmine 🌸` |
| `BOT_AVATAR_URL` | *(Optional)* Default avatar image | `/maomao.png` |
| `AI_API_BASE_URL` | *(Optional)* Reverse proxy URL | `https://your-reverse-proxy.site/v1` |
| `AI_API_KEY` | *(Optional)* Reverse proxy token | `your_token` |
| `AI_DEFAULT_MODEL` | *(Optional)* Default AI model | `gemini-1.5-pro` or `gpt-5.6-luna` |
| `UPSTASH_REDIS_REST_URL` | *(Optional)* Auto-linked via Vercel Storage | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | *(Optional)* Auto-linked via Vercel Storage | `your_token` |

6. Click **Deploy**. Vercel will build and deploy your project in ~1-2 minutes!

---

### ☁️ Step 3.5: Linking Free Upstash Redis (1-Click Cross-Device Sync)
To make your custom uploaded 1:1 flower icons, categories, and persona permanently persist across all phones, tablets, and computers without losing them on cache clears:
1. In your Vercel Project Dashboard, click the **Storage** tab at the top.
2. Click **Create Database** &rarr; select **Upstash** (or **KV**).
3. Click **Continue** (select free region close to you).
4. Click **Connect to Project** and choose your `discord-rec-bot` repository.
5. Vercel automatically populates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_...`)!
6. Trigger a **Redeploy** on Vercel so the live deployment picks up the connection.
7. Done! The web studio and Discord slash commands will now permanently read and save categories from the cloud.

---

## 🌐 Step 4: Configuring Custom Domain on Cloudflare

To point **`rec.jizellecasia.site`** to your Vercel deployment:

### 1. In Cloudflare Dashboard:
1. Log into [Cloudflare](https://dash.cloudflare.com) and select your domain **`jizellecasia.site`**.
2. Go to **DNS** &rarr; **Records** &rarr; click **Add record**:
   - **Type**: `CNAME`
   - **Name**: `rec`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: 
     - *Option A (Recommended)*: **DNS only** (Grey cloud) — Vercel handles SSL certificates automatically.
     - *Option B*: **Proxied** (Orange cloud) — If you use Proxied, ensure Cloudflare **SSL/TLS encryption mode** is set to **Full** or **Full (strict)** under SSL/TLS settings to avoid redirect loops.
   - **TTL**: `Auto`
3. Click **Save**.

### 2. In Vercel Project Settings:
1. Open your project on Vercel &rarr; **Settings** &rarr; **Domains**.
2. Type `rec.jizellecasia.site` and click **Add**.
3. Within 1-2 minutes, Vercel will verify the DNS record and provision a free Let's Encrypt SSL certificate.
4. Your Web Studio is now live at **`https://rec.jizellecasia.site`**! 🌸

---

## ⚡ Step 5: Linking Discord Interactions & Registering Commands

### 1. Link Interactions Endpoint URL in Discord:
1. Go back to the [Discord Developer Portal](https://discord.com/developers/applications) &rarr; select **Jasmine**.
2. On the **General Information** page, find **Interactions Endpoint URL**.
3. Enter:
   ```
   https://rec.jizellecasia.site/api/interactions
   ```
4. Click **Save Changes**.
   - *Discord will send an automated cryptographic PING verification to `/api/interactions`. Our endpoint handles and returns PONG with Ed25519 signature verification immediately!*

### 2. Register Guild Slash Commands:
In your local project folder (or in terminal with environment variables set):
```powershell
npm run register-commands
```
This script calls Discord's REST API and registers:
- **`/rec`** (Slash command with `title`, `category`, `notes`, `image_url` options)
- **`Turn into Rec`** (Message context menu command when right-clicking any message in Discord)

Because the script registers them directly to your `DISCORD_GUILD_ID`, the commands appear in your server **instantly** without waiting for the 1-hour global cache!

---

## ✨ Step 6: Optional AI Reverse Proxy Configuration

If you want one-click AI auto-filling:
1. Open `https://rec.jizellecasia.site` &rarr; click **Settings ⚙️** in the top bar.
2. Select the **AI Reverse Proxy** tab.
3. Enter:
   - **Reverse Proxy API Base URL**: e.g. `https://your-proxy-domain.com/v1`
   - **API Key**: Your reverse proxy bearer token.
4. Click **Save Settings**.
5. When writing a recommendation, toggle **🌸 Auto-Fill with AI** &rarr; click **Organize with AI 🌸**. Jasmine will parse your notes and extract tags, runtime, creators, and platform automatically!

---

## 🎨 Step 7: Managing Categories & 1:1 Icon Uploads

### Uploading 1:1 Flower Icons & Badges
1. Open the Web Studio at `https://rec.jizellecasia.site`.
2. Click **Categories & Icons 🎨** in the top bar.
3. Click **+ Add Category** (or click the edit pencil on an existing category).
4. Fill in:
   - **Category Name**: e.g. `Movie`, `Novel`, `Anime`, `K-Drama`, `Bakery`.
   - **Border Accent Color**: Use the color picker or choose pastel presets (Ayato Blue, Baby Pink, Daisy Cream, etc.).
   - **1:1 Square Badge Icon / Flower Image**:
     - Click **Upload 1:1 Icon (PNG/JPG)**.
     - The built-in HTML5 canvas validator ensures the icon is cropped cleanly to a **1:1 square canvas** (no stretching, no distortion) under 1.5MB.
     - Or paste a direct image URL if you have one hosted online.
5. Click **Save Category 🌸**.
6. The new category is immediately available on your composer toolbar and updates the live preview card in real-time!

### Backing Up & Moving Across Devices
- Click **Backup JSON** to download `jasmine-categories.json`.
- On another device (e.g. your phone or laptop), open the site, click **Import JSON**, and your entire category and flower icon configuration is restored in 1 second.

---

## 🛠️ Troubleshooting & FAQ

#### Q: Discord says "Interactions Endpoint URL could not be verified"?
- Ensure your Vercel deployment has finished building.
- Check that `DISCORD_PUBLIC_KEY` in Vercel Environment Variables matches the **Public Key** in your Discord Developer Portal exactly.
- Test visiting `https://rec.jizellecasia.site/api/interactions` in your browser (it should return status 401 or method not allowed, which proves the serverless route is online).

#### Q: How do multiple images render in Discord?
- In Discord embeds, sending multiple image embeds with the exact same `url` groups them into a Discord media mosaic gallery. Jasmine supports up to 9 images per recommendation.

#### Q: Can I change the bot's username or avatar picture?
- Yes! Default is **`Jasmine 🌸`** and **`/maomao.png`**. You can configure server-wide defaults in `.env` / Vercel (`BOT_USERNAME` and `BOT_AVATAR_URL`), or customize it per-browser in **Settings ⚙️** &rarr; **Bot Persona**.

#### Q: Do I need to pay anything?
- **Zero dollars.** Vercel Hobby tier is free, Cloudflare DNS is free, Discord Webhooks & CDN are free, and your AI proxy models (`5.6-luna`, Gemini Pro) are free as stated in your context.
