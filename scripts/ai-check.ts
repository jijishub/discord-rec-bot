import assert from 'node:assert/strict';
import Module from 'node:module';

const loader = Module as unknown as { _load: (id: string, ...args: any[]) => any };
const originalLoad = loader._load;
const originalFetch = globalThis.fetch;
const requests: any[] = [];
const screenshotText = 'The anime is called how heavy are the dumbbells you lift?\nexactly\nPosted by Example Account';
let outputs: unknown[] = [];
loader._load = function (id, ...args) {
  if (id === './image-text') return { extractImageText: async () => screenshotText };
  return originalLoad.call(this, id, ...args);
};
globalThis.fetch = async (_url, init) => {
  requests.push(JSON.parse(String(init?.body)));
  assert.ok(outputs.length, 'Unexpected extra AI call');
  const value = outputs.shift();
  return new Response(JSON.stringify({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }] }), { status: 200 });
};
async function main() {
  try {
    const { enhanceRecWithAI } = require('../src/lib/ai');
    const req = { category: 'Anime', apiBaseUrl: 'https://example.test', images: ['https://example.test/screenshot.png'], tags: 'Old tags', platform: 'Old service', duration: 'Unknown', creator: 'Unknown' };
    const complete = { title: 'How Heavy Are the Dumbbells You Lift? (2019)', description: 'A fitness comedy.', tags: 'Comedy, Sports', platform: 'Crunchyroll', duration: '12 eps', creator: 'Doga Kobo', channel: 'Example Account', channelEvidence: 'Posted by Example Account', personalNotes: 'A masterpiece!' };
    outputs = [{ ...complete, category: 'Movies', sourceUrl: 'https://invented.test', videoUrl: 'https://invented.test/video' }];
    const result = await enhanceRecWithAI(req);
    assert.equal(result.success, true);
    assert.equal(result.data.title, complete.title);
    assert.equal(result.data.personalNotes, '');
    assert.equal(result.data.channel, 'Example Account');
    assert.equal(result.data.sourceUrl, '');
    assert.equal(result.data.videoUrl, undefined);
    assert.equal(result.data.category, undefined);
    assert.equal(requests.length, 1, 'Review should use a single vision call');
    assert.equal(requests[0].messages[1].content[1].image_url.detail, 'high');
    const input = JSON.parse(requests[0].messages[1].content[0].text);
    assert.equal(input.current.category, 'Anime');
    assert.equal(input.current.tags, 'Old tags');
    assert.equal(input.current.duration, 'Unknown');
    assert.equal(input.current.creator, 'Unknown');
    assert.equal(input.screenshotText, screenshotText, 'OCR text must accompany images for text-only failover');
    assert.ok(!requests[0].messages[0].content.includes('Frieren'));

    outputs = [{ ...complete, channel: '@invented', channelEvidence: 'Made-up source' }];
    assert.equal((await enhanceRecWithAI(req)).data.channel, '');
    outputs = [{ ...complete, channel: 'YouTube', channelEvidence: 'exactly' }];
    assert.equal((await enhanceRecWithAI(req)).data.channel, '', 'Generic screenshot text cannot justify an invented platform');
    outputs = ['{"title"::"Broken"}', complete];
    assert.equal((await enhanceRecWithAI(req)).success, true, 'Retry malformed JSON once');
    outputs = ['{"title":""}', '{"title":""}'];
    assert.equal((await enhanceRecWithAI(req)).success, false, 'Empty titles must not silently become generic recommendations');
    outputs = [{ ...complete, personalNotes: 'Want to try this', tags: '' }];
    const explicit = await enhanceRecWithAI({ ...req, personalNotes: 'Want to try this', channel: 'My source', rawInput: 'https://example.test/post' });
    assert.equal(explicit.data.personalNotes, 'Want to try this');
    assert.equal(explicit.data.sourceUrl, 'https://example.test/post');
    assert.equal(explicit.data.tags, '', 'AI can clear an inappropriate field after review');
    outputs = [{ ...complete, title: 'Book recommendation discussion', description: 'Readers discuss mysteries and psychological thrillers.' }];
    const thread = await enhanceRecWithAI({ ...req, rawInput: 'Recommend this thread https://x.com/person/status/123', description: 'Also https://example.test/books' });
    assert.ok(thread.data.description.includes('https://x.com/person/status/123'));
    assert.ok(thread.data.description.includes('https://example.test/books'));
    assert.equal(thread.data.sourceUrl, 'https://x.com/person/status/123');
    assert.ok(requests.at(-1).messages[0].content.includes('do not choose a book/movie/product mentioned in it'));
    const count = requests.length;
    assert.equal((await enhanceRecWithAI({ ...req, category: '' })).success, false);
    assert.equal(requests.length, count);
    console.log('AI complete-review regression checks passed');
  } finally {
    loader._load = originalLoad;
    globalThis.fetch = originalFetch;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
