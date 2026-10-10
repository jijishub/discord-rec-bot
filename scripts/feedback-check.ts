import assert from 'node:assert/strict';
import { buildDiscordEmbeds } from '../src/lib/discord';
import { resolveSubEmbed, parseTwitterUrl } from '../src/lib/url-metadata';
import { DEFAULT_CATEGORIES, DEFAULT_BOT_PERSONA } from '../src/lib/categories';
async function main() {
  const images = Array.from({length: 9}, (_, i) => `https://example.com/${i}.png`);
  const result = buildDiscordEmbeds({ categoryId: 'movies', title: 'Film (2022)', description: 'A synopsis', images, subEmbed: {title: 'Linked article'} }, DEFAULT_CATEGORIES[0], DEFAULT_BOT_PERSONA);
  assert.equal(result.embeds.length, 10);
  assert.equal(result.embeds[0].title, 'Film (2022)');
  assert.equal(result.embeds[9].title, 'Linked article');
  const threadUrl = 'https://x.com/person/status/123';
  const thread = buildDiscordEmbeds({ categoryId: 'movies', title: 'Discussion', description: 'A recommendation thread.', images: [], subEmbed: { url: threadUrl } }, DEFAULT_CATEGORIES[0], DEFAULT_BOT_PERSONA);
  assert.ok(thread.embeds[0].description?.includes(threadUrl), 'Preview links must remain visible in the description');
  assert.equal(parseTwitterUrl('https://x.com/person/status/123')?.tweetId, '123');
  for (const url of ['http://127.0.0.1/private', 'http://169.254.169.254/', 'http://[::1]/']) {
    assert.equal((await resolveSubEmbed(url)).subEmbed, null);
  }
  console.log('Recommendation regression checks passed');
}
main();
