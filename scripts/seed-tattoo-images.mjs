// Uploads every image in TATTOO_DIR to Tattoo Info (spec §5.6), in file-name order.
// Idempotent: Sanity stores identical files once, and refs already on the document
// are skipped. Run ONLY with Guillermo's explicit OK:
//   TATTOO_DIR="C:/path/to/folder" npm run seed:tattoo
import { createClient } from '@sanity/client';
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.env.TATTOO_DIR;
if (!process.env.SANITY_WRITE_TOKEN || !dir) {
  console.error('Needs SANITY_WRITE_TOKEN in .env and TATTOO_DIR=<folder>.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

// Selection for the Tattoo page, in display order (chosen 2026-09-24 from the
// numbered contact sheet 05 AI/CLAUDE CODE/workspace/tattoo-contact-sheet.jpg;
// no client faces). Empty array → upload every image in file-name order.
const SELECTION = [
  '09040FBE-9AF6-47E8-82BD-33EE903791B3.JPG', //  1 key and head, chest
  '9F2D380B-68E6-4D0A-BFFF-6702A61E2224.JPG', // 17 profile with red sun, upper arm
  'D7AC3EA1-68CD-4932-B377-4BB9BD01B649.JPG', // 26 tiger head
  'AA4C2964-88F3-433D-9C80-F32249B7495B.JPG', // 20 surreal hand, thigh
  'BBB9F582-DECD-444A-81A1-FB94657298F6.JPG', // 24 red mushroom, calf
  'A3EBA439-8548-4017-8049-5661074E7637.JPG', // 18 dotwork face, forearm
  'DB64DE05-F578-4F74-AADC-00F73BE4F34E.JPG', // 27 lighthouse landscape, upper arm
  '79352105-0C29-4E9F-BEDF-9F524540E6D7.JPG', // 12 switchblade, shin
];

const onDisk = new Set(await readdir(dir));
const missing = SELECTION.filter((name) => !onDisk.has(name));
if (missing.length) {
  console.error(`Not found in ${dir}: ${missing.join(', ')}`);
  process.exit(1);
}
const files =
  SELECTION.length > 0
    ? SELECTION
    : [...onDisk]
        .filter((name) => /\.(jpe?g|png|tiff?|webp)$/i.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const skipped = (await readdir(dir)).filter((name) => /\.(heic|heif)$/i.test(name));
if (skipped.length) console.warn(`Skipped (HEIC not supported — export as JPEG): ${skipped.join(', ')}`);
if (files.length === 0) {
  console.error(`No JPEG/PNG/TIFF/WebP images in ${dir}.`);
  process.exit(1);
}

const existing = await client.fetch(`*[_type == "tattooInfo" && !(_id in path("drafts.**"))][0]{ _id, "refs": images[].asset._ref }`);
const docId = existing?._id ?? 'tattooInfo';
const have = new Set(existing?.refs ?? []);
await client.createIfNotExists({ _id: docId, _type: 'tattooInfo' });

const added = [];
for (const name of files) {
  const jpeg = await sharp(join(dir, name)).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const asset = await client.assets.upload('image', jpeg, { filename: name.replace(/\.[^.]+$/, '.jpg'), contentType: 'image/jpeg' });
  if (have.has(asset._id)) continue;
  have.add(asset._id);
  added.push({ _type: 'image', _key: asset._id.slice(-12), asset: { _type: 'reference', _ref: asset._id } });
}
if (added.length) {
  await client.patch(docId).setIfMissing({ images: [] }).append('images', added).commit();
}
console.log(`Tattoo Info: ${added.length} new image(s), ${files.length - added.length} already present.`);
