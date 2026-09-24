# Visual Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Family A brand identity to every page of the Gluk site (dark grainy gradient fields, real wordmark, rupture rule, numbered-index device, veil + halo painting presentation, live-data easter egg), backed by new Sanity content types, and re-fit the existing GSAP motion layer to it.

**Architecture:** A small set of Astro building blocks (`Backdrop`, `RuptureRule`, `NumberedIndex`, `Painting`, `WallLabel`, `DataEgg`) styled from one token file compose every page. All data decisions (defaults, series grouping, halo resolution, live-data formatting, contact prefill) live in pure, unit-tested TypeScript modules in `src/lib/`; `src/lib/sanity.ts` only fetches and wires them together. Motion stays in `src/motion/` (existing lifecycle), with the home hero rewritten; small UI behaviours (mobile menu, data egg, clocks) are plain client scripts in `src/scripts/`.

**Tech Stack:** Astro 7.3 (static, `astro:transitions`), GSAP 3 + ScrollTrigger, Sanity v6 schema + `@sanity/client`, `sharp` (brand-asset build script and build-time halo measurement), vitest 5 (node environment, no DOM library), Netlify Forms.

**Spec:** `docs/superpowers/specs/2026-09-23-visual-design-pass-design.md`

**Status:** Self-reviewed 2026-09-23 (spec coverage, placeholders, cross-task names); awaiting Guillermo's review.

## Global Constraints

- Work happens in the worktree `C:/Users/Guillermo/dev/gluk-portfolio-shop/.worktrees/gsap-motion` on branch `feat/gsap-motion`. Never commit to `main`.
- Colors: Blue `#0C89D5`, Deep blue `#011458`, Black `#1E1619`, Orange `#C34F05`, Bone `#F1EEE8`. Fonts: Archivo (display) and Karla (body) only.
- Copy rule: words come only from the spec/brand book or Guillermo. Allowed UI labels: nav/page names, form labels, data labels (`Air`, `Humidity`, `Elevation`, `Sea`), `Original`, `Inquire`, `Prints`, `Request a session`, `Send`, `Menu`, `Close`, `Series`, `Diptych`, `Standalone works`, `Standalone work`, `No entries yet`, `Read →`, `Photography —`, `Thank you — your message was sent.` Anything else needs Guillermo. No tags, stickers, captions-as-decoration, pull-quotes.
- Real facts only: email `gluk.caribe@gmail.com`, Instagram `gluk______` (six underscores), studio city `Ciudad de México`; Caracas 10.4806 N 66.9036 W, 882 m, `America/Caracas`; Mexico City 19.4326 N 99.1332 W, 2 230 m, `America/Mexico_City`; sea points Caribbean off La Guaira 10.65 N 66.93 W, Pacific off Acapulco 16.80 N 99.90 W.
- Paintings: never animated, tinted, filtered or overlaid; the veil and halo sit *behind* them and never animate.
- Motion values come from `src/motion/tokens.ts`; use `gsap.fromTo` for guard-hidden elements; reduced motion = fades only.
- Live weather is OFF unless `PUBLIC_LIVE_WEATHER=on` (Guillermo must choose a commercial data plan first — spec §8). Do not enable it.
- Sanity writes (`npm run seed:design`), `npx sanity deploy`, `git push`, and any merge to `main` require Guillermo's explicit OK at that moment — implementers must NOT run them.
- Do not read or print `.env` (it holds `SANITY_WRITE_TOKEN`).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Environment: Windows 11, Git Bash, forward-slash paths.
- Gates for every task: `npm run check`, `npm test`, `npm run build` all pass (0 errors).

## Review Focus

1. **Sanity content missing or partial** (no `series` docs yet, no `homePage`/`aboutPage`/`siteSettings` documents, empty `heroList`, dangling featured references) → every page still renders with the spec defaults. Pinned by mapper tests in Task 2, the no-series room test in Task 4, and the pre-seed build check in Task 15.
2. **Halo measurement fails** (network error, non-Sanity image URL, empty image) → the build still succeeds, that painting gets no halo, a warning is logged. Pinned by `measureEdge` and `resolveHalos` tests in Task 3.
3. **Live data unavailable** (weather flag off, fetch rejects, malformed JSON, `sessionStorage` throws, JavaScript disabled) → the egg shows times, elevation and route only; with JS off the egg and clocks are hidden instead of showing `--:--`. Pinned by `parseWeather`/`loadWeather` tests in Task 8 and the no-JS check in Task 16.
4. **Keyboard and touch users** (no hover) → the data egg opens on tap/Enter, the mobile menu opens/closes with a button, `Escape` closes it, `aria-expanded` stays in sync. Pinned by the headless checks added in Task 16.
5. **Hostile or odd contact query strings** (unknown `interest`, 5 000-character or HTML-looking `artwork`) → unknown interests are ignored, the artwork name is length-clamped and inserted as text, never HTML. Pinned by `readPrefill` tests in Task 14.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `sanity/schemaTypes/series.ts` | Create | `series` document |
| `sanity/schemaTypes/haloOptions.ts` | Create | shared `auto/always/never` option list |
| `sanity/schemaTypes/artwork.ts` | Modify | `series`, `seriesPosition`, `halo` fields |
| `sanity/schemaTypes/homePage.ts` | Modify | drop portrait; add `heroList`, `heroFootnote` |
| `sanity/schemaTypes/aboutPage.ts` | Create | About singleton |
| `sanity/schemaTypes/siteSettings.ts` | Create | contact/settings singleton |
| `sanity/schemaTypes/tattooInfo.ts` | Modify | `statement`, `process` |
| `sanity/schemaTypes/index.ts`, `sanity/structure.ts` | Modify | register + pin singletons |
| `src/lib/artwork-map.ts` (+ test) | Create | artwork types + pure raw→view mapping |
| `src/lib/home-page.ts` (+ test) | Rewrite | hero list/footnote defaults, featured slugs → artworks |
| `src/lib/about-page.ts` (+ test) | Create | About defaults + portrait mapping + `focalPoint` |
| `src/lib/site-settings.ts` (+ test) | Create | settings defaults, Instagram URL |
| `src/lib/tattoo-info.ts` (+ test) | Create | tattoo mapping |
| `src/lib/halo.ts` (+ test) | Create | edge luminance + halo resolution |
| `src/lib/halo-measure.ts` (+ test) | Create | build-time thumbnail fetch + `sharp` decode |
| `src/lib/numerals.ts` (+ test) | Create | `toRoman`, `pad2` |
| `src/lib/rooms.ts` (+ test) | Create | series rooms, counts, wall-label heading |
| `src/lib/route-data.ts` (+ test) | Create | places, clocks, distance/bearing, formatting |
| `src/lib/weather.ts` (+ test) | Create | Open-Meteo parse + cached load (flag-gated) |
| `src/lib/contact-prefill.ts` (+ test) | Create | interests + query-string prefill |
| `src/lib/sanity.ts` | Modify | fetch + wire modules; `getAllArtworks` resolves halos |
| `scripts/build-brand-assets.mjs` | Create | brand images → `public/brand/*` |
| `src/lib/brand.ts` | Create | wordmark intrinsic size (`WORDMARK_WIDTH`/`WORDMARK_HEIGHT`) |
| `docs/brand-kit/fields/*` | Create | source gradient fields + rupture rule |
| `public/brand/*` | Create (generated) | optimized fields, veil, rules, wordmark |
| `src/styles/theme.css` | Rewrite | tokens, dark base, type utilities, guard |
| `src/components/Backdrop.astro` | Create | fixed field/veil + grain |
| `src/components/RuptureRule.astro` | Create | the rule |
| `src/components/NumberedIndex.astro` | Create | numbered-list device |
| `src/components/Painting.astro` | Create | painting image + optional halo |
| `src/components/WallLabel.astro` | Create | artwork label column |
| `src/components/Room.astro` | Create | one portfolio room |
| `src/components/DataEgg.astro` | Create | home live-data easter egg |
| `src/components/StudioClock.astro` | Create | live studio time (contact) |
| `src/components/Nav.astro` | Rewrite | wordmark, links, mobile menu |
| `src/components/Footer.astro` | Rewrite | wordmark + rule, columns, legal row |
| `src/components/Cursor.astro` | Modify | bone color, no blend |
| `src/components/ArtworkCard.astro` | Delete | replaced by `Room` + `Painting` |
| `src/scripts/mobile-menu.ts` | Create | menu toggle behaviour |
| `src/scripts/live-data.ts` | Create | clocks + egg toggle + optional weather |
| `src/layouts/BaseLayout.astro` | Modify | `backdrop` prop, settings, drop `overlayNav` |
| `src/motion/home-hero.ts`, `src/motion/tokens.ts` | Modify | new hero opening |
| `src/pages/index.astro` | Rewrite | F2 hero + egg + featured |
| `src/pages/portfolio/index.astro`, `[medium].astro` | Rewrite | rooms |
| `src/pages/artwork/[slug].astro` | Rewrite | wall label |
| `src/pages/about.astro`, `tattoo.astro`, `journal/index.astro`, `journal/[slug].astro`, `contact.astro` | Rewrite | new pages |
| `src/pages/contact/thanks.astro` | Create | form success |
| `scripts/seed-design-content.mjs` | Create | idempotent initial content (series, settings, about, home) |
| `scripts/seed-home-page.mjs` | Delete | superseded |
| `package.json` | Modify | scripts; `sharp` → dependencies |
| `netlify.toml` | Modify | document `PUBLIC_LIVE_WEATHER` |

---

### Task 1: Sanity schemas for the new design

**Files:**
- Create: `sanity/schemaTypes/haloOptions.ts`, `sanity/schemaTypes/series.ts`, `sanity/schemaTypes/aboutPage.ts`, `sanity/schemaTypes/siteSettings.ts`
- Modify: `sanity/schemaTypes/artwork.ts`, `sanity/schemaTypes/homePage.ts`, `sanity/schemaTypes/tattooInfo.ts`, `sanity/schemaTypes/index.ts`, `sanity/structure.ts`

**Interfaces:**
- Produces (Sanity field names later tasks query): `series{name, slug, order, kind, halo}`; `artwork.series` (reference), `artwork.seriesPosition`, `artwork.halo`; `homePage.heroList`, `homePage.heroFootnote`, `homePage.featuredWorks`; `aboutPage{portrait, portraitAlt, statement, body, photoCredit}` with `_id: "aboutPage"`; `siteSettings{email, instagramHandle, studioCity}` with `_id: "siteSettings"`; `tattooInfo.statement`, `tattooInfo.process`.

- [ ] **Step 1: Shared halo option list**

`sanity/schemaTypes/haloOptions.ts`:
```ts
// Halo = soft orange/blue glow behind dark-edged paintings (spec §6.2).
export const HALO_OPTIONS = [
  { title: 'Auto (measured from the painting)', value: 'auto' },
  { title: 'Always', value: 'always' },
  { title: 'Never', value: 'never' },
];
```

- [ ] **Step 2: `series` document**

`sanity/schemaTypes/series.ts`:
```ts
import { defineType, defineField } from 'sanity';
import { HALO_OPTIONS } from './haloOptions';

export const series = defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order on the portfolio page',
      type: 'number',
      description: '1 shows first.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: { list: [{ title: 'Series', value: 'series' }, { title: 'Diptych', value: 'diptych' }] },
      initialValue: 'series',
    }),
    defineField({
      name: 'halo',
      title: 'Halo for the whole series',
      type: 'string',
      options: { list: HALO_OPTIONS, layout: 'radio' },
      initialValue: 'auto',
      description: 'Auto = on if any painting in the series has dark edges.',
    }),
  ],
  orderings: [{ title: 'Portfolio order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
```

- [ ] **Step 3: Artwork fields**

In `sanity/schemaTypes/artwork.ts`, add `import { HALO_OPTIONS } from './haloOptions';` below the existing import, and insert these fields directly after the `medium` field:
```ts
    defineField({
      name: 'series',
      title: 'Series',
      type: 'reference',
      to: [{ type: 'series' }],
      description: 'Leave empty for a standalone work.',
    }),
    defineField({
      name: 'seriesPosition',
      title: 'Position in series',
      type: 'number',
      description: '1, 2, 3… Order of this work inside its series.',
      hidden: ({ document }) => !document?.series,
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: 'halo',
      title: 'Halo',
      type: 'string',
      options: { list: HALO_OPTIONS, layout: 'radio' },
      initialValue: 'auto',
    }),
```

- [ ] **Step 4: Home page — drop the portrait, add the hero list**

Replace the whole `fields` array in `sanity/schemaTypes/homePage.ts` with:
```ts
  fields: [
    defineField({
      name: 'heroList',
      title: 'Hero words',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'The numbered list at the top of the home page. Default: Óleo, Tinta, Código.',
      validation: (Rule) => Rule.max(5),
    }),
    defineField({
      name: 'heroFootnote',
      title: 'Hero footnote',
      type: 'string',
      description: 'Small margin text beside the list. Default: Oil, ink and code, put in friction.',
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
```

- [ ] **Step 5: About page and site settings singletons**

`sanity/schemaTypes/aboutPage.ts`:
```ts
import { defineType, defineField } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({ name: 'portrait', title: 'Portrait', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'portraitAlt',
      title: 'Portrait alt text',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((alt, context) => {
          const doc = context.document as { portrait?: { asset?: unknown } } | undefined;
          return doc?.portrait?.asset && !alt?.trim() ? 'Alt text is required when a portrait is set.' : true;
        }),
    }),
    defineField({ name: 'statement', title: 'Statement (large)', type: 'text', rows: 3 }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'photoCredit', title: 'Photography credit', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'About Page' }) },
});
```

`sanity/schemaTypes/siteSettings.ts`:
```ts
import { defineType, defineField } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'email', title: 'Public email', type: 'string', validation: (Rule) => Rule.email() }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram handle',
      type: 'string',
      description: 'Without the @.',
    }),
    defineField({ name: 'studioCity', title: 'Studio city', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
```

- [ ] **Step 6: Tattoo info fields**

In `sanity/schemaTypes/tattooInfo.ts`, insert before the `body` field:
```ts
    defineField({ name: 'statement', title: 'Statement', type: 'text', rows: 3 }),
    defineField({
      name: 'process',
      title: 'Process steps',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Shown as a numbered list.',
    }),
```

- [ ] **Step 7: Register and pin**

`sanity/schemaTypes/index.ts`:
```ts
import { artwork } from './artwork';
import { series } from './series';
import { printOption } from './printOption';
import { journalPost } from './journalPost';
import { tattooInfo } from './tattooInfo';
import { homePage } from './homePage';
import { aboutPage } from './aboutPage';
import { siteSettings } from './siteSettings';

export const schemaTypes = [
  artwork,
  series,
  printOption,
  journalPost,
  tattooInfo,
  homePage,
  aboutPage,
  siteSettings,
];
```

`sanity/structure.ts`:
```ts
import type { StructureResolver } from 'sanity/structure';

const singleton = (S: Parameters<StructureResolver>[0], title: string, type: string) =>
  S.listItem().title(title).child(S.document().schemaType(type).documentId(type));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      singleton(S, 'Home Page', 'homePage'),
      singleton(S, 'About Page', 'aboutPage'),
      singleton(S, 'Site Settings', 'siteSettings'),
      S.divider(),
      S.documentTypeListItem('artwork').title('Artwork'),
      S.documentTypeListItem('series').title('Series'),
      S.documentTypeListItem('journalPost').title('Journal Posts'),
      singleton(S, 'Tattoo Info', 'tattooInfo'),
    ]);
```

- [ ] **Step 8: Validate**

Run: `npx sanity schema validate`
Expected: no errors (report any warnings).

Run: `npm run check && npm test && npm run build`
Expected: `npm run check` may now report errors in `src/lib/sanity.ts`/`src/pages/index.astro` only if they reference removed schema *types* — they don't (GROQ strings are untyped), so all three pass.

- [ ] **Step 9: Commit**

```bash
git add sanity/
git commit -m "Add series, about, site settings schemas; hero list on home page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Note: the deployed Studio only shows these after `npx sanity deploy` (post-merge, needs Guillermo).

---

### Task 2: Pure content mapping modules

**Files:**
- Create: `src/lib/artwork-map.ts`, `src/lib/artwork-map.test.ts`, `src/lib/about-page.ts`, `src/lib/about-page.test.ts`, `src/lib/site-settings.ts`, `src/lib/site-settings.test.ts`, `src/lib/tattoo-info.ts`, `src/lib/tattoo-info.test.ts`
- Rewrite: `src/lib/home-page.ts`, `src/lib/home-page.test.ts`
- Modify: `src/lib/sanity.ts`

**Interfaces:**
- Produces (from `src/lib/artwork-map.ts`, re-exported by `src/lib/sanity.ts`):
  ```ts
  export const MEDIUMS: readonly ['oil-painting','tattoo','sculpture','mixed-media'];
  export type Medium = (typeof MEDIUMS)[number];
  export type HaloSetting = 'auto' | 'always' | 'never';
  export type SeriesKind = 'series' | 'diptych';
  export interface SeriesInfo { slug: string; name: string; order: number; kind: SeriesKind; halo: HaloSetting }
  export interface PrintOption { size: string; price: number; stripePriceId: string }
  export interface Artwork { slug; title; medium: Medium; year: number | null; dimensions: string | null; description: string | null; images: string[]; availableAsOriginal: boolean; printOptions: PrintOption[]; series: SeriesInfo | null; seriesPosition: number | null; haloSetting: HaloSetting; halo: boolean }
  export interface RawArtwork { … }  // shape returned by ARTWORK_PROJECTION
  export function mapArtwork(raw: RawArtwork, urlFor: (image: RawImage) => string): Artwork;
  export function mediumLabel(medium: Medium): string; // 'Oil painting'
  ```
- `src/lib/home-page.ts`: `DEFAULT_HERO_LIST`, `DEFAULT_HERO_FOOTNOTE`, `interface RawHomePage { heroList; heroFootnote; featuredSlugs }`, `interface HomePage<Art> { heroList: string[]; heroFootnote: string; featuredWorks: Art[] }`, `mapHomePage<Art extends { slug: string }>(raw, artworks: Art[]): HomePage<Art>`.
- `src/lib/about-page.ts`: `DEFAULT_ABOUT`, `focalPoint(hotspot)`, `interface AboutPortrait { src; srcset; alt; focalPoint }`, `interface AboutPage { portrait: AboutPortrait | null; statement: string; bodyHtml: string; photoCredit: string | null }`, `ABOUT_PORTRAIT_WIDTHS`, `mapAboutPage(raw, deps: { imageUrl(image, width): string; toHtml(blocks: unknown[]): string }): AboutPage`.
- `src/lib/site-settings.ts`: `DEFAULT_SITE_SETTINGS`, `interface SiteSettings { email; instagramHandle; instagramUrl; studioCity }`, `mapSiteSettings(raw): SiteSettings`.
- `src/lib/tattoo-info.ts`: `interface TattooInfo { statement: string | null; process: string[]; bodyHtml: string; images: string[] }`, `mapTattooInfo(raw, deps: { urlFor; toHtml }): TattooInfo`.
- `src/lib/sanity.ts` exports: everything above plus `getAllArtworks(): Promise<Artwork[]>`, `getArtworksByMedium(m)`, `getArtworkBySlug(slug)`, `getHomePage(): Promise<HomePage<Artwork>>`, `getAboutPage()`, `getSiteSettings()`, `getTattooInfo()`, `getAllJournalPosts()`, `getJournalPostBySlug()`, `formatMedium` (kept), `JournalPost` type.

- [ ] **Step 1: Write the failing tests**

`src/lib/artwork-map.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapArtwork, mediumLabel, type RawArtwork } from './artwork-map';

const urlFor = (image: { asset: { _ref: string } }) => `https://cdn.sanity.io/images/p/d/${image.asset._ref}.jpg`;

function raw(overrides: Partial<RawArtwork> = {}): RawArtwork {
  return {
    slug: 'motopirueta-1',
    title: 'Motopirueta 1',
    medium: 'oil-painting',
    year: null,
    dimensions: null,
    description: null,
    images: [{ asset: { _ref: 'a1', _type: 'reference' } }],
    availableAsOriginal: null,
    printOptions: null,
    series: null,
    seriesPosition: null,
    haloSetting: null,
    ...overrides,
  };
}

