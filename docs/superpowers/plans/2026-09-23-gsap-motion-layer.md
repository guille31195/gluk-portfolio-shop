# GSAP Motion Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calm, site-wide Gluk motion language (GSAP + ScrollTrigger, Astro view transitions, custom cursor) and a new home page (full-screen portrait hero + curated featured works) driven by a new Sanity `homePage` singleton.

**Architecture:** Astro's `<ClientRouter />` handles page-to-page transitions (crossfade + grid→detail image morph via `transition:name`). All in-page motion is GSAP, organised in `src/motion/`: a pure, unit-tested lifecycle registry runs global and per-page setup functions on `astro:page-load` inside a `gsap.matchMedia()` scope (which also centralises reduced-motion) and reverts them on `astro:before-swap`. Elements opt into motion with data attributes (`data-intro`, `data-reveal`, `data-reveal-stagger`, `data-cursor`).

**Tech Stack:** Astro 7.3 (`astro:transitions`), GSAP 3.15 (already installed; `gsap/ScrollTrigger`), Sanity v6 schema + `@sanity/client`, `sharp` (seed-script image conversion), vitest 5 (node environment, no DOM library).

**Spec:** `docs/superpowers/specs/2026-09-23-gsap-motion-design.md`

## Global Constraints

- Motion values come only from `src/motion/tokens.ts` — no hard-coded durations/eases in modules (CSS-only hover transitions use `0.4s`–`0.8s` with `cubic-bezier(0.16, 1, 0.3, 1)`, the CSS equivalent of the signature ease).
- Animate only `transform`, `opacity`/`visibility` (`autoAlpha`), and `clip-path`.
- Never animate prices, buttons, or form fields. Never tint/distort paintings; the only scale on a painting is the `1.03` hover.
- Always use `gsap.fromTo` (not `gsap.from`) for elements hidden by the `js-motion` CSS guard — `from` would read the CSS-hidden state as its end value.
- Every animation is created inside a lifecycle setup function (so it's reverted on navigation). The only exception is the persistent cursor.
- Reduced motion (`(prefers-reduced-motion: reduce)`): opacity-only fades, no translate/scale/parallax/scrub, no custom cursor.
- Cursor only when `(hover: hover) and (pointer: fine)` matches and reduced motion is off.
- Sanity writes (seed script) and `git push` / `npx sanity deploy` require Guillermo's explicit confirmation — implementers must NOT run them.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Environment: Windows 11, Git Bash, forward-slash paths.
- Gates for every task: `npm run check`, `npm test`, `npm run build` all pass.

## Review Focus

1. **Scripts blocked or the motion bundle fails to load** → every page must still show all content (no permanently hidden `[data-reveal]`/`[data-intro]` elements). Pinned by the manual guard check in Task 5 Step 7 and Task 10.
2. **Back/forward and repeated navigation between the same pages** → no element left hidden, no duplicated ScrollTriggers/animations, page modules run once per visit. Pinned by lifecycle unit tests in Task 4 and the navigation checks in Task 10.
3. **Home page with no `homePage` document, no portrait, empty or dangling featured list** (the real state before seeding, or after an artwork is deleted) → page renders cleanly with only what exists. Pinned by mapper tests in Task 2 and the pre-seed build check in Task 7.
4. **Reduced-motion users** → nothing translates/scales/scrubs, no custom cursor. Pinned by `shouldEnableCursor` tests in Task 4 and the emulation check in Task 10.
5. **Touch devices** → no custom cursor code loaded, native cursor never hidden. Pinned by `shouldEnableCursor` tests in Task 4 and the mobile check in Task 10.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `sanity/schemaTypes/homePage.ts` | Create | `homePage` singleton schema |
| `sanity/schemaTypes/index.ts` | Modify | register `homePage` |
| `sanity/structure.ts` | Modify | pin Home Page as fixed document |
| `src/lib/home-page.ts` | Create | pure `homePage` raw→view mapping (no `sanity:client` import, unit-testable) |
| `src/lib/home-page.test.ts` | Create | mapper tests |
| `src/lib/sanity.ts` | Modify | `getHomePage()` + portrait URL builder |
| `scripts/seed-home-page.mjs` | Create | idempotent seed of portrait + featured works |
| `package.json` | Modify | `seed:home` script, `sharp` devDependency |
| `src/motion/tokens.ts` | Create | motion vocabulary |
| `src/motion/media.ts` | Create | media-query helpers (reduced motion, fine pointer) |
| `src/motion/media.test.ts` | Create | helper tests |
| `src/motion/lifecycle.ts` | Create | pure page-load/before-swap registry |
| `src/motion/lifecycle.test.ts` | Create | lifecycle tests |
| `src/motion/runtime.ts` | Create | browser singleton wiring lifecycle to `document` + `gsap.matchMedia` |
| `src/motion/reveal.ts` | Create | global `setupIntro` + `setupReveal` |
| `src/motion/home-hero.ts` | Create | home opening + hero scroll |
| `src/motion/cursor.ts` | Create | cursor behaviour |
| `src/components/Cursor.astro` | Create | persisted cursor markup/styles/loader |
| `src/env.d.ts` | Modify | `Window.__glukMotionReady` |
| `src/styles/theme.css` | Modify | `js-motion` guard CSS |
| `src/layouts/BaseLayout.astro` | Modify | ClientRouter, guard script, runtime + globals, cursor, `overlayNav` |
| `src/components/Nav.astro` | Modify | underline hover, overlay variant |
| `src/pages/index.astro` | Modify | hero + featured works |
| `src/components/ArtworkCard.astro` | Modify | reveal/cursor/morph/hover |
| `src/pages/portfolio/index.astro`, `src/pages/portfolio/[medium].astro` | Modify | stagger group + intro |
| `src/pages/artwork/[slug].astro` | Modify | morph target, intro sequence, gallery crossfade |
| `src/pages/about.astro`, `tattoo.astro`, `contact.astro`, `journal/index.astro`, `journal/[slug].astro` | Modify | intro/reveal attributes |

---

### Task 1: `homePage` singleton schema

**Files:**
- Create: `sanity/schemaTypes/homePage.ts`
- Modify: `sanity/schemaTypes/index.ts`
- Modify: `sanity/structure.ts`

**Interfaces:**
- Produces: Sanity document type `homePage` with fixed `_id: "homePage"` and fields `portrait` (image, hotspot), `portraitAlt` (string), `featuredWorks` (array of `reference` → `artwork`). Task 2 queries these exact field names; Task 3 writes them.

- [ ] **Step 1: Create the schema**

`sanity/schemaTypes/homePage.ts`:

```ts
import { defineType, defineField } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'image',
      description:
        'Full-screen photo at the top of the home page. Set the hotspot on the subject — phones crop around it.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'portraitAlt',
      title: 'Portrait alt text',
      type: 'string',
      description: 'Describes the photo for screen readers.',
      validation: (Rule) =>
        Rule.custom((alt, context) => {
          const doc = context.document as { portrait?: { asset?: unknown } } | undefined;
          if (doc?.portrait?.asset && !alt?.trim()) {
            return 'Alt text is required when a portrait is set.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'featuredWorks',
      title: 'Featured works',
      type: 'array',
      description: 'Shown on the home page in this order.',
      of: [{ type: 'reference', to: [{ type: 'artwork' }] }],
      validation: (Rule) => [
        Rule.max(5),
        Rule.unique(),
        Rule.min(3).warning('Feature at least 3 works so the home page feels complete.'),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
```

- [ ] **Step 2: Register it**

`sanity/schemaTypes/index.ts` — full file:

```ts
import { artwork } from './artwork';
import { printOption } from './printOption';
import { journalPost } from './journalPost';
import { tattooInfo } from './tattooInfo';
import { homePage } from './homePage';

export const schemaTypes = [artwork, printOption, journalPost, tattooInfo, homePage];
```

- [ ] **Step 3: Pin it in the Studio structure (same pattern as Tattoo Info)**

`sanity/structure.ts` — full file:

```ts
import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Home Page')
        .child(
          S.document().schemaType('homePage').documentId('homePage')
        ),
      S.documentTypeListItem('artwork').title('Artwork'),
      S.documentTypeListItem('journalPost').title('Journal Posts'),
      S.listItem()
        .title('Tattoo Info')
        .child(
          S.document().schemaType('tattooInfo').documentId('tattooInfo')
        ),
    ]);
```

- [ ] **Step 4: Validate**

Run: `npx sanity schema validate`
Expected: no errors (warnings about unrelated existing types are acceptable; report them).

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add sanity/schemaTypes/homePage.ts sanity/schemaTypes/index.ts sanity/structure.ts
git commit -m "Add homePage singleton schema for portrait and featured works

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Note: the deployed Studio only shows the new document after `npx sanity deploy`, which needs Guillermo's login — do NOT run it; it's a post-merge step.

---

### Task 2: Home page data mapping + `getHomePage()`

**Files:**
- Create: `src/lib/home-page.ts`
- Create: `src/lib/home-page.test.ts`
- Modify: `src/lib/sanity.ts` (imports at top; new function after `getTattooInfo`)

**Interfaces:**
- Consumes: `homePage` fields from Task 1; existing `mapArtwork`, `ARTWORK_PROJECTION`, `RawArtwork`, `Artwork`, `imageBuilder` in `src/lib/sanity.ts`.
- Produces:
  - `src/lib/home-page.ts`: `interface Portrait { src: string; srcset: string; alt: string; focalPoint: string }`, `interface HomePage<Art> { portrait: Portrait | null; featuredWorks: Art[] }`, `interface RawPortrait`, `interface RawHomePage<RawArt>`, `PORTRAIT_WIDTHS`, `focalPoint(hotspot)`, `mapHomePage(raw, deps)`.
  - `src/lib/sanity.ts`: `export type HomePageContent = HomePage<Artwork>` and `export async function getHomePage(): Promise<HomePageContent>`. Task 7 uses these.

- [ ] **Step 1: Write the failing tests**

`src/lib/home-page.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { focalPoint, mapHomePage, PORTRAIT_WIDTHS, type RawHomePage, type RawPortrait } from './home-page';

interface FakeRawArt {
  slug: string;
}

const deps = {
  portraitUrl: (_portrait: RawPortrait, width: number) => `https://cdn.test/portrait.jpg?w=${width}`,
  mapArtwork: (raw: FakeRawArt) => ({ slug: raw.slug.toUpperCase() }),
};

