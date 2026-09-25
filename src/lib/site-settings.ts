// Contact details used by the footer, nav and Contact page (spec §7).

export const DEFAULT_SITE_SETTINGS: {
  email: string;
  instagramHandle: string;
  studioCity: string;
  tattooInstagramHandle: string;
  substackUrl: string | null;
} = {
  email: 'gluk.caribe@gmail.com',
  instagramHandle: 'gluk______',
  studioCity: 'Ciudad de México',
  tattooInstagramHandle: 'gluk.tattooo',
  // Guillermo's Substack "Manchas de conciencia" (profile substack.com/@glukcaribe);
  // feed verified 2026-09-24 at https://glukcaribe.substack.com/feed.
  substackUrl: 'https://glukcaribe.substack.com',
};

export interface RawSiteSettings {
  email?: string | null;
  instagramHandle?: string | null;
  studioCity?: string | null;
  tattooInstagramHandle?: string | null;
  substackUrl?: string | null;
}

export interface SiteSettings {
  email: string;
  instagramHandle: string;
  instagramUrl: string;
  studioCity: string;
  tattooInstagramHandle: string;
  tattooInstagramUrl: string;
  substackUrl: string | null;
}

const cleanHandle = (value: string | null | undefined) => value?.trim().replace(/^@+/, '') || '';

// Only https addresses are used, reduced to their origin (the feed lives at <origin>/feed).
function cleanSubstackUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value?.trim() ?? '');
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function mapSiteSettings(raw: RawSiteSettings | null): SiteSettings {
  const handle = cleanHandle(raw?.instagramHandle) || DEFAULT_SITE_SETTINGS.instagramHandle;
  const tattooHandle = cleanHandle(raw?.tattooInstagramHandle) || DEFAULT_SITE_SETTINGS.tattooInstagramHandle;
  return {
    email: raw?.email?.trim() || DEFAULT_SITE_SETTINGS.email,
    instagramHandle: handle,
    instagramUrl: `https://www.instagram.com/${handle}/`,
    studioCity: raw?.studioCity?.trim() || DEFAULT_SITE_SETTINGS.studioCity,
    tattooInstagramHandle: tattooHandle,
    tattooInstagramUrl: `https://www.instagram.com/${tattooHandle}/`,
    substackUrl: cleanSubstackUrl(raw?.substackUrl) ?? DEFAULT_SITE_SETTINGS.substackUrl,
  };
}
