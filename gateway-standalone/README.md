# ୨୧ Jasmine 24/7 Gateway Worker

This isolated worker keeps Jasmine **🟢 Online 24/7** in your Discord server with her custom presence:
> **Watching `✻・recs`**  
> *Curating recommendations 🌸*

Zero external dependencies required on Node 18+ (uses native Node WebSocket).

---

## ✿ Quick Setup on Your Server

### Method 1: If using PM2 (Most Common on Compute Engine / VM)
1. Copy `bot.js` to your server.
2. In the same folder, create a `.env` file (or export the variable):
   ```bash
   DISCORD_BOT_TOKEN="your_bot_token_here"
   ```
3. Start with PM2:
   ```bash
   pm2 start bot.js --name "jasmine-bot"
   pm2 save
   ```
   *(PM2 keeps Jasmine running 24/7 and auto-restarts her on system reboots!)*

---

### Method 2: If using Docker / Docker Compose
Add this lightweight service to your `docker-compose.yml`:
```yaml
  jasmine-bot:
    build: ./gateway-standalone
    restart: always
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
```
Then run:
```bash
docker compose up -d jasmine-bot
```

---

### Method 3: If using systemd (Linux Service)
Create `/etc/systemd/system/jasmine.service`:
```ini
[Unit]
Description=Jasmine Discord Gateway Presence Worker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/gateway-standalone
Environment=DISCORD_BOT_TOKEN=your_bot_token_here
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl enable --now jasmine
```

---

### ✻ Resource Usage
- **Memory**: ~15 MB RAM
- **CPU**: < 0.05%
- Jasmine will immediately light up with a green online circle in your server member sidebar!
