# Site Scaffold Design — Gluk Portfolio & Shop

Date: 2026-09-16
Status: Approved for planning

## Purpose

Scaffold the Gluk portfolio + e-commerce site: a brand-coherent, image-heavy,
editorial site showing original work (oil painting, tattoo art, sculpture,
mixed media) with a direct print-purchase flow, immersive scroll-driven
animation, and a CMS-managed content catalog.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | [Astro](https://astro.build) | Static by default (fast, image-heavy pages), opt-in "islands" give us interactivity exactly where wanted without shipping JS everywhere. |
| Interactive islands | `@astrojs/react` | Used for stateful/interactive components: medium filters, print size selector, checkout trigger. |
| Animation | GSAP + ScrollTrigger | Framework-agnostic, handles scroll-driven reveals, pinning, parallax, and custom cursor — the standard tool for this kind of immersive editorial site. Runs equally well inside a React island or a plain `<script>`. |
| CMS | [Sanity](https://sanity.io) | Structured content, strong image CDN/transforms (important for an art catalog), solid Astro integration, generous free tier. |
| Hosting | Netlify | Native Astro support, simple serverless functions for the Stripe Checkout endpoint, built-in form handling (used for `/contact`). |
| Payments | Stripe Checkout (hosted) | Stripe hosts the actual payment page; we only create a Checkout Session server-side. Minimal PCI scope, no custom payment form to build/maintain. Currency: USD (assumed default — revisit if international print sales become a priority). |

## Sales Flow

- **Originals** (one-of-a-kind pieces): shown with an "Inquire" button that
  opens the contact flow. No price/checkout — negotiation and logistics
  happen off-platform.
- **Prints** (reproductions): shown with a size/price selector on the same
  artwork page. Selecting a size and clicking "Buy" hits
  `/api/create-checkout-session`, which creates a Stripe Checkout Session for
  that size's Price ID and redirects to Stripe's hosted checkout.
- There is no separate "Shop" catalog — the portfolio page **is** the
  browsing surface for both originals and prints. A piece can offer either,
  both, or neither (e.g., a sold original with no print available).

## Content Model (Sanity schemas)

### `artwork` document
| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `slug` | slug | Drives `/artwork/[slug]` |
| `medium` | string (enum) | `oil-painting` \| `tattoo` \| `sculpture` \| `mixed-media` — drives `/portfolio/[medium]` filtering |
| `images` | array of image | Uploaded to Sanity, served via its CDN with on-the-fly transforms |
| `description` | text | |
| `year` | number | |
| `dimensions` | string | Free text (e.g. `"60 x 90 cm, oil on canvas"`) |
| `availableAsOriginal` | boolean | If true, renders the "Inquire" button |
| `printOptions` | array of object `{ size: string, price: number, stripePriceId: string }` | If non-empty, renders the print size/price selector + Buy button. Empty array = no print available for this piece. |

### `journalPost` document
| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `slug` | slug | Drives `/journal/[slug]` |
| `date` | datetime | |
| `coverImage` | image | |
| `body` | portable text | |

### `tattooInfo` singleton document
Free-form content (portable text + images) for the `/tattoo` studio/booking
info page. Singleton — one document, no slug/list.

## Image Pipeline

The existing `data/raw/` → `data/working/` → `data/processed/` pipeline
(gitignored except `processed/`) stays as the **pre-upload staging area**:
raw photos are processed/resized locally with the existing scripts, and the
final files in `data/processed/` are what get uploaded into Sanity as
`artwork.images`. Sanity's CDN — not the repo — is the final serving source
for artwork images on the live site.

## Routes

| Route | Purpose |
|---|---|
| `/` | Home — hero, brand statement, featured pieces |
| `/portfolio` | Grid of all artwork |
| `/portfolio/[medium]` | Filtered by medium (`oil-painting`, `tattoo`, `sculpture`, `mixed-media`) |
| `/artwork/[slug]` | Single piece: images, details, Inquire and/or print purchase |
| `/about` | Bio, brand statement, press (public name "GLUK" per brand kit) |
| `/tattoo` | Studio info, booking process, flash — kept separate from gallery sales |
| `/journal` | Blog listing |
| `/journal/[slug]` | Blog post |
| `/contact` | General inquiry form (Netlify Forms) — also the destination for "Inquire" clicks |
| `/api/create-checkout-session` | Netlify function: takes a `stripePriceId`, returns a Stripe Checkout Session URL |

## Animation & Interactivity

- Scope: immersive/experimental — scroll-driven reveals and pinning,
  parallax, custom cursor. WebGL/canvas touches (e.g. via Three.js) are
  **not** built now — added later as a scoped addition to a specific page if
  a piece calls for it, not a global dependency today (YAGNI).
- GSAP timelines are scoped per-page, not one global script, so pages stay
  independently understandable and animation on one page can't break
  another.
- Accessibility/performance guardrails:
  - Respect `prefers-reduced-motion`: fall back to simple fades or no motion.
  - Animation code for below-the-fold / heavy sequences loads lazily so it
    doesn't block initial render on an image-heavy site.

## Repo Structure Changes

Existing folders (`docs/`, `data/`, `scripts/`, `reports/`) are kept as-is.
Adding:
```
src/            — Astro pages, layouts, components (incl. React islands)
sanity/         — Sanity schema definitions + studio config
netlify/functions/ — create-checkout-session.ts
```
Brand tokens (color palette, Archivo/Karla) are wired into a shared
theme/CSS file from the first commit, sourced from `docs/brand-kit/`.

## Testing

No test framework at this stage — the site is mostly static content and
presentation. Revisit once `create-checkout-session` (or any other function)
has enough branching logic to justify unit tests.

## Out of Scope (for this spec)

- Choosing/uploading actual launch artwork photos (separate next action —
  canonical photo source not yet decided).
- Stripe account setup and product/price creation (separate next action).
- Specific visual design (layout, exact motion choices per page) — decided
  page-by-page during implementation, within the guardrails above.
