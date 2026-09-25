// Pure mapping for the homePage singleton (spec §5.2). Free of `sanity:client`.

export const DEFAULT_HERO_LIST = ['Óleo', 'Tinta', 'Código'] as const;
export const DEFAULT_HERO_FOOTNOTE = 'Oil, ink and code, put in friction.';
const MAX_HERO_WORDS = 5;

export interface RawHomePage {
  heroList: (string | null)[] | null;
  heroFootnote: string | null;
  // `featuredWorks[]->slug.current` yields null for deleted/unpublished artworks.
  featuredSlugs: (string | null)[] | null;
}

export interface HomePage<Art> {
  heroList: string[];
  heroFootnote: string;
  featuredWorks: Art[];
}

export function mapHomePage<Art extends { slug: string }>(raw: RawHomePage | null, artworks: Art[]): HomePage<Art> {
  const words = (raw?.heroList ?? [])
    .map((word) => word?.trim() ?? '')
    .filter((word) => word.length > 0)
    .slice(0, MAX_HERO_WORDS);
  const bySlug = new Map(artworks.map((art) => [art.slug, art]));
  const seen = new Set<string>();
  const featuredWorks: Art[] = [];
  for (const slug of raw?.featuredSlugs ?? []) {
    const art = slug ? bySlug.get(slug) : undefined;
    if (!art || seen.has(art.slug)) continue;
    seen.add(art.slug);
    featuredWorks.push(art);
  }
  return {
    heroList: words.length > 0 ? words : [...DEFAULT_HERO_LIST],
    heroFootnote: raw?.heroFootnote?.trim() || DEFAULT_HERO_FOOTNOTE,
    featuredWorks,
  };
}