describe('mapArtwork', () => {
  it('fills safe defaults for every optional field', () => {
    expect(mapArtwork(raw(), urlFor)).toEqual({
      slug: 'motopirueta-1',
      title: 'Motopirueta 1',
      medium: 'oil-painting',
      year: null,
      dimensions: null,
      description: null,
      images: ['https://cdn.sanity.io/images/p/d/a1.jpg'],
      availableAsOriginal: false,
      printOptions: [],
      series: null,
      seriesPosition: null,
      haloSetting: 'auto',
      halo: false,
    });
  });

  it('maps a series with defaults for missing series fields', () => {
    const result = mapArtwork(
      raw({ series: { slug: 'motopirueta', name: 'Motopirueta', order: null, kind: null, halo: null }, seriesPosition: 2 }),
      urlFor
    );
    expect(result.series).toEqual({ slug: 'motopirueta', name: 'Motopirueta', order: 999, kind: 'series', halo: 'auto' });
    expect(result.seriesPosition).toBe(2);
  });

  it('treats a dangling series reference (null name) as standalone', () => {
    const result = mapArtwork(raw({ series: { slug: null, name: null, order: 1, kind: null, halo: null } }), urlFor);
    expect(result.series).toBeNull();
    expect(result.seriesPosition).toBeNull();
  });

  it('keeps an explicit halo setting and ignores unknown ones', () => {
    expect(mapArtwork(raw({ haloSetting: 'always' }), urlFor).haloSetting).toBe('always');
    expect(mapArtwork(raw({ haloSetting: 'sometimes' as never }), urlFor).haloSetting).toBe('auto');
  });

  it('treats a missing images array as empty', () => {
    expect(mapArtwork(raw({ images: null }), urlFor).images).toEqual([]);
  });
});

describe('mediumLabel', () => {
  it('turns a medium value into a sentence-case label', () => {
    expect(mediumLabel('oil-painting')).toBe('Oil painting');
    expect(mediumLabel('mixed-media')).toBe('Mixed media');
    expect(mediumLabel('tattoo')).toBe('Tattoo');
  });
});
```

`src/lib/home-page.test.ts` (replace the whole file):
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_HERO_FOOTNOTE, DEFAULT_HERO_LIST, mapHomePage } from './home-page';

const artworks = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];

describe('mapHomePage', () => {
  it('uses the defaults when the document does not exist', () => {
    expect(mapHomePage(null, artworks)).toEqual({
      heroList: [...DEFAULT_HERO_LIST],
      heroFootnote: DEFAULT_HERO_FOOTNOTE,
      featuredWorks: [],
    });
  });

  it('keeps the approved defaults (his three media, from BIO.pdf)', () => {
    expect(DEFAULT_HERO_LIST).toEqual(['Óleo', 'Tinta', 'Código']);
    expect(DEFAULT_HERO_FOOTNOTE).toBe('Oil, ink and code, put in friction.');
  });

  it('trims hero words and drops blanks and nulls', () => {
    const result = mapHomePage({ heroList: ['  Uno ', '', null, 'Dos'], heroFootnote: null, featuredSlugs: null }, artworks);
    expect(result.heroList).toEqual(['Uno', 'Dos']);
  });

  it('falls back to the default list when every word is blank', () => {
    expect(mapHomePage({ heroList: ['  '], heroFootnote: '', featuredSlugs: [] }, artworks).heroList).toEqual([
      ...DEFAULT_HERO_LIST,
    ]);
  });

  it('caps the hero list at five words', () => {
    const list = ['1', '2', '3', '4', '5', '6'];
    expect(mapHomePage({ heroList: list, heroFootnote: null, featuredSlugs: null }, artworks).heroList).toHaveLength(5);
  });

  it('uses a trimmed custom footnote', () => {
    expect(mapHomePage({ heroList: null, heroFootnote: '  otra línea ', featuredSlugs: null }, artworks).heroFootnote).toBe(
      'otra línea'
    );
  });

  it('resolves featured slugs to artworks in order, skipping missing and duplicate ones', () => {
    const result = mapHomePage({ heroList: null, heroFootnote: null, featuredSlugs: ['c', null, 'zzz', 'a', 'c'] }, artworks);
    expect(result.featuredWorks).toEqual([{ slug: 'c' }, { slug: 'a' }]);
  });
});
```

`src/lib/about-page.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ABOUT_PORTRAIT_WIDTHS, DEFAULT_ABOUT, DEFAULT_ABOUT_BODY_HTML, focalPoint, mapAboutPage } from './about-page';

const deps = {
  imageUrl: (_image: unknown, width: number) => `https://cdn.test/p.jpg?w=${width}`,
  toHtml: (blocks: unknown[]) => `<p>${blocks.length} blocks</p>`,
};

