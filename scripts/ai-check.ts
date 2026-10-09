import assert from 'node:assert/strict';
import { enhanceRecWithAI } from '../src/lib/ai';

const originalFetch = globalThis.fetch;
const requests: any[] = [];
let outputs: unknown[] = [];
globalThis.fetch = async (_url, init) => {
  requests.push(JSON.parse(String(init?.body)));
  assert.ok(outputs.length, 'Unexpected extra AI call');
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(outputs.shift()) } }] }), { status: 200 });
};
const req = { category: 'Anime', apiBaseUrl: 'https://example.test', images: ['https://example.test/screenshot.png'] };
const identity = { identified: true, title: 'How Heavy Are the Dumbbells You Lift?', evidence: 'The anime is called how heavy are the dumbbells you lift; exactly', extractedDetails: 'Comment naming anime, confirmed by a reply.', channel: '@invented', channelEvidence: '' };
async function main() {
  try {
    outputs = [{ ...identity, identified: false }];
    assert.equal((await enhanceRecWithAI(req)).success, false);
    assert.equal(requests.length, 1, 'Uncertain identification must not trigger enrichment');
    requests.length = 0;
    outputs = [identity, { title: identity.title + ' (2019)', description: 'A fitness comedy.', channel: '@invented', personalNotes: 'A masterpiece!', sourceUrl: 'https://invented.test', videoUrl: 'https://invented.test/video' }];
    const result = await enhanceRecWithAI(req);
    assert.equal(result.success, true);
    assert.equal(result.data?.channel, '');
    assert.equal(result.data?.personalNotes, '');
    assert.equal(result.data?.sourceUrl, '');
    assert.equal(result.data?.videoUrl, undefined);
    assert.equal(requests[0].messages[1].content[1].image_url.detail, 'high');
    assert.ok(!requests[0].messages[0].content.includes('Frieren'));
    assert.ok(requests[1].messages[1].content.includes(identity.title));
    outputs = [identity, { title: 'Frieren (2023)', description: 'Wrong subject' }];
    assert.equal((await enhanceRecWithAI(req)).success, false, 'Reject subject substitution');
    outputs = [identity, { title: identity.title, description: 'A fitness comedy.' }];
    const explicit = await enhanceRecWithAI({ ...req, personalNotes: 'Want to try this', channel: 'My source', rawInput: 'https://example.test/post' });
    assert.equal(explicit.data?.personalNotes, 'Want to try this');
    assert.equal(explicit.data?.channel, 'My source');
    assert.equal(explicit.data?.sourceUrl, 'https://example.test/post');
    const count = requests.length;
    assert.equal((await enhanceRecWithAI({ ...req, category: '' })).success, false);
    assert.equal(requests.length, count);
    console.log('AI identification regression checks passed');
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
