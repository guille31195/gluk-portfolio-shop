# GSAP Motion Layer Design — Gluk Portfolio & Shop

Date: 2026-09-23
Status: Draft — awaiting Guillermo's review

## Purpose

Add the animation layer to the site: a recognisable, site-wide Gluk motion
language plus motion that helps the artwork read well. This is Plan 3 in the
Gluk Portfolio & Shop series, building on Plan 1 (Astro scaffold) and Plan 2
(Sanity CMS), both merged to `main`, with real content live on Netlify.

It also gives the home page real content for the first time — an artist
portrait and a curated set of featured works — because the current home page
(title + tagline only) has nothing for motion to work with.

## Intent

- **Brand personality first, work presentation second.** A consistent motion
  voice across every page, plus reveals and transitions that serve the
  paintings.
- **Balance, not competition.** The work is colorful and intense; the site's
  motion is its counterweight — calm, precise, elegant, generous whitespace.
  The artwork stays the loudest thing on screen.
- **Success:** someone browsing on a phone feels the site is premium and
  deliberate, and remembers the paintings — not the effects.

This supersedes the "immersive/experimental" scope in
`2026-09-16-site-scaffold-design.md` (pinning-heavy cinematic scroll is
dropped). Its per-page scoping and accessibility guardrails still apply.

## Content Changes (Sanity)

### New `homePage` singleton document

| Field | Type | Rules |
|-------|------|-------|
| `portrait` | image, `hotspot: true` | optional |
| `portraitAlt` | string | required when `portrait` is set |
| `featuredWorks` | array of references to `artwork`, ordered | 0–5 items; Studio warns if fewer than 3 |

- Registered in `sanity/schemaTypes/index.ts` and pinned in
  `sanity/structure` as a single fixed document (fixed `_id: "homePage"`),
  following how `tattooInfo` is presented — editors never see a "create new"
  list for it.
- An ordered reference list (not a per-artwork `featured` boolean) so the
  editor controls the sequence on the home page.
- The deployed Studio must be redeployed (`npx sanity deploy`) after the
  schema change — needs Guillermo's Sanity login.

### Seeding

New idempotent script `scripts/seed-home-page.mjs` (npm script
`seed:home`), same conventions as `seed-artworks.mjs` (reads
`SANITY_WRITE_TOKEN` from `.env`, skips work already done):

- Uploads `C:/Users/Guillermo/Desktop/cuadros HD/Gluk_Photoshoot-153.tif`
  (4240×2832, black-and-white, 36 MB) as the portrait, with alt text
  "Gluk, silhouetted between two studio lights".
- Sets `featuredWorks`, in this order, by slug: `motopirueta-1`,
  `johnny-efectivo`, `contemplacion-violenta-1`, `bajale-2-gallito`,
  `pobrecita-la-vaquita-que-bonita-la-cartera`. Guillermo approved any
  selection; the list can be reordered/swapped in Studio at any time.
- Running it writes to the live dataset — confirm with Guillermo before
  running.

### Data layer

`getHomePage()` in `src/lib/sanity.ts`, following the existing raw-type →
mapped-type pattern:

```ts
export interface HomePage {
  portrait: { url: string; alt: string } | null;
  featuredWorks: Artwork[];
}
```

- Missing document, missing portrait, or `null` featured array must map to
  `portrait: null` / `featuredWorks: []` (the GROQ-`null` bug fixed in Plan 2
  must not recur). Dangling references (deleted artwork) are filtered out.
- Rendering rule: an empty portrait or empty featured list simply omits that
  section. No placeholder or broken image is ever rendered.

## Motion System Architecture

Approach: **Astro's built-in View Transitions (`<ClientRouter />`) for
page-to-page transitions; GSAP (+ ScrollTrigger) for all in-page motion.**
Rejected: GSAP-driven custom routing/Barba.js (duplicates the platform,
fragile around history/scroll/focus); React islands with `@gsap/react`
(ships far more JS for otherwise static pages).

```
src/motion/
  tokens.ts       durations, signature ease, reveal distance — the "Gluk feel"
  lifecycle.ts    page-load init + pre-swap cleanup, per-page module registry
  reveal.ts       generic [data-reveal] scroll reveals
  home-hero.ts    home opening + hero scroll sequence (home page only)
  cursor.ts       custom cursor (fine-pointer devices only)
```

### Tokens

A single source for motion values used by every animation:
durations ~`0.6s` / `0.9s` / `1.4s`, one signature ease (slow, confident
ease-out, e.g. `power3.out` or `expo.out` — final pick tuned in browser),
default reveal = 24px upward drift + fade. Tuning the whole site's feel
means editing this one file.

### Lifecycle

- `lifecycle.ts` listens for `astro:page-load` (fires on first load and after
  every client-side navigation) and runs the shared `reveal` setup plus any
  page module registered for the current page.
- All of a page's tweens and ScrollTriggers are created inside one
  `gsap.context()`; on `astro:before-swap` that context is `revert()`ed, which
  kills every animation/trigger and restores every element's original inline
  styles. Nothing leaks across navigations.
