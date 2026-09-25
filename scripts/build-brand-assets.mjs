// Builds the optimized brand images in public/brand/ from docs/brand-kit/,
// and samples the gradient fields into src/lib/brand-fields.data.json.
// Run with: npm run brand:assets  (outputs are committed).
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SRC = 'docs/brand-kit';
const OUT = 'public/brand';
await mkdir(OUT, { recursive: true });

// Fields are drawn as CSS gradients (src/components/BrandField.astro), not
// images: a smooth dark gradient in an 8-bit lossy file bands and blocks, and
// gets upscaled on large screens. We sample each field on a ROWS × COLS grid
// in 16-bit; the browser interpolates (and dithers) between the samples.
const ROWS = 7;
const COLS = 13;

async function sampleField(file, { blur, ...modulate }) {
  const { data, info } = await sharp(file)
    .toColourspace('rgb16')
    .resize(800)
    .blur(blur)
    .modulate(modulate)
    .raw({ depth: 'ushort' })
    .toBuffer({ resolveWithObject: true });
  const px = new Uint16Array(data.buffer, data.byteOffset, data.length / 2);
  const at = (x, y, c) => px[(y * info.width + x) * info.channels + c] / 257;
  const round = (v) => Math.round(v * 10) / 10;
  return Array.from({ length: ROWS }, (_, r) => {
    const y = Math.round((r / (ROWS - 1)) * (info.height - 1));
    return Array.from({ length: COLS }, (_, c) => {
      const x = Math.round((c / (COLS - 1)) * (info.width - 1));
      return [0, 1, 2].map((ch) => round(at(x, y, ch)));
    });
  });
}

const fields = {};
for (const n of [1, 2, 3]) {
  // Fields: slightly darkened, as approved in the mockups (brightness ~0.8).
  // The light blur only removes the grain baked into the source JPEG; the
  // Backdrop grain layer supplies texture at screen resolution.
  fields[`field-${n}`] = await sampleField(`${SRC}/fields/gradient-${n}.jpg`, { blur: 6, brightness: 0.82 });
}
// Veil: field 1 blurred, desaturated and darkened (spec §4). CSS adds a 40%
// dark wash on top.
fields.veil = await sampleField(`${SRC}/fields/gradient-1.jpg`, { blur: 30, brightness: 0.5, saturation: 0.5 });
await writeFile('src/lib/brand-fields.data.json', JSON.stringify(fields) + '\n');

await sharp(`${SRC}/fields/rupture-rule.jpg`).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule.webp`);
await sharp(`${SRC}/fields/rupture-rule.jpg`).rotate(90).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule-v.webp`);

const wordmark = await sharp(`${SRC}/logo/a-wordmark-plain-white.png`).trim().resize({ width: 800 }).png().toFile(`${OUT}/wordmark-white.png`);
console.log(`wordmark-white.png ${wordmark.width}x${wordmark.height}`);
await sharp(`${SRC}/logo/a-monogram-white.png`).trim().resize({ width: 256 }).png().toFile(`${OUT}/monogram-white.png`);
console.log('brand assets written to public/brand/');