describe('mapAboutPage', () => {
  it('uses the BIO.pdf text and no portrait when the document is missing', () => {
    expect(mapAboutPage(null, deps)).toEqual({
      portrait: null,
      statement: DEFAULT_ABOUT.statement,
      bodyHtml: DEFAULT_ABOUT_BODY_HTML,
      photoCredit: null,
    });
  });

  it('keeps the default text verbatim from BIO.pdf', () => {
    expect(DEFAULT_ABOUT.statement).toBe('Gluk is a Caribbean artist born in Caracas, Venezuela.');
    expect(DEFAULT_ABOUT.body).toHaveLength(6);
    expect(DEFAULT_ABOUT.body[0]).toMatch(/^Disruptive not in terms of subject matter, /);
    expect(DEFAULT_ABOUT.body[0]).toMatch(/He currently lives and works in Mexico City\.$/);
    expect(DEFAULT_ABOUT.body[5]).toMatch(/to be touched without being dominated\.$/);
  });

  it('renders every default body paragraph as its own <p>', () => {
    expect(DEFAULT_ABOUT_BODY_HTML).toBe(DEFAULT_ABOUT.body.map((p) => `<p>${p}</p>`).join(''));
  });

  it('maps a complete document', () => {
    const result = mapAboutPage(
      {
        portrait: { asset: { _ref: 'img', _type: 'reference' }, hotspot: { x: 0.5, y: 0.3 } },
        portraitAlt: 'Portrait of GLUK in the studio',
        statement: 'Custom statement',
        body: [{ _type: 'block' }],
        photoCredit: '  Someone  ',
      },
      deps
    );
    expect(result.portrait).toEqual({
      src: 'https://cdn.test/p.jpg?w=1200',
      srcset: ABOUT_PORTRAIT_WIDTHS.map((w) => `https://cdn.test/p.jpg?w=${w} ${w}w`).join(', '),
      alt: 'Portrait of GLUK in the studio',
      focalPoint: '50% 30%',
    });
    expect(result.statement).toBe('Custom statement');
    expect(result.bodyHtml).toBe('<p>1 blocks</p>');
    expect(result.photoCredit).toBe('Someone');
  });

  it('treats blank strings and empty body as missing', () => {
    const result = mapAboutPage(
      { portrait: { asset: null }, portraitAlt: null, statement: '   ', body: [], photoCredit: ' ' },
      deps
    );
    expect(result.portrait).toBeNull();
    expect(result.statement).toBe(DEFAULT_ABOUT.statement);
    expect(result.bodyHtml).toBe(DEFAULT_ABOUT_BODY_HTML);
    expect(result.photoCredit).toBeNull();
  });

  it('falls back to "GLUK" alt text', () => {
    const result = mapAboutPage({ portrait: { asset: { _ref: 'x', _type: 'reference' } }, portraitAlt: ' ' }, deps);
    expect(result.portrait?.alt).toBe('GLUK');
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

`src/lib/site-settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SITE_SETTINGS, mapSiteSettings } from './site-settings';

describe('mapSiteSettings', () => {
  it('uses the real defaults when the document is missing', () => {
    expect(mapSiteSettings(null)).toEqual({
      email: 'gluk.caribe@gmail.com',
      instagramHandle: 'gluk______',
      instagramUrl: 'https://www.instagram.com/gluk______/',
      studioCity: 'Ciudad de México',
    });
    expect(DEFAULT_SITE_SETTINGS.instagramHandle).toBe('gluk______');
  });

  it('strips a leading @ and whitespace from the handle', () => {
    const result = mapSiteSettings({ email: null, instagramHandle: ' @someone ', studioCity: null });
    expect(result.instagramHandle).toBe('someone');
    expect(result.instagramUrl).toBe('https://www.instagram.com/someone/');
  });

  it('falls back field by field on blanks', () => {
    const result = mapSiteSettings({ email: ' ', instagramHandle: '', studioCity: 'Caracas' });
    expect(result.email).toBe('gluk.caribe@gmail.com');
    expect(result.instagramHandle).toBe('gluk______');
    expect(result.studioCity).toBe('Caracas');
  });
});
```

`src/lib/tattoo-info.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapTattooInfo } from './tattoo-info';

const deps = {
  urlFor: (image: { asset: { _ref: string } }) => `https://cdn.sanity.io/images/p/d/${image.asset._ref}.jpg`,
  toHtml: (blocks: unknown[]) => (blocks.length ? '<p>body</p>' : ''),
};

describe('mapTattooInfo', () => {
  it('returns an empty page when the document is missing', () => {
    expect(mapTattooInfo(null, deps)).toEqual({ statement: null, process: [], bodyHtml: '', images: [] });
  });

  it('maps a complete document, trimming and dropping blank process steps', () => {
    expect(
      mapTattooInfo(
        {
          statement: ' A statement ',
          process: [' one ', '', null, 'two'],
          body: [{ _type: 'block' }],
          images: [{ asset: { _ref: 't1', _type: 'reference' } }],
        },
        deps
      )
    ).toEqual({
      statement: 'A statement',
      process: ['one', 'two'],
      bodyHtml: '<p>body</p>',
      images: ['https://cdn.sanity.io/images/p/d/t1.jpg'],
    });
  });

  it('treats a blank statement as missing', () => {
    expect(mapTattooInfo({ statement: '  ', process: null, body: null, images: null }, deps).statement).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/artwork-map.test.ts src/lib/home-page.test.ts src/lib/about-page.test.ts src/lib/site-settings.test.ts src/lib/tattoo-info.test.ts`
Expected: FAIL — modules not found / `mapHomePage` signature mismatch.

- [ ] **Step 3: Implement the modules**

`src/lib/artwork-map.ts`:
```ts
// Artwork types and the pure raw→view mapping. Free of `sanity:client` so it can
// be unit-tested; src/lib/sanity.ts supplies the image URL builder.

export const MEDIUMS = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'] as const;
export type Medium = (typeof MEDIUMS)[number];
export type HaloSetting = 'auto' | 'always' | 'never';
export type SeriesKind = 'series' | 'diptych';

const HALO_SETTINGS: readonly HaloSetting[] = ['auto', 'always', 'never'];

export interface SeriesInfo {
  slug: string;
  name: string;
  order: number;
  kind: SeriesKind;
  halo: HaloSetting;
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
  year: number | null;
  dimensions: string | null;
  description: string | null;
  images: string[];
  availableAsOriginal: boolean;
  printOptions: PrintOption[];
  series: SeriesInfo | null;
  seriesPosition: number | null;
  haloSetting: HaloSetting;
  // Resolved at build time from edge measurement + series rule (src/lib/halo.ts).
  halo: boolean;
}

export interface RawImage {
  asset: { _ref: string; _type: string };
}

export interface RawSeries {
  slug: string | null;
  name: string | null;
  order: number | null;
  kind: string | null;
  halo: string | null;
}

export interface RawArtwork {
  slug: string;
  title: string;
  medium: Medium;
  year: number | null;
  dimensions: string | null;
  description: string | null;
  images: RawImage[] | null;
  availableAsOriginal: boolean | null;
  printOptions: PrintOption[] | null;
  series: RawSeries | null;
  seriesPosition: number | null;
  haloSetting: string | null;
}

// Keep in sync with RawArtwork.
export const ARTWORK_PROJECTION = `{
  "slug": slug.current,
  title,
  medium,
  year,
  dimensions,
  description,
  images,
  availableAsOriginal,
  printOptions[]{size, price, stripePriceId},
  "series": series->{ "slug": slug.current, name, order, kind, halo },
  seriesPosition,
  "haloSetting": halo
}`;

function haloSetting(value: string | null | undefined): HaloSetting {
  return HALO_SETTINGS.includes(value as HaloSetting) ? (value as HaloSetting) : 'auto';
}

function mapSeries(raw: RawSeries | null): SeriesInfo | null {
  if (!raw?.slug || !raw.name) return null;
  return {
    slug: raw.slug,
    name: raw.name,
    order: raw.order ?? 999,
    kind: raw.kind === 'diptych' ? 'diptych' : 'series',
    halo: haloSetting(raw.halo),
  };
}

export function mapArtwork(raw: RawArtwork, urlFor: (image: RawImage) => string): Artwork {
  const series = mapSeries(raw.series);
  return {
    slug: raw.slug,
    title: raw.title,
    medium: raw.medium,
    year: raw.year ?? null,
    dimensions: raw.dimensions ?? null,
    description: raw.description ?? null,
    images: (raw.images ?? []).map(urlFor),
    availableAsOriginal: raw.availableAsOriginal ?? false,
    printOptions: raw.printOptions ?? [],
    series,
    seriesPosition: series ? (raw.seriesPosition ?? null) : null,
    haloSetting: haloSetting(raw.haloSetting),
    halo: false,
  };
}

export function mediumLabel(medium: Medium): string {
  const words = medium.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

`src/lib/home-page.ts` (replace the whole file):
```ts
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
```

`src/lib/about-page.ts`:
```ts
// Pure mapping for the aboutPage singleton (spec §5.5). Default text is
// Guillermo's BIO.pdf, verbatim: its first sentence is the statement, the rest
// is the body (one string per paragraph).

export const DEFAULT_ABOUT = {
  statement: 'Gluk is a Caribbean artist born in Caracas, Venezuela.',
  body: [
    'Disruptive not in terms of subject matter, but in terms of method and attitude: he articulates ideas using non-traditional media and contemporary technologies alongside oil painting and tattooing. His symbolism, rhythm, and source of consciousness come from the Caribbean, the nucleus from which he approaches identity and representation. He currently lives and works in Mexico City.',
    'For Gluk, art is neither a neutral nor decorative space. It is a tool for confrontation and, at the same time, for care. Even in his most raw or violent explorations, there is a good intention to sustain something that he fears will be lost if he does not narrate it: a story, a bodily memory, a way of inhabiting the world without asking permission.',
    'He studied at NYU Shanghai, during which time, at the age of 20, he exhibited at the Yicangart Museum in Shanghai. Subsequently, he lived in Berlin for eight years, where he furthered his training in new media. During that period, in 2020, he produced Onde du Midi at the Louvre Museum (Paris) and developed interdisciplinary collaborations with artists such as Rawayana, Nicola Cruz, and Salomón, among others.',
    'On canvas, Gluk takes on a central gesture: painting in oil what the canon tends to relegate. By choosing oil—a noble, slow, and demanding medium—he places symbols and iconographies of the Caribbean and its contemporary identity at the heart of the pictorial tradition, elevating them without folklorizing them and shifting clichés from postcards to complex narratives.',
    'In the technological sphere, he converts data and urban signals into reactive experiences: visualizations, generative systems, and screens that respond to the body and context. He does not oppose painting and technology; he puts them in friction to raise questions about identity, memory, and power.',
    'His aesthetic is both precise and streetwise: elegant without being domesticated. No matter how harsh or ironic his themes may be, there is an underlying desire for tenderness. For the world—art, the body, the system—to be touched without being dominated.',
  ],
} as const;

// Plain text with no markup characters, so it is safe to wrap directly.
export const DEFAULT_ABOUT_BODY_HTML = DEFAULT_ABOUT.body.map((p) => `<p>${p}</p>`).join('');

export const ABOUT_PORTRAIT_WIDTHS = [640, 960, 1200, 1800] as const;
const ABOUT_PORTRAIT_DEFAULT_WIDTH = 1200;

export interface RawHotspot {
  x: number;
  y: number;
}

export interface RawAboutPage {
  portrait?: { asset: { _ref: string; _type: string } | null; hotspot?: RawHotspot | null } | null;
  portraitAlt?: string | null;
  statement?: string | null;
  body?: unknown[] | null;
  photoCredit?: string | null;
}

export interface AboutPortrait {
  src: string;
  srcset: string;
  alt: string;
  focalPoint: string;
}

export interface AboutPage {
  portrait: AboutPortrait | null;
  statement: string;
  bodyHtml: string;
  photoCredit: string | null;
}

export interface AboutDeps {
  imageUrl: (image: NonNullable<RawAboutPage['portrait']>, width: number) => string;
  toHtml: (blocks: unknown[]) => string;
}

function toPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function focalPoint(hotspot: RawHotspot | null | undefined): string {
  if (!hotspot) return '50% 50%';
  return `${toPercent(hotspot.x)} ${toPercent(hotspot.y)}`;
}

export function mapAboutPage(raw: RawAboutPage | null, deps: AboutDeps): AboutPage {
  const portrait = raw?.portrait;
  return {
    portrait: portrait?.asset
      ? {
          src: deps.imageUrl(portrait, ABOUT_PORTRAIT_DEFAULT_WIDTH),
          srcset: ABOUT_PORTRAIT_WIDTHS.map((w) => `${deps.imageUrl(portrait, w)} ${w}w`).join(', '),
          alt: raw?.portraitAlt?.trim() || 'GLUK',
          focalPoint: focalPoint(portrait.hotspot),
        }
      : null,
    statement: raw?.statement?.trim() || DEFAULT_ABOUT.statement,
    bodyHtml: raw?.body && raw.body.length > 0 ? deps.toHtml(raw.body) : DEFAULT_ABOUT_BODY_HTML,
    photoCredit: raw?.photoCredit?.trim() || null,
  };
}
```

`src/lib/site-settings.ts`:
```ts
// Contact details used by the footer, nav and Contact page (spec §7).

export const DEFAULT_SITE_SETTINGS = {
  email: 'gluk.caribe@gmail.com',
  instagramHandle: 'gluk______',
  studioCity: 'Ciudad de México',
} as const;

export interface RawSiteSettings {
  email?: string | null;
  instagramHandle?: string | null;
  studioCity?: string | null;
}

export interface SiteSettings {
  email: string;
  instagramHandle: string;
  instagramUrl: string;
  studioCity: string;
}

export function mapSiteSettings(raw: RawSiteSettings | null): SiteSettings {
  const handle = raw?.instagramHandle?.trim().replace(/^@+/, '') || DEFAULT_SITE_SETTINGS.instagramHandle;
  return {
    email: raw?.email?.trim() || DEFAULT_SITE_SETTINGS.email,
    instagramHandle: handle,
    instagramUrl: `https://www.instagram.com/${handle}/`,
    studioCity: raw?.studioCity?.trim() || DEFAULT_SITE_SETTINGS.studioCity,
  };
}
```

`src/lib/tattoo-info.ts`:
```ts
import type { RawImage } from './artwork-map';

export interface RawTattooInfo {
  statement?: string | null;
  process?: (string | null)[] | null;
  body?: unknown[] | null;
  images?: RawImage[] | null;
}

export interface TattooInfo {
  statement: string | null;
  process: string[];
  bodyHtml: string;
  images: string[];
}

export interface TattooDeps {
  urlFor: (image: RawImage) => string;
  toHtml: (blocks: unknown[]) => string;
}

export function mapTattooInfo(raw: RawTattooInfo | null, deps: TattooDeps): TattooInfo {
  return {
    statement: raw?.statement?.trim() || null,
    process: (raw?.process ?? []).map((step) => step?.trim() ?? '').filter((step) => step.length > 0),
    bodyHtml: raw?.body && raw.body.length > 0 ? deps.toHtml(raw.body) : '',
    images: (raw?.images ?? []).map(deps.urlFor),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/artwork-map.test.ts src/lib/home-page.test.ts src/lib/about-page.test.ts src/lib/site-settings.test.ts src/lib/tattoo-info.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewire `src/lib/sanity.ts`**

Replace the whole file with:
```ts
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
import { mapHomePage, type HomePage, type RawHomePage } from './home-page';
import { mapAboutPage, type AboutPage, type RawAboutPage } from './about-page';
import { mapSiteSettings, type RawSiteSettings, type SiteSettings } from './site-settings';
import { mapTattooInfo, type RawTattooInfo, type TattooInfo } from './tattoo-info';

export { MEDIUMS, mediumLabel } from './artwork-map';
export type { Artwork, HaloSetting, Medium, PrintOption, SeriesInfo, SeriesKind } from './artwork-map';
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
  return raw.map((item) => mapArtwork(item, urlFor));
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
    `*[_id == "siteSettings"][0]{ email, instagramHandle, studioCity }`
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
```

- [ ] **Step 6: Keep pages compiling until they are rebuilt**

The old home page reads `portrait`. Replace the frontmatter and hero of `src/pages/index.astro` temporarily so the gates pass — change the frontmatter line `const { portrait, featuredWorks } = await getHomePage();` to:
```ts
const { featuredWorks } = await getHomePage();
const portrait = null as null | { src: string; srcset: string; alt: string; focalPoint: string };
```
(Task 9 rewrites this page completely.) In `src/pages/artwork/[slug].astro`, the `year`/`dimensions` line now receives `number | null`/`string | null`; it still type-checks as JSX text. If `npm run check` reports anything else, fix only that line.

- [ ] **Step 7: Run all gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass; 23 pages built.

- [ ] **Step 8: Commit**

```bash
git add src/lib src/pages/index.astro
git commit -m "Add pure mappers for artworks, home, about, settings, tattoo content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Halo — edge measurement and series resolution

**Files:**
- Create: `src/lib/halo.ts`, `src/lib/halo.test.ts`, `src/lib/halo-measure.ts`, `src/lib/halo-measure.test.ts`
- Modify: `src/lib/sanity.ts` (`getAllArtworks`), `package.json` (move `sharp` to `dependencies`)

**Interfaces:**
- Consumes: `Artwork`, `HaloSetting` from `src/lib/artwork-map.ts`.
- Produces:
  ```ts
  export const HALO_EDGE_THRESHOLD = 0.02;
  export const HALO_EDGE_BAND = 0.08;
  export function edgeLuminance(pixels: ArrayLike<number>, width: number, height: number, channels: number, band?: number): number;
  export interface HaloInput { slug: string; haloSetting: HaloSetting; series: { slug: string; halo: HaloSetting } | null; edge: number | null }
  export function resolveHalos(items: HaloInput[]): Map<string, boolean>;
  // halo-measure.ts
  export function measureEdge(imageUrl: string, deps?: MeasureDeps): Promise<number | null>;
  ```
- After this task, `getAllArtworks()` returns artworks with `halo` resolved.

- [ ] **Step 1: Write the failing tests**

`src/lib/halo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { HALO_EDGE_THRESHOLD, edgeLuminance, resolveHalos, type HaloInput } from './halo';

// width×height RGB image; `fill(x, y)` returns a 0–255 gray level.
function image(width: number, height: number, fill: (x: number, y: number) => number, channels = 3): number[] {
  const out: number[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = fill(x, y);
      out.push(v, v, v);
      if (channels === 4) out.push(255);
    }
  return out;
}

const border = (w: number, h: number, band: number) => (x: number, y: number) =>
  x < band || y < band || x >= w - band || y >= h - band;

describe('edgeLuminance', () => {
  it('is 0 for an all-black image and 1 for an all-white image', () => {
    expect(edgeLuminance(image(20, 20, () => 0), 20, 20, 3)).toBe(0);
    expect(edgeLuminance(image(20, 20, () => 255), 20, 20, 3)).toBeCloseTo(1, 5);
  });

  it('only looks at the border band', () => {
    const blackBorderWhiteCenter = image(50, 50, (x, y) => (border(50, 50, 4)(x, y) ? 0 : 255));
    expect(edgeLuminance(blackBorderWhiteCenter, 50, 50, 3)).toBe(0);
    const whiteBorderBlackCenter = image(50, 50, (x, y) => (border(50, 50, 4)(x, y) ? 255 : 0));
    expect(edgeLuminance(whiteBorderBlackCenter, 50, 50, 3)).toBeCloseTo(1, 5);
  });

  it('ignores the alpha channel', () => {
    expect(edgeLuminance(image(10, 10, () => 0, 4), 10, 10, 4)).toBe(0);
  });

  it('uses at least a 1-pixel band on tiny images', () => {
    expect(edgeLuminance(image(3, 3, () => 255), 3, 3, 3)).toBeCloseTo(1, 5);
  });
});

function item(slug: string, overrides: Partial<HaloInput> = {}): HaloInput {
  return { slug, haloSetting: 'auto', series: null, edge: 0.5, ...overrides };
}

describe('resolveHalos', () => {
  it('turns the halo on only for dark edges when set to auto', () => {
    const result = resolveHalos([
      item('dark', { edge: HALO_EDGE_THRESHOLD - 0.001 }),
      item('bright', { edge: 0.3 }),
      item('unknown', { edge: null }),
    ]);
    expect(result.get('dark')).toBe(true);
    expect(result.get('bright')).toBe(false);
    expect(result.get('unknown')).toBe(false);
  });

  it('respects per-artwork always/never', () => {
    const result = resolveHalos([
      item('forced-on', { haloSetting: 'always', edge: 0.9 }),
      item('forced-off', { haloSetting: 'never', edge: 0 }),
    ]);
    expect(result.get('forced-on')).toBe(true);
    expect(result.get('forced-off')).toBe(false);
  });

  it('gives a whole auto series the halo when any member needs it', () => {
    const violenta = { slug: 'violenta', halo: 'auto' as const };
    const result = resolveHalos([
      item('violenta-i', { series: violenta, edge: 0.042 }),
      item('violenta-ii', { series: violenta, edge: 0.007 }),
      item('other', { edge: 0.042 }),
    ]);
    expect(result.get('violenta-i')).toBe(true);
    expect(result.get('violenta-ii')).toBe(true);
    expect(result.get('other')).toBe(false);
  });

  it('lets a series-level always/never win over members', () => {
    const on = { slug: 'on', halo: 'always' as const };
    const off = { slug: 'off', halo: 'never' as const };
    const result = resolveHalos([
      item('a', { series: on, edge: 0.9 }),
      item('b', { series: off, edge: 0, haloSetting: 'always' }),
    ]);
    expect(result.get('a')).toBe(true);
    expect(result.get('b')).toBe(false);
  });
});
```

`src/lib/halo-measure.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { measureEdge } from './halo-measure';

describe('measureEdge', () => {
  it('returns null without fetching for non-Sanity or empty URLs', async () => {
    const fetchImpl = vi.fn();
    expect(await measureEdge('', { fetch: fetchImpl })).toBeNull();
    expect(await measureEdge('/placeholder-artwork.svg', { fetch: fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns null and warns when the fetch fails', async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await measureEdge('https://cdn.sanity.io/images/p/d/fail-1.jpg', { fetch: fetchImpl, warn });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('returns null and warns on a non-OK response', async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await measureEdge('https://cdn.sanity.io/images/p/d/fail-2.jpg', { fetch: fetchImpl, warn })).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('requests a 100px PNG thumbnail and caches per URL', async () => {
    const png = await (await import('sharp')).default({
      create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) });
    const url = 'https://cdn.sanity.io/images/p/d/black-3.jpg';
    expect(await measureEdge(url, { fetch: fetchImpl })).toBe(0);
    expect(await measureEdge(url, { fetch: fetchImpl })).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(`${url}?w=100&fm=png`);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/halo.test.ts src/lib/halo-measure.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/halo.ts`:
```ts
// Halo resolution (spec §6.2): dark-edged paintings disappear on the veil, so
// they get a soft glow behind the canvas. Pure; see halo-measure.ts for I/O.
import type { HaloSetting } from './artwork-map';

// Measured 2026-09-23: darkest edges 0.006–0.007, next darkest 0.042.
export const HALO_EDGE_THRESHOLD = 0.02;
export const HALO_EDGE_BAND = 0.08;

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Mean relative luminance (0–1) of the outer `band` fraction of the image.
export function edgeLuminance(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  channels: number,
  band = HALO_EDGE_BAND
): number {
  const b = Math.max(1, Math.round(Math.min(width, height) * band));
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= b && x < width - b && y >= b && y < height - b) continue;
      const i = (y * width + x) * channels;
      sum += 0.2126 * toLinear(pixels[i]) + 0.7152 * toLinear(pixels[i + 1]) + 0.0722 * toLinear(pixels[i + 2]);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

export interface HaloInput {
  slug: string;
  haloSetting: HaloSetting;
  series: { slug: string; halo: HaloSetting } | null;
  edge: number | null;
}

function ownHalo(item: HaloInput): boolean {
  if (item.haloSetting === 'always') return true;
  if (item.haloSetting === 'never') return false;
  return item.edge !== null && item.edge < HALO_EDGE_THRESHOLD;
}

// A series shares one treatment: its own always/never wins, otherwise the
// darkest member decides (any member on → all on).
export function resolveHalos(items: HaloInput[]): Map<string, boolean> {
  const result = new Map<string, boolean>();
  const seriesOn = new Map<string, boolean>();
  for (const item of items) {
    const own = ownHalo(item);
    result.set(item.slug, own);
    if (item.series) seriesOn.set(item.series.slug, (seriesOn.get(item.series.slug) ?? false) || own);
  }
  for (const item of items) {
    if (!item.series) continue;
    const setting = item.series.halo;
    result.set(item.slug, setting === 'always' ? true : setting === 'never' ? false : seriesOn.get(item.series.slug)!);
  }
  return result;
}
```

`src/lib/halo-measure.ts`:
```ts
// Build-time only: fetch a 100px thumbnail from the Sanity CDN and measure its
// edge luminance. Failures never break the build — they return null (halo off).
import sharp from 'sharp';
import { edgeLuminance } from './halo';

const SANITY_CDN = 'https://cdn.sanity.io/images/';

interface FetchLike {
  (url: string): Promise<{ ok: boolean; status?: number; arrayBuffer(): Promise<ArrayBuffer> }>;
}

export interface MeasureDeps {
  fetch?: FetchLike;
  warn?: (message: string) => void;
}

const cache = new Map<string, Promise<number | null>>();

export function measureEdge(imageUrl: string, deps: MeasureDeps = {}): Promise<number | null> {
  if (!imageUrl.startsWith(SANITY_CDN)) return Promise.resolve(null);
  const cached = cache.get(imageUrl);
  if (cached) return cached;
  const fetchImpl = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const warn = deps.warn ?? ((message: string) => console.warn(message));
  const pending = (async () => {
    try {
      const res = await fetchImpl(`${imageUrl.split('?')[0]}?w=100&fm=png`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const input = Buffer.from(await res.arrayBuffer());
      const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      return edgeLuminance(data, info.width, info.height, info.channels);
    } catch (error) {
      warn(`[halo] could not measure ${imageUrl}: ${(error as Error).message}`);
      return null;
    }
  })();
  cache.set(imageUrl, pending);
  return pending;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/halo.test.ts src/lib/halo-measure.test.ts`
Expected: PASS.

- [ ] **Step 5: Resolve halos in `getAllArtworks`**

In `src/lib/sanity.ts` add imports:
```ts
import { resolveHalos } from './halo';
import { measureEdge } from './halo-measure';
```
and replace `getAllArtworks` with:
```ts
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
```

- [ ] **Step 6: Make `sharp` a runtime dependency**

Netlify must have `sharp` during the build: run `npm install sharp@^0.35.4 --save` (moves it from `devDependencies` to `dependencies`; same version). Confirm `package.json` lists it only under `dependencies`.

- [ ] **Step 7: Run gates and check the measured halos**

Run: `npm run check && npm test && npm run build`
Expected: all pass, no `[halo]` warnings in the build output.

Pages don't render halos until Tasks 6 and 11; the resolved values are verified by the Task 11 build check.

- [ ] **Step 8: Commit**

```bash
git add src/lib/halo.ts src/lib/halo.test.ts src/lib/halo-measure.ts src/lib/halo-measure.test.ts src/lib/sanity.ts package.json package-lock.json
git commit -m "Resolve painting halos from measured edge luminance and series

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Numerals and portfolio rooms

**Files:**
- Create: `src/lib/numerals.ts`, `src/lib/numerals.test.ts`, `src/lib/rooms.ts`, `src/lib/rooms.test.ts`

**Interfaces:**
- Consumes: `Artwork`, `Medium`, `MEDIUMS` from `src/lib/artwork-map.ts`.
- Produces:
  ```ts
  export function toRoman(n: number): string;          // 1 → 'I', 4 → 'IV'
  export function pad2(n: number): string;             // 4 → '04'
  export interface Room { key: string; numeral: string; name: string; kind: 'series' | 'diptych' | 'standalone'; works: Artwork[] }
  export function groupIntoRooms(artworks: Artwork[]): Room[];
  export function roomCountLabel(room: Room): string;  // 'Series · 04 works'
  export interface MediumCount { medium: Medium; count: number }
  export function mediumCounts(artworks: Artwork[]): { total: number; mediums: MediumCount[] };
  export function wallLabelHeading(artwork: Artwork, rooms: Room[]): string; // 'I · Motopirueta · 04 / 04' | 'Standalone work'
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/numerals.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pad2, toRoman } from './numerals';

describe('toRoman', () => {
  it('converts the numbers the site uses', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 14, 39].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'IX', 'X', 'XIV', 'XXXIX']);
  });

  it('returns an empty string for non-positive or non-integer input', () => {
    expect(toRoman(0)).toBe('');
    expect(toRoman(-2)).toBe('');
    expect(toRoman(1.5)).toBe('');
  });
});

describe('pad2', () => {
  it('pads to two digits and leaves larger numbers alone', () => {
    expect(pad2(4)).toBe('04');
    expect(pad2(13)).toBe('13');
    expect(pad2(120)).toBe('120');
  });
});
```

`src/lib/rooms.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { Artwork, SeriesInfo } from './artwork-map';
import { groupIntoRooms, mediumCounts, roomCountLabel, wallLabelHeading } from './rooms';

const moto: SeriesInfo = { slug: 'motopirueta', name: 'Motopirueta', order: 1, kind: 'series', halo: 'auto' };
const violenta: SeriesInfo = { slug: 'violenta', name: 'Violenta', order: 2, kind: 'diptych', halo: 'auto' };

function art(slug: string, overrides: Partial<Artwork> = {}): Artwork {
  return {
    slug,
    title: slug,
    medium: 'oil-painting',
    year: null,
    dimensions: null,
    description: null,
    images: [],
    availableAsOriginal: false,
    printOptions: [],
    series: null,
    seriesPosition: null,
    haloSetting: 'auto',
    halo: false,
    ...overrides,
  };
}

const works = [
  art('johnny'),
  art('violenta-ii', { series: violenta, seriesPosition: 2 }),
  art('moto-2', { series: moto, seriesPosition: 2 }),
  art('violenta-i', { series: violenta, seriesPosition: 1 }),
  art('moto-1', { series: moto, seriesPosition: 1 }),
  art('bajale', { medium: 'mixed-media' }),
];

describe('groupIntoRooms', () => {
  it('orders series rooms by series order, works by position, standalone last', () => {
    const rooms = groupIntoRooms(works);
    expect(rooms.map((r) => [r.numeral, r.name, r.kind, r.works.map((w) => w.slug)])).toEqual([
      ['I', 'Motopirueta', 'series', ['moto-1', 'moto-2']],
      ['II', 'Violenta', 'diptych', ['violenta-i', 'violenta-ii']],
      ['III', 'Standalone works', 'standalone', ['bajale', 'johnny']],
    ]);
  });

  it('puts works without a position after positioned ones, by title', () => {
    const rooms = groupIntoRooms([
      art('b', { series: moto, seriesPosition: null }),
      art('a', { series: moto, seriesPosition: null }),
      art('c', { series: moto, seriesPosition: 1 }),
    ]);
    expect(rooms[0].works.map((w) => w.slug)).toEqual(['c', 'a', 'b']);
  });

  it('orders standalone works by year (newest first, missing years last), then by title', () => {
    const rooms = groupIntoRooms([
      art('perdi', { title: 'Perdí el coco' }),
      art('johnny', { title: 'Johnny Efectivo' }),
      art('old', { title: 'Zeta', year: 2019 }),
      art('bajale', { title: 'Bájale 2 Gallito' }),
      art('new', { title: 'Alfa', year: 2024 }),
    ]);
    expect(rooms[0].works.map((w) => w.slug)).toEqual(['new', 'old', 'bajale', 'johnny', 'perdi']);
  });

  it('returns one standalone room when no series exist yet', () => {
    const rooms = groupIntoRooms([art('x'), art('y')]);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ numeral: 'I', kind: 'standalone', name: 'Standalone works' });
  });

  it('returns no rooms for no artworks', () => {
    expect(groupIntoRooms([])).toEqual([]);
  });
});

describe('roomCountLabel', () => {
  it('names the kind and pads the count', () => {
    const rooms = groupIntoRooms(works);
    expect(rooms.map(roomCountLabel)).toEqual(['Series · 02 works', 'Diptych · 02 works', '02 works']);
  });

  it('uses the singular for one work', () => {
    expect(roomCountLabel(groupIntoRooms([art('solo')])[0])).toBe('01 work');
  });
});

describe('mediumCounts', () => {
  it('counts per medium in MEDIUMS order and skips empty mediums', () => {
    expect(mediumCounts(works)).toEqual({
      total: 6,
      mediums: [
        { medium: 'oil-painting', count: 5 },
        { medium: 'mixed-media', count: 1 },
      ],
    });
  });
});

describe('wallLabelHeading', () => {
  const rooms = groupIntoRooms(works);

  it('shows numeral, series and position out of total', () => {
    expect(wallLabelHeading(works[2], rooms)).toBe('I · Motopirueta · 02 / 02');
  });

  it('says standalone for works without a series', () => {
    expect(wallLabelHeading(works[0], rooms)).toBe('Standalone work');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/numerals.test.ts src/lib/rooms.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/numerals.ts`:
```ts
const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1) return '';
  let rest = n;
  let out = '';
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
```

`src/lib/rooms.ts`:
```ts
// Portfolio "rooms" (spec §5.3): one room per series, standalone works last.
import { MEDIUMS, type Artwork, type Medium } from './artwork-map';
import { pad2, toRoman } from './numerals';

export interface Room {
  key: string;
  numeral: string;
  name: string;
  kind: 'series' | 'diptych' | 'standalone';
  works: Artwork[];
}

const STANDALONE_KEY = 'standalone';

function byPositionThenTitle(a: Artwork, b: Artwork): number {
  const pa = a.seriesPosition ?? Number.POSITIVE_INFINITY;
  const pb = b.seriesPosition ?? Number.POSITIVE_INFINITY;
  return pa !== pb ? pa - pb : a.title.localeCompare(b.title);
}

// Standalone works: newest year first, works without a year after, then A–Z.
// Keeps the order stable on every build while no years are entered.
function byYearThenTitle(a: Artwork, b: Artwork): number {
  const ya = a.year ?? Number.NEGATIVE_INFINITY;
  const yb = b.year ?? Number.NEGATIVE_INFINITY;
  return ya !== yb ? yb - ya : a.title.localeCompare(b.title);
}

export function groupIntoRooms(artworks: Artwork[]): Room[] {
  const series = new Map<string, { order: number; room: Omit<Room, 'numeral'> }>();
  const standalone: Artwork[] = [];
  for (const artwork of artworks) {
    if (!artwork.series) {
      standalone.push(artwork);
      continue;
    }
    const entry = series.get(artwork.series.slug) ?? {
      order: artwork.series.order,
      room: { key: artwork.series.slug, name: artwork.series.name, kind: artwork.series.kind, works: [] },
    };
    entry.room.works.push(artwork);
    series.set(artwork.series.slug, entry);
  }
  const ordered = [...series.values()]
    .sort((a, b) => a.order - b.order || a.room.name.localeCompare(b.room.name))
    .map((entry) => ({ ...entry.room, works: [...entry.room.works].sort(byPositionThenTitle) }));
  const rooms: Omit<Room, 'numeral'>[] =
    standalone.length > 0
      ? [...ordered, { key: STANDALONE_KEY, name: 'Standalone works', kind: 'standalone', works: [...standalone].sort(byYearThenTitle) }]
      : ordered;
  return rooms.map((room, i) => ({ ...room, numeral: toRoman(i + 1) }));
}

export function roomCountLabel(room: Room): string {
  const count = `${pad2(room.works.length)} ${room.works.length === 1 ? 'work' : 'works'}`;
  if (room.kind === 'series') return `Series · ${count}`;
  if (room.kind === 'diptych') return `Diptych · ${count}`;
  return count;
}

export interface MediumCount {
  medium: Medium;
  count: number;
}

export function mediumCounts(artworks: Artwork[]): { total: number; mediums: MediumCount[] } {
  return {
    total: artworks.length,
    mediums: MEDIUMS.map((medium) => ({ medium, count: artworks.filter((a) => a.medium === medium).length })).filter(
      (entry) => entry.count > 0
    ),
  };
}

export function wallLabelHeading(artwork: Artwork, rooms: Room[]): string {
  if (!artwork.series) return 'Standalone work';
  const room = rooms.find((r) => r.key === artwork.series!.slug);
  if (!room) return artwork.series.name;
  const index = room.works.findIndex((w) => w.slug === artwork.slug);
  return `${room.numeral} · ${room.name} · ${pad2(index + 1)} / ${pad2(room.works.length)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/numerals.test.ts src/lib/rooms.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/numerals.ts src/lib/numerals.test.ts src/lib/rooms.ts src/lib/rooms.test.ts
git commit -m "Add portfolio room grouping, medium counts and numerals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Brand assets, theme and backdrop

**Files:**
- Create: `docs/brand-kit/fields/gradient-1.jpg`, `gradient-2.jpg`, `gradient-3.jpg`, `rupture-rule.jpg`; `scripts/build-brand-assets.mjs`; `public/brand/*` (generated); `src/lib/brand.ts`; `src/components/Backdrop.astro`
- Rewrite: `src/styles/theme.css`
- Modify: `src/layouts/BaseLayout.astro`, `package.json`, `docs/brand-kit/README.md`

**Interfaces:**
- Produces: public files `/brand/field-1.webp`, `/brand/field-2.webp`, `/brand/field-3.webp`, `/brand/veil-1.webp`, `/brand/rupture-rule.webp`, `/brand/rupture-rule-v.webp`, `/brand/wordmark-white.png` (trimmed; `node` prints its size), `/brand/monogram-white.png`; `export type BackdropKind = 'field-1' | 'field-2' | 'field-3' | 'veil'` from `Backdrop.astro`; `BaseLayout` prop `backdrop?: BackdropKind` (default `'veil'`); CSS tokens and utility classes listed in Step 3.

- [ ] **Step 1: Copy the source brand images into the repo**

```bash
mkdir -p docs/brand-kit/fields
cp "C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/brand-book/gradient-1.jpg" \
   "C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/brand-book/gradient-2.jpg" \
   "C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/brand-book/gradient-3.jpg" \
   "C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/brand-book/rupture-rule.jpg" \
   docs/brand-kit/fields/
ls -la docs/brand-kit/fields
```
Expected: four files (gradients 1600×1600, rule 2400×174).

Append to `docs/brand-kit/README.md`:
```markdown

## Gradient Fields & Rupture Rule

`fields/` — the three grainy gradient fields and the rupture rule (orange → black → blue) from the
Family A brand book. `npm run brand:assets` turns them into the optimized files in `public/brand/`.
```

- [ ] **Step 2: Asset build script**

`scripts/build-brand-assets.mjs`:
```js
// Builds the optimized brand images in public/brand/ from docs/brand-kit/.
// Run with: npm run brand:assets  (outputs are committed).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'docs/brand-kit';
const OUT = 'public/brand';
await mkdir(OUT, { recursive: true });

for (const n of [1, 2, 3]) {
  // Fields: slightly darkened, as approved in the mockups (brightness ~0.8).
  await sharp(`${SRC}/fields/gradient-${n}.jpg`)
    .resize(1600)
    .modulate({ brightness: 0.82 })
    .webp({ quality: 78 })
    .toFile(`${OUT}/field-${n}.webp`);
}

// Veil: the field pre-blurred, desaturated and darkened so the browser never
// runs a blur filter (spec §4). CSS adds a 40% dark wash on top.
await sharp(`${SRC}/fields/gradient-1.jpg`)
  .resize(800)
  .blur(30)
  .modulate({ brightness: 0.5, saturation: 0.5 })
  .webp({ quality: 70 })
  .toFile(`${OUT}/veil-1.webp`);

await sharp(`${SRC}/fields/rupture-rule.jpg`).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule.webp`);
await sharp(`${SRC}/fields/rupture-rule.jpg`).rotate(90).webp({ quality: 80 }).toFile(`${OUT}/rupture-rule-v.webp`);

const wordmark = await sharp(`${SRC}/logo/a-wordmark-plain-white.png`).trim().resize({ width: 800 }).png().toFile(`${OUT}/wordmark-white.png`);
console.log(`wordmark-white.png ${wordmark.width}x${wordmark.height}`);
await sharp(`${SRC}/logo/a-monogram-white.png`).trim().resize({ width: 256 }).png().toFile(`${OUT}/monogram-white.png`);
console.log('brand assets written to public/brand/');
```

Add to `package.json` `scripts`: `"brand:assets": "node scripts/build-brand-assets.mjs"`.

Run: `npm run brand:assets && ls -la public/brand`
Expected: 8 files; the script prints `wordmark-white.png 800x348` (measured 2026-09-23 from `a-wordmark-plain-white.png`). If it prints a different height, use that value in `src/lib/brand.ts` below.

`src/lib/brand.ts` (single source for the wordmark's intrinsic size, used by `Nav` and `Footer` in Task 7):
```ts
// Intrinsic size of public/brand/wordmark-white.png (printed by `npm run brand:assets`).
export const WORDMARK_WIDTH = 800;
export const WORDMARK_HEIGHT = 348;
```

- [ ] **Step 3: Rewrite the theme**

Replace `src/styles/theme.css` with:
```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Karla:wght@300;400;700&display=swap');

:root {
  --color-blue: #0C89D5;
  --color-deep-blue: #011458;
  --color-black: #1E1619;
  --color-orange: #C34F05;
  --color-bone: #F1EEE8;
  --color-bone-dim: rgba(241, 238, 232, 0.55);
  --color-hairline: rgba(241, 238, 232, 0.22);
  --veil-wash: rgba(30, 22, 25, 0.4);

  --font-display: 'Archivo', sans-serif;
  --font-body: 'Karla', sans-serif;

  --gutter: clamp(1rem, 4vw, 4rem);
  --nav-height: clamp(4.5rem, 8vw, 6.5rem);
  --section-space: clamp(4rem, 10vw, 9rem);

  --rule-hair: 1px;
  --rule-thin: 3px;
  --rule-base: 5px;
  --rule-bold: 9px;

  --text-label: clamp(0.68rem, 0.62rem + 0.2vw, 0.8rem);
  --text-body: clamp(0.95rem, 0.9rem + 0.2vw, 1.1rem);
  --text-statement: clamp(1.4rem, 1rem + 1.4vw, 2.4rem);
  --text-title: clamp(2rem, 1.2rem + 3vw, 4.4rem);
  --text-display: clamp(3.5rem, 1rem + 9vw, 10rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-painting: 0 1.6rem 4rem rgba(0, 0, 0, 0.45);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--color-black);
  color-scheme: dark;
}

body {
  margin: 0;
  color: var(--color-bone);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
}

main {
  position: relative;
  z-index: 1;
  min-height: 100svh;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 800;
  margin: 0;
}

a {
  color: inherit;
}

img {
  max-width: 100%;
}

/* ---- Type utilities ---- */
.display {
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 125%;
  font-size: var(--text-display);
  line-height: 0.8;
  letter-spacing: -0.045em;
  margin: 0;
}
.display--outline {
  color: transparent;
  -webkit-text-stroke: max(1px, 0.012em) var(--color-bone);
}
.title {
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 125%;
  font-size: var(--text-title);
  line-height: 0.95;
  letter-spacing: -0.02em;
}
.statement {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--text-statement);
  line-height: 1.22;
  letter-spacing: -0.01em;
  margin: 0;
}
.label {
  font-size: var(--text-label);
  letter-spacing: 0.26em;
  text-transform: uppercase;
}
.mono {
  font-size: var(--text-label);
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}
.dim {
  opacity: 0.55;
}
.hairline {
  display: block;
  height: var(--rule-hair);
  border: 0;
  margin: 0;
  background: var(--color-hairline);
}
.button {
  display: inline-block;
  padding: 0.9em 1.6em;
  border: 1px solid var(--color-bone);
  background: none;
  color: var(--color-bone);
  font: inherit;
  font-size: var(--text-label);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.4s var(--ease-out), color 0.4s var(--ease-out);
}
.button:hover,
.button:focus-visible {
  background: var(--color-bone);
  color: var(--color-black);
}
.page {
  padding: calc(var(--nav-height) + 3rem) var(--gutter) var(--section-space);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
:focus-visible {
  outline: 1px solid var(--color-bone);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}

/* Motion guard. The inline script in BaseLayout adds .js-motion to <html>
   only when JavaScript runs (and removes it if the motion bundle never
   loads), so these elements are hidden only when GSAP will reveal them.
   Without JS everything stays visible. */
.js-motion [data-reveal],
.js-motion [data-intro],
.js-motion [data-hero-intro],
.js-motion [data-hero-word],
.js-motion [data-hero-rule] {
  visibility: hidden;
}
```

- [ ] **Step 4: Backdrop component**

`src/components/Backdrop.astro`:
```astro
---
// Fixed full-screen background: a grainy brand gradient field, or the dim
// "veil" behind artwork (spec §4). Never animated.
export type BackdropKind = 'field-1' | 'field-2' | 'field-3' | 'veil';

interface Props {
  kind: BackdropKind;
}

const { kind } = Astro.props;
const image = kind === 'veil' ? '/brand/veil-1.webp' : `/brand/${kind}.webp`;
---
<div class:list={['backdrop', { 'backdrop--veil': kind === 'veil' }]} style={`--backdrop-image: url(${image})`} aria-hidden="true">
  <div class="backdrop-grain"></div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: var(--color-black) var(--backdrop-image) center / cover no-repeat;
  }
  .backdrop--veil::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--veil-wash);
  }
  .backdrop-grain {
    position: absolute;
    inset: 0;
    opacity: 0.16;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
</style>
```

- [ ] **Step 5: Wire it into `BaseLayout`**

In `src/layouts/BaseLayout.astro`:
- Add `import Backdrop, { type BackdropKind } from '../components/Backdrop.astro';`
- Replace the `Props` interface and destructuring with:
```ts
interface Props {
  title: string;
  backdrop?: BackdropKind;
}

const { title, backdrop = 'veil' } = Astro.props;
```
- Replace `<body data-nav-overlay={overlayNav ? '' : undefined}>` with `<body>` and insert `<Backdrop kind={backdrop} />` as the first child of `<body>`.
- Change the favicon link to `<link rel="icon" href="/brand/monogram-white.png" />`.

In `src/pages/index.astro` remove the `overlayNav={portrait !== null}` attribute (the page is rewritten in Task 9).

- [ ] **Step 6: Gates and a visual smoke check**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

Run `npm run preview` in the background, then screenshot `/about`:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --user-data-dir="$(mktemp -d)" --screenshot="C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/task5-about.png" http://localhost:4321/about
```
Expected (open the PNG): dark veil background with grain, bone-colored text.

- [ ] **Step 7: Commit**

```bash
git add docs/brand-kit scripts/build-brand-assets.mjs public/brand package.json src/lib/brand.ts src/styles/theme.css src/components/Backdrop.astro src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "Add brand fields, veil and dark theme tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Shared building blocks — rule, numbered index, painting

**Files:**
- Create: `src/components/RuptureRule.astro`, `src/components/NumberedIndex.astro`, `src/components/Painting.astro`

**Interfaces:**
- Consumes: `toRoman`, `pad2` (Task 4), `Artwork` (Task 2), `sizedImage`, `imageSrcset` from `src/lib/image-url.ts`.
- Produces:
  - `<RuptureRule orientation?: 'horizontal'|'vertical' weight?: 'hair'|'thin'|'base'|'bold' class?: string />` (renders `<span class="rule …" aria-hidden="true">`).
  - `<NumberedIndex items: IndexItem[] numerals?: 'arabic'|'roman' size?: 'small'|'large' class?: string />` with `export interface IndexItem { label: string; href?: string; active?: boolean }`.
  - `<Painting artwork: Artwork width: number widths?: number[] sizes: string eager?: boolean />` — renders `.painting` (adds `.painting--halo` + `.painting-halo` span when `artwork.halo`), `<img transition:name={`artwork-${slug}`}>`.

- [ ] **Step 1: `RuptureRule.astro`**

```astro
---
// The orange → black → blue rupture rule from the brand book (spec §4).
interface Props {
  orientation?: 'horizontal' | 'vertical';
  weight?: 'hair' | 'thin' | 'base' | 'bold';
  class?: string;
}

const { orientation = 'horizontal', weight = 'thin', class: className } = Astro.props;
---
<span class:list={['rule', `rule--${orientation}`, `rule--${weight}`, className]} aria-hidden="true"></span>

<style>
  .rule {
    display: block;
    background: url(/brand/rupture-rule.webp) center / 100% 100% no-repeat;
  }
  .rule--vertical {
    background-image: url(/brand/rupture-rule-v.webp);
  }
  .rule--horizontal { width: 100%; }
  .rule--vertical { height: 100%; }
  .rule--horizontal.rule--hair { height: var(--rule-hair); }
  .rule--horizontal.rule--thin { height: var(--rule-thin); }
  .rule--horizontal.rule--base { height: var(--rule-base); }
  .rule--horizontal.rule--bold { height: var(--rule-bold); }
  .rule--vertical.rule--hair { width: var(--rule-hair); }
  .rule--vertical.rule--thin { width: var(--rule-thin); }
  .rule--vertical.rule--base { width: var(--rule-base); }
  .rule--vertical.rule--bold { width: var(--rule-bold); }
</style>
```

- [ ] **Step 2: `NumberedIndex.astro`**

```astro
---
// The numbered-list device used across the site (home hero, series index,
// journal, mobile menu). When one item is active the others dim.
import { pad2, toRoman } from '../lib/numerals';

export interface IndexItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface Props {
  items: IndexItem[];
  numerals?: 'arabic' | 'roman';
  size?: 'small' | 'large';
  class?: string;
}

const { items, numerals = 'arabic', size = 'small', class: className } = Astro.props;
const mark = (i: number) => (numerals === 'roman' ? toRoman(i + 1) : pad2(i + 1));
---
<ol class:list={['index', `index--${size}`, className]}>
  {items.map((item, i) => (
    <li class:list={['index-item', { 'is-active': item.active }]}>
      <span class="index-mark">{mark(i)}</span>
      {item.href ? (
        <a href={item.href} aria-current={item.active ? 'page' : undefined}>{item.label}</a>
      ) : (
        <span>{item.label}</span>
      )}
    </li>
  ))}
</ol>

<style>
  .index {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .index-item {
    display: grid;
    grid-template-columns: 2.6em 1fr;
    align-items: baseline;
    transition: opacity 0.4s var(--ease-out);
  }
  .index:has(.is-active) .index-item:not(.is-active) {
    opacity: 0.4;
  }
  .index-item a {
    text-decoration: none;
  }
  .index-mark {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
  .index--small {
    font-size: var(--text-label);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    line-height: 2.2;
  }
  .index--large .index-item {
    grid-template-columns: 3rem 1fr;
    padding: 0.9rem 0;
    border-top: var(--rule-hair) solid var(--color-hairline);
  }
  .index--large .index-item:last-child {
    border-bottom: var(--rule-hair) solid var(--color-hairline);
  }
  .index--large .index-mark {
    font-size: var(--text-label);
    letter-spacing: 0.12em;
  }
  .index--large a,
  .index--large span:not(.index-mark) {
    font-family: var(--font-display);
    font-weight: 800;
    font-stretch: 125%;
    font-size: clamp(2rem, 9vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.03em;
  }
  @media (prefers-reduced-motion: reduce) {
    .index-item { transition: none; }
  }
</style>
```

- [ ] **Step 3: `Painting.astro`**

```astro
---
// A painting on the veil: never filtered or animated; dark-edged pieces get a
// soft orange/blue glow *behind* the canvas (spec §6.2).
import type { Artwork } from '../lib/sanity';
import { imageSrcset, sizedImage } from '../lib/image-url';

interface Props {
  artwork: Artwork;
  width: number;
  widths?: number[];
  sizes: string;
  eager?: boolean;
}

const { artwork, width, widths, sizes, eager = false } = Astro.props;
const src = artwork.images[0] ?? '';
---
<div class:list={['painting', { 'painting--halo': artwork.halo }]}>
  {artwork.halo && <span class="painting-halo" aria-hidden="true"></span>}
  <img
    src={sizedImage(src, width)}
    srcset={widths ? imageSrcset(src, widths) : undefined}
    sizes={sizes}
    alt={artwork.title}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    transition:name={`artwork-${artwork.slug}`}
  />
</div>

<style>
  .painting {
    position: relative;
  }
  .painting img {
    position: relative;
    display: block;
    width: 100%;
    height: auto;
    box-shadow: var(--shadow-painting);
  }
  .painting-halo {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 120%;
    height: 108%;
    transform: translate(-50%, -50%);
    background:
      radial-gradient(ellipse at 35% 60%, rgba(195, 79, 5, 0.75), transparent 60%),
      radial-gradient(ellipse at 65% 40%, rgba(12, 137, 213, 0.85), transparent 60%);
    filter: blur(clamp(24px, 3vw, 48px));
    pointer-events: none;
  }
</style>
```

- [ ] **Step 4: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass (components are not used yet; `astro check` type-checks them).

- [ ] **Step 5: Commit**

```bash
git add src/components/RuptureRule.astro src/components/NumberedIndex.astro src/components/Painting.astro
git commit -m "Add rupture rule, numbered index and painting building blocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Nav, mobile menu, footer and cursor

**Files:**
- Rewrite: `src/components/Nav.astro`, `src/components/Footer.astro`
- Create: `src/scripts/mobile-menu.ts`
- Modify: `src/components/Cursor.astro`, `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `getSiteSettings(): Promise<SiteSettings>` (Task 2), `NumberedIndex`, `RuptureRule` (Task 6), `WORDMARK_WIDTH`/`WORDMARK_HEIGHT` from `src/lib/brand.ts` (Task 5).
- Produces: `Nav` props `{ settings: SiteSettings }`; `Footer` props `{ settings: SiteSettings }`; DOM hooks `[data-menu-toggle]`, `[data-menu-label]`, `[data-mobile-menu]`; `initMobileMenu(): void`.

- [ ] **Step 1: Mobile menu behaviour**

`src/scripts/mobile-menu.ts`:
```ts
// Phone menu: the toggle opens a full-screen numbered index (spec §5.1).
// Re-binds on every page load because the nav is re-rendered per page; the
// document-level listener is removed on swap so listeners never pile up.

function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu) return;
  // The toggle ships hidden so phones without JS keep the plain link row.
  toggle.hidden = false;
  const listeners = new AbortController();

  const setOpen = (open: boolean, returnFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (label) label.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    },
    { signal: listeners.signal }
  );
  // Leaving the page: reset state and drop the document listener.
  document.addEventListener(
    'astro:before-swap',
    () => {
      setOpen(false);
      listeners.abort();
    },
    { once: true }
  );
}

document.addEventListener('astro:page-load', initMobileMenu);
```

- [ ] **Step 2: Nav**

Replace `src/components/Nav.astro`:
```astro
---
import NumberedIndex from './NumberedIndex.astro';
import RuptureRule from './RuptureRule.astro';
import type { SiteSettings } from '../lib/sanity';
import { WORDMARK_HEIGHT, WORDMARK_WIDTH } from '../lib/brand';

interface Props {
  settings: SiteSettings;
}

const { settings } = Astro.props;
const path = Astro.url.pathname.replace(/\/$/, '') || '/';
const links = [
  { href: '/portfolio', label: 'Work' },
  { href: '/tattoo', label: 'Tattoo' },
  { href: '/journal', label: 'Journal' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];
const isActive = (href: string) =>
  path === href || path.startsWith(`${href}/`) || (href === '/portfolio' && path.startsWith('/artwork/'));
---
<header class="site-nav">
  <a class="brand" href="/" aria-label="GLUK — home">
    <img src="/brand/wordmark-white.png" alt="GLUK" width={WORDMARK_WIDTH} height={WORDMARK_HEIGHT} />
  </a>
  <nav class="nav-desktop" aria-label="Main">
    <ul>
      {links.map((link) => (
        <li>
          <a href={link.href} class:list={{ 'is-active': isActive(link.href) }} aria-current={isActive(link.href) ? 'page' : undefined}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
  <button class="menu-toggle label" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle hidden>
    <span data-menu-label>Menu</span>
  </button>
  <div class="mobile-menu" id="mobile-menu" data-mobile-menu hidden>
    <NumberedIndex items={links.map((link) => ({ label: link.label, href: link.href, active: isActive(link.href) }))} size="large" />
    <RuptureRule weight="base" class="mobile-menu-rule" />
    <a class="label mobile-menu-social" href={settings.instagramUrl} rel="noopener">Instagram</a>
  </div>
</header>

<script>
  import '../scripts/mobile-menu';
</script>

<style>
  .site-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--nav-height);
    padding: 0 var(--gutter);
  }
  .brand img {
    display: block;
    height: clamp(1.4rem, 2.2vw, 2rem);
    width: auto;
  }
  .nav-desktop ul {
    display: flex;
    gap: clamp(1.2rem, 2.4vw, 2.6rem);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .nav-desktop a {
    font-size: var(--text-label);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-decoration: none;
    padding-bottom: 3px;
    background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 0 1px;
    transition: background-size 0.5s var(--ease-out);
  }
  .nav-desktop a:hover,
  .nav-desktop a:focus-visible,
  .nav-desktop a.is-active {
    background-size: 100% 1px;
  }
  .menu-toggle {
    display: none;
    position: relative;
    z-index: 2;
    padding: 0.5rem 0;
    border: 0;
    background: none;
    color: var(--color-bone);
    font: inherit;
    font-size: var(--text-label);
    letter-spacing: 0.2em;
    cursor: pointer;
  }
  .mobile-menu {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2.5rem;
    padding: var(--nav-height) var(--gutter) 3rem;
    background: var(--color-black) url(/brand/field-1.webp) center / cover no-repeat;
    animation: menu-in 0.45s var(--ease-out);
  }
  .mobile-menu[hidden] {
    display: none;
  }
  .mobile-menu :global(.index-item) {
    animation: item-in 0.6s var(--ease-out) both;
  }
  .mobile-menu :global(.index-item:nth-child(2)) { animation-delay: 0.06s; }
  .mobile-menu :global(.index-item:nth-child(3)) { animation-delay: 0.12s; }
  .mobile-menu :global(.index-item:nth-child(4)) { animation-delay: 0.18s; }
  .mobile-menu :global(.index-item:nth-child(5)) { animation-delay: 0.24s; }
  .mobile-menu-social {
    text-decoration: none;
  }
  @keyframes menu-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes item-in {
    from { opacity: 0; transform: translateY(1rem); }
    to { opacity: 1; transform: none; }
  }
  @media (max-width: 760px) {
    .nav-desktop { display: none; }
    .menu-toggle { display: block; }
    .menu-toggle[hidden] { display: none; }
    .brand { position: relative; z-index: 2; }
    /* No JavaScript: the toggle stays hidden, so keep the links as a small wrapping row. */
    .site-nav:has(.menu-toggle[hidden]) {
      flex-wrap: wrap;
      height: auto;
      min-height: var(--nav-height);
      row-gap: 0.6rem;
      padding-block: 1rem;
    }
    .site-nav:has(.menu-toggle[hidden]) .nav-desktop { display: block; }
    .site-nav:has(.menu-toggle[hidden]) .nav-desktop ul { flex-wrap: wrap; gap: 0.4rem 1.2rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-desktop a { transition: none; }
    .mobile-menu :global(.index-item) { animation: none; }
  }
  :global(html.menu-open) {
    overflow: hidden;
  }
</style>
```

- [ ] **Step 3: Footer**

Replace `src/components/Footer.astro`:
```astro
---
import RuptureRule from './RuptureRule.astro';
import type { SiteSettings } from '../lib/sanity';
import { WORDMARK_HEIGHT, WORDMARK_WIDTH } from '../lib/brand';

interface Props {
  settings: SiteSettings;
}

const { settings } = Astro.props;
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="footer-mark">
    <img src="/brand/wordmark-white.png" alt="GLUK" width={WORDMARK_WIDTH} height={WORDMARK_HEIGHT} />
    <RuptureRule weight="base" class="footer-rule" />
  </div>
  <div class="footer-cols">
    <div>
      <p class="label dim">Work</p>
      <ul>
        <li><a href="/portfolio/oil-painting">Oil painting</a></li>
        <li><a href="/portfolio/mixed-media">Mixed media</a></li>
        <li><a href="/tattoo">Tattoo</a></li>
        <li><a href="/portfolio">Prints</a></li>
      </ul>
    </div>
    <div>
      <p class="label dim">Studio</p>
      <ul>
        <li>{settings.studioCity}</li>
        <li><a href="/contact?interest=commission">Commissions &amp; originals: inquire</a></li>
      </ul>
    </div>
    <div>
      <p class="label dim">Follow</p>
      <ul>
        <li><a href={settings.instagramUrl} rel="noopener">Instagram</a></li>
        <li><a href="/journal">Journal</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-legal label dim">
    <span>&copy; GLUK {year}</span>
    <span>Guillermo Carrasquero</span>
  </div>
</footer>

<style>
  .site-footer {
    position: relative;
    z-index: 1;
    padding: var(--section-space) var(--gutter) 2rem;
    background: var(--color-black);
  }
  .footer-mark {
    display: flex;
    align-items: flex-end;
    gap: 1.4vw;
  }
  .footer-mark img {
    width: clamp(7rem, 18vw, 16rem);
    height: auto;
    display: block;
  }
  .footer-mark :global(.footer-rule) {
    flex: 1;
    margin-bottom: 0.9vw;
  }
  .footer-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-top: 3.5rem;
  }
  .footer-cols ul {
    list-style: none;
    margin: 0.6rem 0 0;
    padding: 0;
    line-height: 1.9;
  }
  .footer-cols a {
    text-decoration: none;
  }
  .footer-cols a:hover {
    text-decoration: underline;
  }
  .footer-legal {
    display: flex;
    justify-content: space-between;
    margin-top: 3rem;
  }
  @media (max-width: 640px) {
    .footer-cols { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 4: Cursor restyle**

In `src/components/Cursor.astro` `<style>`, change `.cursor`'s `color: #fff;` to `color: var(--color-bone);` and delete the line `mix-blend-mode: difference;`.

- [ ] **Step 5: Pass settings from the layout**

In `src/layouts/BaseLayout.astro` frontmatter add:
```ts
import { getSiteSettings } from '../lib/sanity';
const settings = await getSiteSettings();
```
and change `<Nav />` → `<Nav settings={settings} />`, `<Footer />` → `<Footer settings={settings} />`.

- [ ] **Step 6: Gates + manual check**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

With `npm run preview` running, screenshot `/about` at 1440×900 and at 390×844, then (at 390×844) confirm in DevTools device mode: tapping `Menu` shows the numbered index, the label reads `Close`, `Escape` closes it and focus returns to the toggle. Then disable JavaScript (DevTools → Settings → Debugger) and reload at 390×844: no `Menu` button, the five page links show as a wrapped row under the wordmark.

- [ ] **Step 7: Commit**

```bash
git add src/components/Nav.astro src/components/Footer.astro src/components/Cursor.astro src/scripts/mobile-menu.ts src/layouts/BaseLayout.astro
git commit -m "Brand nav with wordmark and mobile index menu; new footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Live data — clocks, route and the data egg

**Files:**
- Create: `src/lib/route-data.ts`, `src/lib/route-data.test.ts`, `src/lib/weather.ts`, `src/lib/weather.test.ts`, `src/scripts/live-data.ts`, `src/components/DataEgg.astro`, `src/components/StudioClock.astro`
- Modify: `netlify.toml`, `src/env.d.ts`

**Interfaces:**
- Produces:
  ```ts
  // route-data.ts
  export interface Place { name: string; short: string; timeZone: string; lat: number; lon: number; elevation: number }
  export const CARACAS: Place; export const MEXICO_CITY: Place;
  export const SEA_POINTS: { caribbean: { name: string; lat: number; lon: number }; pacific: { … } };
  export function formatClock(date: Date, timeZone: string): string;      // '17:34'
  export function distanceKm(a: Place, b: Place): number;                  // 3595
  export function bearingDeg(a: Place, b: Place): number;                  // 289.9
  export function compassPoint(deg: number): string;                       // 'WNW'
  export function formatThousands(n: number): string;                      // '3 595'
  export function formatRoute(a: Place, b: Place): string;                 // '3 595 km · 289.9° WNW'
  export function formatElevation(m: number): string;                      // '2 230 m'
  export function formatTemp(c: number | null): string;                    // '26.4°' | '—'
  export function formatPercent(p: number | null): string;                 // '88%' | '—'
  // weather.ts
  export interface RouteWeather { origin: { air: number; humidity: number }; base: { air: number; humidity: number }; sea: { caribbean: number | null; pacific: number | null } }
  export const FORECAST_URL: string; export const MARINE_URL: string; export const WEATHER_CACHE_MS = 900000;
  export function parseWeather(forecast: unknown, marine: unknown): RouteWeather | null;
  export function loadWeather(deps: WeatherDeps): Promise<RouteWeather | null>;
  ```
- DOM hooks: `[data-live]` (hidden until JS), `[data-clock="<IANA zone>"]`, `[data-egg]`, `[data-egg-toggle]`, `[data-weather-row]`, `[data-w="ccs-air|cdmx-air|ccs-humidity|cdmx-humidity|ccs-sea|cdmx-sea"]`, `[data-weather-note]`.
- Components: `<DataEgg />` (no props), `<StudioClock />` (no props).

- [ ] **Step 1: Write the failing tests**

`src/lib/route-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  CARACAS,
  MEXICO_CITY,
  bearingDeg,
  compassPoint,
  distanceKm,
  formatClock,
  formatElevation,
  formatPercent,
  formatRoute,
  formatTemp,
  formatThousands,
} from './route-data';

describe('places', () => {
  it('holds the real coordinates, zones and elevations', () => {
    expect(CARACAS).toMatchObject({ short: 'CCS', timeZone: 'America/Caracas', lat: 10.4806, lon: -66.9036, elevation: 882 });
    expect(MEXICO_CITY).toMatchObject({ short: 'CDMX', timeZone: 'America/Mexico_City', lat: 19.4326, lon: -99.1332, elevation: 2230 });
  });
});

describe('formatClock', () => {
  const instant = new Date('2026-09-23T21:34:00Z');
  it('shows 24-hour local time in each city', () => {
    expect(formatClock(instant, 'America/Caracas')).toBe('17:34');
    expect(formatClock(instant, 'America/Mexico_City')).toBe('15:34');
  });
  it('keeps two-digit hours after midnight', () => {
    expect(formatClock(new Date('2026-09-24T04:05:00Z'), 'America/Caracas')).toBe('00:05');
  });
});

describe('route', () => {
  it('computes the real distance and heading Caracas → Mexico City', () => {
    expect(distanceKm(CARACAS, MEXICO_CITY)).toBe(3595);
    expect(bearingDeg(CARACAS, MEXICO_CITY)).toBe(289.9);
    expect(compassPoint(289.9)).toBe('WNW');
    expect(formatRoute(CARACAS, MEXICO_CITY)).toBe('3 595 km · 289.9° WNW');
  });
  it('maps compass points at the edges', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(359)).toBe('N');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(202.5)).toBe('SSW');
  });
});

describe('formatting', () => {
  it('groups thousands with spaces', () => {
    expect(formatThousands(882)).toBe('882');
    expect(formatThousands(2230)).toBe('2 230');
    expect(formatElevation(2230)).toBe('2 230 m');
  });
  it('formats temperatures and percentages, with a dash for missing values', () => {
    expect(formatTemp(26.4)).toBe('26.4°');
    expect(formatTemp(24)).toBe('24.0°');
    expect(formatTemp(null)).toBe('—');
    expect(formatPercent(88.4)).toBe('88%');
    expect(formatPercent(null)).toBe('—');
  });
});
```

`src/lib/weather.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { FORECAST_URL, MARINE_URL, WEATHER_CACHE_MS, loadWeather, parseWeather } from './weather';

// Shapes captured from the live Open-Meteo API on 2026-09-23.
const forecast = [
  { current: { temperature_2m: 24.2, relative_humidity_2m: 88 } },
  { current: { temperature_2m: 24.6, relative_humidity_2m: 39 } },
];
const marine = [{ current: { sea_surface_temperature: 26.4 } }, { current: { sea_surface_temperature: 30.9 } }];
const parsed = {
  origin: { air: 24.2, humidity: 88 },
  base: { air: 24.6, humidity: 39 },
  sea: { caribbean: 26.4, pacific: 30.9 },
};

describe('parseWeather', () => {
  it('reads both cities and both seas', () => {
    expect(parseWeather(forecast, marine)).toEqual(parsed);
  });
  it('keeps air data when the marine response is missing or malformed', () => {
    expect(parseWeather(forecast, null)).toEqual({ ...parsed, sea: { caribbean: null, pacific: null } });
    expect(parseWeather(forecast, [{ current: { sea_surface_temperature: 'hot' } }])?.sea).toEqual({
      caribbean: null,
      pacific: null,
    });
  });
  it('returns null when the forecast is not two locations of numbers', () => {
    expect(parseWeather(null, marine)).toBeNull();
    expect(parseWeather({ current: {} }, marine)).toBeNull();
    expect(parseWeather([forecast[0]], marine)).toBeNull();
    expect(parseWeather([{ current: { temperature_2m: '24' } }, forecast[1]], marine)).toBeNull();
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, json: async () => body });
}

describe('loadWeather', () => {
  it('fetches both endpoints, parses and caches', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const storage = memoryStorage();
    expect(await loadWeather({ fetch: fetchImpl, now: () => 1000, storage })).toEqual(parsed);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.data['gluk:weather'])).toEqual({ t: 1000, data: parsed });
  });

  it('uses a fresh cache without fetching', async () => {
    const fetchImpl = vi.fn();
    const storage = memoryStorage({ 'gluk:weather': JSON.stringify({ t: 0, data: parsed }) });
    expect(await loadWeather({ fetch: fetchImpl, now: () => WEATHER_CACHE_MS - 1, storage })).toEqual(parsed);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refetches when the cache is stale or corrupt', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const stale = memoryStorage({ 'gluk:weather': JSON.stringify({ t: 0, data: parsed }) });
    await loadWeather({ fetch: fetchImpl, now: () => WEATHER_CACHE_MS + 1, storage: stale });
    const corrupt = memoryStorage({ 'gluk:weather': '{not json' });
    await loadWeather({ fetch: fetchImpl, now: () => 5, storage: corrupt });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('returns null when the forecast fetch fails, and never throws', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    expect(await loadWeather({ fetch: fetchImpl, now: () => 0, storage: null })).toBeNull();
  });

  it('still returns air data when only the marine fetch fails', async () => {
    const fetchImpl = vi.fn((url: string) => (url === FORECAST_URL ? okJson(forecast) : Promise.reject(new Error('x'))));
    expect((await loadWeather({ fetch: fetchImpl, now: () => 0, storage: null }))?.sea).toEqual({
      caribbean: null,
      pacific: null,
    });
  });

  it('survives a storage that throws', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(await loadWeather({ fetch: fetchImpl, now: () => 0, storage: throwing })).toEqual(parsed);
  });

  it('points at the two cities and the two sea points', () => {
    expect(FORECAST_URL).toContain('latitude=10.4806,19.4326');
    expect(FORECAST_URL).toContain('longitude=-66.9036,-99.1332');
    expect(MARINE_URL).toContain('latitude=10.65,16.8');
    expect(MARINE_URL).toContain('longitude=-66.93,-99.9');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/route-data.test.ts src/lib/weather.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/route-data.ts`:
```ts
// Where GLUK comes from and where he is (spec §8). Everything here is computed
// locally — no network, no cost.

export interface Place {
  name: string;
  short: string;
  timeZone: string;
  lat: number;
  lon: number;
  elevation: number;
}

export const CARACAS: Place = {
  name: 'Caracas',
  short: 'CCS',
  timeZone: 'America/Caracas',
  lat: 10.4806,
  lon: -66.9036,
  elevation: 882,
};

export const MEXICO_CITY: Place = {
  name: 'Ciudad de México',
  short: 'CDMX',
  timeZone: 'America/Mexico_City',
  lat: 19.4326,
  lon: -99.1332,
  elevation: 2230,
};

export const SEA_POINTS = {
  caribbean: { name: 'Caribbean, off La Guaira', lat: 10.65, lon: -66.93 },
  pacific: { name: 'Pacific, off Acapulco', lat: 16.8, lon: -99.9 },
} as const;

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

export function distanceKm(a: Place, b: Place): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)));
}

export function bearingDeg(a: Place, b: Place): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return Math.round(deg * 10) / 10;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassPoint(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function formatThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatRoute(a: Place, b: Place): string {
  const bearing = bearingDeg(a, b);
  return `${formatThousands(distanceKm(a, b))} km · ${bearing.toFixed(1)}° ${compassPoint(bearing)}`;
}

export function formatElevation(m: number): string {
  return `${formatThousands(m)} m`;
}

export function formatTemp(c: number | null): string {
  return c === null ? '—' : `${c.toFixed(1)}°`;
}

export function formatPercent(p: number | null): string {
  return p === null ? '—' : `${Math.round(p)}%`;
}
```

`src/lib/weather.ts`:
```ts
// Optional live weather for the data egg (spec §8). Only used when
// PUBLIC_LIVE_WEATHER=on — Open-Meteo's free API is non-commercial, so a paid
// plan (or another provider) must be chosen before enabling it.
import { CARACAS, MEXICO_CITY, SEA_POINTS } from './route-data';

export interface RouteWeather {
  origin: { air: number; humidity: number };
  base: { air: number; humidity: number };
  sea: { caribbean: number | null; pacific: number | null };
}

export const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${CARACAS.lat},${MEXICO_CITY.lat}` +
  `&longitude=${CARACAS.lon},${MEXICO_CITY.lon}&current=temperature_2m,relative_humidity_2m`;

export const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${SEA_POINTS.caribbean.lat},${SEA_POINTS.pacific.lat}` +
  `&longitude=${SEA_POINTS.caribbean.lon},${SEA_POINTS.pacific.lon}&current=sea_surface_temperature`;

export const WEATHER_CACHE_MS = 15 * 60 * 1000;
const CACHE_KEY = 'gluk:weather';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function current(list: unknown, index: number, field: string): unknown {
  if (!Array.isArray(list)) return undefined;
  const entry = list[index] as { current?: Record<string, unknown> } | undefined;
  return entry?.current?.[field];
}

export function parseWeather(forecast: unknown, marine: unknown): RouteWeather | null {
  if (!Array.isArray(forecast) || forecast.length < 2) return null;
  const values = [
    current(forecast, 0, 'temperature_2m'),
    current(forecast, 0, 'relative_humidity_2m'),
    current(forecast, 1, 'temperature_2m'),
    current(forecast, 1, 'relative_humidity_2m'),
  ];
  if (!values.every(isNum)) return null;
  const [oAir, oHum, bAir, bHum] = values as number[];
  const sea = (i: number) => {
    const v = current(marine, i, 'sea_surface_temperature');
    return isNum(v) ? v : null;
  };
  return { origin: { air: oAir, humidity: oHum }, base: { air: bAir, humidity: bHum }, sea: { caribbean: sea(0), pacific: sea(1) } };
}

interface JsonResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

export interface WeatherDeps {
  fetch: (url: string) => Promise<JsonResponse>;
  now: () => number;
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void } | null;
}

function readCache(deps: WeatherDeps): RouteWeather | null {
  try {
    const raw = deps.storage?.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { t: number; data: RouteWeather };
    return deps.now() - cached.t < WEATHER_CACHE_MS ? cached.data : null;
  } catch {
    return null;
  }
}

function writeCache(deps: WeatherDeps, data: RouteWeather): void {
  try {
    deps.storage?.setItem(CACHE_KEY, JSON.stringify({ t: deps.now(), data }));
  } catch {
    // Storage full or blocked: caching is optional.
  }
}

async function getJson(deps: WeatherDeps, url: string): Promise<unknown> {
  try {
    const res = await deps.fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function loadWeather(deps: WeatherDeps): Promise<RouteWeather | null> {
  const cached = readCache(deps);
  if (cached) return cached;
  const [forecast, marine] = await Promise.all([getJson(deps, FORECAST_URL), getJson(deps, MARINE_URL)]);
  const data = parseWeather(forecast, marine);
  if (data) writeCache(deps, data);
  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/route-data.test.ts src/lib/weather.test.ts`
Expected: PASS.

- [ ] **Step 5: Client script**

`src/scripts/live-data.ts`:
```ts
// Live clocks (home egg, contact) and the data-egg toggle. Weather only loads
// when PUBLIC_LIVE_WEATHER=on (spec §8).
import { formatClock, formatPercent, formatTemp } from '../lib/route-data';
import { loadWeather, type RouteWeather } from '../lib/weather';

let clockTimer: number | undefined;

function tickClocks(): void {
  const now = new Date();
  for (const el of document.querySelectorAll<HTMLElement>('[data-clock]')) {
    el.textContent = formatClock(now, el.dataset.clock!);
  }
}

function fillWeather(egg: HTMLElement, w: RouteWeather): void {
  const set = (key: string, value: string) => {
    const cell = egg.querySelector<HTMLElement>(`[data-w="${key}"]`);
    if (cell) cell.textContent = value;
  };
  set('ccs-air', formatTemp(w.origin.air));
  set('cdmx-air', formatTemp(w.base.air));
  set('ccs-humidity', formatPercent(w.origin.humidity));
  set('cdmx-humidity', formatPercent(w.base.humidity));
  set('ccs-sea', formatTemp(w.sea.caribbean));
  set('cdmx-sea', formatTemp(w.sea.pacific));
  for (const row of egg.querySelectorAll<HTMLElement>('[data-weather-row], [data-weather-note]')) row.hidden = false;
}

function initLiveData(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-live]')) el.hidden = false;
  tickClocks();
  window.clearInterval(clockTimer);
  clockTimer = window.setInterval(tickClocks, 30_000);

  const egg = document.querySelector<HTMLElement>('[data-egg]');
  const toggle = egg?.querySelector<HTMLButtonElement>('[data-egg-toggle]');
  if (!egg || !toggle) return;
  toggle.addEventListener('click', () => {
    const open = egg.toggleAttribute('data-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  if (import.meta.env.PUBLIC_LIVE_WEATHER !== 'on') return;
  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  loadWeather({ fetch: (url) => window.fetch(url), now: Date.now, storage }).then((weather) => {
    if (weather && egg.isConnected) fillWeather(egg, weather);
  });
}

document.addEventListener('astro:page-load', initLiveData);
```

In `src/env.d.ts` append:
```ts
interface ImportMetaEnv {
  readonly PUBLIC_LIVE_WEATHER?: 'on' | 'off';
}
```

- [ ] **Step 6: Components**

`src/components/DataEgg.astro`:
```astro
---
// Home-page easter egg (spec §5.2, §8): one faint line of two local times that
// unfolds into a tiny table. Hidden entirely without JavaScript.
import { CARACAS, MEXICO_CITY, SEA_POINTS, formatElevation, formatRoute } from '../lib/route-data';
---
<div class="egg" data-egg data-live hidden>
  <div class="egg-panel" id="egg-panel">
    <div class="egg-panel-inner">
      <table class="egg-table mono">
        <thead>
          <tr><th></th><th scope="col" class="label">Caracas</th><th scope="col" class="label">CDMX</th></tr>
        </thead>
        <tbody>
          <tr data-weather-row hidden><th scope="row" class="label">Air</th><td data-w="ccs-air">—</td><td data-w="cdmx-air">—</td></tr>
          <tr data-weather-row hidden><th scope="row" class="label">Humidity</th><td data-w="ccs-humidity">—</td><td data-w="cdmx-humidity">—</td></tr>
          <tr><th scope="row" class="label">Elevation</th><td>{formatElevation(CARACAS.elevation)}</td><td>{formatElevation(MEXICO_CITY.elevation)}</td></tr>
          <tr data-weather-row hidden><th scope="row" class="label">Sea</th><td data-w="ccs-sea">—</td><td data-w="cdmx-sea">—</td></tr>
        </tbody>
      </table>
      <p class="egg-note label" data-weather-note hidden>{SEA_POINTS.caribbean.name} · {SEA_POINTS.pacific.name}</p>
      <p class="egg-route label">{formatRoute(CARACAS, MEXICO_CITY)}</p>
    </div>
  </div>
  <button class="egg-toggle label" type="button" aria-expanded="false" aria-controls="egg-panel" data-egg-toggle>
    <span class="egg-dot" aria-hidden="true"></span>
    {CARACAS.short} <time data-clock={CARACAS.timeZone}>--:--</time> / {MEXICO_CITY.short} <time data-clock={MEXICO_CITY.timeZone}>--:--</time>
  </button>
</div>

<script>
  import '../scripts/live-data';
</script>

<style>
  .egg {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .egg[hidden] {
    display: none;
  }
  .egg-toggle {
    border: 0;
    padding: 0.4rem 0;
    background: none;
    color: var(--color-bone);
    font: inherit;
    font-size: var(--text-label);
    letter-spacing: 0.18em;
    opacity: 0.55;
    cursor: pointer;
    transition: opacity 0.4s var(--ease-out);
  }
  .egg-dot {
    display: inline-block;
    width: 0.45rem;
    height: 0.45rem;
    margin-right: 0.6rem;
    border-radius: 50%;
    background: var(--color-orange);
    vertical-align: middle;
  }
  .egg-panel {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.5s var(--ease-out), opacity 0.4s var(--ease-out);
  }
  .egg-panel-inner {
    overflow: hidden;
  }
  /* Open state is driven only by [data-open] (click / Enter / Space) and hover.
     No :focus-within — the clicked button keeps focus, so the panel could not
     close again and would disagree with aria-expanded. */
  .egg[data-open] .egg-panel {
    grid-template-rows: 1fr;
    opacity: 1;
  }
  .egg[data-open] .egg-toggle,
  .egg-toggle:focus-visible {
    opacity: 1;
  }
  @media (hover: hover) {
    .egg:hover .egg-panel { grid-template-rows: 1fr; opacity: 1; }
    .egg:hover .egg-toggle { opacity: 1; }
  }
  .egg-table {
    border-collapse: collapse;
    margin-left: auto;
  }
  .egg-table th,
  .egg-table td {
    padding: 0.45rem 0 0.45rem 2rem;
    border-top: var(--rule-hair) solid var(--color-hairline);
    text-align: right;
    font-weight: 400;
  }
  .egg-table thead th {
    border-top: 0;
    opacity: 0.7;
  }
  .egg-table th[scope='row'] {
    padding-left: 0;
    opacity: 0.5;
    text-align: left;
  }
  .egg-note,
  .egg-route {
    margin: 0.8rem 0 0;
    opacity: 0.55;
  }
  @media (prefers-reduced-motion: reduce) {
    .egg-panel { transition: opacity 0.2s linear; }
    .egg-toggle { transition: none; }
  }
</style>
```

`src/components/StudioClock.astro`:
```astro
---
import { MEXICO_CITY } from '../lib/route-data';
---
<p class="studio-clock mono" data-live hidden>
  <span class="studio-clock-dot" aria-hidden="true"></span>Studio time <time data-clock={MEXICO_CITY.timeZone}>--:--</time>
</p>

<script>
  import '../scripts/live-data';
</script>

<style>
  .studio-clock[hidden] { display: none; }
  .studio-clock-dot {
    display: inline-block;
    width: 0.45rem;
    height: 0.45rem;
    margin-right: 0.7rem;
    border-radius: 50%;
    background: var(--color-orange);
    vertical-align: middle;
  }
</style>
```

- [ ] **Step 7: Document the flag**

Append to `netlify.toml`:
```toml
# Optional (spec §8): PUBLIC_LIVE_WEATHER=on enables live weather/sea data in the
# home-page data egg. Leave unset until a commercial weather plan is chosen —
# Open-Meteo's free API is non-commercial only.
```

- [ ] **Step 8: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/route-data.ts src/lib/route-data.test.ts src/lib/weather.ts src/lib/weather.test.ts src/scripts/live-data.ts src/components/DataEgg.astro src/components/StudioClock.astro src/env.d.ts netlify.toml
git commit -m "Add live route data, optional weather and the data egg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Home page and hero motion

**Files:**
- Rewrite: `src/pages/index.astro`, `src/motion/home-hero.ts`
- Modify: `src/motion/tokens.ts`

**Interfaces:**
- Consumes: `getHomePage()` (Task 2/3), `toRoman` (Task 4), `RuptureRule`, `Painting` (Task 6), `DataEgg` (Task 8), `mediumLabel`.
- Produces: DOM hooks `[data-hero]`, `[data-hero-list]`, `[data-hero-intro]`, `[data-hero-word]`, `[data-hero-outline]`, `[data-hero-rule]`; `setupHomeHero(env: MotionEnv): void` (same export name as today).

- [ ] **Step 1: Tokens**

In `src/motion/tokens.ts` replace the `HERO_INTRO` line and comment with:
```ts
// Home hero opening (spec §10): the list rises word by word, ~1.5 s in total.
export const HERO_INTRO = { delay: 0.1, stagger: 0.15 } as const;
export const HERO_DRIFT = 12; // % the hero list drifts up while scrolling away
```

- [ ] **Step 2: Hero motion**

Replace `src/motion/home-hero.ts`:
```ts
// Home opening (spec §10): numerals and footnote fade in, the words rise from
// behind a mask one after another, the rupture rule draws across the middle
// word, and the outlined last word wipes in. Scrolling away drifts the list up
// slightly slower than the page. Reduced motion: fades only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, HERO_DRIFT, HERO_INTRO } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupHomeHero({ reduced }: MotionEnv): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const intro = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-intro]'));
  const words = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-word]'));
  const outline = hero.querySelector<HTMLElement>('[data-hero-outline]');
  const rule = hero.querySelector<HTMLElement>('[data-hero-rule]');
  const list = hero.querySelector<HTMLElement>('[data-hero-list]');

  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (reduced) {
    tl.fromTo([...intro, ...words], { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: HERO_INTRO.stagger });
    if (rule) tl.fromTo(rule, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base }, 0);
    return;
  }

  tl.fromTo(intro, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: 0.08 }, 0);
  tl.fromTo(
    words,
    { autoAlpha: 1, yPercent: 110 },
    { yPercent: 0, duration: DURATION.base, stagger: HERO_INTRO.stagger },
    HERO_INTRO.delay
  );
  if (rule) {
    tl.fromTo(
      rule,
      { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger
    );
  }
  if (outline) {
    tl.fromTo(
      outline,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger * 2
    );
  }
  if (list) {
    gsap.to(list, {
      yPercent: -HERO_DRIFT,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}
```

- [ ] **Step 3: Home page**

Replace `src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import RuptureRule from '../components/RuptureRule.astro';
import Painting from '../components/Painting.astro';
import DataEgg from '../components/DataEgg.astro';
import { getHomePage, mediumLabel } from '../lib/sanity';
import { toRoman } from '../lib/numerals';
import { CARD_WIDTH, CARD_WIDTHS } from '../lib/image-url';

const { heroList, heroFootnote, featuredWorks } = await getHomePage();
const middle = Math.floor(heroList.length / 2);
const last = heroList.length - 1;
---
<BaseLayout title="Home" backdrop="field-2">
  <div data-motion-page="home">
    <section class="hero" data-hero>
      <p class="hero-footnote" data-hero-intro>{heroFootnote}</p>
      <span class="hero-hairline" aria-hidden="true"></span>
      <h1 class="hero-list" data-hero-list>
        <span class="visually-hidden">GLUK — </span>
        {heroList.map((word, i) => (
          <span class="hero-line">
            <span class="hero-numeral mono" data-hero-intro>{toRoman(i + 1)}</span>
            <span class="hero-mask">
              <span
                class:list={['hero-word', { 'display--outline': i === last && last > 0 }]}
                data-hero-word
                data-hero-outline={i === last && last > 0 ? '' : undefined}
              >{word.toUpperCase()}</span>
            </span>
            {i === middle && (
              <span class="hero-rule" data-hero-rule>
                <RuptureRule weight="base" />
              </span>
            )}
          </span>
        ))}
      </h1>
      <div class="hero-egg"><DataEgg /></div>
    </section>

    {featuredWorks.length > 0 && (
      <section class="featured" aria-label="Selected work">
        <ol class="featured-list">
          {featuredWorks.map((artwork) => (
            <li class="featured-item" data-reveal>
              <a class="featured-link" href={`/artwork/${artwork.slug}`} data-cursor="view">
                <Painting artwork={artwork} width={CARD_WIDTH} widths={CARD_WIDTHS} sizes="(max-width: 700px) 100vw, 34rem" />
                <p class="featured-title">{artwork.title}</p>
                <p class="label dim">
                  {mediumLabel(artwork.medium)}{artwork.series && ` · ${artwork.series.name}`}
                </p>
              </a>
            </li>
          ))}
        </ol>
        <p class="view-all" data-reveal><a class="button" href="/portfolio">Work</a></p>
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
    position: relative;
    display: grid;
    grid-template-columns: minmax(8rem, 14rem) 1px 1fr;
    column-gap: clamp(1.5rem, 3vw, 3rem);
    align-items: start;
    min-height: 100svh;
    padding: calc(var(--nav-height) + 6vh) var(--gutter) 8rem;
  }
  .hero-footnote {
    margin: 0.4rem 0 0;
    font-size: var(--text-label);
    line-height: 1.6;
    opacity: 0.8;
  }
  .hero-hairline {
    align-self: stretch;
    background: var(--color-hairline);
    max-height: 70vh;
  }
  .hero-list {
    display: flex;
    flex-direction: column;
    font-family: var(--font-display);
    font-weight: 800;
    font-stretch: 125%;
    font-size: clamp(3rem, 1rem + 7.5vw, 9rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
  }
  .hero-line {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 1.2rem;
  }
  .hero-numeral {
    padding-top: 0.6em;
    font-family: var(--font-body);
    font-weight: 400;
    font-stretch: 100%;
    opacity: 0.55;
    min-width: 2.2rem;
  }
  .hero-mask {
    display: block;
    overflow: hidden;
    padding-bottom: 0.04em;
  }
  .hero-word {
    display: block;
  }
  .hero-rule {
    position: absolute;
    left: -3%;
    right: -12%;
    top: 58%;
  }
  .hero-egg {
    position: absolute;
    right: var(--gutter);
    bottom: 2.4rem;
  }
  .featured {
    position: relative;
    padding: var(--section-space) var(--gutter);
    background: linear-gradient(var(--veil-wash), var(--veil-wash)), url(/brand/veil-1.webp) center / cover;
  }
  .featured-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(3rem, 8vw, 8rem);
    max-width: 72rem;
    margin: 0 auto;
    padding: 0;
    list-style: none;
  }
  .featured-item:nth-child(even) {
    margin-top: clamp(6rem, 16vw, 14rem);
  }
  .featured-link {
    display: block;
    text-decoration: none;
  }
  .featured-title {
    margin: 1.4rem 0 0.3rem;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.4rem;
  }
  .view-all {
    margin: var(--section-space) 0 0;
    text-align: center;
  }
  @media (max-width: 760px) {
    .hero {
      grid-template-columns: 1fr;
      row-gap: 2rem;
    }
    .hero-hairline { display: none; }
    .hero-egg { left: var(--gutter); }
    .featured-list { grid-template-columns: 1fr; }
    .featured-item:nth-child(even) { margin-top: 0; }
  }
</style>
```

- [ ] **Step 4: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass. `dist/index.html` contains `ÓLEO`, `TINTA`, `CÓDIGO` and `data-hero-rule`.

Run: `grep -c "data-hero-word" dist/index.html` → Expected: `3`.

- [ ] **Step 5: Visual check**

With `npm run preview` running, screenshot `/` at 1440×900 and 390×844 (as in Task 5 Step 6, names `task9-home-desktop.png`, `task9-home-phone.png`). Compare with the approved mockup `.superpowers/brainstorm/4236-1790195626/content/home-egg.html` (open it via the companion or the saved check image `05 AI/CLAUDE CODE/workspace/egg-check.png`). Expected: list with numerals I–III, rule through TINTA, CÓDIGO outlined, footnote "Oil, ink and code, put in friction.", faint time line bottom-right. The mockup still shows the old words (SÍMBOLO / MEMORIA / PODER); compare layout, not wording. Fix layout differences before committing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/motion/home-hero.ts src/motion/tokens.ts
git commit -m "Rebuild home: material list hero, data egg, featured works on the veil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Portfolio rooms

**Files:**
- Create: `src/components/Room.astro`
- Rewrite: `src/pages/portfolio/index.astro`, `src/pages/portfolio/[medium].astro`
- Delete: `src/components/ArtworkCard.astro`

**Interfaces:**
- Consumes: `groupIntoRooms`, `roomCountLabel`, `mediumCounts`, `Room` (Task 4), `Painting`, `RuptureRule` (Task 6), `pad2`, `mediumLabel`, `getAllArtworks`.
- Produces: `<Room room: Room />`; a shared page shape used by both portfolio routes.

- [ ] **Step 1: `Room.astro`**

```astro
---
import Painting from './Painting.astro';
import { roomCountLabel, type Room } from '../lib/rooms';
import { pad2, toRoman } from '../lib/numerals';
import { CARD_WIDTH, CARD_WIDTHS } from '../lib/image-url';

interface Props {
  room: Room;
}

const { room } = Astro.props;
const mark = (i: number) => (room.kind === 'diptych' ? toRoman(i + 1) : pad2(i + 1));
---
<section class="room" data-reveal-stagger aria-labelledby={`room-${room.key}`}>
  <header class="room-label" data-reveal>
    <p class="mono dim">{room.numeral}</p>
    <h2 class="room-name" id={`room-${room.key}`}>{room.name}</h2>
    <p class="label dim">{roomCountLabel(room)}</p>
  </header>
  <ul class="room-works">
    {room.works.map((artwork, i) => (
      <li data-reveal>
        <a href={`/artwork/${artwork.slug}`} data-cursor="view" class="room-work">
          <Painting artwork={artwork} width={CARD_WIDTH} widths={CARD_WIDTHS} sizes="(max-width: 760px) 45vw, 22vw" />
          <span class="mono room-mark">{room.kind === 'standalone' ? artwork.title : mark(i)}</span>
        </a>
      </li>
    ))}
  </ul>
</section>

<style>
  .room {
    display: grid;
    grid-template-columns: minmax(9rem, 14vw) 1fr;
    gap: clamp(1.5rem, 3vw, 3rem);
    padding: clamp(3rem, 6vw, 5rem) 0;
    border-top: var(--rule-hair) solid var(--color-hairline);
  }
  .room-name {
    margin: 0.8rem 0 0.9rem;
    font-size: clamp(1.3rem, 1rem + 1vw, 2.2rem);
    letter-spacing: -0.01em;
  }
  .room-works {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(11rem, 40vw), 1fr));
    gap: clamp(1.2rem, 2.4vw, 2.4rem);
    align-items: end;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .room-work {
    display: block;
    text-decoration: none;
  }
  .room-mark {
    display: block;
    margin-top: 0.9rem;
  }
  @media (max-width: 760px) {
    .room { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 2: Portfolio pages**

`src/pages/portfolio/index.astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Room from '../../components/Room.astro';
import RuptureRule from '../../components/RuptureRule.astro';
import { getAllArtworks, mediumLabel } from '../../lib/sanity';
import { groupIntoRooms, mediumCounts } from '../../lib/rooms';
import { pad2 } from '../../lib/numerals';

const artworks = await getAllArtworks();
const counts = mediumCounts(artworks);
const rooms = groupIntoRooms(artworks);
---
<BaseLayout title="Work">
  <section class="page">
    <div class="portfolio-head">
      <h1 class="display" data-intro>OBRA</h1>
      <nav class="filters label" aria-label="Filter by medium" data-intro>
        <a href="/portfolio" aria-current="page" class="is-on"><span class="dim">{pad2(counts.total)}</span> All</a>
        {counts.mediums.map(({ medium, count }) => (
          <a href={`/portfolio/${medium}`}><span class="dim">{pad2(count)}</span> {mediumLabel(medium)}</a>
        ))}
      </nav>
    </div>
    <RuptureRule weight="base" class="portfolio-rule" />
    {rooms.map((room) => <Room room={room} />)}
  </section>
</BaseLayout>

<style>
  .portfolio-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.5rem;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1.6rem;
  }
  .filters a {
    text-decoration: none;
    opacity: 0.45;
  }
  .filters a.is-on,
  .filters a:hover {
    opacity: 1;
  }
  :global(.portfolio-rule) {
    margin: 2.4rem 0 1rem;
  }
</style>
```

`src/pages/portfolio/[medium].astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Room from '../../components/Room.astro';
import RuptureRule from '../../components/RuptureRule.astro';
import { MEDIUMS, getAllArtworks, mediumLabel, type Medium } from '../../lib/sanity';
import { groupIntoRooms, mediumCounts } from '../../lib/rooms';
import { pad2 } from '../../lib/numerals';

export function getStaticPaths() {
  return MEDIUMS.map((medium) => ({ params: { medium } }));
}

const { medium } = Astro.params as { medium: Medium };
const all = await getAllArtworks();
const counts = mediumCounts(all);
const rooms = groupIntoRooms(all.filter((artwork) => artwork.medium === medium));
---
<BaseLayout title={`Work — ${mediumLabel(medium)}`}>
  <section class="page">
    <div class="portfolio-head">
      <h1 class="display" data-intro>OBRA</h1>
      <nav class="filters label" aria-label="Filter by medium" data-intro>
        <a href="/portfolio"><span class="dim">{pad2(counts.total)}</span> All</a>
        {counts.mediums.map((entry) => (
          <a href={`/portfolio/${entry.medium}`} class:list={{ 'is-on': entry.medium === medium }} aria-current={entry.medium === medium ? 'page' : undefined}>
            <span class="dim">{pad2(entry.count)}</span> {mediumLabel(entry.medium)}
          </a>
        ))}
      </nav>
    </div>
    <RuptureRule weight="base" class="portfolio-rule" />
    {rooms.map((room) => <Room room={room} />)}
  </section>
</BaseLayout>

<style>
  .portfolio-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.5rem;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1.6rem;
  }
  .filters a {
    text-decoration: none;
    opacity: 0.45;
  }
  .filters a.is-on,
  .filters a:hover {
    opacity: 1;
  }
  :global(.portfolio-rule) {
    margin: 2.4rem 0 1rem;
  }
</style>
```

- [ ] **Step 3: Remove the old card**

Run: `git rm src/components/ArtworkCard.astro` and `grep -rn "ArtworkCard" src` → Expected: no matches.

- [ ] **Step 4: Gates**

Run: `npm run check && npm test && npm run build`
Expected: all pass.

Run: `grep -o 'class="room"' dist/portfolio/index.html | wc -l`
Expected (before the content seed, no series exist): `1` (one "Standalone works" room). After Task 15's seed it becomes `5`.

- [ ] **Step 5: Visual check**

Screenshot `/portfolio` at 1440×900 (full page: `--window-size=1440,3000`) and 390×844; compare with `portfolio.html` P1 (check image `05 AI/CLAUDE CODE/workspace/portfolio-check.png`).

- [ ] **Step 6: Commit**

```bash
git add src/components/Room.astro src/pages/portfolio
git commit -m "Portfolio as exhibition rooms per series

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Artwork page — wall label

**Files:**
- Create: `src/components/WallLabel.astro`
- Rewrite: `src/pages/artwork/[slug].astro`

**Interfaces:**
- Consumes: `getAllArtworks`, `mediumLabel`, `groupIntoRooms`, `wallLabelHeading`, `NumberedIndex`, `IndexItem`, `RuptureRule`, `formatPrice` (`src/data/format-price.ts`), `DETAIL_WIDTH`, `THUMB_WIDTH`, `sizedImage`.
- Produces: `<WallLabel artwork: Artwork heading: string siblings: IndexItem[] />`; inquiry link format `/contact?interest=original&artwork=<encoded title>` (consumed by Task 14).

- [ ] **Step 1: `WallLabel.astro`**

```astro
---
import NumberedIndex, { type IndexItem } from './NumberedIndex.astro';
import RuptureRule from './RuptureRule.astro';
import { mediumLabel, type Artwork } from '../lib/sanity';
import { formatPrice } from '../data/format-price';

interface Props {
  artwork: Artwork;
  heading: string;
  siblings: IndexItem[];
}

const { artwork, heading, siblings } = Astro.props;
const details = [artwork.year, artwork.dimensions].filter(Boolean).join(' · ');
const inquire = `/contact?interest=original&artwork=${encodeURIComponent(artwork.title)}`;
---
<aside class="wall-label">
  <p class="mono dim" data-intro>{heading}</p>
  <h1 class="title" data-intro>{artwork.title}</h1>
  <RuptureRule weight="thin" class="wall-rule" />
  <p class="wall-medium" data-intro>
    {mediumLabel(artwork.medium)}
    {details && <><br /><span class="dim">{details}</span></>}
  </p>
  {artwork.description && <p class="wall-description" data-intro>{artwork.description}</p>}
  <hr class="hairline" />
  <div class="wall-block" data-intro>
    <p class="label dim">Original</p>
    <a class="button" href={inquire}>Inquire</a>
  </div>
  {artwork.printOptions.length > 0 && (
    <div class="wall-block" data-intro>
      <p class="label dim">Prints</p>
      <ul class="wall-prints">
        {artwork.printOptions.map((option) => (
          <li><span>{option.size}</span><span>{formatPrice(option.price)}</span></li>
        ))}
      </ul>
    </div>
  )}
  {siblings.length > 1 && (
    <>
      <hr class="hairline" />
      <NumberedIndex items={siblings} class="wall-series" />
    </>
  )}
</aside>

<style>
  .wall-label {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }
  .wall-label .title {
    margin-top: -0.4rem;
  }
  :global(.wall-rule) {
    width: 9rem !important;
  }
  .wall-medium,
  .wall-description {
    margin: 0;
  }
  .wall-block .label {
    margin: 0 0 0.8rem;
  }
  .wall-prints {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .wall-prints li {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-top: var(--rule-hair) solid var(--color-hairline);
    font-variant-numeric: tabular-nums;
  }
</style>
```

- [ ] **Step 2: Artwork page**

Replace `src/pages/artwork/[slug].astro`, keeping its gallery CSS block (radio crossfade + thumbs) as-is except for the changes noted:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import WallLabel from '../../components/WallLabel.astro';
import { getAllArtworks } from '../../lib/sanity';
import { groupIntoRooms, wallLabelHeading } from '../../lib/rooms';
import { DETAIL_WIDTH, THUMB_WIDTH, sizedImage } from '../../lib/image-url';

export async function getStaticPaths() {
  const artworks = await getAllArtworks();
  const rooms = groupIntoRooms(artworks);
  return artworks.map((artwork) => ({ params: { slug: artwork.slug }, props: { artwork, rooms } }));
}

const { artwork, rooms } = Astro.props;
const images = artwork.images.slice(0, 8);
const room = artwork.series ? rooms.find((r) => r.key === artwork.series!.slug) : undefined;
const siblings = (room?.works ?? []).map((work) => ({
  label: work.title,
  href: `/artwork/${work.slug}`,
  active: work.slug === artwork.slug,
}));
---
<BaseLayout title={artwork.title}>
  <section class="detail page">
    <div class="gallery">
      {images.map((_, i) => (
        <input type="radio" name="gallery" id={`gallery-${i}`} class="gallery-radio" checked={i === 0} />
      ))}
      <div class:list={['gallery-main', { 'gallery-main--halo': artwork.halo }]}>
        {artwork.halo && <span class="gallery-halo" aria-hidden="true"></span>}
        {images.map((src, i) =>
          i === 0 ? (
            <img src={sizedImage(src, DETAIL_WIDTH)} alt={artwork.title} class="gallery-image gallery-image-0" transition:name={`artwork-${artwork.slug}`} />
          ) : (
            <img src={sizedImage(src, DETAIL_WIDTH)} alt={artwork.title} class={`gallery-image gallery-image-${i}`} />
          )
        )}
      </div>
      {images.length > 1 && (
        <div class="gallery-thumbs">
          {images.map((src, i) => (
            <label for={`gallery-${i}`} class="gallery-thumb">
              <img src={sizedImage(src, THUMB_WIDTH)} alt={`${artwork.title} thumbnail ${i + 1}`} />
            </label>
          ))}
        </div>
      )}
    </div>
    <WallLabel artwork={artwork} heading={wallLabelHeading(artwork, rooms)} siblings={siblings} />
  </section>
</BaseLayout>
```
In the `<style>` block:
- Replace the `.detail` rule with:
```css
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: clamp(2rem, 6vw, 7rem);
    align-items: start;
  }
  .gallery-main {
    position: relative;
  }
  .gallery-halo {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 120%;
    height: 108%;
    transform: translate(-50%, -50%);
    background:
      radial-gradient(ellipse at 35% 60%, rgba(195, 79, 5, 0.75), transparent 60%),
      radial-gradient(ellipse at 65% 40%, rgba(12, 137, 213, 0.85), transparent 60%);
    filter: blur(clamp(24px, 3vw, 48px));
    pointer-events: none;
  }
  .gallery-image {
    position: relative;
    box-shadow: var(--shadow-painting);
  }
  @media (max-width: 860px) {
    .detail { grid-template-columns: 1fr; }
  }
```
  (keep the existing `grid-area`, opacity/visibility crossfade and thumb rules; `.gallery-image` gets `position: relative` so it paints above the halo).
- Delete the old `.meta`, `.button` and `.prints ul` rules (now in `WallLabel` / theme).

- [ ] **Step 3: Gates + halo verification**

Run: `npm run check && npm test && npm run build`
Expected: all pass, 13 artwork pages.

Run: `grep -l "gallery-halo" dist/artwork/*/index.html`
Expected before the content seed: exactly `dist/artwork/johnny-efectivo/index.html` and `dist/artwork/violenta-ii/index.html` (Violenta I joins after the series seed in Task 15).

- [ ] **Step 4: Visual check**

Screenshot `/artwork/motopirueta-4` and `/artwork/johnny-efectivo` at 1440×900 and 390×844; compare with `artwork.html` A1 (`05 AI/CLAUDE CODE/workspace/artwork-check.png`).

- [ ] **Step 5: Commit**

```bash
git add src/components/WallLabel.astro src/pages/artwork
git commit -m "Artwork page with museum wall label and series index

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: About page

**Files:**
- Rewrite: `src/pages/about.astro`

**Interfaces:**
- Consumes: `getAboutPage(): Promise<AboutPage>` (Task 2), `RuptureRule`.

- [ ] **Step 1: Page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import RuptureRule from '../components/RuptureRule.astro';
import { getAboutPage } from '../lib/sanity';

const about = await getAboutPage();
---
<BaseLayout title="About">
  <section class:list={['about', { 'about--portrait': about.portrait }]}>
    {about.portrait && (
      <div class="about-photo">
        <img
          src={about.portrait.src}
          srcset={about.portrait.srcset}
          sizes="(max-width: 860px) 100vw, 44vw"
          alt={about.portrait.alt}
          style={`object-position: ${about.portrait.focalPoint}`}
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </div>
    )}
    <div class="about-text">
      <p class="mono dim" data-intro>Guillermo Carrasquero — GLUK</p>
      <p class="statement" data-intro>{about.statement}</p>
      <RuptureRule weight="thin" class="about-rule" />
      <div class="about-body" data-intro set:html={about.bodyHtml} />
      {about.photoCredit && <p class="label dim about-credit">Photography — {about.photoCredit}</p>}
    </div>
  </section>
</BaseLayout>

<style>
  .about {
    display: grid;
    grid-template-columns: 1fr;
    min-height: 100svh;
  }
  .about--portrait {
    grid-template-columns: 44fr 56fr;
  }
  /* The BIO body runs longer than one screen: the portrait stays pinned at
     screen height (keeping the close crop) while the text scrolls beside it. */
  .about-photo {
    position: sticky;
    top: 0;
    align-self: start;
  }
  .about-photo img {
    display: block;
    width: 100%;
    height: 100svh;
    object-fit: cover;
  }
  .about-text {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    max-width: 44rem;
    padding: calc(var(--nav-height) + 4rem) var(--gutter) var(--section-space);
  }
  :global(.about-rule) {
    width: 10rem !important;
  }
  .about-body :global(p) {
    margin: 0 0 1em;
    opacity: 0.85;
    max-width: 36rem;
  }
  .about-credit {
    margin-top: auto;
  }
  @media (max-width: 860px) {
    .about--portrait { grid-template-columns: 1fr; }
    .about-photo { position: static; }
    .about-photo img { height: 70svh; }
    .about-text { padding-top: 3rem; }
  }
</style>
```
Note: the nav overlays the portrait; the wordmark is white on the photo, which is acceptable per the approved mockup.

- [ ] **Step 2: Gates + visual check**

Run: `npm run check && npm test && npm run build` → all pass. Before the seed there is no portrait: the page shows the text column alone. Screenshot `/about` (1440×900, 390×844); after the seed, compare with `about-v2.html` AB1 (`05 AI/CLAUDE CODE/workspace/about-check2.png`). The body is the six BIO.pdf paragraphs: at 1440×900 scroll to the bottom and confirm the portrait stays pinned at full screen height (close crop, not stretched) while the text scrolls.

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "About page: close portrait and BIO text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Tattoo and Journal pages

**Files:**
- Rewrite: `src/pages/tattoo.astro`, `src/pages/journal/index.astro`, `src/pages/journal/[slug].astro`

**Interfaces:**
- Consumes: `getTattooInfo(): Promise<TattooInfo>`, `getSiteSettings()`, `getAllJournalPosts()`, `getJournalPostBySlug()`, `RuptureRule`, `pad2`, `sizedImage`, `CARD_WIDTH`, `DETAIL_WIDTH`.

- [ ] **Step 1: Tattoo**

`src/pages/tattoo.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import RuptureRule from '../components/RuptureRule.astro';
import { getSiteSettings, getTattooInfo } from '../lib/sanity';
import { CARD_WIDTH, sizedImage } from '../lib/image-url';
import { pad2 } from '../lib/numerals';

const [info, settings] = await Promise.all([getTattooInfo(), getSiteSettings()]);
---
<BaseLayout title="Tattoo">
  <section class="page">
    <div class="tattoo-head">
      <h1 class="display" data-intro>TATUAJE</h1>
      {info.statement && <p class="tattoo-statement" data-intro>{info.statement}</p>}
    </div>
    <RuptureRule weight="base" class="tattoo-rule" />
    {info.bodyHtml && <div class="tattoo-body" data-reveal set:html={info.bodyHtml} />}
    {info.images.length > 0 && (
      <div class="tattoo-gallery" data-reveal-stagger>
        {info.images.map((src) => (
          <img src={sizedImage(src, CARD_WIDTH)} alt="" loading="lazy" decoding="async" data-reveal />
        ))}
      </div>
    )}
    <div class="tattoo-foot">
      {info.process.length > 0 && (
        <ol class="tattoo-process">
          {info.process.map((step, i) => (
            <li data-reveal><span class="mono dim">{pad2(i + 1)}</span><span>{step}</span></li>
          ))}
        </ol>
      )}
      <div class="tattoo-cta" data-reveal>
        <a class="button" href="/contact?interest=tattoo">Request a session</a>
        <p class="mono dim">Studio · {settings.studioCity}</p>
      </div>
    </div>
  </section>
</BaseLayout>

<style>
  .tattoo-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
    gap: 3rem;
    align-items: end;
  }
  .tattoo-statement {
    margin: 0;
  }
  :global(.tattoo-rule) {
    margin: 2.6rem 0 3.5rem;
  }
  .tattoo-body {
    max-width: 40rem;
    margin-bottom: 3rem;
  }
  .tattoo-gallery {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .tattoo-gallery img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
  .tattoo-gallery img:nth-child(even) {
    margin-top: 4rem;
  }
  .tattoo-foot {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: end;
    margin-top: 5rem;
  }
  .tattoo-process {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tattoo-process li {
    display: grid;
    grid-template-columns: 4rem 1fr;
    padding: 1rem 0;
    border-top: var(--rule-hair) solid var(--color-hairline);
  }
  .tattoo-cta .mono {
    margin-top: 1.2rem;
  }
  @media (max-width: 760px) {
    .tattoo-head,
    .tattoo-foot { grid-template-columns: 1fr; }
    .tattoo-gallery { grid-template-columns: 1fr 1fr; }
    .tattoo-gallery img:nth-child(even) { margin-top: 2rem; }
  }
</style>
```

- [ ] **Step 2: Journal index**

`src/pages/journal/index.astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllJournalPosts } from '../../lib/sanity';
import { sizedImage } from '../../lib/image-url';
import { pad2 } from '../../lib/numerals';

const posts = await getAllJournalPosts();
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
---
<BaseLayout title="Journal">
  <section class="page">
    <h1 class="display" data-intro>DIARIO</h1>
    {posts.length === 0 ? (
      <p class="label dim journal-empty">No entries yet</p>
    ) : (
      <ol class="journal-list" data-reveal-stagger>
        {posts.map((post, i) => (
          <li data-reveal>
            <a class="journal-row" href={`/journal/${post.slug}`}>
              <span class="mono dim">{pad2(posts.length - i)}</span>
              <span class="mono dim">{formatDate(post.date)}</span>
              <span class="journal-title">{post.title}</span>
              <span class="label dim">Read →</span>
              {post.coverImage && (
                <img class="journal-cover" src={sizedImage(post.coverImage, 600)} alt="" loading="lazy" decoding="async" />
              )}
            </a>
          </li>
        ))}
      </ol>
    )}
  </section>
</BaseLayout>

<style>
  .journal-empty {
    margin-top: 3rem;
  }
  .journal-list {
    margin: 4rem 0 0;
    padding: 0;
    list-style: none;
  }
  .journal-row {
    position: relative;
    display: grid;
    grid-template-columns: 4rem 9rem 1fr auto;
    gap: 1.5rem;
    align-items: baseline;
    padding: 1.3rem 0;
    border-top: var(--rule-hair) solid var(--color-hairline);
    text-decoration: none;
  }
  .journal-title {
    font-family: var(--font-display);
    font-weight: 300;
    font-size: clamp(1.3rem, 1rem + 1vw, 2rem);
  }
  .journal-cover {
    position: absolute;
    right: 12%;
    top: 50%;
    width: 14rem;
    transform: translateY(-50%) rotate(-2deg);
    opacity: 0;
    pointer-events: none;
    box-shadow: var(--shadow-painting);
    transition: opacity 0.4s var(--ease-out);
  }
  @media (hover: hover) {
    .journal-row:hover .journal-cover { opacity: 1; }
  }
  @media (max-width: 760px) {
    .journal-row { grid-template-columns: 3rem 1fr; }
    .journal-row .label { display: none; }
    .journal-cover { display: none; }
  }
</style>
```

- [ ] **Step 3: Journal entry**

`src/pages/journal/[slug].astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import RuptureRule from '../../components/RuptureRule.astro';
import { getAllJournalPosts, getJournalPostBySlug } from '../../lib/sanity';
import { DETAIL_WIDTH, sizedImage } from '../../lib/image-url';

export async function getStaticPaths() {
  const posts = await getAllJournalPosts();
  return posts.map((post) => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post = (await getJournalPostBySlug(slug!))!;
const date = new Date(post.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
---
<BaseLayout title={post.title}>
  <article class="page entry">
    <p class="mono dim" data-intro>{date}</p>
    <h1 class="title" data-intro>{post.title}</h1>
    <RuptureRule weight="thin" class="entry-rule" />
    {post.coverImage && <img class="entry-cover" src={sizedImage(post.coverImage, DETAIL_WIDTH)} alt="" data-reveal />}
    <div class="entry-body" data-reveal set:html={post.body} />
  </article>
</BaseLayout>

<style>
  .entry {
    max-width: 44rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
  }
  :global(.entry-rule) {
    width: 9rem !important;
  }
  .entry-cover {
    width: 100%;
    box-shadow: var(--shadow-painting);
  }
  .entry-body :global(p) {
    margin: 0 0 1.2em;
  }
</style>
```

- [ ] **Step 4: Gates + visual check**

Run: `npm run check && npm test && npm run build` → all pass. Screenshot `/tattoo` and `/journal` (1440×900, 390×844); compare with `small-pages-v2.html` (`05 AI/CLAUDE CODE/workspace/small-check.png`). Expected with empty content: TATUAJE + rule + Request a session + studio line; DIARIO + "No entries yet".

- [ ] **Step 5: Commit**

```bash
git add src/pages/tattoo.astro src/pages/journal
git commit -m "Tattoo and Journal pages in the brand system

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Contact page, prefill and thanks page

**Files:**
- Create: `src/lib/contact-prefill.ts`, `src/lib/contact-prefill.test.ts`, `src/pages/contact/thanks.astro`
- Rewrite: `src/pages/contact.astro`

**Interfaces:**
- Consumes: `getSiteSettings()`, `StudioClock` (Task 8), `RuptureRule`; query format from Task 11 (`interest`, `artwork`).
- Produces:
  ```ts
  export const INTERESTS: readonly { value: 'original' | 'print' | 'tattoo' | 'commission'; label: string }[];
  export type Interest = (typeof INTERESTS)[number]['value'];
  export const MAX_ARTWORK_LENGTH = 120;
  export interface Prefill { interest: Interest | null; message: string }
  export function readPrefill(search: string): Prefill;
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/contact-prefill.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { INTERESTS, MAX_ARTWORK_LENGTH, readPrefill } from './contact-prefill';

describe('INTERESTS', () => {
  it('lists the four approved choices in order', () => {
    expect(INTERESTS.map((i) => i.label)).toEqual(['An original', 'A print', 'A tattoo', 'A commission']);
  });
});

describe('readPrefill', () => {
  it('is empty for no query', () => {
    expect(readPrefill('')).toEqual({ interest: null, message: '' });
  });

  it('reads a known interest and an artwork title', () => {
    expect(readPrefill('?interest=original&artwork=Motopirueta%204')).toEqual({
      interest: 'original',
      message: 'About: Motopirueta 4\n\n',
    });
  });

  it('ignores unknown interests', () => {
    expect(readPrefill('?interest=free-stuff').interest).toBeNull();
  });

  it('clamps very long artwork names and strips control characters', () => {
    const long = 'x'.repeat(5000);
    const result = readPrefill(`?artwork=${long}`);
    expect(result.message).toBe(`About: ${'x'.repeat(MAX_ARTWORK_LENGTH)}\n\n`);
    expect(readPrefill('?artwork=a%00b%0Ac').message).toBe('About: a b c\n\n');
  });

  it('keeps HTML-looking text as plain text (inserted with .value, never innerHTML)', () => {
    expect(readPrefill('?artwork=%3Cimg%20src%3Dx%3E').message).toBe('About: <img src=x>\n\n');
  });

  it('ignores a blank artwork', () => {
    expect(readPrefill('?interest=tattoo&artwork=%20%20').message).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/contact-prefill.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/contact-prefill.ts`:
```ts
// Contact form prefill from links like "Inquire" (spec §5.8). The result is
// assigned with `.value`/`.checked`, so it is never interpreted as HTML.

export const INTERESTS = [
  { value: 'original', label: 'An original' },
  { value: 'print', label: 'A print' },
  { value: 'tattoo', label: 'A tattoo' },
  { value: 'commission', label: 'A commission' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];
export const MAX_ARTWORK_LENGTH = 120;

export interface Prefill {
  interest: Interest | null;
  message: string;
}

export function readPrefill(search: string): Prefill {
  const params = new URLSearchParams(search);
  const rawInterest = params.get('interest');
  const interest = INTERESTS.find((i) => i.value === rawInterest)?.value ?? null;
  const artwork = (params.get('artwork') ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ARTWORK_LENGTH);
  return { interest, message: artwork ? `About: ${artwork}\n\n` : '' };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/contact-prefill.test.ts` → PASS.

- [ ] **Step 5: Contact page**

`src/pages/contact.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import RuptureRule from '../components/RuptureRule.astro';
import StudioClock from '../components/StudioClock.astro';
import { getSiteSettings } from '../lib/sanity';
import { INTERESTS } from '../lib/contact-prefill';

const settings = await getSiteSettings();
---
<BaseLayout title="Contact" backdrop="field-3">
  <section class="page contact">
    <div class="contact-info">
      <h1 class="display" data-intro>CONTACTO</h1>
      <RuptureRule weight="thin" class="contact-rule" />
      <a class="statement contact-email" href={`mailto:${settings.email}`} data-intro>{settings.email}</a>
      <p class="mono" data-intro>Studio · {settings.studioCity}</p>
      <StudioClock />
      <a class="mono" href={settings.instagramUrl} rel="noopener" data-intro>Instagram @{settings.instagramHandle}</a>
    </div>

    <form class="contact-form" name="contact" method="POST" action="/contact/thanks" data-netlify="true" netlify-honeypot="bot-field" data-contact-form data-intro>
      <input type="hidden" name="form-name" value="contact" />
      <p class="visually-hidden"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off" /></label></p>
      <fieldset class="interests">
        <legend class="label dim">I'm interested in</legend>
        {INTERESTS.map((interest) => (
          <label class="chip">
            <input type="radio" name="interest" value={interest.value} />
            <span>{interest.label}</span>
          </label>
        ))}
      </fieldset>
      <label class="field"><span class="label dim">Name</span><input type="text" name="name" required autocomplete="name" /></label>
      <label class="field"><span class="label dim">Email</span><input type="email" name="email" required autocomplete="email" /></label>
      <label class="field"><span class="label dim">Message</span><textarea name="message" rows="5" required></textarea></label>
      <button class="button" type="submit">Send</button>
    </form>
  </section>
</BaseLayout>

<script>
  import { readPrefill } from '../lib/contact-prefill';

  document.addEventListener('astro:page-load', () => {
    const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
    if (!form) return;
    const { interest, message } = readPrefill(window.location.search);
    if (interest) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="interest"][value="${interest}"]`);
      if (radio) radio.checked = true;
    }
    const textarea = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (textarea && message && !textarea.value) textarea.value = message;
  });
</script>

<style>
  .contact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(2rem, 7vw, 8rem);
    align-items: start;
  }
  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  :global(.contact-rule) {
    width: 10rem !important;
    margin: 1.4rem 0;
  }
  .contact-email {
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .contact-info a.mono {
    text-decoration: none;
  }
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
    padding-top: 1rem;
  }
  .interests {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .interests legend {
    margin-bottom: 1rem;
  }
  .chip input {
    position: absolute;
    opacity: 0;
  }
  .chip span {
    display: inline-block;
    padding: 0.5em 1em;
    border: 1px solid rgba(241, 238, 232, 0.45);
    font-size: var(--text-label);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .chip input:checked + span {
    background: var(--color-bone);
    color: var(--color-black);
  }
  .chip input:focus-visible + span {
    outline: 1px solid var(--color-bone);
    outline-offset: 3px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .field input,
  .field textarea {
    padding: 0.6rem 0;
    border: 0;
    border-bottom: 1px solid rgba(241, 238, 232, 0.4);
    background: none;
    color: var(--color-bone);
    font: inherit;
    resize: vertical;
  }
  .contact-form .button {
    align-self: flex-start;
  }
  @media (max-width: 760px) {
    .contact { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 6: Thanks page**

`src/pages/contact/thanks.astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import RuptureRule from '../../components/RuptureRule.astro';
---
<BaseLayout title="Contact" backdrop="field-3">
  <section class="page thanks">
    <h1 class="display" data-intro>GRACIAS</h1>
    <RuptureRule weight="thin" class="thanks-rule" />
    <p class="statement" data-intro>Thank you — your message was sent.</p>
    <a class="button" href="/portfolio">Work</a>
  </section>
</BaseLayout>

<style>
  .thanks {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: 80svh;
    justify-content: center;
  }
  :global(.thanks-rule) {
    width: 10rem !important;
  }
  .thanks .button {
    align-self: flex-start;
  }
</style>
```
Note: `GRACIAS` is a new Spanish display word — **ask Guillermo** at sign-off (Task 16) whether he wants it; if not, use `CONTACTO`.

- [ ] **Step 7: Gates**

Run: `npm run check && npm test && npm run build` → all pass.
Run: `grep -c 'data-netlify="true"' dist/contact/index.html` → `1`; `grep -c 'name="interest"' dist/contact/index.html` → `4`.

- [ ] **Step 8: Visual + prefill check**

Screenshot `/contact?interest=original&artwork=Motopirueta%204` at 1440×900 and 390×844 (use `--virtual-time-budget=6000` so scripts run). Expected: "An original" chip filled, message field starts with `About: Motopirueta 4`, studio time visible. Compare with `small-pages-v2.html` "Contact" (open the mockup in the companion; `small-check2.png` only shows the Tattoo section).

- [ ] **Step 9: Commit**

```bash
git add src/lib/contact-prefill.ts src/lib/contact-prefill.test.ts src/pages/contact.astro src/pages/contact
git commit -m "Contact page with interest chips, prefill and studio time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Initial design content script (series, settings, about, home)

**Files:**
- Create: `scripts/seed-design-content.mjs`
- Delete: `scripts/seed-home-page.mjs`
- Modify: `package.json`

**Interfaces:**
- Writes to Sanity (when run with Guillermo's OK): documents `series-motopirueta`, `series-violenta`, `series-contemplacion-violenta`, `series-pobrecita-la-vaquita`; patches `series` + `seriesPosition` onto 8 artworks (only if unset); `siteSettings`, `aboutPage` (with shoot #82 uploaded), `homePage` (created if missing; otherwise only `setIfMissing` for hero fields).

- [ ] **Step 1: Script**

`scripts/seed-design-content.mjs`:
```js
// Initial content for the visual design pass (spec §7). Idempotent: never
// overwrites anything Guillermo has edited in the Studio.
// Run ONLY with Guillermo's explicit OK:  npm run seed:design
// Requires SANITY_WRITE_TOKEN (Editor) in .env.
import { createClient } from '@sanity/client';
import sharp from 'sharp';

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

const SERIES = [
  { id: 'series-motopirueta', slug: 'motopirueta', name: 'Motopirueta', order: 1, kind: 'series',
    members: ['motopirueta-1', 'motopirueta-2', 'motopirueta-3', 'motopirueta-4'] },
  { id: 'series-violenta', slug: 'violenta', name: 'Violenta', order: 2, kind: 'diptych',
    members: ['violenta-i', 'violenta-ii'] },
  { id: 'series-contemplacion-violenta', slug: 'contemplacion-violenta', name: 'Contemplación Violenta', order: 3, kind: 'series',
    members: ['contemplacion-violenta-1', 'contemplacion-violenta-2'] },
  { id: 'series-pobrecita-la-vaquita', slug: 'pobrecita-la-vaquita', name: 'Pobrecita la vaquita', order: 4, kind: 'series',
    members: ['pobrecita-la-vaquita-que-bonita-la-cartera', 'pobrecita-la-vaquita-que-bonita-la-cartera-invertido'] },
];

const FEATURED_SLUGS = [
  'motopirueta-1',
  'johnny-efectivo',
  'contemplacion-violenta-1',
  'bajale-2-gallito',
  'pobrecita-la-vaquita-que-bonita-la-cartera',
];

// Shoot #82 (Gluk_Photoshoot-82.tif) from Guillermo's Drive folder. If the
// Drive download is refused, download the TIFF by hand and pass PORTRAIT_PATH.
const PORTRAIT_DRIVE_ID = '1Om7p2e091hAuBXNyY9hu6XXPNq5mqUWp';
const PORTRAIT_PATH = process.env.PORTRAIT_PATH;
const PORTRAIT_ALT = 'Portrait of GLUK in the studio';

const slugs = SERIES.flatMap((s) => s.members).concat(FEATURED_SLUGS);
const artworks = await client.fetch(
  `*[_type == "artwork" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current, series }`,
  { slugs }
);
const bySlug = new Map(artworks.map((a) => [a.slug, a]));
const missing = [...new Set(slugs)].filter((slug) => !bySlug.has(slug));
if (missing.length > 0) {
  console.error(`No published artwork for: ${missing.join(', ')}. Aborting — nothing written.`);
  process.exit(1);
}

const tx = client.transaction();
for (const s of SERIES) {
  tx.createIfNotExists({
    _id: s.id,
    _type: 'series',
    name: s.name,
    slug: { _type: 'slug', current: s.slug },
    order: s.order,
    kind: s.kind,
    halo: 'auto',
  });
  s.members.forEach((slug, i) => {
    const art = bySlug.get(slug);
    if (art.series) return; // already assigned in the Studio — leave it
    tx.patch(art._id, (p) => p.set({ series: { _type: 'reference', _ref: s.id }, seriesPosition: i + 1 }));
  });
}
tx.createIfNotExists({
  _id: 'siteSettings',
  _type: 'siteSettings',
  email: 'gluk.caribe@gmail.com',
  instagramHandle: 'gluk______',
  studioCity: 'Ciudad de México',
});
tx.createIfNotExists({
  _id: 'homePage',
  _type: 'homePage',
  heroList: ['Óleo', 'Tinta', 'Código'],
  heroFootnote: 'Oil, ink and code, put in friction.',
  featuredWorks: FEATURED_SLUGS.map((slug) => ({ _type: 'reference', _ref: bySlug.get(slug)._id, _key: slug })),
});
tx.patch('homePage', (p) =>
  p.setIfMissing({
    heroList: ['Óleo', 'Tinta', 'Código'],
    heroFootnote: 'Oil, ink and code, put in friction.',
  })
);
const result = await tx.commit();
console.log(`Series, artwork assignments, settings and home page: ${result.results.length} operations.`);

const about = await client.fetch(`*[_id == "aboutPage"][0]{ _id, "hasPortrait": defined(portrait.asset) }`);
if (about?.hasPortrait) {
  console.log('aboutPage already has a portrait — skipped.');
} else {
  let source = PORTRAIT_PATH;
  if (!source) {
    console.log('Downloading shoot #82 from Google Drive...');
    const res = await fetch(`https://drive.usercontent.google.com/download?id=${PORTRAIT_DRIVE_ID}&export=download&confirm=t`);
    const tiff = Buffer.from(await res.arrayBuffer());
    const magic = tiff.subarray(0, 4).toString('hex');
    if (!res.ok || (magic !== '49492a00' && magic !== '4d4d002a')) {
      console.error('Drive did not return the TIFF. Download Gluk_Photoshoot-82.tif manually and re-run with PORTRAIT_PATH=<file>.');
      process.exit(1);
    }
    source = tiff;
  }
  const jpeg = await sharp(source).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const asset = await client.assets.upload('image', jpeg, { filename: 'gluk-about-82.jpg', contentType: 'image/jpeg' });
  await client.createIfNotExists({ _id: 'aboutPage', _type: 'aboutPage' });
  await client
    .patch('aboutPage')
    .setIfMissing({ portraitAlt: PORTRAIT_ALT })
    .set({ portrait: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } })
    .commit();
  console.log(`aboutPage portrait uploaded -> ${asset._id}`);
}
```

- [ ] **Step 2: Package scripts**

In `package.json` `scripts`: remove `"seed:home"`, add `"seed:design": "node --env-file=.env scripts/seed-design-content.mjs"`. Run `git rm scripts/seed-home-page.mjs`.

Syntax check (no network, no writes): `node --check scripts/seed-design-content.mjs` → no output.

- [ ] **Step 3: Pre-seed build check (Review Focus 1)**

Run: `npm run check && npm test && npm run build`
Expected: all pass with the live dataset as it is now (no series, no homePage/aboutPage/siteSettings documents): home shows the default list, portfolio shows one standalone room, About shows text only, contact shows the default email.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-design-content.mjs package.json
git commit -m "Add idempotent design content seed; retire the home portrait seed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: STOP — ask Guillermo before running**

Tell Guillermo exactly what the seed writes to the live `production` dataset (4 series, 8 artwork assignments, site settings, home page, About portrait #82 uploaded) and that the Sanity webhook will rebuild the live site from `main` (which still has the old design — the new fields are simply unused there). Run `npm run seed:design` **only after his explicit yes**. Then rebuild and verify:
- `grep -o 'class="room"' dist/portfolio/index.html | wc -l` → `5`
- `grep -l "gallery-halo" dist/artwork/*/index.html` → johnny-efectivo, violenta-i, violenta-ii
- `/about` shows portrait #82.

---

### Task 16: Verification and per-page sign-off

**Files:**
- Modify: `C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/gsap-motion-check.mjs` (vault, not the repo)
- Create: `C:/Users/Guillermo/Documents/gluk/05 AI/CLAUDE CODE/workspace/design-signoff/` (screenshots)

- [ ] **Step 1: Gates**

Run: `npm run check && npm test && npm run build` → all pass. Report the gzipped JS size loaded by `dist/index.html` (same method as the GSAP plan's Task 10); expected around 52 KB, flag anything above 70 KB.

- [ ] **Step 2: Extend the headless checks**

Add these checks to `gsap-motion-check.mjs` after check 7, reusing its `load`, `evaluate`, `send`, `record`, `desktop` helpers:
```js
  // 8. Home hero: three words visible after the intro, rule drawn
  await desktop();
  await load('/');
  const hero = await evaluate(`(() => {
    const words = [...document.querySelectorAll('[data-hero-word]')];
    const rule = document.querySelector('[data-hero-rule]');
    return { words: words.map(w => getComputedStyle(w).visibility + ':' + w.getBoundingClientRect().height.toFixed(0)), rule: rule && getComputedStyle(rule).transform };
  })()`);
  record('8. Home hero words visible and rule drawn',
    hero.words.length === 3 && hero.words.every((w) => w.startsWith('visible')) && (hero.rule === 'none' || hero.rule === 'matrix(1, 0, 0, 1, 0, 0)'),
    JSON.stringify(hero));

  // 9. Data egg: tap/Enter opens it, aria-expanded follows
  const egg = await evaluate(`(async () => {
    const t = document.querySelector('[data-egg-toggle]');
    if (!t) return { error: 'no toggle' };
    t.click(); await new Promise(r => setTimeout(r, 700));
    const panel = document.querySelector('.egg-panel');
    const openH = panel.getBoundingClientRect().height;
    const expanded = t.getAttribute('aria-expanded');
    t.click(); await new Promise(r => setTimeout(r, 700));
    // Focus stays on the button after the second click: the panel must still close.
    const closedH = panel.getBoundingClientRect().height;
    return { openH, closedH, expanded, after: t.getAttribute('aria-expanded'), clock: document.querySelector('[data-clock]').textContent };
  })()`);
  record('9. Data egg opens and closes by tap and shows the clock',
    egg.openH > 40 && egg.closedH < 2 && egg.expanded === 'true' && egg.after === 'false' && /^\\d{2}:\\d{2}$/.test(egg.clock), JSON.stringify(egg));

  // 10. Mobile menu: opens, focuses first link, Escape closes
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await load('/portfolio/');
  const menu = await evaluate(`(async () => {
    const t = document.querySelector('[data-menu-toggle]');
    t.click(); await new Promise(r => setTimeout(r, 300));
    const m = document.querySelector('[data-mobile-menu]');
    const open = !m.hidden, focused = document.activeElement?.textContent?.trim(), label = t.textContent.trim();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise(r => setTimeout(r, 100));
    return { open, focused, label, closed: m.hidden, expanded: t.getAttribute('aria-expanded'), back: document.activeElement === t };
  })()`);
  record('10. Mobile menu opens, focuses, Escape closes',
    menu.open && menu.focused === 'Work' && menu.label === 'Close' && menu.closed && menu.expanded === 'false' && menu.back, JSON.stringify(menu));
  await desktop();

  // 11. JavaScript disabled: egg and clocks hidden, not showing "--:--"
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await load('/');
  const noJs = await evaluate(`(() => [...document.querySelectorAll('[data-live]')].map(e => e.hidden))()`);
  await load('/contact/');
  const noJsContact = await evaluate(`(() => [...document.querySelectorAll('[data-live]')].map(e => e.hidden))()`);
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  record('11. No-JS: live elements hidden', [...noJs, ...noJsContact].every(Boolean) && noJs.length > 0, JSON.stringify({ noJs, noJsContact }));
```
Also update check 5's page list to `['/', '/portfolio/', '/artwork/motopirueta-1']` (unchanged) and check 1's text to expect `ÓLEO`.

Run it against `npm run preview`, three times. Expected: 12/12 (the existing 8 plus 4 new) each run. Any failure → `superpowers:systematic-debugging`, fix, re-run.

- [ ] **Step 3: Screenshots for sign-off**

For each page `/`, `/portfolio`, `/artwork/motopirueta-4`, `/artwork/johnny-efectivo`, `/about`, `/tattoo`, `/journal`, `/contact` capture desktop (1440×900, and a full-length 1440×3200 for home and portfolio) and phone (390×844) with headless Chrome into `05 AI/CLAUDE CODE/workspace/design-signoff/`. Build one side-by-side sheet per page with `sharp` (left: built page; right: the approved mockup check image named in that page's task).

- [ ] **Step 4: Sign-off with Guillermo**

Show Guillermo every sheet, page by page, and ask for an explicit approval per page (and his answer on `GRACIAS` for the thanks page). Record each result. Any requested change is fixed and re-shot before moving on. Nothing merges until every page is approved.

- [ ] **Step 5: Post-approval steps (each needs Guillermo's explicit OK at that moment)**

1. Commit the two `CLAUDE.md` rule updates that are sitting uncommitted on `main` — ask whether to commit them on `main` or bring them into this branch.
2. Merge `feat/gsap-motion` into `main` locally (`superpowers:finishing-a-development-branch`).
3. Push `main` → Netlify deploys the new design.
4. `npx sanity deploy` → Studio shows Series, About Page, Site Settings.
5. Live check on https://thriving-halva-34e095.netlify.app: every page, desktop + phone.
6. Open items stay open: weather provider/cost (then set `PUBLIC_LIVE_WEATHER=on` in Netlify), Netlify Forms billing safeguard, photographer credit, final About text.
