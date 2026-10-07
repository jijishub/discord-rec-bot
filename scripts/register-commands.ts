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
    description: "🌸 Create an aesthetic Jasmine recommendation for #❋・recs",
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
        description: "Upload an image/poster directly from your device",
        type: 11, // ATTACHMENT (File upload)
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
        description: "Or paste a direct URL of an image/poster",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "Turn into Rec",
    type: 3, // MESSAGE context menu
  },
];

async function registerCommands() {
  console.log(`🌸 Registering Jasmine Discord commands for Guild ${GUILD_ID}...`);

  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Discord API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    console.log(`✨ Successfully registered ${data.length} commands to your Discord server!`);
    console.log(data.map((c: { name: string; type: number }) => ` - /${c.name} (type: ${c.type})`).join("\n"));
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

registerCommands();
