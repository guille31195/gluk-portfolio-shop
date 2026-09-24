# Visual Design Pass — Family A brand applied to every page

**Date:** 2026-09-23
**Status:** Design approved in brainstorming; spec awaiting review
**Branch:** builds on `feat/gsap-motion` (unmerged); design and motion merge to `main` together

## 1. Why

The scaffold, Sanity and GSAP plans produced a working site that looks generic: only the
brand's color and font tokens were wired in. None of the Family A identity from the brand
book (https://mangomartinez.com/gluk) — the wordmark, the rupture rule, the gradient fields,
"The Rupture" layout device — reached the pages. This spec applies that identity to every
page, re-fits the existing motion layer to it, and adds the content fields the new design
needs.

Success = every page, compared side by side with its approved mockup and the brand book,
reads as GLUK, and Guillermo signs off each page before merge.

## 2. Principles (non-negotiable)

1. **Two registers.** Text and graphic design are avant-garde and loud; imagery is presented
   with elegance and silence. Nothing animated or saturated competes with a painting.
2. **Restraint.** Few elements, extreme scale contrast, precise grid placement, generous
   negative space, one deliberate violent gesture per composition. No tags, stickers,
   "fig." captions, pull-quotes or decorative labels.
3. **No invented copy.** Words come only from the brand book or from Guillermo. Anything
   else is a visibly marked placeholder until he supplies it.
4. **Real assets only.** Real Family A logo files, real gradient fields, real studio photos,
   real data. Typed "GLUK" never stands in for the wordmark.

These rules are also recorded in the repo `CLAUDE.md`.

## 3. Brand system

### 3.1 Tokens (`src/styles/theme.css`)
- Colors: Blue `#0C89D5`, Deep blue `#011458`, Black `#1E1619`, Orange `#C34F05`,
  Bone `#F1EEE8` (text and wordmark color on dark).
- Type: Archivo (display; 800 weight, width 125% for giant words; 200–300 for numerals and
  large light statements; outline variant via text stroke) and Karla (body, labels, data;
  small caps-style labels with wide letter-spacing, tabular numerals).
- Base: dark. The page background is the grainy gradient field, not white.

### 3.2 Assets
- Logos: `docs/brand-kit/logo/` (Family A) copied to `public/brand/` — white wordmark for
  nav and footer, monogram for favicon.
- Gradient fields and rupture rule: brand-book images `gradient-1.jpg`, `gradient-2.jpg`,
  `gradient-3.jpg`, `rupture-rule.jpg` (currently in the vault at
  `05 AI/CLAUDE CODE/workspace/brand-book/`) added to `docs/brand-kit/fields/` and served
  optimized from `public/brand/`.
- Grain: inline SVG `feTurbulence` noise overlay (no image request).
- Studio photography: Google Drive shoot folder `1jymqeogfYmPDlj3R3rPv5ZKr3NcSbBVS`
  (74 TIFFs). Frames are referenced by their shoot number (`Gluk_Photoshoot-82.tif` = #82).
  Only frames actually used are exported, resized, and uploaded to Sanity.

## 4. Building blocks (components)

| Component | Purpose |
|---|---|
| `Field` | Full-bleed grainy gradient background; variants 1–3 (brand-book fields). |
| `Veil` | The dim branded field behind artwork: field blurred (~50px), saturation ~0.5, brightness ~0.5, dark wash ~40%, grain. Static — never animated. |
| `Halo` | Soft orange/blue radial glow placed *behind* a painting's canvas; applied only when the artwork's halo resolves to on (§6.2). |
| `RuptureRule` | The orange→black→blue rule; horizontal, vertical or angled; fixed thickness tokens. |
| `NumberedIndex` | The numbered-list device (arabic or roman numerals, active/dimmed states). Used by the home hero, series index, journal, mobile menu. |
| `DisplayWord` | Giant Archivo word, solid or outline. |
| `WallLabel` | Artwork page label column (series · position, title, rule, medium, original, prints, series index). |
| `DataEgg` | Live CCS/CDMX line that unfolds into a small data table (§8). |
| `Wordmark` / `Footer` / `Nav` / `MobileMenu` | Real logo files; footer and nav per §5. |

All sizes, spacings and thicknesses live in theme tokens; components never hard-code them.

## 5. Pages

Approved mockups live in the brainstorm companion folder
`.superpowers/brainstorm/4236-1790195626/content/` (git-ignored, local only). File names
are cited per page. Screenshots of the approved state are the visual source of truth for
the per-page comparison in §11.

### 5.1 Global: nav and footer
- **Desktop nav:** white Family A wordmark left; `Work · Tattoo · Journal · About · Contact`
  right, Karla uppercase with wide tracking; active page underlined.
- **Mobile nav:** wordmark + the word `Menu`. Open = full-screen gradient field with the
  pages as a large `NumberedIndex` (01 Work … 05 Contact), a rupture rule near the bottom,
  and the Instagram link. (`small-pages-v2.html`, "Mobile nav".)
- **Footer:** wordmark at ~18% of page width with the rupture rule running from it to the
  page edge; three link columns (Work: Oil painting, Mixed media, Tattoo, Prints · Studio:
  Mexico City, Commissions & originals: inquire · Follow: Instagram, Journal); bottom row
  `© GLUK <year>` left, `Guillermo Carrasquero` right. (`home-mix.html`, "Footer".)

### 5.2 Home (`home-families.html` F2 + `home-egg.html` state 2)
- **Hero:** on a gradient field, a vertical hairline with a margin footnote to its left —
  "Oil, ink and code, put in friction." (adapted from BIO.pdf, chosen 2026-09-24).
  To its right, the numbered material list, large and precise:
  `I ÓLEO / II TINTA / III CÓDIGO` (CÓDIGO in outline). A rupture rule cuts through
  TINTA. Words are his three media from BIO.pdf: oil painting, tattooing, technology.
- **Data egg:** bottom-right (§8).
- **Featured works:** on the veil, staggered two-column layout, restrained captions (title,
  medium, series), halo where applicable.
- No portrait of Guillermo on the home page.

### 5.3 Portfolio — "Rooms" (`portfolio.html` P1)
- Title `OBRA` (giant display word) with medium filters as counts computed from data
  (`13 All · 11 Oil painting · 02 Mixed media`), then a full-width rupture rule.
- One **room per series**, ordered by series order: a narrow label column (roman numeral,
  series name, `Series · NN works`) and the paintings in a bottom-aligned row like a gallery
  wall, each with its position number. Diptychs may say `Diptych`.
- **Standalone works** (no series) form a final room.
- All on the veil; halos per §6.2.
- Medium filter pages (`/portfolio/[medium]`) use the same rooms, filtered.

### 5.4 Artwork page — "Wall label" (`artwork.html` A1)
- Painting large on the left on the veil (halo if applicable); image at `DETAIL_WIDTH`.
- Right column `WallLabel`: `<numeral> · <Series> · NN / NN` (or `Standalone work`), title
  (display), short rupture rule, medium (+ year · dimensions when present in Sanity),
  hairline, `Original` block driven by the artwork's `originalStatus` (decided
  2026-09-24): `available` → `Inquire` button (→ Contact with "An original" preselected
  and the artwork named), `sold` → `Sold`, `notForSale` (default) → block hidden;
  `Prints` (from `printOptions`; a size flagged `soldOut` shows `Sold out` instead of
  its price; Stripe comes in a later plan),
  hairline, then the series as a `NumberedIndex` linking to its siblings (current active).
- Existing gallery (multiple images, thumbnails) and the portfolio→artwork morph remain.

### 5.5 About — close portrait (`about-v2.html` AB1)
- Left: full-height portrait (default shoot #82), cropped close.
- Right: mono label `Guillermo Carrasquero — GLUK`, large light statement, short rupture
  rule, body paragraphs, `Photography — <name>` credit.
- The default text is Guillermo's `BIO.pdf`, verbatim (decided 2026-09-24): its first
  sentence is the statement, the rest is the body (six paragraphs). The portrait stays
  pinned at screen height while the longer text scrolls beside it.

### 5.6 Tattoo (`small-pages-v2.html`, "Tattoo")
- Giant `TATUAJE`, statement beside it, rupture rule, staggered row of tattoo photos,
  numbered process list, one action `Request a session` (→ Contact, "A tattoo"
  preselected), `Studio · Ciudad de México`.
- Treated as a fine-art practice, never a "tattoo shop" (brand book). Empty fields render
  gracefully (sections hide when there is no content).

### 5.7 Journal (`small-pages-v2.html`, "Journal")
- Giant `DIARIO`; entries as a `NumberedIndex` table (Nº, date, title, `Read →`), newest
  first; hovering an entry reveals its cover. Entry page = single narrow reading column
  with the cover on the veil. Empty state when there are no posts.

### 5.8 Contact (`small-pages-v2.html`, "Contact")
- Giant `CONTACTO`, short rule, email `gluk.caribe@gmail.com`, `Studio · Ciudad de
  México`, live studio time (§8), Instagram `@gluk______` (six underscores).
- Form (§9): interest chips `An original · A print · A tattoo · A commission`, name,
  email, message, `Send`. Query parameters from Inquire / Request a session preselect the
  chip and prefill the artwork title.

## 6. Painting presentation

### 6.1 Veil
Every painting sits on the veil (§4). The veil is dim enough that no background hue
competes with the art, and it never animates.

### 6.2 Halo
Dark-edged paintings disappear on the veil, so they get a halo.

- **Automatic rule:** at build time, measure the mean relative luminance of the outer 8%
  border band of each artwork's first image (small thumbnail via the Sanity CDN, decoded
  with `sharp`). Border luminance `< 0.02` → halo on. (Measured 2026-09-23: Johnny
  Efectivo 0.006, Violenta II 0.007; next darkest 0.042 — a clean gap.)
- **Series rule:** a series shares one treatment; if any member needs the halo, all members
  get it ("the darkest member decides"). Current result: halo on for Johnny Efectivo and
  the Violenta series (I + II); off for all others.
- **Override:** Sanity field `halo: auto | always | never` (default `auto`) on artwork;
  a series-level override wins over members.
- Measurement failures default to halo off and log a build warning (never fail the build).

## 7. Content model changes (Sanity)

| Change | Details |
|---|---|
| New `series` document | `name` (string, required), `slug`, `order` (number), `kind` (optional: `series` / `diptych`), `halo` (`auto`/`always`/`never`, default `auto`). |
| `artwork` | Add `series` (reference → `series`, optional), `seriesPosition` (number), `halo` (`auto`/`always`/`never`, default `auto`). Replace the `availableAsOriginal` checkbox with `originalStatus` (`available`/`sold`/`notForSale`, default `notForSale`; the old checkbox is still read as a fallback). |
| `printOption` | Add `soldOut` (boolean, default false). |
| `homePage` | Remove `portrait` / `portraitAlt` from the design (the home seed stops uploading a portrait); add `heroList` (array of strings, default Óleo · Tinta · Código) and `heroFootnote` (string, default "Oil, ink and code, put in friction."). Keep `featuredWorks`. |
| New `aboutPage` singleton | `portrait` (image with hotspot), `portraitAlt`, `statement` (text), `body` (portable text), `photoCredit` (string). |
| `tattooInfo` | Add `statement` (text) and `process` (array of strings); keep `body`, `images`. |
| New `siteSettings` singleton | `email`, `instagramHandle`, `studioCity`; used by footer and Contact. |

**Initial content (write to the live `production` dataset — requires Guillermo's explicit
OK at run time):**
- Series: Motopirueta (1–4), Violenta (I–II, diptych), Contemplación Violenta (1–2),
  Pobrecita la vaquita (original + invertido). Standalone: Johnny Efectivo, Perdí el coco en
  un pueblo caribeño, Bájale 2 Gallito.
- `siteSettings`: gluk.caribe@gmail.com, `gluk______`, Ciudad de México.
- `aboutPage`: shoot #82 portrait, credit `@topomaseda` (links to his Instagram); text comes from the BIO.pdf defaults.
- Delivered as an idempotent script (same pattern as `scripts/seed-artworks.mjs`).

## 8. Live data

**Displayed:**
- **Home data egg.** Collapsed: faint `● CCS 17:34 / CDMX 15:34` bottom-right. On hover
  or tap it unfolds upward into a small table — rows Air, Humidity, Elevation, Sea; columns
  Caracas, CDMX — plus `3 595 km · 289.9° WNW`. Sea = Caribbean off La Guaira vs Pacific off
  Acapulco (deliberate contrast).
- **Contact:** `● Studio time HH:MM` (Mexico City).

**Sources:**
- Computed in the browser, free: local times (`Intl`, `America/Caracas`,
  `America/Mexico_City`), distance and heading (constants from coordinates: Caracas
  10.4806 N 66.9036 W; CDMX 19.4326 N 99.1332 W; 3 595 km, 289.9°), elevations (constants:
  882 m, 2 230 m).
- Weather and sea (air temperature, humidity, sea-surface temperature, swell): **gated
  decision.** Open-Meteo's terms (checked 2026-09-23) restrict the free API to
  non-commercial use, and a site selling prints is commercial. Before implementing this
  part, Guillermo chooses between: (a) an Open-Meteo commercial plan (price to be confirmed
  on their site), (b) another provider with a commercial licence, or (c) ship the egg with
  computed data only (times, distance, elevation) and add weather later.

**Behavior:** fetched client-side after the page is interactive, cached for 15 minutes;
never blocks rendering. On any failure the egg shows only the computed data. Reduced motion:
the unfold becomes a fade.

## 9. Contact form

Netlify Forms (no extra service): hidden honeypot field, submissions emailed to
gluk.caribe@gmail.com. Netlify's current pricing counts form submissions against a monthly
usage credit and upgrades plans automatically when limits are reached — before launch,
confirm the free allowance and set the account so it cannot start charging without
Guillermo's approval. Success and error states are styled in the same system.

## 10. Motion re-fit

The existing motion layer (`src/motion/*`: lifecycle, reveals, view transitions, cursor,
reduced-motion handling, the 2.5 s failsafe) stays. Changes:

| Where | Motion |
|---|---|
| Home hero | Replaces the portrait opening (`home-hero.ts`): numerals fade in, the three words rise from behind a mask in sequence, the rupture rule draws across TINTA, CÓDIGO's outline traces in. ~1.5 s once, then still. On scroll the list drifts slightly slower than the page. |
| Data egg | Unfold/fold on hover or tap. |
| Portfolio rooms | Label and paintings rise gently on entering the viewport (existing reveal system). Veil and halo static. |
| Portfolio → artwork | Existing view-transition morph, re-targeted to the room painting and the wall-label painting. |
| Mobile menu | Field fills the screen; index items step in. |
| Cursor | Kept (desktop, fine pointer only), restyled to bone with the `View` label over paintings. |
| Reduced motion | Fades only; no movement, drawing or parallax. |

Budget: home-page JS stays around the current ~52 KB gzipped.

## 11. Verification

- **Per page, visual:** screenshot the built page (desktop 1440 px and phone 390 px) next
  to its approved mockup and the relevant brand-book images; Guillermo signs off each page.
  Nothing merges without all sign-offs.
- **Automated:** `npm run check`, `npm test`, `npm run build`; the headless-Chrome checklist
  (`05 AI/CLAUDE CODE/workspace/gsap-motion-check.mjs`) extended for the new home hero,
  data egg, rooms and mobile menu; unit tests for pure logic (halo measurement and series
  rule, data-egg formatting and fallback, room grouping and ordering, filter counts).
- **Content safety:** schema changes are additive; existing documents keep working before
  the initial-content script runs.

## 12. Out of scope

- Stripe checkout for prints (separate plan).
- Tattoo photos, statement and process text (Guillermo adds via Sanity).
- Photographer credit name.
- Year, dimensions and print prices for artworks (fields exist; content later).

## 13. Open items

1. Weather/sea data provider and cost (§8) — decision needed before that part is built.
2. Netlify Forms allowance and billing safeguard (§9).
3. Photographer's name for the credit.
4. Confirm the exported size/crop of shoot #82 for About.
