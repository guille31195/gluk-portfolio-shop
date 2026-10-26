// Loud checker for print data: run with `npm run check:prints`. Read-only.
// Prints, per artwork, the parsed dimensions and derived print sizes, and exits
// non-zero when dimensions cannot be parsed or an image's proportions differ from
// them by more than 2%. The site build never fails on this; bad data just gets no offer.
import { createClient } from '@sanity/client';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const lib = (file) => import(pathToFileURL(path.resolve('src/lib/prints', file)).href);
const { parseDimensions, printSizes, sizeLabel } = await lib('print-sizes.ts');

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

const TOLERANCE = 0.02;

const artworks = await client.fetch(`*[_type == "artwork"] | order(title asc){
  title,
  dimensions,
  printPriceLarge,
  printPriceSmall,
  "image": images[0].asset->metadata.dimensions{width, height}
}`);

const rows = artworks.map((a) => {
  const flags = [];
  const dims = parseDimensions(a.dimensions);
  const valid = dims && dims.widthCm > 0 && dims.heightCm > 0;
  if (!valid) flags.push(a.dimensions ? 'UNPARSEABLE DIMENSIONS' : 'no dimensions');
  const sizes = valid ? printSizes(dims.widthCm, dims.heightCm) : null;
  if (valid && a.image?.width && a.image?.height) {
    const stated = dims.widthCm / dims.heightCm;
    const actual = a.image.width / a.image.height;
    if (Math.abs(actual - stated) / stated > TOLERANCE) {
      flags.push(`ASPECT MISMATCH (image ${actual.toFixed(3)} vs stated ${stated.toFixed(3)})`);
    }
  }
  if (!a.printPriceLarge && !a.printPriceSmall) flags.push('no prices');
  return {
    title: a.title,
    dimensions: a.dimensions ?? '',
    parsed: valid ? `${dims.widthCm} × ${dims.heightCm}` : '-',
    large: sizes ? `${sizeLabel(sizes.large)}${a.printPriceLarge ? ` $${a.printPriceLarge}` : ''}` : '-',
    small: sizes ? `${sizeLabel(sizes.small)}${a.printPriceSmall ? ` $${a.printPriceSmall}` : ''}` : '-',
    flags: flags.join('; '),
  };
});

console.table(rows);

const problems = rows.filter((r) => /UNPARSEABLE|ASPECT/.test(r.flags));
if (problems.length) {
  console.error(`\n${problems.length} piece(s) with print data problems.`);
  process.exit(1);
}
