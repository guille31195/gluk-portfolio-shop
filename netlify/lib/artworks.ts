import type { SanityClient } from '@sanity/client';
import { mediumLabel, type Medium } from '../../src/lib/artwork-map';

// What checkout and stock need to know about a piece, read live from Sanity.
// `medium` is the label the wall label shows: materials, else the medium name.
export type PrintableArtwork = {
  slug: string;
  title: string;
  year: number | null;
  medium: string;
  dimensions: string | null;
  printPriceLarge: number | null;
  printPriceSmall: number | null;
};

export type ArtworkReader = (slug: string) => Promise<PrintableArtwork | null>;

export const SLUG_PATTERN = /^[a-z0-9-]+$/;

const QUERY = `*[_type == "artwork" && slug.current == $slug][0]{
  "slug": slug.current,
  title,
  year,
  medium,
  materials,
  dimensions,
  printPriceLarge,
  printPriceSmall
}`;

type Raw = Omit<PrintableArtwork, 'medium'> & { medium: Medium | null; materials: string | null };

export function sanityArtworkReader(client: SanityClient): ArtworkReader {
  return async (slug) => {
    const raw = await client.fetch<Raw | null>(QUERY, { slug });
    if (!raw) return null;
    return {
      slug: raw.slug,
      title: raw.title,
      year: raw.year ?? null,
      medium: raw.materials || (raw.medium ? mediumLabel(raw.medium) : ''),
      dimensions: raw.dimensions ?? null,
      printPriceLarge: raw.printPriceLarge ?? null,
      printPriceSmall: raw.printPriceSmall ?? null,
    };
  };
}
