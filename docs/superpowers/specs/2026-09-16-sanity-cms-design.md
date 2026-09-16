# Sanity CMS Integration Design — Gluk Portfolio & Shop

Date: 2026-09-16
Status: Approved for planning

## Purpose

Replace the static placeholder data modules (`src/data/placeholder-artworks.ts`,
`src/data/placeholder-journal.ts`) with live content managed in Sanity CMS,
so Guillermo can add/edit artwork, journal posts, and tattoo studio info
through a content dashboard instead of editing code. This is Plan 2 in the
Gluk Portfolio & Shop site-scaffold series, building on Plan 1 (the Astro
scaffold, merged to `main`), whose placeholder data interfaces were
deliberately shaped to match this plan's schema so page components don't
need to change.

## Prerequisite: Manual Account Setup

This plan requires a Sanity account and project that do not exist yet.
These steps need Guillermo's own browser/account access and cannot be
automated by an agent:

1. Create a free Sanity account at sanity.io and a new project — yields a
   **Project ID**.
2. Choose the `production` dataset (Sanity's default) as public/read-only,
   so the live site can read published content with no API token.
3. After the Studio is built (Task-level work in the implementation plan),
   run `npx sanity deploy` from the repo to publish the Studio to Sanity's
   free hosted URL (e.g. `gluk-portfolio.sanity.studio`) — requires
   Guillermo's Sanity login.
4. Create a Netlify build hook (Netlify dashboard → Site settings → Build
   hooks) and add its URL as a webhook target in the Sanity project's
   settings (Sanity dashboard → API → Webhooks), so publishing content
   triggers a rebuild.
5. Log into the deployed Studio and enter real content (or re-enter the
   Plan 1 placeholder demo data as a starting point) — content population
   is out of scope for the implementation plan itself.

The implementation plan must produce a working Studio + working GROQ
queries that Guillermo can verify against his own project once steps 1-2
are done; it cannot fully build/verify against live Sanity data until a
real Project ID exists. Where a plan task needs the Project ID before it
exists, it uses a placeholder value with a clear one-line instruction for
swapping in the real one.

## Architecture

| Concern | Choice | Why |
|---|---|---|
| Astro integration | [`@sanity/astro`](https://www.npmjs.com/package/@sanity/astro) | Official, Sanity-maintained — configures the client, works with plain GROQ queries, no extra abstraction layer needed for a catalog this size. |
| Studio location | `sanity/` folder in this repo, deployed via `npx sanity deploy` to Sanity's free hosted Studio | Schema and site stay versioned together in one repo (no second repo to keep in sync); Studio UI itself is hosted by Sanity for free, no separate deploy pipeline to maintain. |
| Data fetching | Direct GROQ queries in a typed `src/lib/sanity.ts` module, called from pages exactly like the old placeholder-data imports | Matches the existing mental model (Plan 1's pages already call named functions returning typed data) — swapping the implementation behind those functions is the whole point of Plan 1's interface design. |
| Rendering mode | Fully static — GROQ queries run at **build time** inside `getStaticPaths`/page frontmatter, same as today | No server runtime needed; Netlify continues serving prebuilt HTML. Simpler and cheaper than SSR, and content doesn't change fast enough to need instant server-side freshness. |
| Content freshness | Sanity webhook → Netlify build hook on publish | Live site updates within ~1-2 minutes of a content change, without Guillermo needing to manually trigger a deploy. |
| Auth | None needed for reads (public dataset); Studio auth is Guillermo's personal Sanity login, unrelated to site secrets | Keeps the site's build free of API tokens/secrets to manage. |

## Schema (Sanity Document Types)

Defined in `sanity/schemaTypes/`, one file per type, registered in
`sanity/schemaTypes/index.ts`.

### `artwork`
| Field | Sanity type | Notes |
|---|---|---|
| `title` | string | |
| `slug` | slug | Source: `title`. Drives `/artwork/[slug]`. |
| `medium` | string, `options.list` restricted to the 4 values | `oil-painting` \| `tattoo` \| `sculpture` \| `mixed-media` — drives `/portfolio/[medium]` filtering, same as Plan 1. |
| `images` | array of `image` (with hotspot enabled) | Genuinely plural now — Plan 1's placeholder had a singular `image` field, which was a known drift from this schema; this plan is where that gets resolved for real. |
| `description` | text | |
| `year` | number | |
| `dimensions` | string | Free text, e.g. `"60 x 90 cm, oil on canvas"`. |
| `availableAsOriginal` | boolean | Drives the "Inquire" button. |
| `printOptions` | array of object `{ size: string, price: number, stripePriceId: string }` | Object type defined inline in the schema (`sanity/schemaTypes/printOption.ts`), reused as an array field — matches Plan 1's `PrintOption` interface exactly. |

### `journalPost`
| Field | Sanity type | Notes |
|---|---|---|
| `title` | string | |
| `slug` | slug | Source: `title`. Drives `/journal/[slug]`. |
| `date` | datetime | |
| `coverImage` | image | |
| `body` | array (portable text / block content) | Rendered via `@portabletext/to-html` or Astro's portable-text renderer — plain paragraphs/headings only, no custom block types needed for v1. |

### `tattooInfo`
Singleton document (Sanity's "only one instance" pattern — enforced in the
Studio's structure config, not the schema type itself). Fields: `body`
(portable text) and `images` (array of image), replacing the hardcoded
copy currently in `src/pages/tattoo.astro`.

## Code Changes

- **Delete:** `src/data/placeholder-artworks.ts`, `src/data/placeholder-artworks.test.ts`,
  `src/data/placeholder-journal.ts`.
- **Create:** `src/lib/sanity.ts` — the Sanity client (from `@sanity/astro`'s
  helper) plus typed query functions:
  - `getAllArtworks(): Promise<Artwork[]>`
  - `getArtworksByMedium(medium: Medium): Promise<Artwork[]>`
  - `getArtworkBySlug(slug: string): Promise<Artwork | null>`
  - `getAllJournalPosts(): Promise<JournalPost[]>`
  - `getJournalPostBySlug(slug: string): Promise<JournalPost | null>`
  - `getTattooInfo(): Promise<TattooInfo>`
  - Also exports `MEDIUMS`, `Medium`, `formatMedium` (moved here from the
    deleted placeholder file — same values, same signatures, new home).
  - `Artwork`/`PrintOption`/`JournalPost`/`TattooInfo` TypeScript interfaces
    stay structurally identical to Plan 1's, except `Artwork.images` is now
    genuinely `string[]` (already true after Plan 1's final-review fix) —
    every image URL returned by these functions is a ready-to-use Sanity
    CDN URL (built with `@sanity/image-url`), not a raw asset reference.
- **Modify (data source only, not markup, except where noted):**
  `src/pages/portfolio/index.astro`, `src/pages/portfolio/[medium].astro`,
  `src/pages/journal/index.astro`, `src/pages/journal/[slug].astro`,
  `src/pages/tattoo.astro` — swap placeholder imports for `src/lib/sanity.ts`
  calls inside `getStaticPaths`/frontmatter. `ArtworkCard.astro` and
  `formatPrice.ts` are untouched.
- **Modify (data source + markup):** `src/pages/artwork/[slug].astro` —
  swap data source, and add a basic image gallery: the first image renders
  large, the rest render as a thumbnail row; clicking a thumbnail swaps the
  main image via a plain CSS radio-button/label technique (no JavaScript
  framework, consistent with the rest of this static-first site). Full
  transition/lightbox polish is left to the future animation plan.

## Deployment

- `netlify.toml` gains the two Sanity env vars declared as required build
  vars (values entered in Netlify's dashboard by Guillermo once the
  project exists — not committed to the repo): `PUBLIC_SANITY_PROJECT_ID`,
  `PUBLIC_SANITY_DATASET`.
- A `.env.example` file documents the same two vars for local dev, with a
  placeholder project ID and `production` as the example dataset.

## Testing

- No new automated tests for the GROQ query functions themselves (they're
  thin wrappers with no branching logic worth unit-testing, consistent
  with Plan 1's "no test framework for presentation-layer code" approach).
- `MEDIUMS`/`Medium`/`formatMedium` keep their existing behavior unchanged
  by this plan — no new tests needed since their logic doesn't change,
  only their file location.
- Verification is build-level: `npm run build` must successfully fetch
  from the real (or a documented placeholder) Sanity project and generate
  all static pages, same as Plan 1's verification approach.

## Out of Scope (for this plan)

- GSAP/ScrollTrigger animation (separate plan).
- Stripe Checkout wiring (separate plan) — `printOptions.stripePriceId`
  data now comes from Sanity instead of the placeholder array, but nothing
  consumes it yet beyond display.
- Full image gallery interactivity (lightbox, transitions, swipe) — only
  the basic thumbnail-swap gallery described above is in scope here.
- Actual content entry (real artwork photos/copy) — a separate, manual,
  non-coding next action tracked in the project brief.
- Draft/preview mode in Sanity (viewing unpublished content on the live
  site before it's published) — not needed for a single-editor site;
  publish-to-rebuild is fast enough.
