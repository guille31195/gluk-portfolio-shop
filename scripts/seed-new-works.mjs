// Adds new artworks (photos + details) to Sanity. Idempotent: pieces whose slug
// already exists are skipped. Run with: npm run seed:new-works
// Pass --dry-run to only print what would be created.
// Requires SANITY_WRITE_TOKEN (an Editor-level token) in .env.
import { createClient } from '@sanity/client';
import fs from 'node:fs';
import path from 'node:path';

const PHOTOS_ROOT = 'C:/Users/Guillermo/Desktop/cuadros HD';
const dryRun = process.argv.includes('--dry-run');

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

// Images in display order: the first is the main image. Original status stays
// "notForSale" (Portfolio only, hidden from Collect) until Guillermo sets it.
const pieces = [
  {
    folder: 'Anestesia para invierno',
    slug: 'anestesia-para-invierno',
    title: 'Anestesia para invierno',
    materials: 'Oil on canvas',
    year: 2024,
    dimensions: '120 × 150 cm',
    images: ['_MCM3660-2.jpg', 'M.jpg', '_MCM3716.jpg'],
  },
  {
    folder: 'Valet parking en las Mercedes',
    slug: 'valet-parking-en-las-mercedes',
    title: 'Valet parking en Las Mercedes',
    materials: 'Oil on truck tarpaulin',
    year: 2026,
    dimensions: '70 × 70 cm',
    images: ['IMG_4445.jpg', 'IMG_4473.JPG', 'IMG_4462.JPG', 'IMG_5302.JPG'],
  },
  {
    folder: 'DE CHIRICO EN LA GUAIRA',
    slug: 'de-chirico-en-la-guaira',
    title: 'De Chirico en La Guaira',
    materials: 'Oil on canvas',
    year: 2025,
    dimensions: '145 × 90 cm',
    images: ['IMG_5520.jpg', 'IMG_5521.JPG', 'IMG_5522.JPG'],
  },
];

if (!dryRun && !process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing SANITY_WRITE_TOKEN in environment (add it to .env).');
  process.exit(1);
}

for (const piece of pieces) {
  for (const imgFile of piece.images) {
    const filePath = path.join(PHOTOS_ROOT, piece.folder, imgFile);
    if (!fs.existsSync(filePath)) throw new Error(`Missing photo: ${filePath}`);
  }

  const existing = await client.fetch(`*[_type == "artwork" && slug.current == $slug][0]._id`, { slug: piece.slug });
  if (existing) {
    console.log(`Skipping "${piece.title}" — already exists (${existing}).`);
    continue;
  }
  if (dryRun) {
    console.log(`Would create "${piece.title}" (${piece.slug}) with ${piece.images.length} images.`);
    continue;
  }

  console.log(`Uploading images for "${piece.title}"...`);
  const imageRefs = [];
  for (const imgFile of piece.images) {
    const filePath = path.join(PHOTOS_ROOT, piece.folder, imgFile);
    const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
      filename: `${piece.slug}-${imgFile}`,
    });
    imageRefs.push({
      _type: 'image',
      _key: crypto.randomUUID(),
      asset: { _type: 'reference', _ref: asset._id },
    });
  }

  const created = await client.create({
    _type: 'artwork',
    title: piece.title,
    slug: { _type: 'slug', current: piece.slug },
    medium: 'oil-painting',
    materials: piece.materials,
    year: piece.year,
    dimensions: piece.dimensions,
    originalStatus: 'notForSale',
    images: imageRefs,
  });
  console.log(`Created "${piece.title}" -> ${created._id}`);
}

console.log('Done.');
