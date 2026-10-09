import path from 'node:path';
import sharp from 'sharp';
import { createWorker, OEM, PSM } from 'tesseract.js';
import { fetchPublicResource } from './url-metadata';

const MAX_BYTES = 8 * 1024 * 1024;

async function loadImage(image: string): Promise<Buffer> {
  if (image.startsWith('data:')) {
    const match = image.match(/^data:image\/[\w.+-]+;base64,([\s\S]+)$/);
    if (!match || match[1].length > MAX_BYTES * 1.4) throw new Error('Invalid image data');
    return Buffer.from(match[1], 'base64');
  }
  const response = await fetchPublicResource(image);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    await response.body?.cancel();
    throw new Error('Image could not be downloaded');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty image response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Image is too large for text extraction');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

/** Keep screenshot text available even when the gateway fails over to a text-only provider. */
export async function extractImageText(images: string[]): Promise<string> {
  if (!images.length) return '';
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    // Explicit runtime paths avoid webpack replacing require.resolve() with numeric module IDs.
    workerPath: path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js'),
    langPath: path.join(process.cwd(), 'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
    cacheMethod: 'none',
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const excerpts: string[] = [];
  let stopped = false;
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const recognition = (async () => {
      for (const [index, image] of images.slice(0, 9).entries()) {
        if (stopped) break;
        try {
          const buffer = await loadImage(image);
          const prepared = await sharp(buffer, { limitInputPixels: 20_000_000 }).rotate()
            .resize({ width: 1600, height: 3200, fit: 'inside', withoutEnlargement: true })
            .grayscale().normalize().png().toBuffer();
          const { data } = await worker.recognize(prepared);
          if (data.text.trim()) excerpts.push(`Screenshot ${index + 1}:\n${data.text.trim().slice(0, 6000)}`);
        } catch {
          // Failed downloads/decoding do not discard the other screenshots or the vision request.
        }
      }
    })();
    await Promise.race([recognition, new Promise<void>(resolve => { timer = setTimeout(() => { stopped = true; resolve(); }, 40_000); })]);
    return excerpts.join('\n\n').slice(0, 20_000);
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}
