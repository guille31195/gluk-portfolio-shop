// Derives the certificate's PDF-embeddable brand assets in netlify/assets/ from
// public/brand/ (pdf-lib embeds only PNG/JPG). Run with: npm run certificate:assets
// Outputs are committed.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'netlify/assets';
const INK = { r: 30, g: 22, b: 25 }; // --color-black #1E1619
await mkdir(OUT, { recursive: true });

// White wordmark on transparent -> brand black on transparent (alpha kept).
const { data, info } = await sharp('public/brand/wordmark-white.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) [data[i], data[i + 1], data[i + 2]] = [INK.r, INK.g, INK.b];
await sharp(data, { raw: info }).png().toFile(`${OUT}/wordmark-black.png`);

await sharp('public/brand/rupture-rule.webp').png().toFile(`${OUT}/rupture-rule.png`);
console.log('certificate assets written to netlify/assets/');
