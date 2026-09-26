// Built to /content-stamp.json: what this deploy rendered, for the daily
// rebuild check (see src/lib/content-stamp.ts).
import type { APIRoute } from 'astro';
import { sanityClient } from 'sanity:client';
import { getSiteSettings } from '../lib/sanity';
import { loadJournal } from '../lib/substack';
import { SANITY_STAMP_QUERY, journalStamp, sanityStamp, type ContentStamp, type RawSanityStamp } from '../lib/content-stamp';

export const GET: APIRoute = async () => {
  const [raw, settings] = await Promise.all([sanityClient.fetch<RawSanityStamp>(SANITY_STAMP_QUERY), getSiteSettings()]);
  // Same call as the Journal page, so the stamp matches what it shows.
  const posts = await loadJournal(settings.substackUrl, { required: import.meta.env.JOURNAL_FEED_REQUIRED === 'true' });
  const stamp: ContentStamp = { sanity: sanityStamp(raw), journal: journalStamp(posts) };
  return new Response(JSON.stringify(stamp), { headers: { 'Content-Type': 'application/json' } });
};
