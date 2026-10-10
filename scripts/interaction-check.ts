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
let lastAIRequest: any;
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
  if (id === '@/lib/ai') return { enhanceRecWithAI: async (request: any) => { lastAIRequest = request; return aiResult; } };
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
    const failedList = await send({ name: 'rec', options: [{ name: 'category', value: anime.id }, { name: 'ai-instructions', value: 'suggest me 6 animes in netflix' }] });
    assert.equal(failedList.embeds.length, 0, 'Failed AI-only requests must not post an empty recommendation card');
    assert.ok(failedList.content.includes(aiResult.error));
    aiResult = { success: false, disposition: 'reject', error: 'I can help with recommendations.' };
    const rejected = await send({ name: 'rec', options: [{ name: 'category', value: anime.id }, { name: 'description', value: 'make me a PDF' }, { name: 'ai', value: true }] });
    assert.equal(rejected.embeds.length, 0, 'Rejected input must not become a fallback card');
    assert.equal(rejected.content, aiResult.error);
    aiResult = { success: false, error: "I couldn't confidently identify the item in this category." };
    const data = { name: 'rec', options: [{ name: 'category', value: anime.id }, { name: 'description', value: 'Saved from comments' },
      { name: 'notes', value: 'Want to watch' }, { name: 'tags', value: 'My tag' }], resolved: { attachments: { '1': attachment } } };
    const fallback = await send(data);
    assert.equal(fallback.embeds[0].title, 'Anime recommendation');
    assert.equal(fallback.embeds[0].author.name, 'Anime');
    assert.equal(fallback.embeds[0].image.url, screenshot);
    assert.equal(fallback.embeds[0].description, 'Saved from comments\n\n> Want to watch');
    assert.equal(fallback.embeds[0].fields[0].name, 'Genres');
    assert.equal(fallback.embeds[0].fields[0].value, 'My tag');
    assert.equal(fallback.embeds[0].footer.text, 'Rec by Jiji');
    assert.ok(!fallback.content, 'Identification error must not replace the embed');
    assert.ok(!JSON.stringify(fallback).includes('Frieren'));

    const context = await send({ name: 'Turn into Rec', target_id: 'message', resolved: { messages: {
      message: { content: '', attachments: [attachment], author: { username: 'Original author' } },
    } } });
    assert.equal(context.embeds[0].image.url, screenshot);
    assert.equal(context.embeds[0].title, 'Recommendation');
    assert.equal(context.embeds[0].author.name, 'Others', 'Context menu must not silently choose Movies');

    aiResult = { success: true, data: { title: 'Identified Anime (2019)', description: 'A synopsis', tags: 'Comedy, Sports', platform: 'Crunchyroll', duration: '12 eps', creator: 'Doga Kobo', category: 'Products' } };
    const identified = await send(data);
    assert.equal(identified.embeds[0].title, 'Identified Anime (2019)');
    assert.equal(identified.embeds[0].image.url, screenshot);
    assert.equal(identified.embeds[0].author.name, 'Anime', 'AI must never override the selected category');
    assert.equal(identified.embeds[0].fields[0].value, 'Comedy, Sports', 'AI must review existing tags');
    assert.equal(identified.embeds[0].fields[2].name, 'Episodes / Runtime');
    assert.equal(identified.embeds[0].fields[2].value, '12 eps');
    assert.equal(lastAIRequest.tags, 'My tag');
    assert.equal(lastAIRequest.description, 'Saved from comments');
    const invalid = await POST({ headers: new Headers({ 'x-signature-ed25519': 'test', 'x-signature-timestamp': 'test' }),
      text: async () => JSON.stringify({ type: InteractionType.APPLICATION_COMMAND, data: { name: 'rec', options: [{ name: 'category', value: 'Some item title' }] } }) });
    const invalidBody = await invalid.json();
    assert.equal(invalidBody.data.flags, 64);
    assert.equal(callbacks.length, 0, 'Invalid category must not become a custom category');
    console.log('Interaction fallback regression checks passed');
  } finally {
    moduleLoader._load = originalLoad;
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DISCORD_PUBLIC_KEY;
    else process.env.DISCORD_PUBLIC_KEY = originalKey;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
