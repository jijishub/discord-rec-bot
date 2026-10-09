import assert from 'node:assert/strict';
import sharp from 'sharp';
import { extractImageText } from '../src/lib/image-text';
async function main() {
  const png = await sharp(Buffer.from(`<svg width="1280" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#252525"/>
    <g fill="white" font-family="sans-serif" font-size="40">
      <text x="40" y="100">The anime is called</text>
      <text x="40" y="180">How Heavy Are the Dumbbells You Lift?</text>
      <text x="40" y="260">Reply: exactly</text>
      <text x="40" y="400">Canon PowerShot A460</text>
      <text x="40" y="480">Price: 4800</text>
    </g></svg>`)).png().toBuffer();
  const text = await extractImageText(['data:image/png;base64,' + png.toString('base64')]);
  assert.match(text, /how heavy are the dumbbells you lift/i);
  assert.match(text, /exactly/i);
  assert.match(text, /canon powershot a460/i);
  assert.match(text, /4800/);
  assert.equal(await extractImageText([]), '');
  console.log('Screenshot text extraction checks passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
