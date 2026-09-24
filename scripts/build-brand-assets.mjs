// Builds the optimized brand images in public/brand/ from docs/brand-kit/.
// Run with: npm run brand:assets  (outputs are committed).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'docs/brand-kit';
const OUT = 'public/brand';
await mkdir(OUT, { recursive: true });

for (const n of [1, 2, 3]) {
  // Fields: slightly darkened, as approved in the mockups (brightness ~0.8).
  await sharp(`${SRC}/fields/gradient-${n}.jpg`)
    .resize(1600)
    .modulate({ brightness: 0.82 })
    .webp({ quality: 78 })
    .toFile(`${OUT}/field-${n}.webp`);
}

// Veil: the field pre-blurred, desaturated and darkened so the browser never
// runs a blur filter (spec §4). CSS adds a 40% dark wash on top.
await sharp(`${SRC}/fields/gradient-1.jpg`)
  .resize(800)
  .blur(30)
  .modulate({ brightness: 0.5, saturation: 0.5 })
  .webp({ quality: 70 })
  .toFile(`${OUT}/veil-1.webp`);

await sharp(`${SRC}/fields/rupture-rule.jpg`).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule.webp`);
await sharp(`${SRC}/fields/rupture-rule.jpg`).rotate(90).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule-v.webp`);

const wordmark = await sharp(`${SRC}/logo/a-wordmark-plain-white.png`).trim().resize({ width: 800 }).png().toFile(`${OUT}/wordmark-white.png`);
console.log(`wordmark-white.png ${wordmark.width}x${wordmark.height}`);
await sharp(`${SRC}/logo/a-monogram-white.png`).trim().resize({ width: 256 }).png().toFile(`${OUT}/monogram-white.png`);
console.log('brand assets written to public/brand/');
