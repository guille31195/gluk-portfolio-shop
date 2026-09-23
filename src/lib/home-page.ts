// Pure mapping for the homePage singleton. Kept free of `sanity:client` so it
// can be unit-tested; src/lib/sanity.ts supplies the image URL builder and
// artwork mapper.

export interface RawPortrait {
  asset: { _ref: string; _type: string } | null;
  hotspot?: { x: number; y: number } | null;
}

export interface RawHomePage<RawArt> {
  portrait: RawPortrait | null;
  portraitAlt: string | null;
  // `featuredWorks[]->` yields null for references to deleted/unpublished artworks.
  featuredWorks: (RawArt | null)[] | null;
}

export interface Portrait {
  src: string;
  srcset: string;
  alt: string;
  focalPoint: string;
}

export interface HomePage<Art> {
  portrait: Portrait | null;
  featuredWorks: Art[];
}

export interface HomePageDeps<RawArt, Art> {
  portraitUrl: (portrait: RawPortrait, width: number) => string;
  mapArtwork: (raw: RawArt) => Art;
}

export const PORTRAIT_WIDTHS = [640, 1024, 1600, 2400] as const;
const PORTRAIT_DEFAULT_WIDTH = 1600;
const PORTRAIT_FALLBACK_ALT = 'GLUK';

function toPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function focalPoint(hotspot: RawPortrait['hotspot']): string {
  if (!hotspot) return '50% 50%';
  return `${toPercent(hotspot.x)} ${toPercent(hotspot.y)}`;
}

function mapPortrait<RawArt, Art>(
  raw: RawHomePage<RawArt>,
  deps: HomePageDeps<RawArt, Art>
): Portrait | null {
  const portrait = raw.portrait;
  if (!portrait?.asset) return null;
  return {
    src: deps.portraitUrl(portrait, PORTRAIT_DEFAULT_WIDTH),
    srcset: PORTRAIT_WIDTHS.map((w) => `${deps.portraitUrl(portrait, w)} ${w}w`).join(', '),
    alt: raw.portraitAlt?.trim() || PORTRAIT_FALLBACK_ALT,
    focalPoint: focalPoint(portrait.hotspot),
  };
}

export function mapHomePage<RawArt, Art>(
  raw: RawHomePage<RawArt> | null,
  deps: HomePageDeps<RawArt, Art>
): HomePage<Art> {
  if (!raw) return { portrait: null, featuredWorks: [] };
  return {
    portrait: mapPortrait(raw, deps),
    featuredWorks: (raw.featuredWorks ?? [])
      .filter((work): work is RawArt => work !== null)
      .map(deps.mapArtwork),
  };
}