const portrait: RawPortrait = {
  asset: { _ref: 'image-abc-4240x2832-jpg', _type: 'reference' },
  hotspot: { x: 0.5, y: 0.42 },
};

function doc(overrides: Partial<RawHomePage<FakeRawArt>> = {}): RawHomePage<FakeRawArt> {
  return {
    portrait,
    portraitAlt: 'Gluk, silhouetted between two studio lights',
    featuredWorks: [{ slug: 'a' }, { slug: 'b' }],
    ...overrides,
  };
}

describe('mapHomePage', () => {
  it('returns an empty home page when the document does not exist', () => {
    expect(mapHomePage(null, deps)).toEqual({ portrait: null, featuredWorks: [] });
  });

  it('maps a complete document', () => {
    const result = mapHomePage(doc(), deps);
    expect(result.portrait).toEqual({
      src: 'https://cdn.test/portrait.jpg?w=1600',
      srcset: PORTRAIT_WIDTHS.map((w) => `https://cdn.test/portrait.jpg?w=${w} ${w}w`).join(', '),
      alt: 'Gluk, silhouetted between two studio lights',
      focalPoint: '50% 42%',
    });
    expect(result.featuredWorks).toEqual([{ slug: 'A' }, { slug: 'B' }]);
  });

  it('omits the portrait when none is set, keeping featured works', () => {
    const result = mapHomePage(doc({ portrait: null }), deps);
    expect(result.portrait).toBeNull();
    expect(result.featuredWorks).toHaveLength(2);
  });

  it('omits the portrait when the image has no asset', () => {
    const result = mapHomePage(doc({ portrait: { asset: null } }), deps);
    expect(result.portrait).toBeNull();
  });

  it('falls back to "GLUK" alt text when alt is missing or blank', () => {
    expect(mapHomePage(doc({ portraitAlt: null }), deps).portrait?.alt).toBe('GLUK');
    expect(mapHomePage(doc({ portraitAlt: '   ' }), deps).portrait?.alt).toBe('GLUK');
  });

  it('treats a null featured list as empty', () => {
    expect(mapHomePage(doc({ featuredWorks: null }), deps).featuredWorks).toEqual([]);
  });

  it('drops dangling references (deleted artworks) and keeps order', () => {
    const result = mapHomePage(doc({ featuredWorks: [{ slug: 'c' }, null, { slug: 'a' }] }), deps);
    expect(result.featuredWorks).toEqual([{ slug: 'C' }, { slug: 'A' }]);
  });
});

