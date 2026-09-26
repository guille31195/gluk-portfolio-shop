// A fingerprint of everything a build renders from outside the repo: Sanity
// content and the newest Substack post. Each build publishes it at STAMP_PATH;
// the daily workflow (scripts/rebuild-if-changed.mjs) recomputes it and only
// triggers a Netlify deploy (15 credits) when the two differ.
// No runtime imports: the workflow runs this file directly with Node.

export const STAMP_PATH = '/content-stamp.json';

// Deleting a document lowers the count even when the latest edit doesn't move.
export const SANITY_STAMP_QUERY = `{ "count": count(*), "latest": *[] | order(_updatedAt desc)[0]._updatedAt }`;

export interface ContentStamp {
  sanity: string;
  journal: string | null;
}

export interface RawSanityStamp {
  count: number;
  latest: string | null;
}

export function sanityStamp(raw: RawSanityStamp): string {
  return `${raw.count}@${raw.latest ?? 'none'}`;
}

// Entries arrive newest first (parseFeed sorts them).
export function journalStamp(entries: readonly { url: string }[]): string | null {
  return entries[0]?.url ?? null;
}

export interface Decision {
  rebuild: boolean;
  reason: string;
}

const isStamp = (value: unknown): value is ContentStamp =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ContentStamp).sanity === 'string' &&
  ((value as ContentStamp).journal === null || typeof (value as ContentStamp).journal === 'string');

// feedOk is false when Substack couldn't be read: an empty journal then means
// "unknown", not "changed", so it never triggers a deploy on its own.
export function decide(live: unknown, current: ContentStamp & { feedOk: boolean }): Decision {
  if (!isStamp(live)) return { rebuild: true, reason: 'live site has no content stamp' };
  if (live.sanity !== current.sanity) return { rebuild: true, reason: 'Sanity content changed' };
  if (current.feedOk && live.journal !== current.journal) return { rebuild: true, reason: 'new Substack post' };
  return { rebuild: false, reason: 'no content changes' };
}