- Page-specific modules (e.g. `home-hero.ts`) are imported only by their page
  and register themselves with the lifecycle, so other pages never download
  them and a fault in one page's motion cannot break another.

### Reveal by attribute

Any element with `data-reveal` gets the standard reveal. Optional
`data-reveal-stagger` on a container staggers its `[data-reveal]` children.
Adding motion to new content is mostly adding attributes.

### Cursor

- Mounted once in `BaseLayout` with `transition:persist` so it survives
  navigations without flicker.
- Loaded and activated only when `(hover: hover) and (pointer: fine)` matches;
  touch devices never download it.

### Page transitions

- `<ClientRouter />` in `BaseLayout`; default transition is a ~0.3s soft
  crossfade.
- `ArtworkCard`'s image and the artwork detail page's first gallery image
  share `transition:name={`artwork-${slug}`}`, producing the grid → detail
  morph.
- Browsers without View Transitions support get Astro's built-in fallback
  (plain fade/swap).

## What Moves Where

### Everywhere
- Page `h1` rises + fades in once on load (signature ease).
- Nav links: thin underline draws in from the left on hover — pure CSS.
- Page change: ~0.3s crossfade.

### Home
1. **Opening (on load):** full-viewport portrait, starts at ~1.08× scale and
   settles to 1.0× over ~1.4s; "GLUK" fades up in the dark center; tagline
   follows ~0.3s later. Nav overlays the photo in white. On narrow screens the
   landscape photo is cropped to portrait around the Sanity hotspot (set on
   the silhouette).
2. **Hero scroll (scrubbed ScrollTrigger):** as the hero scrolls away the
   photo scales up slightly and fades toward the page background; the title
   drifts up faster than the photo (parallax). Fully reversible. Nav returns
   to its normal dark colors once past the hero.
3. **Featured works:** generous spacing, alternating left/right on desktop,
   single column on mobile. Each image frame opens with a slow vertical
   clip-path "curtain", then its title fades in.
4. **"View all work"** link to `/portfolio`, standard reveal.

### Portfolio (`/portfolio`, `/portfolio/[medium]`)
- Cards reveal with a stagger as they enter the viewport.
- Hover: image scales ~1.03× inside its frame, title underline draws in,
  cursor becomes the "View" ring.
- Click: morph into the detail page.

### Artwork detail (`/artwork/[slug]`)
- Main image arrives via the morph; text fades up in sequence after it
  (title → year/dimensions → description → prints).
- Existing CSS radio-button gallery keeps working; the instant image swap
  becomes a soft CSS opacity crossfade.

### About, Tattoo, Journal (index + post), Contact
- Heading motion only, plus `data-reveal` on content blocks and images.
  Deliberately calm.

### Never animated
- The paintings themselves: never tinted, distorted, or scaled beyond the
  ~1.03× hover.
- Prices, buttons, and form fields — anything actionable stays still.

## Accessibility & Robustness

- **No-JS safe:** elements are put into their pre-animation (hidden) state
  only by JavaScript immediately before animating. With scripts blocked or
  failing, every page shows all content, unanimated. Context `revert()`
  guarantees no element is left hidden after navigating away/back.
- **Reduced motion:** handled centrally with `gsap.matchMedia()` on
  `(prefers-reduced-motion: reduce)`: opacity-only fades, no translation,
  scale, parallax, or scrubbed effects; the morph becomes a plain crossfade
  (Astro respects the media query for view transitions); the custom cursor is
  not activated.
- **Focus & history:** Astro's router handles focus and scroll restoration;
  back/forward must restore scroll position and never leave content hidden.

## Performance

- Animate only `transform`, `opacity`, and (for the curtain) `clip-path`.
- Portrait served via the Sanity image URL builder with responsive `srcset`
  widths and `fetchpriority="high"` / eager loading (it is the LCP element).
  The 36 MB TIFF never reaches visitors.
- ScrollTrigger is imported only by modules that use it; cursor code only on
  fine-pointer devices.
- Check the home page's JS bundle size in the build output and keep GSAP out
  of pages' critical path beyond what they use.

## Testing

**Unit (vitest, pure logic — no DOM library added):**
- `lifecycle`: init/cleanup ordering against a simulated
  page-load → before-swap → page-load event sequence; page modules run only on
  their page; cleanup runs exactly once per page.
- Reduced-motion and fine-pointer decision helpers.
- `getHomePage()` mapping: full document, missing document, missing portrait,
  `null` featured array, dangling reference.

**Existing gates:** `npm run check`, `npm test`, `npm run build` all green.

**Manual browser checklist (run in Chrome, results reported):**
- Home opening and hero scroll, including scrolling back up.
- Grid → detail morph, plus browser back/forward.
- Mobile-width layout (hero crop, single-column featured works).
- Reduced-motion emulation.
- JavaScript disabled: all content visible.
- Scroll position after navigation.
- Final check on the live Netlify URL after merge.

## Out of Scope

- Smooth-scroll libraries (Lenis, ScrollSmoother) — native scroll kept.
- WebGL / Three.js.
- Stripe checkout (Plan 4).
- Redesigning page layouts beyond what this motion work requires (home page
  hero + featured section is the only new layout).