describe('focalPoint', () => {
  it('centers when there is no hotspot', () => {
    expect(focalPoint(null)).toBe('50% 50%');
    expect(focalPoint(undefined)).toBe('50% 50%');
  });

  it('converts a hotspot to a CSS object-position', () => {
    expect(focalPoint({ x: 0.25, y: 0.333 })).toBe('25% 33.3%');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/home-page.test.ts`
Expected: FAIL — cannot resolve `./home-page`.

- [ ] **Step 3: Implement the mapper**

`src/lib/home-page.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/home-page.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Add `getHomePage()` to the data layer**

In `src/lib/sanity.ts`, add to the imports at the top:

```ts
import { mapHomePage, type HomePage, type RawHomePage, type RawPortrait } from './home-page';
```

Append at the end of the file:

```ts
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
```

- [ ] **Step 6: Run all gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass (the homePage document doesn't exist yet — `getHomePage()` is not called by any page until Task 7, so the build is unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/lib/home-page.ts src/lib/home-page.test.ts src/lib/sanity.ts
git commit -m "Add homePage data mapping and getHomePage query

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Home page seed script

**Files:**
- Create: `scripts/seed-home-page.mjs`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: `homePage` schema (Task 1); existing artwork documents with slugs from `scripts/seed-artworks.mjs`.
- Produces: `npm run seed:home`. Run later by the controller after Guillermo confirms — **implementer must NOT run it** (it writes to the live `production` dataset).

- [ ] **Step 1: Add sharp as an explicit devDependency**

Run: `npm install --save-dev sharp@^0.35.4`
Expected: `package.json` devDependencies gains `"sharp": "^0.35.4"` (it's already in the tree as an Astro dependency; this makes the script's dependency explicit).

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, after `"seed:artworks"`, add:

```json
"seed:home": "node --env-file=.env scripts/seed-home-page.mjs"
```

(Remember the comma on the preceding line.)

- [ ] **Step 3: Write the script**

`scripts/seed-home-page.mjs`:

```js
// One-time content seed: uploads the home-page portrait and creates the
// homePage singleton with its featured works. Run with: npm run seed:home
// Requires SANITY_WRITE_TOKEN (an Editor-level token) in .env.
// Safe to re-run: does nothing if the homePage document already exists
// (edit it in Studio instead).
import { createClient } from '@sanity/client';
import sharp from 'sharp';

const PORTRAIT_PATH = 'C:/Users/Guillermo/Desktop/cuadros HD/Gluk_Photoshoot-153.tif';
const PORTRAIT_ALT = 'Gluk, silhouetted between two studio lights';
// Centered on the silhouette in the 4240x2832 frame; adjustable in Studio.
const PORTRAIT_HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.5, y: 0.5, width: 0.35, height: 0.9 };
const FEATURED_SLUGS = [
  'motopirueta-1',
  'johnny-efectivo',
  'contemplacion-violenta-1',
  'bajale-2-gallito',
  'pobrecita-la-vaquita-que-bonita-la-cartera',
];

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing SANITY_WRITE_TOKEN in environment (add it to .env).');
  process.exit(1);
}

const existing = await client.fetch(`*[_id == "homePage"][0]._id`);
if (existing) {
  console.log('Skipping — homePage already exists. Edit it in Studio instead.');
  process.exit(0);
}

const artworks = await client.fetch(
  `*[_type == "artwork" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
  { slugs: FEATURED_SLUGS }
);
const idBySlug = new Map(artworks.map((a) => [a.slug, a._id]));
const missing = FEATURED_SLUGS.filter((slug) => !idBySlug.has(slug));
if (missing.length > 0) {
  console.error(`No published artwork found for: ${missing.join(', ')}. Run npm run seed:artworks first.`);
  process.exit(1);
}

console.log('Converting portrait TIFF to JPEG...');
const jpeg = await sharp(PORTRAIT_PATH).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();

console.log('Uploading portrait...');
const asset = await client.assets.upload('image', jpeg, {
  filename: 'gluk-portrait.jpg',
  contentType: 'image/jpeg',
});

const created = await client.createIfNotExists({
  _id: 'homePage',
  _type: 'homePage',
  portrait: {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    hotspot: PORTRAIT_HOTSPOT,
  },
  portraitAlt: PORTRAIT_ALT,
  featuredWorks: FEATURED_SLUGS.map((slug) => ({
    _type: 'reference',
    _ref: idBySlug.get(slug),
    _key: slug,
  })),
});
console.log(`Created homePage -> ${created._id}`);
```

- [ ] **Step 4: Syntax-check without running**

Run: `node --check scripts/seed-home-page.mjs`
Expected: no output, exit code 0.

Run: `node -e "require('sharp')('C:/Users/Guillermo/Desktop/cuadros HD/Gluk_Photoshoot-153.tif').metadata().then(m => console.log(m.width, m.height))"`
Expected: `4240 2832` (confirms sharp can read the TIFF — read-only).

- [ ] **Step 5: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-home-page.mjs package.json package-lock.json
git commit -m "Add home page seed script for portrait and featured works

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Motion core — tokens, media helpers, lifecycle, runtime

**Files:**
- Create: `src/motion/tokens.ts`
- Create: `src/motion/media.ts`, `src/motion/media.test.ts`
- Create: `src/motion/lifecycle.ts`, `src/motion/lifecycle.test.ts`
- Create: `src/motion/runtime.ts`
- Modify: `src/env.d.ts`

**Interfaces:**
- Produces (used by Tasks 5–9):
  - `tokens.ts`: `DURATION = { quick: 0.6, base: 0.9, slow: 1.4 }`, `EASE = 'expo.out'`, `REVEAL_DISTANCE = 24`, `STAGGER = 0.08`, `INTRO_STAGGER = 0.12`, `REVEAL_START = 'top 85%'`.
  - `media.ts`: `REDUCED_MOTION_QUERY`, `NO_MOTION_PREFERENCE_QUERY`, `FINE_POINTER_QUERY`, `type MatchMedia = (query: string) => { matches: boolean }`, `prefersReducedMotion(matchMedia): boolean`, `shouldEnableCursor(matchMedia): boolean`.
  - `lifecycle.ts`: `interface MotionEnv { reduced: boolean }`, `type MotionSetup = (env: MotionEnv) => void`, `interface MotionScope { revert(): void }`, `PAGE_LOAD_EVENT = 'astro:page-load'`, `BEFORE_SWAP_EVENT = 'astro:before-swap'`, `createLifecycle(deps): MotionLifecycle` with `registerGlobal(setup)` and `registerPage(key, setup)`.
  - `runtime.ts`: `export const motion: MotionLifecycle` (browser singleton; page key read from `[data-motion-page]`), sets `window.__glukMotionReady = true`.

- [ ] **Step 1: Write the tokens**

`src/motion/tokens.ts`:

```ts
// The Gluk motion vocabulary. Every animation reads its timing from here so
// the whole site speaks with one voice — tune the site's feel in this file.
export const DURATION = {
  quick: 0.6,
  base: 0.9,
  slow: 1.4,
} as const;

// Slow, confident ease-out. CSS equivalent: cubic-bezier(0.16, 1, 0.3, 1).
export const EASE = 'expo.out';

export const REVEAL_DISTANCE = 24; // px of upward drift on reveal
export const STAGGER = 0.08; // seconds between items in a revealed group
export const INTRO_STAGGER = 0.12; // seconds between page-intro elements
export const REVEAL_START = 'top 85%'; // ScrollTrigger start for reveals
```

- [ ] **Step 2: Write failing media helper tests**

`src/motion/media.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  FINE_POINTER_QUERY,
  REDUCED_MOTION_QUERY,
  prefersReducedMotion,
  shouldEnableCursor,
  type MatchMedia,
} from './media';

function fakeMatchMedia(matching: string[]): MatchMedia {
  return (query) => ({ matches: matching.includes(query) });
}

describe('prefersReducedMotion', () => {
  it('is true only when the reduced-motion query matches', () => {
    expect(prefersReducedMotion(fakeMatchMedia([REDUCED_MOTION_QUERY]))).toBe(true);
    expect(prefersReducedMotion(fakeMatchMedia([]))).toBe(false);
  });
});

describe('shouldEnableCursor', () => {
  it('enables on a fine, hover-capable pointer with motion allowed', () => {
    expect(shouldEnableCursor(fakeMatchMedia([FINE_POINTER_QUERY]))).toBe(true);
  });

  it('disables on touch devices', () => {
    expect(shouldEnableCursor(fakeMatchMedia([]))).toBe(false);
  });

  it('disables when the user prefers reduced motion, even with a mouse', () => {
    expect(shouldEnableCursor(fakeMatchMedia([FINE_POINTER_QUERY, REDUCED_MOTION_QUERY]))).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/motion/media.test.ts`
Expected: FAIL — cannot resolve `./media`.

- [ ] **Step 4: Implement media helpers**

`src/motion/media.ts`:

```ts
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const NO_MOTION_PREFERENCE_QUERY = '(prefers-reduced-motion: no-preference)';
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export type MatchMedia = (query: string) => { matches: boolean };

export function prefersReducedMotion(matchMedia: MatchMedia): boolean {
  return matchMedia(REDUCED_MOTION_QUERY).matches;
}

// The custom cursor is a desktop flourish: mouse/trackpad only, and never for
// visitors who asked for less motion.
export function shouldEnableCursor(matchMedia: MatchMedia): boolean {
  return matchMedia(FINE_POINTER_QUERY).matches && !prefersReducedMotion(matchMedia);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/motion/media.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Write failing lifecycle tests**

`src/motion/lifecycle.test.ts` (uses Node's global `EventTarget` — no DOM library needed):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BEFORE_SWAP_EVENT,
  PAGE_LOAD_EVENT,
  createLifecycle,
  type MotionScope,
  type MotionSetup,
} from './lifecycle';

interface FakeScope extends MotionScope {
  label: string;
  reverted: number;
}

let events: EventTarget;
let pageKey: string | null;
let scopes: FakeScope[];
let runs: string[];

function createScope(setup: MotionSetup): FakeScope {
  const before = runs.length;
  setup({ reduced: false });
  const scope: FakeScope = {
    label: runs.slice(before).join(','),
    reverted: 0,
    revert() {
      this.reverted += 1;
    },
  };
  scopes.push(scope);
  return scope;
}

function setup(name: string): MotionSetup {
  return () => {
    runs.push(name);
  };
}

function lifecycle() {
  return createLifecycle({ events, getPageKey: () => pageKey, createScope });
}

const pageLoad = () => events.dispatchEvent(new Event(PAGE_LOAD_EVENT));
const beforeSwap = () => events.dispatchEvent(new Event(BEFORE_SWAP_EVENT));

beforeEach(() => {
  events = new EventTarget();
  pageKey = null;
  scopes = [];
  runs = [];
});

describe('createLifecycle', () => {
  it('runs global setups on page load', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    pageLoad();
    expect(runs).toEqual(['reveal']);
  });

  it('runs a page setup only on its own page, after globals', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));

    pageKey = 'about';
    pageLoad();
    expect(runs).toEqual(['reveal']);

    beforeSwap();
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['reveal', 'reveal', 'hero']);
  });

  it('reverts every scope exactly once before the next page swaps in', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));
    pageKey = 'home';
    pageLoad();

    beforeSwap();
    expect(scopes.map((s) => s.reverted)).toEqual([1, 1]);

    beforeSwap(); // a second swap event must not revert again
    expect(scopes.map((s) => s.reverted)).toEqual([1, 1]);
  });

  it('reverts the previous page if page-load fires again without a swap', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    pageLoad();
    pageLoad();
    expect(scopes.map((s) => s.reverted)).toEqual([1, 0]);
  });

  it('runs a page registered after page-load immediately when it is the current page', () => {
    const motion = lifecycle();
    pageKey = 'home';
    pageLoad();
    motion.registerPage('home', setup('hero'));
    expect(runs).toEqual(['hero']);

    beforeSwap();
    expect(scopes[0].reverted).toBe(1);
  });

  it('does not run a late-registered page on a different page, but runs it on a later visit', () => {
    const motion = lifecycle();
    pageKey = 'about';
    pageLoad();
    motion.registerPage('home', setup('hero'));
    expect(runs).toEqual([]);

    beforeSwap();
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['hero']);
  });

  it('does not run anything registered between a swap and the next page-load', () => {
    const motion = lifecycle();
    pageKey = 'home';
    pageLoad();
    beforeSwap();
    motion.registerGlobal(setup('late-global'));
    motion.registerPage('home', setup('late-page'));
    expect(runs).toEqual([]);
  });

  it('ignores a second registration for the same page key', () => {
    const motion = lifecycle();
    motion.registerPage('home', setup('hero'));
    motion.registerPage('home', setup('hero-duplicate'));
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['hero']);
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run src/motion/lifecycle.test.ts`
Expected: FAIL — cannot resolve `./lifecycle`.

- [ ] **Step 8: Implement the lifecycle**

`src/motion/lifecycle.ts`:

```ts
// Runs each page's motion on Astro's page-load and tears it all down before
// the next page swaps in, so motion code never manages its own cleanup.
// Pure (no GSAP, no DOM globals) so it can be unit-tested; see runtime.ts
// for the browser wiring.

export interface MotionEnv {
  reduced: boolean;
}

export type MotionSetup = (env: MotionEnv) => void;

export interface MotionScope {
  revert(): void;
}

export interface LifecycleDeps {
  events: Pick<EventTarget, 'addEventListener'>;
  getPageKey: () => string | null;
  createScope: (setup: MotionSetup) => MotionScope;
}

export interface MotionLifecycle {
  registerGlobal(setup: MotionSetup): void;
  registerPage(key: string, setup: MotionSetup): void;
}

export const PAGE_LOAD_EVENT = 'astro:page-load';
export const BEFORE_SWAP_EVENT = 'astro:before-swap';

export function createLifecycle(deps: LifecycleDeps): MotionLifecycle {
  const globals: MotionSetup[] = [];
  const pages = new Map<string, MotionSetup>();
  let scopes: MotionScope[] = [];
  let loaded = false;

  function teardown(): void {
    for (const scope of scopes) scope.revert();
    scopes = [];
  }

  function start(): void {
    teardown();
    loaded = true;
    for (const setup of globals) scopes.push(deps.createScope(setup));
    const key = deps.getPageKey();
    const page = key ? pages.get(key) : undefined;
    if (page) scopes.push(deps.createScope(page));
  }

  deps.events.addEventListener(PAGE_LOAD_EVENT, start);
  deps.events.addEventListener(BEFORE_SWAP_EVENT, () => {
    teardown();
    loaded = false;
  });

  return {
    registerGlobal(setup) {
      globals.push(setup);
      if (loaded) scopes.push(deps.createScope(setup));
    },
    registerPage(key, setup) {
      if (pages.has(key)) return;
      pages.set(key, setup);
      // Page scripts can execute after the first page-load has already fired.
      if (loaded && deps.getPageKey() === key) scopes.push(deps.createScope(setup));
    },
  };
}
```

- [ ] **Step 9: Run to verify pass**

Run: `npx vitest run src/motion/lifecycle.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 10: Browser runtime singleton**

`src/motion/runtime.ts`:

```ts
// Browser wiring for the motion lifecycle. Bundled module scripts run once
// per session under Astro's ClientRouter, so this is a true singleton.
import { gsap } from 'gsap';
import { createLifecycle, type MotionScope, type MotionSetup } from './lifecycle';
import { NO_MOTION_PREFERENCE_QUERY, REDUCED_MOTION_QUERY } from './media';

// gsap.matchMedia() records every tween/ScrollTrigger created in `setup` and
// reverts them together; it also re-runs setup if the reduced-motion
// preference changes while the page is open.
function createScope(setup: MotionSetup): MotionScope {
  const mm = gsap.matchMedia();
  mm.add(
    { reduced: REDUCED_MOTION_QUERY, full: NO_MOTION_PREFERENCE_QUERY },
    (context) => {
      setup({ reduced: Boolean(context.conditions?.reduced) });
    }
  );
  return mm;
}

export const motion = createLifecycle({
  events: document,
  getPageKey: () =>
    document.querySelector<HTMLElement>('[data-motion-page]')?.dataset.motionPage ?? null,
  createScope,
});

// Tells the inline guard in BaseLayout that motion is live (see theme.css).
window.__glukMotionReady = true;
```

- [ ] **Step 11: Declare the window flag**

`src/env.d.ts` — full file:

```ts
/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface Window {
  // Set by src/motion/runtime.ts; read by the inline js-motion guard in BaseLayout.
  __glukMotionReady?: boolean;
}
```

- [ ] **Step 12: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass (runtime isn't imported by any page yet).

- [ ] **Step 13: Commit**

```bash
git add src/motion src/env.d.ts
git commit -m "Add motion core: tokens, media helpers, page lifecycle, runtime

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Site-wide wiring — view transitions, guard, intro/reveal, nav

**Files:**
- Create: `src/motion/reveal.ts`
- Modify: `src/styles/theme.css` (append)
- Modify: `src/layouts/BaseLayout.astro` (full rewrite below)
- Modify: `src/components/Nav.astro` (style block)

**Interfaces:**
- Consumes: `motion` (runtime.ts), `MotionEnv` (lifecycle.ts), tokens.
- Produces:
  - `setupIntro(env)`: animates every `[data-intro]` in document order on page load.
  - `setupReveal(env)`: `[data-reveal]` rises on scroll; `[data-reveal="curtain"]` opens its `[data-reveal-frame]` with a clip-path curtain then fades `[data-reveal-caption]`; `[data-reveal]` inside a `[data-reveal-stagger]` container reveal as a staggered batch.
  - `BaseLayout` prop `overlayNav?: boolean` → `data-nav-overlay` on `<body>`; Nav renders white and absolutely positioned over the page top.
  - CSS guard: `.js-motion [data-reveal], .js-motion [data-intro], .js-motion [data-hero-intro] { visibility: hidden; }`.

- [ ] **Step 1: Reveal and intro setups**

`src/motion/reveal.ts`:

```ts
// Site-wide motion, registered as global setups in BaseLayout:
// - setupIntro:  [data-intro] elements rise in, in document order, on load.
// - setupReveal: [data-reveal] elements rise in as they scroll into view.
//     [data-reveal="curtain"] opens its [data-reveal-frame] like a vertical
//     curtain, then fades in its [data-reveal-caption].
//     [data-reveal] items inside a [data-reveal-stagger] container reveal
//     together as a staggered batch.
// Elements are hidden up front by the .js-motion CSS guard (theme.css), so
// every tween is a fromTo with an explicit visible end state.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, INTRO_STAGGER, REVEAL_DISTANCE, REVEAL_START, STAGGER } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupIntro({ reduced }: MotionEnv): void {
  const items = gsap.utils.toArray<HTMLElement>('[data-intro]');
  if (items.length === 0) return;
  gsap.fromTo(
    items,
    { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
    { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE, stagger: INTRO_STAGGER, delay: 0.15 }
  );
}

export function setupReveal({ reduced }: MotionEnv): void {
  const batched = new Set<HTMLElement>();

  for (const group of gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]')) {
    const items = gsap.utils.toArray<HTMLElement>(group.querySelectorAll('[data-reveal]'));
    if (items.length === 0) continue;
    items.forEach((item) => batched.add(item));
    gsap.set(items, { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE });
    ScrollTrigger.batch(items, {
      start: REVEAL_START,
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE, stagger: STAGGER }),
    });
  }

  for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
    if (batched.has(el)) continue;
    if (el.dataset.reveal === 'curtain') curtain(el, reduced);
    else rise(el, reduced);
  }

  refreshWhenImagesLoad();
}

