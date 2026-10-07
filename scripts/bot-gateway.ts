import dotenv from "dotenv";
dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Error: DISCORD_BOT_TOKEN is required in .env to connect Jasmine to Discord Gateway.");
  process.exit(1);
}

let heartbeatTimer: NodeJS.Timeout | null = null;
let lastSequence: number | null = null;

function connectGateway() {
  console.log("✿ Connecting Jasmine to Discord Gateway (wss://gateway.discord.gg)...");

  const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.onopen = () => {
    console.log("✿ Connected to Discord Gateway WebSocket.");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data.toString());
      const { op, d, s, t } = data;

      if (s !== null) {
        lastSequence = s;
      }

      // Opcode 10: Hello -> start heartbeat & identify
      if (op === 10) {
        const heartbeatInterval = d.heartbeat_interval;
        console.log(`✿ Received Hello. Heartbeat interval: ${heartbeatInterval}ms`);

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: lastSequence }));
          }
        }, heartbeatInterval);

        // Identify
        const identifyPayload = {
          op: 2,
          d: {
            token: BOT_TOKEN,
            intents: 513,
            properties: {
              os: process.platform,
              browser: "jasmine-bot",
              device: "jasmine-bot",
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

      // Opcode 0: Dispatch
      if (op === 0) {
        if (t === "READY") {
          const user = d.user;
          console.log(`\n✿ ══════════════════════════════════════════════ ✿`);
          console.log(`  Jasmine is now ONLINE & AWAKE in your server!`);
          console.log(`  User: ${user.username} (ID: ${user.id})`);
          console.log(`  Status: 🟢 Online (Watching ✻・recs)`);
          console.log(`✿ ══════════════════════════════════════════════ ✿\n`);
        }
      }

      // Opcode 1: Heartbeat requested by Discord
      if (op === 1) {
        ws.send(JSON.stringify({ op: 1, d: lastSequence }));
      }

      // Opcode 7: Reconnect
      if (op === 7) {
        console.log("✿ Gateway requested reconnect. Reconnecting...");
        ws.close();
      }

      // Opcode 9: Invalid session
      if (op === 9) {
        console.log("✿ Invalid session. Reconnecting in 5s...");
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        setTimeout(connectGateway, 5000);
      }
    } catch (err) {
      console.error("Error parsing gateway message:", err);
    }
  };

  ws.onclose = (event) => {
    console.log(`✿ Gateway disconnected (code ${event.code}). Reconnecting in 5s...`);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    setTimeout(connectGateway, 5000);
  };

  ws.onerror = (err) => {
    console.error("✿ Gateway WebSocket error:", err);
  };
}

connectGateway();
