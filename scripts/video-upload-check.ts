import assert from 'node:assert/strict';
import Module from 'node:module';
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from '../src/lib/categories';

const loader = Module as unknown as { _load: (id: string, ...args: any[]) => any };
const originalLoad = loader._load;
let sent: any;
loader._load = function (id, ...args) {
  if (id === '@/lib/url-metadata') return { resolveSubEmbed: async () => ({ subEmbed: null }) };
  if (id === '@/lib/discord') return {
    ...originalLoad.call(this, id, ...args),
    sendWebhook: async (payload: unknown, destination: unknown, files: unknown) => {
      sent = { payload, destination, files };
      return { success: true };
    },
  };
  return originalLoad.call(this, id, ...args);
};

async function main() {
  try {
    const { POST } = require('../src/app/api/webhook/send/route');
    const payload = { data: { title: 'A clip', description: 'Recommendation', images: [] }, category: DEFAULT_CATEGORIES[0], persona: DEFAULT_BOT_PERSONA };
    const upload = new FormData();
    upload.append('payload', JSON.stringify(payload));
    upload.append('video', new File(['clip bytes'], 'clip.mp4', { type: 'video/mp4' }));
    const response = await POST(new Request('https://example.test/api/webhook/send', { method: 'POST', body: upload }));
    assert.equal(response.status, 200);
    assert.equal(sent.files.length, 1);
    assert.equal(sent.files[0].filename, 'clip.mp4');
    assert.equal(await sent.files[0].blob.text(), 'clip bytes');
    assert.equal(sent.payload.embeds.length, 1);
    upload.set('video', new File(['not video'], 'file.txt', { type: 'text/plain' }));
    assert.equal((await POST(new Request('https://example.test/api/webhook/send', { method: 'POST', body: upload }))).status, 400);
    upload.set('video', new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.mp4', { type: 'video/mp4' }));
    assert.equal((await POST(new Request('https://example.test/api/webhook/send', { method: 'POST', body: upload }))).status, 400);
    const jsonResponse = await POST(new Request('https://example.test/api/webhook/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    assert.equal(jsonResponse.status, 200, 'Existing JSON submissions still work');
    console.log('Video upload regression checks passed');
  } finally { loader._load = originalLoad; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
