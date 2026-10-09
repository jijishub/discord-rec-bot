import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['tesseract.js', 'sharp'],
  outputFileTracingIncludes: {
    '/api/ai/enhance': ['./node_modules/tesseract.js/src/**/*', './node_modules/tesseract.js-core/**/*', './node_modules/@tesseract.js-data/eng/4.0.0_best_int/*'],
    '/api/interactions': ['./node_modules/tesseract.js/src/**/*', './node_modules/tesseract.js-core/**/*', './node_modules/@tesseract.js-data/eng/4.0.0_best_int/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
