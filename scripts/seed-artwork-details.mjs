// Wall-label details (materials, year, size) as given by Guillermo on 2026-09-24.
// Idempotent: sets the same values on every run. Overwrites these three fields only.
// Run ONLY with Guillermo's explicit OK:  npm run seed:details
// Requires SANITY_WRITE_TOKEN (Editor) in .env.
import { createClient } from '@sanity/client';

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

const OIL = 'Oil on canvas';
const HIDE = 'Tattoo on hide';

const DETAILS = {
  'motopirueta-1': { materials: OIL, year: 2025, dimensions: '120 × 150 cm' },
  'motopirueta-2': { materials: OIL, year: 2025, dimensions: '120 × 150 cm' },
  'motopirueta-3': { materials: OIL, year: 2026, dimensions: '120 × 150 cm' },
  'motopirueta-4': { materials: OIL, year: 2026, dimensions: '120 × 150 cm' },
  'johnny-efectivo': { materials: OIL, year: 2026, dimensions: '120 × 150 cm' },
  'violenta-i': { materials: OIL, year: 2026, dimensions: '105 × 60 cm' },
  'violenta-ii': { materials: OIL, year: 2026, dimensions: '105 × 60 cm' },
  'contemplacion-violenta-1': { materials: OIL, year: 2026, dimensions: '70 × 90 cm' },
  'contemplacion-violenta-2': { materials: OIL, year: 2026, dimensions: '140 × 90 cm' },
  'bajale-2-gallito': { materials: OIL, year: 2026, dimensions: '50 × 60 cm' },
  'perdi-el-coco-en-un-pueblo-caribeno': { materials: OIL, year: 2026, dimensions: '70 × 90 cm' },
  'pobrecita-la-vaquita-que-bonita-la-cartera': { materials: HIDE, year: 2026, dimensions: '100 × 100 cm' },
  'pobrecita-la-vaquita-que-bonita-la-cartera-invertido': { materials: HIDE, year: 2026, dimensions: '100 × 100 cm' },
};

const docs = await client.fetch(`*[_type == "artwork" && slug.current in $slugs]{ _id, "slug": slug.current }`, {
  slugs: Object.keys(DETAILS),
});
const missing = Object.keys(DETAILS).filter((slug) => !docs.some((doc) => doc.slug === slug));
if (missing.length) {
  console.error(`No artwork document for: ${missing.join(', ')}`);
  process.exit(1);
}

const tx = client.transaction();
for (const doc of docs) tx.patch(doc._id, (patch) => patch.set(DETAILS[doc.slug]));
await tx.commit();
console.log(`Set materials/year/dimensions on ${docs.length} artworks.`);
