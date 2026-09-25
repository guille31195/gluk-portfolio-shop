// Artwork types and the pure raw→view mapping. Free of `sanity:client` so it can
// be unit-tested; src/lib/sanity.ts supplies the image URL builder.

export const MEDIUMS = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'] as const;
export type Medium = (typeof MEDIUMS)[number];
export type HaloSetting = 'auto' | 'always' | 'never';
export type SeriesKind = 'series' | 'diptych';

const HALO_SETTINGS: readonly HaloSetting[] = ['auto', 'always', 'never'];

// available → "Inquire"; sold → "Sold"; notForSale → the Original block is hidden.
export type OriginalStatus = 'available' | 'sold' | 'notForSale';
const ORIGINAL_STATUSES: readonly OriginalStatus[] = ['available', 'sold', 'notForSale'];

export interface SeriesInfo {
  slug: string;
  name: string;
  order: number;
  kind: SeriesKind;
  halo: HaloSetting;
}

export interface PrintOption {
  size: string;
  price: number;
  stripePriceId: string;
  soldOut: boolean;
}

export interface RawPrintOption {
  size: string;
  price: number;
  stripePriceId: string;
  soldOut: boolean | null;
}

export interface Artwork {
  slug: string;
  title: string;
  medium: Medium;
  materials: string | null;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  images: string[];
  originalStatus: OriginalStatus;
  printOptions: PrintOption[];
  series: SeriesInfo | null;
  seriesPosition: number | null;
  haloSetting: HaloSetting;
  // Resolved at build time from edge measurement + series rule (src/lib/halo.ts).
  halo: boolean;
}

export interface RawImage {
  asset: { _ref: string; _type: string };
}

export interface RawSeries {
  slug: string | null;
  name: string | null;
  order: number | null;
  kind: string | null;
  halo: string | null;
}

export interface RawArtwork {
  slug: string;
  title: string;
  medium: Medium;
  materials: string | null;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  images: RawImage[] | null;
  originalStatus: string | null;
  // Legacy checkbox, read only as a fallback for documents edited before originalStatus.
  availableAsOriginal: boolean | null;
  printOptions: RawPrintOption[] | null;
  series: RawSeries | null;
  seriesPosition: number | null;
  haloSetting: string | null;
}

// Keep in sync with RawArtwork.
export const ARTWORK_PROJECTION = `{
  "slug": slug.current,
  title,
  medium,
  materials,
  year,
  dimensions,
  description,
  images,
  originalStatus,
  availableAsOriginal,
  printOptions[]{size, price, stripePriceId, soldOut},
  "series": series->{ "slug": slug.current, name, order, kind, halo },
  seriesPosition,
  "haloSetting": halo
}`;

function haloSetting(value: string | null | undefined): HaloSetting {
  return HALO_SETTINGS.includes(value as HaloSetting) ? (value as HaloSetting) : 'auto';
}

function originalStatus(raw: RawArtwork): OriginalStatus {
  if (ORIGINAL_STATUSES.includes(raw.originalStatus as OriginalStatus)) return raw.originalStatus as OriginalStatus;
  return raw.availableAsOriginal ? 'available' : 'notForSale';
}

function mapSeries(raw: RawSeries | null): SeriesInfo | null {
  if (!raw?.slug || !raw.name) return null;
  return {
    slug: raw.slug,
    name: raw.name,
    order: raw.order ?? 999,
    kind: raw.kind === 'diptych' ? 'diptych' : 'series',
    halo: haloSetting(raw.halo),
  };
}

export function mapArtwork(raw: RawArtwork, urlFor: (image: RawImage) => string): Artwork {
  const series = mapSeries(raw.series);
  return {
    slug: raw.slug,
    title: raw.title,
    medium: raw.medium,
    materials: raw.materials ?? null,
    year: raw.year ?? null,
    dimensions: raw.dimensions ?? null,
    description: raw.description ?? null,
    images: (raw.images ?? []).map(urlFor),
    originalStatus: originalStatus(raw),
    printOptions: (raw.printOptions ?? []).map((option) => ({ ...option, soldOut: option.soldOut ?? false })),
    series,
    seriesPosition: series ? (raw.seriesPosition ?? null) : null,
    haloSetting: haloSetting(raw.haloSetting),
    halo: false,
  };
}

export function mediumLabel(medium: Medium): string {
  const words = medium.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
