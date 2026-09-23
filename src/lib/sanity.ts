import { sanityClient } from 'sanity:client';
import imageUrlBuilder from '@sanity/image-url';
import { toHTML } from '@portabletext/to-html';
import { mapHomePage, type HomePage, type RawHomePage, type RawPortrait } from './home-page';

export const MEDIUMS = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'] as const;
export type Medium = (typeof MEDIUMS)[number];

export function formatMedium(medium: Medium): string {
  return medium.replace(/-/g, ' ');
}

export interface PrintOption {
  size: string;
  price: number;
  stripePriceId: string;
}

export interface Artwork {
  slug: string;
  title: string;
  medium: Medium;
  year: number;
  dimensions: string;
  description: string;
  images: string[];
  availableAsOriginal: boolean;
  printOptions: PrintOption[];
}

export interface JournalPost {
  slug: string;
  title: string;
  date: string;
  coverImage: string;
  body: string;
}

export interface TattooInfo {
  body: string;
  images: string[];
}

interface RawImage {
  asset: { _ref: string; _type: string };
}

interface RawArtwork {
  slug: string;
  title: string;
  medium: Medium;
  year: number;
  dimensions: string;
  description: string;
  images: RawImage[];
  availableAsOriginal: boolean;
  printOptions: PrintOption[];
}

interface RawJournalPost {
  slug: string;
  title: string;
  date: string;
  coverImage: RawImage | null;
  body: unknown[];
}

interface RawTattooInfo {
  body: unknown[];
  images: RawImage[];
}

const imageBuilder = imageUrlBuilder(sanityClient);

function urlFor(image: RawImage): string {
  return imageBuilder.image(image).url();
}

function mapArtwork(raw: RawArtwork): Artwork {
  return {
    slug: raw.slug,
    title: raw.title,
    medium: raw.medium,
    year: raw.year,
    dimensions: raw.dimensions,
    description: raw.description,
    images: (raw.images ?? []).map(urlFor),
    availableAsOriginal: raw.availableAsOriginal,
    printOptions: raw.printOptions ?? [],
  };
}

function mapJournalPost(raw: RawJournalPost): JournalPost {
  return {
    slug: raw.slug,
    title: raw.title,
    date: raw.date,
    coverImage: raw.coverImage ? urlFor(raw.coverImage) : '',
    body: toHTML(raw.body as never),
  };
}

function mapTattooInfo(raw: RawTattooInfo | null): TattooInfo {
  if (!raw) {
    return { body: '', images: [] };
  }
  return {
    body: toHTML(raw.body as never),
    images: (raw.images ?? []).map(urlFor),
  };
}

const ARTWORK_PROJECTION = `{
  "slug": slug.current,
  title,
  medium,
  year,
  dimensions,
  description,
  images,
  availableAsOriginal,
  printOptions[]{size, price, stripePriceId}
}`;

export async function getAllArtworks(): Promise<Artwork[]> {
  const raw: RawArtwork[] = await sanityClient.fetch(
    `*[_type == "artwork" && !(_id in path("drafts.**"))] | order(year desc) ${ARTWORK_PROJECTION}`
  );
  return raw.map(mapArtwork);
}

export async function getArtworksByMedium(medium: Medium): Promise<Artwork[]> {
  const raw: RawArtwork[] = await sanityClient.fetch(
    `*[_type == "artwork" && medium == $medium && !(_id in path("drafts.**"))] | order(year desc) ${ARTWORK_PROJECTION}`,
    { medium }
  );
  return raw.map(mapArtwork);
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const raw: RawArtwork | null = await sanityClient.fetch(
    `*[_type == "artwork" && slug.current == $slug && !(_id in path("drafts.**"))][0] ${ARTWORK_PROJECTION}`,
    { slug }
  );
  return raw ? mapArtwork(raw) : null;
}

const JOURNAL_PROJECTION = `{
  "slug": slug.current,
  title,
  date,
  coverImage,
  body
}`;

export async function getAllJournalPosts(): Promise<JournalPost[]> {
  const raw: RawJournalPost[] = await sanityClient.fetch(
    `*[_type == "journalPost" && !(_id in path("drafts.**"))] | order(date desc) ${JOURNAL_PROJECTION}`
  );
  return raw.map(mapJournalPost);
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const raw: RawJournalPost | null = await sanityClient.fetch(
    `*[_type == "journalPost" && slug.current == $slug && !(_id in path("drafts.**"))][0] ${JOURNAL_PROJECTION}`,
    { slug }
  );
  return raw ? mapJournalPost(raw) : null;
}

export async function getTattooInfo(): Promise<TattooInfo> {
  const raw: RawTattooInfo | null = await sanityClient.fetch(
    `*[_type == "tattooInfo" && !(_id in path("drafts.**"))][0]{ body, images }`
  );
  return mapTattooInfo(raw);
}

export type HomePageContent = HomePage<Artwork>;

function portraitUrl(portrait: RawPortrait, width: number): string {
  return imageBuilder
    .image(portrait as Parameters<typeof imageBuilder.image>[0])
    .width(width)
    .auto('format')
    .quality(80)
    .url();
}

export async function getHomePage(): Promise<HomePageContent> {
  // `_id == "homePage"` matches only the published singleton (drafts are "drafts.homePage").
  const raw: RawHomePage<RawArtwork> | null = await sanityClient.fetch(
    `*[_id == "homePage"][0]{
      portrait{ asset, hotspot },
      portraitAlt,
      "featuredWorks": featuredWorks[]-> ${ARTWORK_PROJECTION}
    }`
  );
  return mapHomePage(raw, { portraitUrl, mapArtwork });
}
