// Daily rebuild check (.github/workflows/daily-rebuild.yml): recompute the
// content stamp from Sanity + Substack, compare it with the live site's
// /content-stamp.json, and trigger the Netlify build hook only if it changed.
// Every deploy costs Netlify credits, so an unchanged day costs nothing.
// Env: NETLIFY_BUILD_HOOK_URL (required to deploy), SITE_URL, FORCE=true, DRY_RUN=true.
// Node 24 runs the imported .ts files directly (type stripping).
import { SANITY_STAMP_QUERY, STAMP_PATH, decide, journalStamp, sanityStamp } from '../src/lib/content-stamp.ts';
import { mapSiteSettings } from '../src/lib/site-settings.ts';
import { loadJournal } from '../src/lib/substack.ts';

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb';
const DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';
const API_VERSION = '2026-09-16'; // matches astro.config.mjs
const SITE_URL = (process.env.SITE_URL || 'https://thriving-halva-34e095.netlify.app').replace(/\/$/, '');
const HOOK = process.env.NETLIFY_BUILD_HOOK_URL;
const FORCE = process.env.FORCE === 'true';
const DRY_RUN = process.env.DRY_RUN === 'true';

async function groq(query) {
  // api (not apicdn), anonymous: the same view of the dataset the build gets.
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
  return (await res.json()).result;
}

async function liveStamp() {
  try {
    const res = await fetch(`${SITE_URL}${STAMP_PATH}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function main() {
  let decision;
  if (FORCE) {
    decision = { rebuild: true, reason: 'forced from the workflow' };
  } else {
    let raw, settings;
    try {
      [raw, settings] = await Promise.all([
        groq(SANITY_STAMP_QUERY),
        groq(`*[_id == "siteSettings"][0]{ email, instagramHandle, studioCity, tattooInstagramHandle, substackUrl }`),
      ]);
    } catch (error) {
      // Never deploy on a guess; tomorrow's run tries again.
      console.warn(`::warning::Could not read Sanity (${error.message}); skipping today.`);
      return;
    }
    let feedOk = true;
    const posts = await loadJournal(mapSiteSettings(settings).substackUrl, {
      warn: (message) => {
        feedOk = false;
        console.warn(`::warning::${message}`);
      },
    });
    const current = { sanity: sanityStamp(raw), journal: journalStamp(posts), feedOk };
    const live = await liveStamp();
    console.log('live:   ', JSON.stringify(live));
    console.log('current:', JSON.stringify(current));
    decision = decide(live, current);
  }

  console.log(`${decision.rebuild ? 'Rebuild' : 'No rebuild'}: ${decision.reason}`);
  if (!decision.rebuild || DRY_RUN) return;
  if (!HOOK) throw new Error('NETLIFY_BUILD_HOOK_URL is not set');
  const res = await fetch(HOOK, { method: 'POST', body: '{}', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Build hook HTTP ${res.status}`);
  console.log('Netlify build triggered.');
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
