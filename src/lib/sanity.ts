import { sanityClient } from 'sanity:client';
import imageUrlBuilder from '@sanity/image-url';
import { toHTML } from '@portabletext/to-html';
import {
  ARTWORK_PROJECTION,
  MEDIUMS,
  mapArtwork,
  type Artwork,
  type Medium,
  type RawArtwork,
  type RawImage,
} from './artwork-map';
import { resolveHalos } from './halo';
import { measureEdge } from './halo-measure';
import { mapHomePage, type HomePage, type RawHomePage } from './home-page';
import { mapAboutPage, type AboutPage, type RawAboutPage } from './about-page';
import { mapSiteSettings, type RawSiteSettings, type SiteSettings } from './site-settings';
import { mapTattooInfo, type RawTattooInfo, type TattooInfo } from './tattoo-info';

export { MEDIUMS, mediumLabel } from './artwork-map';
export type { Artwork, HaloSetting, Medium, OriginalStatus, PrintOption, SeriesInfo, SeriesKind } from './artwork-map';
export type { AboutPage, HomePage, SiteSettings, TattooInfo };

export function formatMedium(medium: Medium): string {
  return medium.replace(/-/g, ' ');
}

export interface JournalPost {
  slug: string;
  title: string;
  date: string;
  coverImage: string;
  body: string;
}

interface RawJournalPost {
  slug: string;
  title: string;
  date: string;
  coverImage: RawImage | null;
  body: unknown[] | null;
}

const imageBuilder = imageUrlBuilder(sanityClient);

function urlFor(image: RawImage): string {
  return imageBuilder.image(image).url();
}

const toHtml = (blocks: unknown[]) => toHTML(blocks as never);

const PUBLISHED = '!(_id in path("drafts.**"))';

export async function getAllArtworks(): Promise<Artwork[]> {
  const raw: RawArtwork[] = await sanityClient.fetch(
    `*[_type == "artwork" && ${PUBLISHED}] | order(year desc) ${ARTWORK_PROJECTION}`
  );
  const artworks = raw.map((item) => mapArtwork(item, urlFor));
  const edges = await Promise.all(artworks.map((artwork) => measureEdge(artwork.images[0] ?? '')));
  const halos = resolveHalos(
    artworks.map((artwork, i) => ({
      slug: artwork.slug,
      haloSetting: artwork.haloSetting,
      series: artwork.series ? { slug: artwork.series.slug, halo: artwork.series.halo } : null,
      edge: edges[i],
    }))
  );
  return artworks.map((artwork) => ({ ...artwork, halo: halos.get(artwork.slug) ?? false }));
}

export async function getArtworksByMedium(medium: Medium): Promise<Artwork[]> {
  return (await getAllArtworks()).filter((artwork) => artwork.medium === medium);
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  return (await getAllArtworks()).find((artwork) => artwork.slug === slug) ?? null;
}

export async function getHomePage(): Promise<HomePage<Artwork>> {
  // `_id == "homePage"` matches only the published singleton (drafts are "drafts.homePage").
  const [raw, artworks] = await Promise.all([
    sanityClient.fetch<RawHomePage | null>(
      `*[_id == "homePage"][0]{ heroList, heroFootnote, "featuredSlugs": featuredWorks[]->slug.current }`
    ),
    getAllArtworks(),
  ]);
  return mapHomePage(raw, artworks);
}

export async function getAboutPage(): Promise<AboutPage> {
  const raw = await sanityClient.fetch<RawAboutPage | null>(
    `*[_id == "aboutPage"][0]{ portrait{ asset, hotspot }, portraitAlt, statement, body, photoCredit }`
  );
  return mapAboutPage(raw, {
    imageUrl: (image, width) =>
      imageBuilder
        .image(image as Parameters<typeof imageBuilder.image>[0])
        .width(width)
        .auto('format')
        .quality(80)
        .url(),
    toHtml,
  });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const raw = await sanityClient.fetch<RawSiteSettings | null>(
    `*[_id == "siteSettings"][0]{ email, instagramHandle, studioCity, tattooInstagramHandle, substackUrl }`
  );
  return mapSiteSettings(raw);
}

export async function getTattooInfo(): Promise<TattooInfo> {
  const raw = await sanityClient.fetch<RawTattooInfo | null>(
    `*[_type == "tattooInfo" && ${PUBLISHED}][0]{ statement, process, body, images }`
  );
  return mapTattooInfo(raw, { urlFor, toHtml });
}

const JOURNAL_PROJECTION = `{
  "slug": slug.current,
  title,
  date,
  coverImage,
  body
}`;

function mapJournalPost(raw: RawJournalPost): JournalPost {
  return {
    slug: raw.slug,
    title: raw.title,
    date: raw.date,
    coverImage: raw.coverImage ? urlFor(raw.coverImage) : '',
    body: raw.body ? toHtml(raw.body) : '',
  };
}

export async function getAllJournalPosts(): Promise<JournalPost[]> {
  const raw: RawJournalPost[] = await sanityClient.fetch(
    `*[_type == "journalPost" && ${PUBLISHED}] | order(date desc) ${JOURNAL_PROJECTION}`
  );
  return raw.map(mapJournalPost);
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const raw: RawJournalPost | null = await sanityClient.fetch(
    `*[_type == "journalPost" && slug.current == $slug && ${PUBLISHED}][0] ${JOURNAL_PROJECTION}`,
    { slug }
  );
  return raw ? mapJournalPost(raw) : null;
}
