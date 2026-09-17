# Sanity CMS Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static placeholder data modules with live Sanity CMS content (artwork, journal posts, tattoo studio info), keeping the site fully static and every page's rendered output/URL structure unchanged.

**Architecture:** A Sanity Studio (schema + config) lives inside this repo and is deployed separately to Sanity's free hosting. Pages fetch content via GROQ queries through a single typed `src/lib/sanity.ts` module at Astro build time — the site remains 100% static; a Sanity webhook triggers a Netlify rebuild on publish.

**Tech Stack:** `sanity` (Studio + schema), `@sanity/astro` (Astro integration/client), `@sanity/image-url` (CDN image URLs), `@portabletext/to-html` (rich text rendering).

**Spec:** `docs/superpowers/specs/2026-09-16-sanity-cms-design.md`

## Global Constraints

- Public artist name is "GLUK" in site copy (unaffected by this plan — no copy changes).
- Site stays fully static — no SSR adapter, no server runtime. GROQ queries run inside `getStaticPaths`/page frontmatter at build time only.
- Env vars: `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` — public (no API token needed for reads from a public dataset).
- **Real Sanity Project ID: `48jkcmcb`, dataset: `production`** (Sanity's default dataset, created automatically with the project). The Studio has not been deployed yet and no content exists in the dataset yet — that's separate manual follow-up work (see the bottom of this plan). Fetching against an existing-but-empty dataset succeeds and returns empty results (`[]` for list queries), it does not error — so `npm run build` is expected to **succeed** for every task in this plan, just with zero portfolio/journal items until real content is entered later. The one exception is the `tattooInfo` singleton query (Task 6), which returns `null` rather than an empty array when no document exists yet — `getTattooInfo()` must handle that case without crashing (see Task 3).
- `Artwork` interface fields: `slug, title, medium, year, dimensions, description, images (string[]), availableAsOriginal, printOptions (PrintOption[])`. `PrintOption`: `{ size: string, price: number, stripePriceId: string }`. `Medium`: `'oil-painting' | 'tattoo' | 'sculpture' | 'mixed-media'` (`MEDIUMS` const array is the source of truth). These must stay identical in shape to Plan 1's interfaces so `ArtworkCard.astro` and `formatPrice.ts` need no changes beyond an import path.
- No new automated tests for the Sanity query functions or for `MEDIUMS`/`formatMedium` (their logic is unchanged from Plan 1, only their file location) — per the spec's Testing section.

---

## File Structure

```
.env                                — local Sanity credentials (gitignored, placeholder until real project exists)
.env.example                        — documents the two required env vars
sanity.config.ts                    — Sanity Studio config (repo root, Sanity CLI convention)
sanity.cli.ts                       — Sanity CLI config (repo root)
sanity/
  schemaTypes/
    printOption.ts                  — object type: size/price/stripePriceId
    artwork.ts                      — document type
    journalPost.ts                  — document type
    tattooInfo.ts                   — document type (used as a singleton via Studio structure)
    index.ts                        — exports the schemaTypes array
  structure.ts                      — Studio desk structure (singleton pattern for tattooInfo)
astro.config.mjs                    — add @sanity/astro integration
src/lib/sanity.ts                   — client, types, GROQ query functions, MEDIUMS/Medium/formatMedium
src/components/ArtworkCard.astro    — modify: import path only
src/pages/portfolio/index.astro     — modify: use src/lib/sanity.ts
src/pages/portfolio/[medium].astro  — modify: use src/lib/sanity.ts
src/pages/journal/index.astro       — modify: use src/lib/sanity.ts
src/pages/journal/[slug].astro      — modify: use src/lib/sanity.ts
src/pages/tattoo.astro              — modify: use src/lib/sanity.ts
src/pages/artwork/[slug].astro      — modify: use src/lib/sanity.ts, add basic image gallery
Delete: src/data/placeholder-artworks.ts, src/data/placeholder-artworks.test.ts, src/data/placeholder-journal.ts
```

---

### Task 1: Sanity Studio schema and config scaffold

**Files:**
- Create: `sanity/schemaTypes/printOption.ts`, `sanity/schemaTypes/artwork.ts`, `sanity/schemaTypes/journalPost.ts`, `sanity/schemaTypes/tattooInfo.ts`, `sanity/schemaTypes/index.ts`, `sanity/structure.ts`, `sanity.config.ts`, `sanity.cli.ts`, `.env`, `.env.example`
- Modify: `package.json` (add dependencies)

**Interfaces:**
- Produces: the `artwork`, `journalPost`, `tattooInfo`, `printOption` Sanity schema types, registered and ready for the Studio; the `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` env vars that Task 2 and `src/lib/sanity.ts` (Task 3) both read.

- [ ] **Step 1: Install dependencies**

Run: `npm install sanity @sanity/astro @sanity/image-url @portabletext/to-html`
Expected: exits 0, packages added to `package.json`/`package-lock.json`.

- [ ] **Step 2: Create `sanity/schemaTypes/printOption.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const printOption = defineType({
  name: 'printOption',
  title: 'Print Option',
  type: 'object',
  fields: [
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price (cents, USD)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'stripePriceId',
      title: 'Stripe Price ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
});
```

- [ ] **Step 3: Create `sanity/schemaTypes/artwork.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const artwork = defineType({
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
      options: {
        list: [
          { title: 'Oil Painting', value: 'oil-painting' },
          { title: 'Tattoo', value: 'tattoo' },
          { title: 'Sculpture', value: 'sculpture' },
          { title: 'Mixed Media', value: 'mixed-media' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'string',
    }),
    defineField({
      name: 'availableAsOriginal',
      title: 'Available as Original',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'printOptions',
      title: 'Print Options',
      type: 'array',
      of: [{ type: 'printOption' }],
    }),
  ],
});
```

- [ ] **Step 4: Create `sanity/schemaTypes/journalPost.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const journalPost = defineType({
  name: 'journalPost',
  title: 'Journal Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
});
```

- [ ] **Step 5: Create `sanity/schemaTypes/tattooInfo.ts`**

```ts
import { defineType, defineField } from 'sanity';

export const tattooInfo = defineType({
  name: 'tattooInfo',
  title: 'Tattoo Info',
  type: 'document',
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
  ],
});
```

- [ ] **Step 6: Create `sanity/schemaTypes/index.ts`**

```ts
import { artwork } from './artwork';
import { printOption } from './printOption';
import { journalPost } from './journalPost';
import { tattooInfo } from './tattooInfo';

export const schemaTypes = [artwork, printOption, journalPost, tattooInfo];
```

- [ ] **Step 7: Create `sanity/structure.ts`**

This gives `tattooInfo` a fixed, single document ID (`tattooInfo`) in the Studio's desk structure, enforcing the "only one instance" singleton pattern — there is no schema-level way to do this, it's a Studio configuration concern.

```ts
import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('artwork').title('Artwork'),
      S.documentTypeListItem('journalPost').title('Journal Posts'),
      S.listItem()
        .title('Tattoo Info')
        .child(
          S.document().schemaType('tattooInfo').documentId('tattooInfo')
        ),
    ]);
```

- [ ] **Step 8: Create `sanity.config.ts`** (repo root)

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';
import { structure } from './sanity/structure';

export default defineConfig({
  name: 'default',
  title: 'Gluk Portfolio & Shop',
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
  },
});
```

- [ ] **Step 9: Create `sanity.cli.ts`** (repo root)

```ts
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  },
});
```

- [ ] **Step 10: Create `.env.example`**

```
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
```

- [ ] **Step 11: Create `.env`**

```
PUBLIC_SANITY_PROJECT_ID=48jkcmcb
PUBLIC_SANITY_DATASET=production
```

`.env` is already gitignored (line 1 of `.gitignore` since Plan 1's initial commit) — confirm with `git check-ignore -q .env && echo ignored`.

- [ ] **Step 12: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors (this type-checks the new schema/config files along with everything else, since `tsconfig.json` includes `**/*`).

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json sanity.config.ts sanity.cli.ts sanity/ .env.example
git commit -m "Add Sanity Studio schema and config scaffold"
```

(`.env` is gitignored and intentionally not committed.)

---

### Task 2: Wire the Astro integration

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` (Task 1's `.env`)
- Produces: the `sanity:client` virtual module that `src/lib/sanity.ts` (Task 3) imports from.

- [ ] **Step 1: Replace `astro.config.mjs` with the version below**

Astro config files run in Node before Vite's normal env-loading kicks in, so we use Vite's `loadEnv` helper directly to read `.env` here.

```js
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  ''
);

export default defineConfig({
  integrations: [
    react(),
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
      dataset: PUBLIC_SANITY_DATASET || 'production',
      useCdn: true,
      apiVersion: '2026-09-16',
    }),
  ],
});
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors.

Run: `npm run build`
Expected: exits 0, all 15 pages still build — no page yet imports `sanity:client` or `src/lib/sanity.ts` (that starts in Task 4), so adding the integration alone must not change build output.

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "Wire @sanity/astro integration into Astro config"
```

---

### Task 3: Sanity client and query functions

**Files:**
- Create: `src/lib/sanity.ts`

**Interfaces:**
- Consumes: the `sanity:client` virtual module (Task 2)
- Produces: `MEDIUMS` (const array), `Medium` (type), `formatMedium(medium: Medium): string`, `Artwork`/`PrintOption`/`JournalPost`/`TattooInfo` interfaces, `getAllArtworks(): Promise<Artwork[]>`, `getArtworksByMedium(medium: Medium): Promise<Artwork[]>`, `getArtworkBySlug(slug: string): Promise<Artwork | null>`, `getAllJournalPosts(): Promise<JournalPost[]>`, `getJournalPostBySlug(slug: string): Promise<JournalPost | null>`, `getTattooInfo(): Promise<TattooInfo>` — every page task (4-7) imports from this file by these exact names.

- [ ] **Step 1: Create `src/lib/sanity.ts`**

```ts
import { sanityClient } from 'sanity:client';
import imageUrlBuilder from '@sanity/image-url';
import { toHTML } from '@portabletext/to-html';

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
    images: raw.images.map(urlFor),
    availableAsOriginal: raw.availableAsOriginal,
    printOptions: raw.printOptions,
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
    images: raw.images.map(urlFor),
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
    `*[_type == "artwork"] | order(year desc) ${ARTWORK_PROJECTION}`
  );
  return raw.map(mapArtwork);
}

export async function getArtworksByMedium(medium: Medium): Promise<Artwork[]> {
  const raw: RawArtwork[] = await sanityClient.fetch(
    `*[_type == "artwork" && medium == $medium] | order(year desc) ${ARTWORK_PROJECTION}`,
    { medium }
  );
  return raw.map(mapArtwork);
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const raw: RawArtwork | null = await sanityClient.fetch(
    `*[_type == "artwork" && slug.current == $slug][0] ${ARTWORK_PROJECTION}`,
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
    `*[_type == "journalPost"] | order(date desc) ${JOURNAL_PROJECTION}`
  );
  return raw.map(mapJournalPost);
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const raw: RawJournalPost | null = await sanityClient.fetch(
    `*[_type == "journalPost" && slug.current == $slug][0] ${JOURNAL_PROJECTION}`,
    { slug }
  );
  return raw ? mapJournalPost(raw) : null;
}

export async function getTattooInfo(): Promise<TattooInfo> {
  const raw: RawTattooInfo | null = await sanityClient.fetch(
    `*[_type == "tattooInfo"][0]{ body, images }`
  );
  return mapTattooInfo(raw);
}
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors. (No page imports this file yet, so `npm run build` is unaffected — still 15 pages, still using Plan 1's placeholder data.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/sanity.ts
git commit -m "Add Sanity client and typed GROQ query functions"
```

---

### Task 4: Migrate Portfolio pages

**Files:**
- Modify: `src/pages/portfolio/index.astro`, `src/pages/portfolio/[medium].astro`, `src/components/ArtworkCard.astro`

**Interfaces:**
- Consumes: `MEDIUMS`, `formatMedium`, `getAllArtworks`, `getArtworksByMedium`, `Medium`, `Artwork` from `src/lib/sanity.ts` (Task 3)

- [ ] **Step 1: Update `src/components/ArtworkCard.astro`'s import**

Change only the type import line — everything else in this file (markup, styles) stays exactly as it is:

```diff
-import type { Artwork } from '../data/placeholder-artworks';
+import type { Artwork } from '../lib/sanity';
```

- [ ] **Step 2: Replace `src/pages/portfolio/index.astro` with the version below**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ArtworkCard from '../../components/ArtworkCard.astro';
import { MEDIUMS, formatMedium, getAllArtworks } from '../../lib/sanity';

const artworks = await getAllArtworks();
---
<BaseLayout title="Portfolio">
  <section class="page">
    <h1>Portfolio</h1>
    <nav class="medium-filter">
      {MEDIUMS.map((medium) => (
        <a href={`/portfolio/${medium}`}>{formatMedium(medium)}</a>
      ))}
    </nav>
    <div class="grid">
      {artworks.map((artwork) => (
        <ArtworkCard artwork={artwork} />
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
  }
  .medium-filter {
    display: flex;
    gap: 1rem;
    margin: 1rem 0 2rem;
    text-transform: capitalize;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
</style>
```

- [ ] **Step 3: Replace `src/pages/portfolio/[medium].astro` with the version below**

`getStaticPaths` here only needs `MEDIUMS` (a static local array), not Sanity — so path generation works even before real credentials exist. Only the per-page `getArtworksByMedium` call needs a live project.

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ArtworkCard from '../../components/ArtworkCard.astro';
import { MEDIUMS, formatMedium, getArtworksByMedium, type Medium } from '../../lib/sanity';

export function getStaticPaths() {
  return MEDIUMS.map((medium) => ({ params: { medium } }));
}

const { medium } = Astro.params as { medium: Medium };
const artworks = await getArtworksByMedium(medium);
---
<BaseLayout title={`Portfolio — ${formatMedium(medium)}`}>
  <section class="page">
    <h1>{formatMedium(medium)}</h1>
    <div class="grid">
      {artworks.map((artwork) => (
        <ArtworkCard artwork={artwork} />
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    text-transform: capitalize;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
</style>
```

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors.

Run: `npm run build`
Expected: exits 0. The `production` dataset has no `artwork` documents yet (Studio isn't deployed and no content has been entered — that's separate manual follow-up), so `dist/portfolio/index.html` and each medium subpage render with an empty grid — that's correct, not a bug. Confirm the build completes without a fetch/network error, which would indicate the Project ID or dataset is wrong.

- [ ] **Step 5: Commit**

```bash
git add src/components/ArtworkCard.astro src/pages/portfolio/index.astro src/pages/portfolio/[medium].astro
git commit -m "Migrate Portfolio pages to Sanity"
```

---

### Task 5: Migrate Journal pages

**Files:**
- Modify: `src/pages/journal/index.astro`, `src/pages/journal/[slug].astro`

**Interfaces:**
- Consumes: `getAllJournalPosts`, `getJournalPostBySlug` from `src/lib/sanity.ts` (Task 3)

- [ ] **Step 1: Replace `src/pages/journal/index.astro` with the version below**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllJournalPosts } from '../../lib/sanity';

const posts = await getAllJournalPosts();
---
<BaseLayout title="Journal">
  <section class="page">
    <h1>Journal</h1>
    <ul>
      {posts.map((post) => (
        <li>
          <a href={`/journal/${post.slug}`}>{post.title}</a>
          <span> — {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </li>
      ))}
    </ul>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  li {
    margin-bottom: 0.75rem;
  }
</style>
```

- [ ] **Step 2: Replace `src/pages/journal/[slug].astro` with the version below**

Unlike `portfolio/[medium].astro`, this page's `getStaticPaths` genuinely needs Sanity to enumerate posts — there is no static fallback list, so path generation itself (not just per-page rendering) requires real credentials.

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllJournalPosts, getJournalPostBySlug } from '../../lib/sanity';

export async function getStaticPaths() {
  const posts = await getAllJournalPosts();
  return posts.map((post) => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post = await getJournalPostBySlug(slug!);
---
<BaseLayout title={post!.title}>
  <article class="page">
    <h1>{post!.title}</h1>
    <p class="meta">{new Date(post!.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    {post!.coverImage && <img src={post!.coverImage} alt={post!.title} />}
    <div set:html={post!.body} />
  </article>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  .meta {
    color: var(--color-deep-blue);
  }
  img {
    width: 100%;
  }
</style>
```

`set:html` is safe here because the HTML comes from `toHTML()` on Guillermo's own Sanity portable-text content — there is no untrusted user input in this pipeline.

- [ ] **Step 3: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors.

Run: `npm run build`
Expected: exits 0. No `journalPost` documents exist yet, so `getStaticPaths` returns an empty array and `dist/journal/` only gets an index page (with an empty list) and no post subpages — that's correct for an empty dataset, not a bug.

- [ ] **Step 4: Commit**

```bash
git add src/pages/journal/index.astro src/pages/journal/[slug].astro
git commit -m "Migrate Journal pages to Sanity"
```

---

### Task 6: Migrate Tattoo page

**Files:**
- Modify: `src/pages/tattoo.astro`

**Interfaces:**
- Consumes: `getTattooInfo` from `src/lib/sanity.ts` (Task 3)

- [ ] **Step 1: Replace `src/pages/tattoo.astro` with the version below**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getTattooInfo } from '../lib/sanity';

const info = await getTattooInfo();
---
<BaseLayout title="Tattoo">
  <section class="page">
    <h1>Tattoo</h1>
    <div set:html={info.body} />
    {info.images.length > 0 && (
      <div class="gallery">
        {info.images.map((src) => <img src={src} alt="" />)}
      </div>
    )}
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  .gallery img {
    width: 100%;
  }
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors.

Run: `npm run build`
Expected: exits 0. No `tattooInfo` document exists yet, so `getTattooInfo()` returns the `{ body: '', images: [] }` default from Task 3's null-handling — `dist/tattoo/index.html` renders with an empty body and no gallery, which is correct until Guillermo creates the singleton document in the deployed Studio.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tattoo.astro
git commit -m "Migrate Tattoo page to Sanity"
```

---

### Task 7: Migrate Artwork detail page and add basic image gallery

**Files:**
- Modify: `src/pages/artwork/[slug].astro`

**Interfaces:**
- Consumes: `getAllArtworks`, `getArtworkBySlug` from `src/lib/sanity.ts` (Task 3); `formatPrice` from `src/data/format-price.ts` (Plan 1, untouched)

This page's `getStaticPaths`, like Journal's, genuinely needs Sanity to enumerate artworks — no static fallback.

The gallery below supports up to 8 images per artwork via pure CSS (radio-button + sibling-selector technique, no JavaScript). 8 is an intentional cap for this plan — a piece with more than 8 photos is not expected for v1; only the first 8 are click-able if that limit is ever exceeded, and this can be revisited later if it becomes a real constraint.

- [ ] **Step 1: Replace `src/pages/artwork/[slug].astro` with the version below**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllArtworks, getArtworkBySlug } from '../../lib/sanity';
import { formatPrice } from '../../data/format-price';

export async function getStaticPaths() {
  const artworks = await getAllArtworks();
  return artworks.map((artwork) => ({ params: { slug: artwork.slug } }));
}

const { slug } = Astro.params;
const artwork = await getArtworkBySlug(slug!);
const images = artwork!.images.slice(0, 8);
---
<BaseLayout title={artwork!.title}>
  <section class="detail">
    <div class="gallery">
      {images.map((_, i) => (
        <input type="radio" name="gallery" id={`gallery-${i}`} class="gallery-radio" checked={i === 0} />
      ))}
      <div class="gallery-main">
        {images.map((src, i) => (
          <img src={src} alt={artwork!.title} class={`gallery-image gallery-image-${i}`} />
        ))}
      </div>
      {images.length > 1 && (
        <div class="gallery-thumbs">
          {images.map((src, i) => (
            <label for={`gallery-${i}`} class="gallery-thumb">
              <img src={src} alt={`${artwork!.title} thumbnail ${i + 1}`} />
            </label>
          ))}
        </div>
      )}
    </div>
    <div class="info">
      <h1>{artwork!.title}</h1>
      <p class="meta">{artwork!.year} — {artwork!.dimensions}</p>
      <p>{artwork!.description}</p>

      {artwork!.availableAsOriginal && (
        <a class="button" href="/contact">Inquire about the original</a>
      )}

      {artwork!.printOptions.length > 0 && (
        <div class="prints">
          <h2>Available prints</h2>
          <ul>
            {artwork!.printOptions.map((option) => (
              <li>
                {option.size} — {formatPrice(option.price)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </section>
</BaseLayout>

<style>
  .detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 3rem 2rem;
  }
  .gallery-radio {
    display: none;
  }
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
  .gallery-thumbs {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .gallery-thumb {
    display: block;
    width: 60px;
    cursor: pointer;
    opacity: 0.6;
  }
  .gallery-thumb img {
    width: 100%;
    display: block;
  }
  .gallery-radio:nth-of-type(1):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(1),
  .gallery-radio:nth-of-type(2):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(2),
  .gallery-radio:nth-of-type(3):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(3),
  .gallery-radio:nth-of-type(4):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(4),
  .gallery-radio:nth-of-type(5):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(5),
  .gallery-radio:nth-of-type(6):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(6),
  .gallery-radio:nth-of-type(7):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(7),
  .gallery-radio:nth-of-type(8):checked ~ .gallery-thumbs .gallery-thumb:nth-of-type(8) {
    opacity: 1;
  }
  .meta {
    color: var(--color-deep-blue);
  }
  .button {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-blue);
    color: #fff;
    text-decoration: none;
  }
  .prints ul {
    list-style: none;
    padding: 0;
  }
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors.

Run: `npm run build`
Expected: exits 0. No `artwork` documents exist yet, so `getStaticPaths` returns an empty array and no `dist/artwork/*` pages generate at all — that's correct for an empty dataset, not a bug.

- [ ] **Step 3: Commit**

```bash
git add src/pages/artwork/[slug].astro
git commit -m "Migrate Artwork detail page to Sanity, add basic image gallery"
```

---

### Task 8: Remove placeholder data and finalize

**Files:**
- Delete: `src/data/placeholder-artworks.ts`, `src/data/placeholder-artworks.test.ts`, `src/data/placeholder-journal.ts`
- Modify: `netlify.toml`

**Interfaces:**
- None produced — this is cleanup. No remaining file should import from the deleted paths.

- [ ] **Step 1: Confirm nothing still imports the placeholder files**

Run: `grep -rn "placeholder-artworks\|placeholder-journal" src/ --include="*.astro" --include="*.ts"`
Expected: no output (empty) — Tasks 4-6 already moved every consumer to `src/lib/sanity.ts`.

- [ ] **Step 2: Delete the placeholder files**

```bash
git rm src/data/placeholder-artworks.ts src/data/placeholder-artworks.test.ts src/data/placeholder-journal.ts
```

- [ ] **Step 3: Update `netlify.toml`**

Add a comment documenting the two required env vars (their real values are entered in Netlify's dashboard, never committed):

```toml
[build]
  command = "npm run build"
  publish = "dist"

# Required environment variables (set in Netlify's dashboard, not here):
#   PUBLIC_SANITY_PROJECT_ID
#   PUBLIC_SANITY_DATASET (typically "production")
```

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: exits 0, 0 errors — confirms nothing type-checks against the deleted files.

Run: `npm run test`
Expected: `vitest run` reports no test files found (the only two test files belonged to the deleted placeholder module). This is expected: there is nothing left to test at this stage (per the Global Constraints' "no new tests" rule) — not a regression.

- [ ] **Step 5: Commit**

```bash
git add netlify.toml
git commit -m "Remove placeholder data modules, document required Netlify env vars"
```

---

## Manual Follow-Up (not part of this plan's tasks)

The Sanity project (`48jkcmcb`, `production` dataset) already exists. Once this plan's 8 tasks are complete and reviewed, these steps need Guillermo's own accounts/browser access before the site has real content:

1. Run `npx sanity deploy` to publish the Studio.
2. Log into the deployed Studio and enter content — at minimum, one `tattooInfo` document (Task 3's `getTattooInfo()` handles zero documents gracefully, but the `/tattoo` page will stay empty until one exists), plus real artwork and journal posts.
3. Run `npm run build` again to confirm real content now generates real pages (portfolio grids populated, artwork/journal detail pages generated per document).
4. Create a Netlify build hook and add it as a Sanity webhook target so future publishes trigger a rebuild.
5. Set `PUBLIC_SANITY_PROJECT_ID=48jkcmcb` and `PUBLIC_SANITY_DATASET=production` in Netlify's dashboard build environment variables.
