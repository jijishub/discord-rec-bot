// Exercise the interaction handler with AI and Discord transport mocked.
import assert from 'node:assert/strict';
import Module from 'node:module';
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from '../src/lib/categories';
import { InteractionType } from 'discord-interactions';

const moduleLoader = Module as unknown as { _load: (id: string, ...args: any[]) => any };
const originalLoad = moduleLoader._load;
const originalFetch = globalThis.fetch;
const originalKey = process.env.DISCORD_PUBLIC_KEY;
const callbacks: (() => Promise<void>)[] = [];
const patches: any[] = [];
let aiResult: any = { success: false, error: "I couldn't confidently identify the item in this category." };

moduleLoader._load = function (id, ...args) {
  if (id === 'next/server') return {
    after: (callback: () => Promise<void>) => callbacks.push(callback),
    NextResponse: { json: (body: unknown) => new Response(JSON.stringify(body)) },
  };
  if (id === 'discord-interactions') return { ...originalLoad.call(this, id, ...args), verifyKey: async () => true };
  if (id === '@/lib/redis') return {
    getStoredCategories: async () => ({ categories: DEFAULT_CATEGORIES }),
    getStoredPersona: async () => ({ persona: DEFAULT_BOT_PERSONA }),
  };
  if (id === '@/lib/ai') return { enhanceRecWithAI: async () => aiResult };
  return originalLoad.call(this, id, ...args);
};
globalThis.fetch = async (url, init) => {
  assert.ok(String(url).includes('/messages/@original'));
  patches.push(JSON.parse(String(init?.body)));
  return new Response('{}', { status: 200 });
};
process.env.DISCORD_PUBLIC_KEY = 'test';

async function main() {
  try {
    const { POST } = require('../src/app/api/interactions/route');
    const screenshot = 'https://cdn.discordapp.com/attachments/test/screenshot.png';
    const attachment = { url: screenshot, filename: 'screenshot.png', content_type: 'image/png' };
    async function send(data: unknown) {
      const interaction = { type: InteractionType.APPLICATION_COMMAND, application_id: 'test', token: 'test',
        member: { user: { username: 'Jiji' } }, data };
      const response = await POST({ headers: new Headers({ 'x-signature-ed25519': 'test', 'x-signature-timestamp': 'test' }),
        text: async () => JSON.stringify(interaction) });
      assert.equal((await response.json()).type, 5);
      assert.equal(callbacks.length, 1);
      await callbacks.shift()!();
      return patches.pop();
    }
    const anime = DEFAULT_CATEGORIES.find(c => c.name === 'Anime')!;
    assert.ok(anime);
    const data = { name: 'rec', options: [{ name: 'category', value: anime.id }, { name: 'description', value: 'Saved from comments' },
      { name: 'notes', value: 'Want to watch' }, { name: 'tags', value: 'My tag' }], resolved: { attachments: { '1': attachment } } };
    const fallback = await send(data);
    assert.equal(fallback.embeds[0].title, 'New Recommendation');
    assert.equal(fallback.embeds[0].author.name, 'Anime');
    assert.equal(fallback.embeds[0].image.url, screenshot);
    assert.equal(fallback.embeds[0].description, 'Saved from comments\n\n> Want to watch');
    assert.equal(fallback.embeds[0].fields[0].name, 'My tag');
    assert.equal(fallback.embeds[0].footer.text, 'Rec by Jiji');
    assert.ok(!fallback.content, 'Identification error must not replace the embed');
    assert.ok(!JSON.stringify(fallback).includes('Frieren'));

    const context = await send({ name: 'Turn into Rec', target_id: 'message', resolved: { messages: {
      message: { content: '', attachments: [attachment], author: { username: 'Original author' } },
    } } });
    assert.equal(context.embeds[0].image.url, screenshot);
    assert.equal(context.embeds[0].title, 'Recommendation');

    aiResult = { success: true, data: { title: 'Identified Anime (2019)', description: 'A synopsis' } };
    const identified = await send(data);
    assert.equal(identified.embeds[0].title, 'Identified Anime (2019)');
    assert.equal(identified.embeds[0].image.url, screenshot);
    console.log('Interaction fallback regression checks passed');
  } finally {
    moduleLoader._load = originalLoad;
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DISCORD_PUBLIC_KEY;
    else process.env.DISCORD_PUBLIC_KEY = originalKey;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
