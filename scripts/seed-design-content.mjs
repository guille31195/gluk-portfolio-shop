// Initial content for the visual design pass (spec §7). Idempotent: never
// overwrites anything Guillermo has edited in the Studio.
// Run ONLY with Guillermo's explicit OK:  npm run seed:design
// Requires SANITY_WRITE_TOKEN (Editor) in .env.
import { createClient } from '@sanity/client';
import sharp from 'sharp';

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

const SERIES = [
  { id: 'series-motopirueta', slug: 'motopirueta', name: 'Motopirueta', order: 1, kind: 'series',
    members: ['motopirueta-1', 'motopirueta-2', 'motopirueta-3', 'motopirueta-4'] },
  { id: 'series-violenta', slug: 'violenta', name: 'Violenta', order: 2, kind: 'diptych',
    members: ['violenta-i', 'violenta-ii'] },
  { id: 'series-contemplacion-violenta', slug: 'contemplacion-violenta', name: 'Contemplación Violenta', order: 3, kind: 'series',
    members: ['contemplacion-violenta-1', 'contemplacion-violenta-2'] },
  { id: 'series-pobrecita-la-vaquita', slug: 'pobrecita-la-vaquita', name: 'Pobrecita la vaquita, qué bonita la cartera', order: 4, kind: 'series',
    members: ['pobrecita-la-vaquita-que-bonita-la-cartera', 'pobrecita-la-vaquita-que-bonita-la-cartera-invertido'] },
];

const FEATURED_SLUGS = [
  'motopirueta-1',
  'johnny-efectivo',
  'contemplacion-violenta-1',
  'bajale-2-gallito',
  'pobrecita-la-vaquita-que-bonita-la-cartera',
];

// Shoot #82 (Gluk_Photoshoot-82.tif) from Guillermo's Drive folder. If the
// Drive download is refused, download the TIFF by hand and pass PORTRAIT_PATH.
const PORTRAIT_DRIVE_ID = '1Om7p2e091hAuBXNyY9hu6XXPNq5mqUWp';
const PORTRAIT_PATH = process.env.PORTRAIT_PATH;
const PORTRAIT_ALT = 'Portrait of GLUK in the studio';
const PHOTO_CREDIT = '@topomaseda';
// Confirmed by Guillermo 2026-09-24 (three o's).
const TATTOO_INSTAGRAM_HANDLE = 'gluk.tattooo';
// "Manchas de conciencia"; feed verified 2026-09-24.
const SUBSTACK_URL = 'https://glukcaribe.substack.com';

const slugs = SERIES.flatMap((s) => s.members).concat(FEATURED_SLUGS);
const artworks = await client.fetch(
  `*[_type == "artwork" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current, series }`,
  { slugs }
);
const bySlug = new Map(artworks.map((a) => [a.slug, a]));
const missing = [...new Set(slugs)].filter((slug) => !bySlug.has(slug));
if (missing.length > 0) {
  console.error(`No published artwork for: ${missing.join(', ')}. Aborting — nothing written.`);
  process.exit(1);
}

const tx = client.transaction();
for (const s of SERIES) {
  tx.createIfNotExists({
    _id: s.id,
    _type: 'series',
    name: s.name,
    slug: { _type: 'slug', current: s.slug },
    order: s.order,
    kind: s.kind,
    halo: 'auto',
  });
  s.members.forEach((slug, i) => {
    const art = bySlug.get(slug);
    if (art.series) return; // already assigned in the Studio — leave it
    tx.patch(art._id, (p) => p.set({ series: { _type: 'reference', _ref: s.id }, seriesPosition: i + 1 }));
  });
}
tx.createIfNotExists({
  _id: 'siteSettings',
  _type: 'siteSettings',
  email: 'gluk.caribe@gmail.com',
  instagramHandle: 'gluk______',
  studioCity: 'Ciudad de México',
});
tx.patch('siteSettings', (p) =>
  p.setIfMissing({
    tattooInstagramHandle: TATTOO_INSTAGRAM_HANDLE,
    ...(SUBSTACK_URL ? { substackUrl: SUBSTACK_URL } : {}),
  })
);
tx.createIfNotExists({
  _id: 'homePage',
  _type: 'homePage',
  heroList: ['Óleo', 'Tinta', 'Código'],
  heroFootnote: 'Oil, ink and code, put in friction.',
  featuredWorks: FEATURED_SLUGS.map((slug) => ({ _type: 'reference', _ref: bySlug.get(slug)._id, _key: slug })),
});
tx.patch('homePage', (p) =>
  p.setIfMissing({
    heroList: ['Óleo', 'Tinta', 'Código'],
    heroFootnote: 'Oil, ink and code, put in friction.',
  })
);
const result = await tx.commit();
console.log(`Series, artwork assignments, settings and home page: ${result.results.length} operations.`);

const about = await client.fetch(`*[_id == "aboutPage"][0]{ _id, "hasPortrait": defined(portrait.asset) }`);
if (about?.hasPortrait) {
  console.log('aboutPage already has a portrait — skipped.');
} else {
  let source = PORTRAIT_PATH;
  if (!source) {
    console.log('Downloading shoot #82 from Google Drive...');
    const res = await fetch(`https://drive.usercontent.google.com/download?id=${PORTRAIT_DRIVE_ID}&export=download&confirm=t`);
    const tiff = Buffer.from(await res.arrayBuffer());
    const magic = tiff.subarray(0, 4).toString('hex');
    if (!res.ok || (magic !== '49492a00' && magic !== '4d4d002a')) {
      console.error('Drive did not return the TIFF. Download Gluk_Photoshoot-82.tif manually and re-run with PORTRAIT_PATH=<file>.');
      process.exit(1);
    }
    source = tiff;
  }
  const jpeg = await sharp(source).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const asset = await client.assets.upload('image', jpeg, { filename: 'gluk-about-82.jpg', contentType: 'image/jpeg' });
  await client.createIfNotExists({ _id: 'aboutPage', _type: 'aboutPage' });
  await client
    .patch('aboutPage')
    .setIfMissing({ portraitAlt: PORTRAIT_ALT })
    .set({ portrait: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } })
    .commit();
  console.log(`aboutPage portrait uploaded -> ${asset._id}`);
}

// Shoot #82 photographer (confirmed by Guillermo 2026-09-24). Never overwrites a credit set in Studio.
await client.createIfNotExists({ _id: 'aboutPage', _type: 'aboutPage' });
await client.patch('aboutPage').setIfMissing({ photoCredit: PHOTO_CREDIT }).commit();
