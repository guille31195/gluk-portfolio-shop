// One-time content seed: uploads artwork photos and creates matching Sanity
// documents. Run with: npm run seed:artworks
// Requires SANITY_WRITE_TOKEN (an Editor-level token) in .env.
import { createClient } from '@sanity/client';
import fs from 'node:fs';
import path from 'node:path';

const PHOTOS_ROOT = 'C:/Users/Guillermo/Desktop/cuadros HD';

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const pieces = [
  { folder: 'motopirueta-1', title: 'Motopirueta 1', medium: 'oil-painting', images: ['motopirueta-1.jpg'] },
  { folder: 'motopirueta-2', title: 'Motopirueta 2', medium: 'oil-painting', images: ['motopirueta-2.jpg'] },
  { folder: 'motopirueta-3', title: 'Motopirueta 3', medium: 'oil-painting', images: ['motopirueta-3.jpg'] },
  { folder: 'motopirueta-4', title: 'Motopirueta 4', medium: 'oil-painting', images: ['motopirueta-4.jpg'] },
  { folder: 'johnny-efectivo', title: 'Johnny Efectivo', medium: 'oil-painting', images: ['johnny-efectivo.jpg'] },
  { folder: 'contemplacion-violenta-1', title: 'Contemplación Violenta 1', medium: 'oil-painting', images: ['contemplacion-violenta-1.jpg'] },
  { folder: 'contemplacion-violenta-2', title: 'Contemplación Violenta 2', medium: 'oil-painting', images: ['contemplacion-violenta-2.jpg'] },
  { folder: 'violenta-i', title: 'Violenta I', medium: 'oil-painting', images: ['violenta-i.jpg'] },
  { folder: 'violenta-ii', title: 'Violenta II', medium: 'oil-painting', images: ['violenta-ii.jpg'] },
  { folder: 'bajale-2-gallito', title: 'Bájale 2 Gallito', medium: 'oil-painting', images: ['bajale-2-gallito.jpg'] },
  { folder: 'perdi-el-coco-en-un-pueblo-caribeno', title: 'Perdí el coco en un pueblo caribeño', medium: 'oil-painting', images: ['perdi-el-coco-en-un-pueblo-caribeno.jpg'] },
  { folder: 'pobrecita-la-vaquita-que-bonita-la-cartera', title: 'Pobrecita la vaquita, qué bonita la cartera', medium: 'mixed-media', images: ['full.jpg', 'detail.jpg'] },
  { folder: 'pobrecita-la-vaquita-que-bonita-la-cartera-invertido', title: 'Pobrecita la vaquita, qué bonita la cartera (invertido)', medium: 'mixed-media', images: ['full.jpg', 'full-alt.jpg', 'detail.jpg'] },
];

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing SANITY_WRITE_TOKEN in environment (add it to .env).');
  process.exit(1);
}

for (const piece of pieces) {
  const existing = await client.fetch(`*[_type == "artwork" && slug.current == $slug][0]._id`, { slug: piece.folder });
  if (existing) {
    console.log(`Skipping "${piece.title}" — already exists (${existing}).`);
    continue;
  }

  console.log(`Uploading images for "${piece.title}"...`);
  const imageRefs = [];
  for (const imgFile of piece.images) {
    const filePath = path.join(PHOTOS_ROOT, piece.folder, imgFile);
    const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
      filename: `${piece.folder}-${imgFile}`,
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
    slug: { _type: 'slug', current: piece.folder },
    medium: piece.medium,
    images: imageRefs,
  });
  console.log(`Created "${piece.title}" -> ${created._id}`);
}

console.log('Done.');