function rise(el: HTMLElement, reduced: boolean): void {
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
    {
      autoAlpha: 1,
      y: 0,
      duration: DURATION.base,
      ease: EASE,
      scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
    }
  );
}

function curtain(el: HTMLElement, reduced: boolean): void {
  const frame = el.querySelector<HTMLElement>('[data-reveal-frame]') ?? el;
  const caption = el.querySelector<HTMLElement>('[data-reveal-caption]');
  const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: REVEAL_START, once: true } });

  tl.set(el, { autoAlpha: 1 });
  if (reduced) {
    tl.fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, ease: EASE });
  } else {
    tl.fromTo(
      frame,
      { clipPath: 'inset(50% 0% 50% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.slow, ease: EASE }
    );
  }
  if (caption) {
    tl.fromTo(
      caption,
      { autoAlpha: 0, y: reduced ? 0 : 12 },
      { autoAlpha: 1, y: 0, duration: DURATION.quick, ease: EASE },
      '-=0.4'
    );
  }
}

// Images that load after setup shift the layout; re-measure trigger
// positions once they land (debounced, and reverted with the page scope).
function refreshWhenImagesLoad(): void {
  const pending = Array.from(document.images).filter((img) => !img.complete);
  if (pending.length === 0) return;
  let scheduled: gsap.core.Tween | null = null;
  const schedule = () => {
    scheduled?.kill();
    scheduled = gsap.delayedCall(0.15, () => ScrollTrigger.refresh());
  };
  for (const img of pending) img.addEventListener('load', schedule, { once: true });
}
```

- [ ] **Step 2: Guard CSS**

Append to `src/styles/theme.css`:

```css
/* Motion guard. The inline script in BaseLayout adds .js-motion to <html>
   only when JavaScript runs (and removes it if the motion bundle never
   loads), so these elements are hidden only when GSAP will reveal them.
   Without JS everything stays visible. */
