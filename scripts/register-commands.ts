import dotenv from "dotenv";
dotenv.config();

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APPLICATION_ID || !BOT_TOKEN || !GUILD_ID) {
  console.error(
    "Error: DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_GUILD_ID are required in your environment variables."
  );
  process.exit(1);
}

const commands = [
  {
    name: "rec",
    type: 1, // CHAT_INPUT (Slash Command)
    description: "🌸 Create an aesthetic recommendation embed",
    integration_types: [0, 1], // 0 = GUILD_INSTALL (Servers), 1 = USER_INSTALL (Personal Account)
    contexts: [0, 1, 2], // 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEL
    options: [
      {
        name: "title",
        description: "The title of the recommendation",
        type: 3, // STRING
        required: true,
      },
      {
        name: "category",
        description: "The recommendation category (live from your studio)",
        type: 3, // STRING
        required: false,
        autocomplete: true,
      },
      {
        name: "image",
        description: "Primary image / poster (Upload)",
        type: 11, // ATTACHMENT (File upload)
        required: false,
      },
      {
        name: "image_2",
        description: "2nd image for mosaic gallery (Upload)",
        type: 11, // ATTACHMENT
        required: false,
      },
      {
        name: "image_3",
        description: "3rd image for mosaic gallery (Upload)",
        type: 11, // ATTACHMENT
        required: false,
      },
      {
        name: "image_4",
        description: "4th image for mosaic gallery (Upload)",
        type: 11, // ATTACHMENT
        required: false,
      },
      {
        name: "notes",
        description: "Personal thoughts, review, or quotes",
        type: 3, // STRING
        required: false,
      },
      {
        name: "image_url",
        description: "Or paste image link(s) (supports space/comma separated URLs)",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "Turn into Rec",
    type: 3, // MESSAGE context menu
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];

async function registerCommands() {
  console.log("🌸 Registering Jasmine Discord commands...");

  // 1. Register Globally (for all servers that add Jasmine)
  const globalUrl = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
  try {
    const res = await fetch(globalUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`⚠️ Discord Global API error (${res.status}): ${err}`);
    } else {
      const data = await res.json();
      console.log(`✨ Successfully registered ${data.length} GLOBAL commands across all Discord servers!`);
    }
  } catch (err) {
    console.error("❌ Failed to register global commands:", err);
  }

  // 2. Also register to Guild for instant caching in your primary server
  const guildUrl = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;
  try {
    const res = await fetch(guildUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`⚠️ Discord Guild API error (${res.status}): ${err}`);
    } else {
      const data = await res.json();
      console.log(`✨ Successfully registered ${data.length} commands to primary Guild ${GUILD_ID}!`);
    }
  } catch (err) {
    console.error("❌ Failed to register guild commands:", err);
  }
}

registerCommands();
