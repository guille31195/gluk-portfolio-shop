// One-time content seed: uploads the home-page portrait and creates the
// homePage singleton with its featured works. Run with: npm run seed:home
// Requires SANITY_WRITE_TOKEN (an Editor-level token) in .env.
// Safe to re-run: does nothing if the homePage document already exists
// (edit it in Studio instead).
import { createClient } from '@sanity/client';
import sharp from 'sharp';

const PORTRAIT_PATH = 'C:/Users/Guillermo/Desktop/cuadros HD/Gluk_Photoshoot-153.tif';
const PORTRAIT_ALT = 'Gluk, silhouetted between two studio lights';
// Centered on the silhouette in the 4240x2832 frame; adjustable in Studio.
const PORTRAIT_HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.5, y: 0.5, width: 0.35, height: 0.9 };
const FEATURED_SLUGS = [
  'motopirueta-1',
  'johnny-efectivo',
  'contemplacion-violenta-1',
  'bajale-2-gallito',
  'pobrecita-la-vaquita-que-bonita-la-cartera',
];

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing SANITY_WRITE_TOKEN in environment (add it to .env).');
  process.exit(1);
}

const existing = await client.fetch(`*[_id == "homePage"][0]._id`);
if (existing) {
  console.log('Skipping — homePage already exists. Edit it in Studio instead.');
  process.exit(0);
}

const artworks = await client.fetch(
  `*[_type == "artwork" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
  { slugs: FEATURED_SLUGS }
);
const idBySlug = new Map(artworks.map((a) => [a.slug, a._id]));
const missing = FEATURED_SLUGS.filter((slug) => !idBySlug.has(slug));
if (missing.length > 0) {
  console.error(`No published artwork found for: ${missing.join(', ')}. Run npm run seed:artworks first.`);
  process.exit(1);
}

console.log('Converting portrait TIFF to JPEG...');
const jpeg = await sharp(PORTRAIT_PATH).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();

console.log('Uploading portrait...');
const asset = await client.assets.upload('image', jpeg, {
  filename: 'gluk-portrait.jpg',
  contentType: 'image/jpeg',
});

const created = await client.createIfNotExists({
  _id: 'homePage',
  _type: 'homePage',
  portrait: {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    hotspot: PORTRAIT_HOTSPOT,
  },
  portraitAlt: PORTRAIT_ALT,
  featuredWorks: FEATURED_SLUGS.map((slug) => ({
    _type: 'reference',
    _ref: idBySlug.get(slug),
    _key: slug,
  })),
});
console.log(`Created homePage -> ${created._id}`);