.js-motion [data-reveal],
.js-motion [data-intro],
.js-motion [data-hero-intro] {
  visibility: hidden;
}
```

- [ ] **Step 3: BaseLayout**

`src/layouts/BaseLayout.astro` — full file:

```astro
---
import { ClientRouter, fade } from 'astro:transitions';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import '../styles/theme.css';

interface Props {
  title: string;
  // Nav floats over the top of the page in white (home hero photo).
  overlayNav?: boolean;
}

const { title, overlayNav = false } = Astro.props;
---
<html lang="en" transition:animation={fade({ duration: '0.3s' })}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.png" />
    <title>{title} — GLUK</title>
    <ClientRouter />
    <script is:inline>
      // Motion guard — see theme.css. Runs once per full page load.
      (function () {
        if (window.__glukMotionGuard) return;
        window.__glukMotionGuard = true;
        var root = document.documentElement;
        root.classList.add('js-motion');
        // Failsafe: if the motion bundle never loads, show everything.
        setTimeout(function () {
          if (!window.__glukMotionReady) root.classList.remove('js-motion');
        }, 2500);
        // ClientRouter replaces <html> attributes on every navigation.
        document.addEventListener('astro:after-swap', function () {
          if (window.__glukMotionReady) document.documentElement.classList.add('js-motion');
        });
      })();
    </script>
  </head>
  <body data-nav-overlay={overlayNav ? '' : undefined}>
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
    <script>
      import { motion } from '../motion/runtime';
      import { setupIntro, setupReveal } from '../motion/reveal';

      motion.registerGlobal(setupIntro);
      motion.registerGlobal(setupReveal);
    </script>
  </body>
