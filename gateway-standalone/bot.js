/**
 * ୨୧ Jasmine Discord Gateway Worker (Standalone)
 *
 * Keeps Jasmine permanently awake and 🟢 Online in your Discord server 24/7.
 * Zero npm dependencies required on Node 18+ (uses native WebSocket).
 */

const fs = require("fs");
const path = require("path");

// Load local .env if present
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ Error: DISCORD_BOT_TOKEN environment variable is missing.");
  console.error("Please add DISCORD_BOT_TOKEN to your .env file or server environment.");
  process.exit(1);
}

let heartbeatTimer = null;
let lastSequence = null;
let sessionId = null;
let resumeGatewayUrl = null;

function connectGateway() {
  const gatewayUrl = resumeGatewayUrl || "wss://gateway.discord.gg/?v=10&encoding=json";
  console.log(`✿ Connecting to Discord Gateway (${gatewayUrl.split("?")[0]})...`);

  const ws = new WebSocket(gatewayUrl);

  ws.onopen = () => {
    console.log("✿ Connected to Discord Gateway WebSocket.");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data.toString());
      const { op, d, s, t } = data;

      if (s !== null && s !== undefined) {
        lastSequence = s;
      }

      // Opcode 10: Hello -> start heartbeat & send identify/resume
      if (op === 10) {
        const heartbeatInterval = d.heartbeat_interval;
        console.log(`✿ Heartbeat interval: ${heartbeatInterval}ms`);

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: lastSequence }));
          }
        }, heartbeatInterval);

        // Resume if we have a session, else Identify
        if (sessionId && lastSequence) {
          console.log("✿ Attempting to resume previous gateway session...");
          ws.send(
            JSON.stringify({
              op: 6,
              d: {
                token: BOT_TOKEN,
                session_id: sessionId,
                seq: lastSequence,
              },
            })
          );
        } else {
          const identifyPayload = {
            op: 2,
            d: {
              token: BOT_TOKEN,
              intents: 513, // GUILDS (1) + GUILD_MESSAGES (512)
              properties: {
                os: process.platform,
                browser: "jasmine-gateway",
                device: "jasmine-gateway",
              },
              presence: {
                status: "online",
                activities: [
                  {
                    name: "✻・recs",
                    type: 3, // WATCHING
                    state: "Curating recommendations 🌸",
                  },
                ],
                afk: false,
              },
            },
          };
          ws.send(JSON.stringify(identifyPayload));
        }
      }

      // Opcode 0: Dispatch Events
      if (op === 0) {
        if (t === "READY") {
          sessionId = d.session_id;
          resumeGatewayUrl = d.resume_gateway_url ? `${d.resume_gateway_url}/?v=10&encoding=json` : null;
          const user = d.user;
          console.log("\n✿ ═════════════════════════════════════════════════════ ✿");
          console.log(`  Jasmine is now ONLINE & AWAKE in your Discord server!`);
          console.log(`  Account: ${user.username} (ID: ${user.id})`);
          console.log(`  Status:  🟢 Online`);
          console.log(`  Playing: Watching ✻・recs ("Curating recommendations 🌸")`);
          console.log("✿ ═════════════════════════════════════════════════════ ✿\n");
        } else if (t === "RESUMED") {
          console.log("✿ Gateway session successfully resumed. Jasmine remains online.");
        }
      }

      // Opcode 1: Heartbeat request
      if (op === 1) {
        ws.send(JSON.stringify({ op: 1, d: lastSequence }));
      }

      // Opcode 7: Reconnect request
      if (op === 7) {
        console.log("✿ Gateway requested reconnect. Closing connection to resume...");
        ws.close();
      }

      // Opcode 9: Invalid session
      if (op === 9) {
        console.log("✿ Invalid session. Resetting session and re-identifying in 5s...");
        sessionId = null;
        resumeGatewayUrl = null;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        setTimeout(connectGateway, 5000);
      }
    } catch (err) {
      console.error("Error processing gateway message:", err);
    }
  };

  ws.onclose = (event) => {
    console.log(`✿ Gateway disconnected (code ${event.code}). Reconnecting in 5s...`);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    setTimeout(connectGateway, 5000);
  };

  ws.onerror = (err) => {
    console.error("✿ Gateway WebSocket error:", err.message || err);
  };
}

connectGateway();