</html>
```

- [ ] **Step 4: Nav — underline hover + overlay variant**

In `src/components/Nav.astro`, replace the whole `<style>` block with:

```astro
<style>
  .site-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
  }
  :global(body[data-nav-overlay]) .site-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2;
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.25rem;
    text-decoration: none;
    color: var(--color-black);
  }
  .site-nav ul {
    display: flex;
    gap: 1.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .site-nav a {
    text-decoration: none;
    color: var(--color-black);
  }
  :global(body[data-nav-overlay]) .site-nav a {
    color: #fff;
  }
  .site-nav ul a {
    padding-bottom: 2px;
    background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 0 1px;
    transition: background-size 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .site-nav ul a:hover,
  .site-nav ul a:focus-visible {
    background-size: 100% 1px;
  }
  .site-nav a:hover {
    color: var(--color-blue);
  }
  :global(body[data-nav-overlay]) .site-nav a:hover {
    color: #fff;
  }
  @media (prefers-reduced-motion: reduce) {
    .site-nav ul a {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 5: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Confirm the guard and router are in the built HTML**

Run: `grep -c "js-motion" dist/about/index.html && grep -c "astro-view-transitions-enabled\|ClientRouter\|astro:page-load" dist/about/index.html`
Expected: both counts ≥ 1. (If the second grep finds 0, inspect `dist/about/index.html` for the view-transitions meta tag Astro emits and report what's there.)

- [ ] **Step 7: Manual guard check (dev server)**

Run: `npm run dev`, open `http://localhost:4321/about`. No page uses `data-intro`/`data-reveal` yet, so the page should look exactly as before; confirm in DevTools that `<html>` has class `js-motion`, that `window.__glukMotionReady === true` in the console, and that clicking nav links navigates without full reloads (Network panel: document requests are fetch, not full navigations) with a soft crossfade. Hover a nav link: underline draws from left.

- [ ] **Step 8: Commit**

```bash
git add src/motion/reveal.ts src/styles/theme.css src/layouts/BaseLayout.astro src/components/Nav.astro
git commit -m "Wire site-wide motion: view transitions, motion guard, intro and reveal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Custom cursor

**Files:**
- Create: `src/motion/cursor.ts`
- Create: `src/components/Cursor.astro`
- Modify: `src/layouts/BaseLayout.astro` (import + render `<Cursor />` as first child of `<body>`)

**Interfaces:**
- Consumes: `shouldEnableCursor` (media.ts), `DURATION` (tokens.ts).
- Produces: `mountCursor(el: HTMLElement): void`; any element with `data-cursor="view"` turns the cursor into the "View" ring (used by Tasks 7 and 8).

- [ ] **Step 1: Cursor behaviour**

`src/motion/cursor.ts`:

```ts
// Custom cursor: a small dot that trails the mouse and becomes a thin
// "View" ring over [data-cursor="view"]. The element is persisted across
// navigations (transition:persist), so this mounts once and is never torn
// down — it deliberately lives outside the page lifecycle.
import { gsap } from 'gsap';
import { DURATION } from './tokens';

const ACTIVE_CLASS = 'has-custom-cursor';
const VIEW_CLASS = 'is-view';
const VIEW_SELECTOR = '[data-cursor="view"]';

export function mountCursor(el: HTMLElement): void {
  const root = document.documentElement;
  let visible = false;
  let viewing = false;

  const setViewing = (next: boolean) => {
    if (next === viewing) return;
    viewing = next;
    el.classList.toggle(VIEW_CLASS, next);
  };

  root.classList.add(ACTIVE_CLASS);
  // ClientRouter replaces <html> attributes on every navigation, and the
  // element under the pointer is gone, so reset both after each swap.
  document.addEventListener('astro:after-swap', () => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    setViewing(false);
  });

  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      if (!visible) {
        visible = true;
        gsap.set(el, { x: event.clientX, y: event.clientY });
        gsap.to(el, { autoAlpha: 1, duration: DURATION.quick });
      }
      xTo(event.clientX);
      yTo(event.clientY);
      setViewing(event.target instanceof Element && event.target.closest(VIEW_SELECTOR) !== null);
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => {
    visible = false;
    gsap.to(el, { autoAlpha: 0, duration: DURATION.quick });
  });
}
```

- [ ] **Step 2: Cursor component**

`src/components/Cursor.astro`:

```astro
---
// Desktop-only custom cursor. Persisted across page transitions; the
// behaviour module is only downloaded on fine-pointer devices with motion
// allowed (see src/motion/media.ts).
---
<div class="cursor" id="gluk-cursor" aria-hidden="true" transition:persist>
  <span class="cursor-dot"></span>
  <span class="cursor-ring"><span class="cursor-label">View</span></span>
</div>

<script>
  import { shouldEnableCursor } from '../motion/media';

  const el = document.getElementById('gluk-cursor');
  if (el && shouldEnableCursor((query) => window.matchMedia(query))) {
    import('../motion/cursor').then(({ mountCursor }) => mountCursor(el));
  }
</script>

<style>
  .cursor {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    color: #fff;
    mix-blend-mode: difference;
  }
  .cursor-dot,
  .cursor-ring {
    position: absolute;
    border-radius: 50%;
    transition:
      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .cursor-dot {
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    background: currentColor;
  }
  .cursor-ring {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    margin: -36px 0 0 -36px;
    border: 1px solid currentColor;
    opacity: 0;
    transform: scale(0.2);
  }
  .cursor-label {
    font-family: var(--font-body);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .cursor.is-view .cursor-dot {
    opacity: 0;
    transform: scale(0);
  }
  .cursor.is-view .cursor-ring {
    opacity: 1;
    transform: scale(1);
  }

  :global(.has-custom-cursor),
  :global(.has-custom-cursor *) {
    cursor: none;
  }
  :global(.has-custom-cursor input),
  :global(.has-custom-cursor textarea),
  :global(.has-custom-cursor select) {
    cursor: auto;
  }
</style>
```

- [ ] **Step 3: Render it in BaseLayout**

In `src/layouts/BaseLayout.astro`: add `import Cursor from '../components/Cursor.astro';` below the Footer import, and make `<Cursor />` the first child of `<body>`:

```astro
  <body data-nav-overlay={overlayNav ? '' : undefined}>
    <Cursor />
    <Nav />
```

- [ ] **Step 4: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Confirm the cursor module is a separate chunk**

Run: `ls dist/_astro/ | grep -i cursor`
Expected: a `cursor.*.js` chunk exists separately (it's lazily imported), so touch devices never download it.

- [ ] **Step 6: Manual check (dev server, desktop)**

`npm run dev`, open any page: native cursor hidden, white dot (difference-blended) trails the mouse; move the pointer out of the window and back — it fades out/in; navigate via nav links — the dot does not flicker or jump to the corner. Form fields on `/contact` show the normal text cursor. In DevTools → Rendering, emulate `prefers-reduced-motion: reduce` and reload: native cursor, no dot.

- [ ] **Step 7: Commit**

```bash
git add src/motion/cursor.ts src/components/Cursor.astro src/layouts/BaseLayout.astro
git commit -m "Add persistent desktop-only custom cursor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Home page — portrait hero + featured works

**Files:**
- Create: `src/motion/home-hero.ts`
- Modify: `src/pages/index.astro` (full rewrite)

**Interfaces:**
- Consumes: `getHomePage(): Promise<HomePageContent>` (Task 2), `motion.registerPage` (Task 4), `setupReveal` curtain markup contract (`data-reveal="curtain"`, `data-reveal-frame`, `data-reveal-caption`) and CSS guard for `data-hero-intro` (Task 5), `data-cursor="view"` (Task 6), `BaseLayout` `overlayNav` prop (Task 5).
- Produces: page key `home` (`data-motion-page="home"`); `setupHomeHero(env)`; home featured images carry `transition:name={`artwork-${slug}`}` (same name Task 8 uses on the detail page).

- [ ] **Step 1: Hero motion**

`src/motion/home-hero.ts`:

```ts
// Home opening: the portrait settles from a slight zoom while "GLUK" and the
// tagline fade up; scrolling away scrubs the photo into a gentle zoom-and-fade
// with the title drifting up faster (parallax). Reduced motion: text fades only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, REVEAL_DISTANCE } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupHomeHero({ reduced }: MotionEnv): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const media = hero.querySelector<HTMLElement>('[data-hero-media]');
  const image = hero.querySelector<HTMLElement>('[data-hero-image]');
  const text = hero.querySelector<HTMLElement>('[data-hero-text]');
  const intro = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-intro]'));

  const opening = gsap.timeline({ defaults: { ease: EASE } });
  // The portrait is the LCP element: never hide it, only settle its scale.
  if (image && !reduced) {
    opening.fromTo(image, { scale: 1.08 }, { scale: 1, duration: DURATION.slow }, 0);
  }
  if (intro.length > 0) {
    opening.fromTo(
      intro,
      { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
      { autoAlpha: 1, y: 0, duration: DURATION.slow, stagger: 0.3 },
      0.2
    );
  }

  if (reduced || !media || !text) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    })
    .to(media, { scale: 1.12, autoAlpha: 0, ease: 'none' }, 0)
    .to(text, { yPercent: -60, autoAlpha: 0, ease: 'none' }, 0);
}
```

(Scale on the opening targets `[data-hero-image]` and scroll scale targets its wrapper `[data-hero-media]`, so the two never fight over the same property.)

- [ ] **Step 2: Home page**

`src/pages/index.astro` — full file:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getHomePage } from '../lib/sanity';

const { portrait, featuredWorks } = await getHomePage();
---
<BaseLayout title="Home" overlayNav={portrait !== null}>
  <div data-motion-page="home">
    <section class:list={['hero', { 'hero--photo': portrait }]} data-hero>
      {portrait && (
        <div class="hero-media" data-hero-media>
          <img
            class="hero-image"
            data-hero-image
            src={portrait.src}
            srcset={portrait.srcset}
            sizes="100vw"
            alt={portrait.alt}
            style={`object-position: ${portrait.focalPoint}`}
            fetchpriority="high"
            loading="eager"
            decoding="async"
          />
        </div>
      )}
      <div class="hero-text" data-hero-text>
        <h1 data-hero-intro>GLUK</h1>
        <p class="tagline" data-hero-intro>
          Precise, streetwise images about Caribbean identity, memory and power.
        </p>
      </div>
    </section>

    {featuredWorks.length > 0 && (
      <section class="featured" aria-label="Selected work">
        <ol class="featured-list">
          {featuredWorks.map((artwork) => (
            <li class="featured-item">
              <a class="featured-link" href={`/artwork/${artwork.slug}`} data-cursor="view">
                <figure data-reveal="curtain">
                  <div class="featured-frame" data-reveal-frame>
                    <img
                      src={artwork.images[0]}
                      alt={artwork.title}
                      loading="lazy"
                      decoding="async"
                      transition:name={`artwork-${artwork.slug}`}
                    />
                  </div>
                  <figcaption data-reveal-caption>
                    {artwork.title}
                    {artwork.year && <span class="featured-year">{artwork.year}</span>}
                  </figcaption>
                </figure>
              </a>
            </li>
          ))}
        </ol>
        <p class="view-all" data-reveal><a href="/portfolio">View all work</a></p>
      </section>
    )}
  </div>
</BaseLayout>

<script>
  import { motion } from '../motion/runtime';
  import { setupHomeHero } from '../motion/home-hero';

  motion.registerPage('home', setupHomeHero);
</script>

<style>
  .hero {
    padding: 6rem 2rem;
    text-align: center;
  }
  .hero--photo {
    position: relative;
    display: grid;
    place-items: center;
    height: 100svh;
    min-height: 32rem;
    padding: 0;
    overflow: hidden;
    color: #fff;
  }
  .hero-media {
    position: absolute;
    inset: 0;
  }
  .hero-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-text {
    position: relative;
    padding: 0 2rem;
  }
  .hero h1 {
    font-size: 4rem;
  }
  .hero--photo h1 {
    font-size: clamp(3.5rem, 12vw, 9rem);
    letter-spacing: 0.02em;
    margin: 0 0 0.25em;
  }
  .tagline {
    font-family: var(--font-body);
    font-size: 1.25rem;
    max-width: 40ch;
    margin: 0 auto;
  }
  .hero--photo .tagline {
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);
  }

  .featured {
    max-width: 72rem;
    margin: 0 auto;
    padding: 8rem 2rem 6rem;
  }
  .featured-list {
    display: flex;
    flex-direction: column;
    gap: clamp(5rem, 12vw, 10rem);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .featured-item {
    width: min(100%, 34rem);
  }
  .featured-item:nth-child(even) {
    align-self: flex-end;
  }
  .featured-link {
    display: block;
    color: var(--color-black);
    text-decoration: none;
  }
  figure {
    margin: 0;
  }
  .featured-frame {
    overflow: hidden;
  }
  .featured-frame img {
    display: block;
    width: 100%;
    transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .featured-link:hover .featured-frame img {
    transform: scale(1.03);
  }
  figcaption {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    font-family: var(--font-display);
    font-weight: 800;
  }
  .featured-year {
    font-family: var(--font-body);
    font-weight: 400;
    color: var(--color-deep-blue);
  }
  .view-all {
    margin-top: 6rem;
    text-align: center;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.25rem;
  }
  .view-all a {
    color: var(--color-black);
  }

  @media (max-width: 640px) {
    .featured-item:nth-child(even) {
      align-self: auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .featured-frame img {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 3: Run gates (pre-seed state)**

Run: `npm run check && npm test && npm run build`
Expected: all pass. The `homePage` document does not exist yet, so this proves the empty state.

- [ ] **Step 4: Verify the pre-seed fallback renders cleanly**

Run: `grep -c "hero--photo" dist/index.html; grep -c "featured-list" dist/index.html; grep -c "GLUK" dist/index.html`
Expected: `0`, `0`, and ≥ 1 — plain text hero, no portrait, no featured section, no broken images.

- [ ] **Step 5: Manual check with real data (dev server)**

The seed is not run yet, so to see the full home page in dev the controller runs the seed only after Guillermo confirms (see Post-merge steps). Implementer: in `npm run dev`, confirm the plain hero's "GLUK"/tagline fade up on load and that `data-motion-page="home"` is present. Report that full-hero verification is pending the seed.

- [ ] **Step 6: Commit**

```bash
git add src/motion/home-hero.ts src/pages/index.astro
git commit -m "Build home page: portrait hero opening and featured works

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Portfolio grid + artwork detail (reveals, hover, morph, gallery crossfade)

**Files:**
- Modify: `src/components/ArtworkCard.astro` (full rewrite)
- Modify: `src/pages/portfolio/index.astro` (markup lines only)
- Modify: `src/pages/portfolio/[medium].astro` (markup lines only)
- Modify: `src/pages/artwork/[slug].astro` (markup + gallery CSS)

**Interfaces:**
- Consumes: `data-intro`, `data-reveal`, `data-reveal-stagger` (Task 5), `data-cursor="view"` (Task 6).
- Produces: `transition:name={`artwork-${slug}`}` on the card image and on the detail page's first gallery image — must match Task 7's featured images exactly.

- [ ] **Step 1: ArtworkCard**

`src/components/ArtworkCard.astro` — full file:

```astro
---
import type { Artwork } from '../lib/sanity';

interface Props {
  artwork: Artwork;
}

const { artwork } = Astro.props;
---
<a class="card" href={`/artwork/${artwork.slug}`} data-reveal data-cursor="view">
  <div class="card-frame">
    <img
      src={artwork.images[0]}
      alt={artwork.title}
      loading="lazy"
      decoding="async"
      transition:name={`artwork-${artwork.slug}`}
    />
  </div>
  <p class="card-title"><span>{artwork.title}</span></p>
</a>

<style>
  .card {
    display: block;
    text-decoration: none;
    color: var(--color-black);
  }
  .card-frame {
    overflow: hidden;
  }
  .card img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card:hover img {
    transform: scale(1.03);
  }
  .card-title span {
    padding-bottom: 2px;
    background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 0 1px;
    transition: background-size 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card:hover .card-title span,
  .card:focus-visible .card-title span {
    background-size: 100% 1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .card img,
    .card-title span {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: Portfolio pages — intro + stagger group**

In `src/pages/portfolio/index.astro` change:
- `<h1>Portfolio</h1>` → `<h1 data-intro>Portfolio</h1>`
- `<div class="grid">` → `<div class="grid" data-reveal-stagger>`

In `src/pages/portfolio/[medium].astro` change:
- `<h1>{formatMedium(medium)}</h1>` → `<h1 data-intro>{formatMedium(medium)}</h1>`
- `<div class="grid">` → `<div class="grid" data-reveal-stagger>`

(The medium filter links are actionable — they stay still.)

- [ ] **Step 3: Artwork detail — morph target + intro sequence**

In `src/pages/artwork/[slug].astro`, replace the `gallery-main` block:

```astro
      <div class="gallery-main">
        {images.map((src, i) => (
          <img src={src} alt={artwork!.title} class={`gallery-image gallery-image-${i}`} />
        ))}
      </div>
```

with:

```astro
      <div class="gallery-main">
        {images.map((src, i) =>
          i === 0 ? (
            <img
              src={src}
              alt={artwork!.title}
              class="gallery-image gallery-image-0"
              transition:name={`artwork-${artwork!.slug}`}
            />
          ) : (
            <img src={src} alt={artwork!.title} class={`gallery-image gallery-image-${i}`} />
          )
        )}
      </div>
```

In the `.info` block, change only these three lines (the button and the prints block stay untouched — actionable/price content never moves):
- `<h1>{artwork!.title}</h1>` → `<h1 data-intro>{artwork!.title}</h1>`
- `<p class="meta">{artwork!.year} — {artwork!.dimensions}</p>` → `<p class="meta" data-intro>{artwork!.year} — {artwork!.dimensions}</p>`
- `<p>{artwork!.description}</p>` → `<p data-intro>{artwork!.description}</p>`

- [ ] **Step 4: Gallery crossfade CSS**

In the same file's `<style>`, replace:

```css
  .gallery-image {
    display: none;
    width: 100%;
  }
  .gallery-radio:nth-of-type(1):checked ~ .gallery-main .gallery-image-0 { display: block; }
  .gallery-radio:nth-of-type(2):checked ~ .gallery-main .gallery-image-1 { display: block; }
  .gallery-radio:nth-of-type(3):checked ~ .gallery-main .gallery-image-2 { display: block; }
  .gallery-radio:nth-of-type(4):checked ~ .gallery-main .gallery-image-3 { display: block; }
  .gallery-radio:nth-of-type(5):checked ~ .gallery-main .gallery-image-4 { display: block; }
  .gallery-radio:nth-of-type(6):checked ~ .gallery-main .gallery-image-5 { display: block; }
  .gallery-radio:nth-of-type(7):checked ~ .gallery-main .gallery-image-6 { display: block; }
  .gallery-radio:nth-of-type(8):checked ~ .gallery-main .gallery-image-7 { display: block; }
```

with:

```css
  /* Images stack in one grid cell and crossfade; hidden ones are also
     visibility:hidden so screen readers skip them, as display:none did. */
  .gallery-main {
    display: grid;
    align-items: start;
  }
  .gallery-image {
    grid-area: 1 / 1;
    width: 100%;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.5s ease, visibility 0s linear 0.5s;
  }
  .gallery-radio:nth-of-type(1):checked ~ .gallery-main .gallery-image-0,
  .gallery-radio:nth-of-type(2):checked ~ .gallery-main .gallery-image-1,
  .gallery-radio:nth-of-type(3):checked ~ .gallery-main .gallery-image-2,
  .gallery-radio:nth-of-type(4):checked ~ .gallery-main .gallery-image-3,
  .gallery-radio:nth-of-type(5):checked ~ .gallery-main .gallery-image-4,
  .gallery-radio:nth-of-type(6):checked ~ .gallery-main .gallery-image-5,
  .gallery-radio:nth-of-type(7):checked ~ .gallery-main .gallery-image-6,
  .gallery-radio:nth-of-type(8):checked ~ .gallery-main .gallery-image-7 {
    opacity: 1;
    visibility: visible;
    transition: opacity 0.5s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .gallery-image {
      transition: none;
    }
  }
```

- [ ] **Step 5: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Verify transition names match across pages**

Run: `grep -c "artwork-motopirueta-1" dist/portfolio/index.html dist/artwork/motopirueta-1/index.html`
Expected: both counts ≥ 1 (Astro emits the `view-transition-name` in a `<style>` in each page). If either is 0, search `dist/_astro/*.css` for `artwork-motopirueta-1` and report where Astro put it before changing anything.

- [ ] **Step 7: Manual check (dev server)**

`/portfolio`: cards reveal row by row on scroll; hover scales the image slightly and draws the title underline; cursor shows "View". Click a card: the painting morphs into the detail image, then title → meta → description fade up; button and prints appear immediately and never move. Click thumbnails on a multi-image piece (`pobrecita-la-vaquita-que-bonita-la-cartera-invertido`): images crossfade. Press browser Back: returns to the grid with all cards visible and scroll position restored.

- [ ] **Step 8: Commit**

```bash
git add src/components/ArtworkCard.astro src/pages/portfolio src/pages/artwork
git commit -m "Animate portfolio grid and artwork detail with morph transition

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Calm pages — About, Tattoo, Journal, Contact

**Files:**
- Modify: `src/pages/about.astro`, `src/pages/tattoo.astro`, `src/pages/contact.astro`, `src/pages/journal/index.astro`, `src/pages/journal/[slug].astro` (markup attributes only)

**Interfaces:**
- Consumes: `data-intro`, `data-reveal`, `data-reveal-stagger` (Task 5).

- [ ] **Step 1: Add attributes**

`src/pages/about.astro`:
- `<h1>About GLUK</h1>` → `<h1 data-intro>About GLUK</h1>`
- `<p>` (the bio paragraph opening tag) → `<p data-intro>`

`src/pages/tattoo.astro`:
- `<h1>Tattoo</h1>` → `<h1 data-intro>Tattoo</h1>`
- `<div set:html={info.body} />` → `<div data-intro set:html={info.body} />`
- `<div class="gallery">` → `<div class="gallery" data-reveal-stagger>`
- `{info.images.map((src) => <img src={src} alt="" />)}` → `{info.images.map((src) => <img src={src} alt="" data-reveal />)}`

`src/pages/contact.astro`:
- `<h1>Contact</h1>` → `<h1 data-intro>Contact</h1>` (the form is actionable — no motion)

`src/pages/journal/index.astro`:
- `<h1>Journal</h1>` → `<h1 data-intro>Journal</h1>`
- `<ul>` → `<ul data-reveal-stagger>`
- `<li>` → `<li data-reveal>`

`src/pages/journal/[slug].astro`:
- `<h1>{post!.title}</h1>` → `<h1 data-intro>{post!.title}</h1>`
- `<p class="meta">` → `<p class="meta" data-intro>`
- `{post!.coverImage && <img src={post!.coverImage} alt={post!.title} />}` → `{post!.coverImage && <img src={post!.coverImage} alt={post!.title} data-reveal />}`
- `<div set:html={post!.body} />` → `<div data-reveal set:html={post!.body} />`

- [ ] **Step 2: Run gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 3: Manual check**

`npm run dev`: visit About, Tattoo, Journal, Contact — headings rise in once; nothing else moves on Contact; all content is visible after load; navigating between them repeatedly never leaves anything hidden.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/tattoo.astro src/pages/contact.astro src/pages/journal
git commit -m "Add calm intro and reveal motion to content pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Whole-site verification

**Files:** none (verification only; fix-forward commits if issues are found, each with its own test/check).

- [ ] **Step 1: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass. Record the total size of JS loaded by `dist/index.html` (sum the `<script type="module" src>` chunks and their imports in `dist/_astro/`) and report it.

- [ ] **Step 2: Browser checklist** (Chrome via `npm run preview`; report each item pass/fail)

1. Home opening: plain-hero fallback text fades up (full portrait check happens after seeding — see Post-merge).
2. Portfolio → detail morph; browser Back and Forward twice; no card or heading left invisible; scroll position restored.
3. Navigate Home → Portfolio → About → Portfolio → detail → Home repeatedly (10+ navigations): no console errors, every reveal fires exactly once per visit (no element re-animates or flickers on scroll), scrolling stays smooth, the home hero scroll effect still tracks the scroll correctly on the last visit.
4. Phone width (DevTools device toolbar, iPhone 14): no custom cursor, native tap works, single-column layouts, hover scale doesn't stick after tap-navigating back.
5. Reduced motion (DevTools → Rendering → `prefers-reduced-motion: reduce`): only fades, no movement/scale/parallax, native cursor, morph becomes crossfade.
6. JavaScript disabled (DevTools → Settings → Debugger → Disable JavaScript): every page shows all content.
7. Motion bundle blocked (DevTools → Network → block request URL pattern `*reveal*` or the runtime chunk name from `dist/_astro/`): within ~2.5s all content becomes visible.

- [ ] **Step 3: Report**

Summarise results; any failure gets a fix commit before the branch is considered done.

---

## Post-merge steps (controller only — each needs Guillermo's explicit OK)

1. **Push `main`** to `origin` → Netlify deploys (home renders the plain-hero fallback until seeding).
2. **Seed:** `npm run seed:home` (writes the portrait + featured list to the live `production` dataset; the Sanity webhook then triggers a Netlify rebuild).
3. **Studio:** `npx sanity deploy` so the Home Page document appears in https://gluk-studio.sanity.studio/.
4. **Live check** on https://thriving-halva-34e095.netlify.app: full portrait hero opening + scroll, featured curtain reveals, home → detail morph, phone width.
