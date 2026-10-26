# Limited Edition Print Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collectors buy numbered limited edition prints (2 formats, 50 each, per piece) on glukart.com with DHL Express shipping paid at checkout, land on a private order page, and Guillermo is notified, ships from Mexico and prints a numbered certificate.

**Architecture:** The Astro site stays static. Checkout, stock, webhook, order and certificate run as Netlify Functions (v2, `export default (req: Request)` with `config.path`) under `/api/*`. Stripe hosted Checkout takes payment. Edition counters, reservations and orders live in a **separate private Sanity dataset `orders`** (customer addresses must not be publicly readable), with its own Studio workspace so Guillermo marks orders shipped there. All edition logic is pure and unit-tested against an in-memory store; Sanity and Stripe are thin adapters.

**Tech Stack:** Astro 7, TypeScript, vitest, Sanity (`@sanity/client`), Stripe (`stripe`), Resend (`resend`), `pdf-lib` + `@pdf-lib/fontkit`, Netlify Functions.

**Spec:** `docs/superpowers/specs/2026-10-26-print-checkout-design.md` (read it first; "Calls made after the builder check" are decisions).

## Global Constraints

- English for code, comments, names. Forward slashes in paths. Git Bash commands.
- Work on branch `feat/print-checkout` in `~/dev/gluk-portfolio-shop`. **Do not push before Task 12.** Each push to `main` costs a Netlify deploy (15 credits); a sale must never trigger a rebuild.
- Visible wording is gallery language: "Collect", "collector", "Inquire". Never "Shop", "Buy now", "Cart". No invented slogans; certificate/email wording beyond facts is placeholder until Guillermo picks from options.
- Edition: 50 per format per piece, formats `large` and `small`. Currency USD. Card payments only. One print per order.
- Sizes: Large = original if it fits 100 × 100 cm, else scaled so the longest side is 100 cm; Small = half of each side of Large. Exact proportions; only the long side is rounded (Large whole cm, Small nearest 0.5 cm); short side to 0.1 cm.
- Shipping, DHL Express, USD flat: Mexico 20, US & Canada 50, Latin America 60, Europe & UK 60, Rest of world 80. Editable in one config file.
- Reservation held 30 minutes (Stripe's minimum session expiry). Edition number assigned at payment confirmation. Duties and taxes are paid by the collector on arrival, and checkout says so.
- Stripe test mode until Guillermo approves live. Secrets only in `.env` (gitignored) and Netlify env vars; never committed.
- Live Sanity writes (dataset creation, Studio deploy) need Guillermo's OK first. Open every visual result for him directly (rendered HTML in the browser), never hand over paths.
- Brand: every UI task names the brand-book elements it uses (rupture rule, Archivo/Karla, bone on black `src/styles/theme.css` tokens, wordmark in `public/brand/`) and is checked by a side-by-side screenshot against the existing site.

## Review Focus

1. Two buyers race for the last edition: exactly one succeeds (Task 3 test, Task 7 test).
2. Stripe retries `checkout.session.completed`: one order, one edition number, one set of emails (Task 3, Task 8).
3. Collector opens the success page before the webhook has run, or opens a wrong/unknown token: "confirming" state then the order; unknown token shows a generic not-found that leaks nothing (Task 9).
4. Artwork with unparseable `dimensions`, or no price set: no buy block, the "Prints · Inquire" fallback shows, build does not crash (Task 4).
5. Payment lands after the reservation expired and the edition is full: automatic refund, Guillermo emailed, no order number issued (Task 8).
6. Country outside the chosen region, or an excluded country, is rejected at checkout (Task 2, Task 7).

## Needs Guillermo (ask in ONE batch at the start, do not block Tasks 1–5)

- **Stripe account** (free signup; test mode needs no business verification). He gives the **test secret key**; later the webhook signing secret. Click-by-click steps required.
- **Sanity:** OK to create private dataset `orders` and deploy Studio; a Sanity **Editor API token** for `orders`. If private datasets are not on his Sanity plan, STOP and tell him (it may cost money) instead of storing addresses in a public dataset.
- **Resend** account + glukart.com SPF/DKIM records at Porkbun (start early, DNS takes time).
- Prices per piece and size, in Studio, whenever ready (not blocking).
- Real DHL quote for a 100 cm tube to confirm the shipping table.
- Review of the excluded-country list (default `CU, IR, KP, SY, RU, BY`).
- Visual sign-off (Task 5) and certificate wording choice.

## File Structure

- `src/lib/prints/print-sizes.ts` (+test): parse dimensions, derive Large/Small.
- `src/lib/prints/shipping.ts` (+test): regions, rates, country mapping.
- `src/lib/prints/edition.ts` (+test): ledger logic, `EditionStore` interface, in-memory fake in `edition.fake.ts`.
- `src/lib/prints/offer.ts` (+test): per-artwork print offer for pages.
- `src/lib/prints/order.ts` (+test): order shape, token, masking, signed certificate key.
- `netlify/lib/`: `clients.ts`, `sanity-store.ts`, `email.ts`, `certificate-pdf.ts` (I/O adapters).
- `netlify/functions/`: `stock.ts`, `checkout.ts`, `stripe-webhook.ts`, `order.ts`, `certificate.ts`.
- `src/pages/collector.astro` + `src/scripts/collector.ts`: order page. `src/components/PrintBlock.astro` + `src/scripts/print-block.ts`: buying UI.
- `sanity/schemaTypes/artwork.ts` (modify), `order.ts`, `printEdition.ts` (new), `printOption.ts` (delete), `sanity.config.ts` (second workspace).
- `netlify.toml` (functions dir, `/collector` noindex), `scripts/check-prints.mjs`.

---

### Task 1: Print size derivation

**Files:** Create `src/lib/prints/print-sizes.ts`, `src/lib/prints/print-sizes.test.ts`.

**Interfaces:**
- Produces: `parseDimensions(text: string | null): { widthCm: number; heightCm: number } | null`; `type Format = 'large' | 'small'`; `type PrintSize = { widthCm: number; heightCm: number }`; `printSizes(widthCm: number, heightCm: number): Record<Format, PrintSize>`; `sizeLabel(size: PrintSize): string` (e.g. `"100 × 38.3 cm"`, `.0` dropped).

- [ ] **Step 1: Write failing tests** with these cases: `parseDimensions('120 × 150 cm')` → `{120,150}`; also accepts `x`, `X`, comma decimals `"70,5 × 90 cm"`; returns `null` for `null`, `''`, `'variable'`. `printSizes(70,70)` → large 70×70, small 35×35; `(235,90)` → large 100×38.3, small 50×19.1; `(120,150)` → large 80×100, small 40×50; `(105,60)` → large 100×57.1; `(100,100)` → large 100×100; `(50,60)` → small 25×30. Property test: for every size in the existing seed list (100×100, 105×60, 120×150, 140×90, 235×90, 50×60, 70×70, 70×90) the short/long ratio of each output equals the input ratio within 0.1 cm of rounding error, and large long side ≤ 100.
- [ ] **Step 2:** Run `npx vitest run src/lib/prints/print-sizes.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement. Large: `scale = min(1, 100 / max(w,h))`; long side `round(max*scale)` (whole cm), short = `long * min/max` rounded to 0.1. Small: long = `round(largeLong / 2 * 2) / 2` (nearest 0.5), short = `small long * min/max` to 0.1. Orientation preserved (portrait stays portrait).
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** `git add src/lib/prints && git commit -m "feat(prints): derive Large/Small print sizes"`.

### Task 2: Shipping regions

**Files:** Create `src/lib/prints/shipping.ts`, `shipping.test.ts`.

**Interfaces:**
- Produces: `type RegionId = 'MX' | 'US_CA' | 'LATAM' | 'EU_UK' | 'ROW'`; `SHIPPING_RATES_USD: Record<RegionId, number>` = `{MX:20, US_CA:50, LATAM:60, EU_UK:60, ROW:80}`; `EXCLUDED_COUNTRIES: readonly string[]` = `['CU','IR','KP','SY','RU','BY']`; `regionForCountry(iso2: string): RegionId | null` (null if excluded/unknown); `countriesInRegion(region: RegionId): string[]` (ISO-2, sorted, ROW = every Stripe-supported country not in another region and not excluded); `shippingCents(region: RegionId): number`.

- [ ] **Step 1: Failing tests:** `regionForCountry('MX')==='MX'`, `'US'` and `'CA'` → `US_CA`, `'VE'` and `'BR'` → `LATAM`, `'ES'`, `'GB'`, `'DE'` → `EU_UK`, `'JP'`, `'AU'` → `ROW`, `'CU'`, `'XX'` → `null`; `shippingCents('US_CA') === 5000`; no country appears in two regions; `countriesInRegion('ROW')` contains none of `EXCLUDED_COUNTRIES`; every country returned by any region round-trips through `regionForCountry`.
- [ ] **Step 2:** Run test, expect FAIL.
- [ ] **Step 3:** Implement with explicit ISO lists for MX, US_CA, LATAM (Central/South America + Caribbean), EU_UK (EU-27 + GB, NO, CH, IS, plus other European countries DHL serves); ROW built from a Stripe-supported-country constant minus the others. Comment that rates need a real DHL quote check.
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5:** Commit `feat(prints): shipping regions and rates`.

### Task 3: Edition ledger

**Files:** Create `src/lib/prints/edition.ts`, `edition.fake.ts`, `edition.test.ts`.

**Interfaces:**
- Produces: `EDITION_SIZE = 50`, `RESERVATION_MINUTES = 30`; `type Reservation = { reservationId: string; expiresAt: string }`; `type EditionCounter = { id: string; rev: string; sold: number; reservations: Reservation[] }`; `counterId(slug: string, format: Format): string` (`"edition-<slug>-<format>"`); `remaining(c: EditionCounter, now: Date): number` (`50 − sold − unexpired reservations`, never < 0); `interface EditionStore { load(id: string): Promise<EditionCounter>; save(next: EditionCounter, ifRev: string, create?: { _id: string; [k: string]: unknown }): Promise<'ok' | 'conflict' | 'exists'> }`; `reserveEdition(store, id, reservationId, now): Promise<'reserved' | 'sold-out'>`; `releaseReservation(store, id, reservationId): Promise<void>`; `finalizeEdition(store, id, reservationId, now, order: (editionNumber: number) => { _id: string; [k: string]: unknown }): Promise<{ status: 'issued'; editionNumber: number } | { status: 'already-processed' } | { status: 'sold-out' }>`. All retry up to 8 times on `'conflict'` with a fresh `load`. `createFakeStore(initial?)` in `edition.fake.ts` enforces revision checks and `_id` uniqueness like Sanity.
- Consumed by: Tasks 6, 7, 8.

- [ ] **Step 1: Failing tests:** `remaining` ignores expired reservations; `reserveEdition` returns `'sold-out'` when `sold + live reservations ≥ 50`; **race:** 60 concurrent `reserveEdition` calls on a fresh fake store yield exactly 50 `'reserved'` and 10 `'sold-out'`; an expired reservation frees capacity; `finalizeEdition` issues numbers 1, 2, 3 in order and removes the reservation; calling `finalizeEdition` twice for the same order `_id` returns `'already-processed'` and `sold` rises once; finalize when `sold === 50` returns `'sold-out'` and creates no order; finalize works for a reservation that already expired as long as `sold < 50` (late payment, spec call), and a number is never reused after a release.
- [ ] **Step 2:** Run `npx vitest run src/lib/prints/edition.test.ts`, expect FAIL.
- [ ] **Step 3:** Implement as pure transforms plus the retry loop. Finalize writes counter (`sold+1`, reservation removed) and `create` order in one `save`; `'exists'` maps to `'already-processed'`.
- [ ] **Step 4:** Run, expect PASS (race test included).
- [ ] **Step 5:** Commit `feat(prints): edition ledger with reservations`.

### Task 4: Prices in Sanity and the offer derivation

**Files:** Modify `sanity/schemaTypes/artwork.ts:114-119`, `sanity/schemaTypes/index.ts`, `src/lib/artwork-map.ts` (`PrintOption`, `RawPrintOption`, query line 113, mapping line 154), `src/components/WallLabel.astro:43-62`, `src/pages/collect.astro:13-54`, `src/lib/collect.ts:7`, tests `artwork-map.test.ts`, `collect.test.ts`, `rooms.test.ts`. Delete `sanity/schemaTypes/printOption.ts`. Create `src/lib/prints/offer.ts`, `offer.test.ts`, `scripts/check-prints.mjs`; add `"check:prints"` to `package.json`.

**Interfaces:**
- Consumes: `parseDimensions`, `printSizes`, `sizeLabel` (Task 1).
- Produces: artwork fields `printPriceLarge`, `printPriceSmall` (number, whole USD, optional, min 1). `type PrintOffer = { format: Format; size: PrintSize; sizeLabel: string; priceCents: number }`. `printOffers(artwork: Pick<Artwork,'dimensions'> & { printPriceLarge: number | null; printPriceSmall: number | null }): PrintOffer[]` — a format is offered only when its price is set and `dimensions` parses; otherwise omitted. `Artwork.printOffers: PrintOffer[]` replaces `Artwork.printOptions`. `collectable()` keeps pieces with ≥1 offer.

- [ ] **Step 1: Failing tests** in `offer.test.ts`: 120 × 150 with both prices → two offers labelled `80 × 100 cm` and `40 × 50 cm`, cents = dollars × 100; only large priced → one offer; dimensions `'variable'` → `[]`; no prices → `[]`. Update existing tests to the new field names.
- [ ] **Step 2:** `npx vitest run`, expect FAIL.
- [ ] **Step 3:** Implement schema fields, mapping, `printOffers`. WallLabel and `/collect` keep the current "Prints · Inquire" button whenever `printOffers.length === 0`; the buy block is added in Task 11, so here only rename data so everything compiles. `scripts/check-prints.mjs` fetches artworks and prints, per piece, parsed dimensions, both sizes, and flags unparseable dimensions or an image whose aspect ratio differs from the stated dimensions by >2%; exits non-zero on problems. The site build itself never fails on this.
- [ ] **Step 4:** `npx vitest run && npx astro check`. Expected: all PASS, 0 errors. Then `npm run check:prints` and report the table of real pieces to Guillermo.
- [ ] **Step 5:** Commit `feat(prints): per-piece print prices and derived offers`.

### Task 5: Mockups and sign-off (GATE)

**Files:** Create throwaway HTML mockups in the scratchpad (not the repo): print block on an artwork page, `/collector` order page (paid and shipped states), certificate, owner notification email.

- [ ] **Step 1:** Build static HTML mockups using `src/styles/theme.css` tokens, Archivo/Karla, rupture rule and the wordmark from `public/brand/`. Use real pieces and the real derived sizes from Task 4; mark any price as "price set in Studio" placeholder (no invented prices). Provide 3 certificate wording options built only from facts (title, year, medium, size, edition n / 50, date, collector, glukart.com) and a signature line.
- [ ] **Step 2:** Open each in the browser for Guillermo directly. Take side-by-side screenshots against the live artwork page for the brand check.
- [ ] **Step 3:** Get sign-off on layout and one certificate wording. Record the choices in the spec's "Calls" section. **Do not start Tasks 9–11 UI before this passes.**

### Task 6: Sanity orders dataset, stores and clients

**Files:** Create `sanity/schemaTypes/order.ts`, `sanity/schemaTypes/printEdition.ts`, `netlify/lib/clients.ts`, `netlify/lib/sanity-store.ts`, `netlify/lib/sanity-store.test.ts`, `src/lib/prints/order.ts`, `order.test.ts`. Modify `sanity.config.ts` (workspaces `production` and `orders`), `package.json` (add deps `stripe`, `resend`, `pdf-lib`, `@pdf-lib/fontkit`, `@netlify/functions`; move `@sanity/client` to dependencies), `netlify.toml` (`[functions] directory = "netlify/functions"`; `/collector` noindex header), `.env.example` entries.

**Interfaces:**
- Produces in `order.ts`: `type OrderStatus = 'paid' | 'shipped' | 'void'`; `type Order = { _id: string; _type: 'order'; token: string; status: OrderStatus; artworkSlug: string; artworkTitle: string; year: number | null; medium: string; format: Format; widthCm: number; heightCm: number; editionNumber: number; editionSize: 50; priceCents: number; shippingCents: number; region: RegionId; stripeSessionId: string; customer: { name: string; email: string; phone: string | null; address: { line1: string; line2: string | null; city: string; state: string | null; postalCode: string; country: string } }; createdAt: string; shippedAt: string | null; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null }`; `orderId(sessionId: string): string` (`"order-"+sessionId`); `newToken(): string` (32 random bytes, base64url); `toCollectorView(o: Order): CollectorView` (no street, no postal code, no phone, no email; city + country only); `signKey(id: string, secret: string): string` and `verifyKey(id, key, secret): boolean` (HMAC-SHA256, constant-time compare).
- `clients.ts`: `readClient()` (production dataset, no token), `ordersClient()` (dataset `orders`, `SANITY_ORDERS_TOKEN`), `stripe()`, `resend()`; each throws a clear error naming the missing env var.
- `sanity-store.ts`: `createSanityEditionStore(client): EditionStore`; `save` uses `client.transaction().patch(id,{ifRevisionID}).create(order).commit()` and maps revision-mismatch to `'conflict'` and duplicate-id to `'exists'`; `load` creates the counter doc (`sold: 0, reservations: []`) if missing.

- [ ] **Step 1: Failing tests:** `toCollectorView` contains no field with the street or postal code or email (assert on `JSON.stringify` not containing them); `signKey`/`verifyKey` accept the right key and reject a tampered id or key; `newToken()` has ≥ 43 chars and 1000 calls are unique; `createSanityEditionStore` against a stubbed client maps a 409 revision error to `'conflict'`.
- [ ] **Step 2:** Run the new tests, expect FAIL.
- [ ] **Step 3:** Implement. Studio `orders` workspace shows `order` documents (title "Order — <artworkTitle> <editionNumber>/50", list sorted by `createdAt` desc, `status`, tracking fields editable; customer and edition fields read-only) and read-only `printEdition`.
- [ ] **Step 4:** Run `npx vitest run && npx astro check`. Expected PASS. **With Guillermo's OK:** `npx sanity dataset create orders --visibility private`, then verify privacy: an unauthenticated GROQ query against `orders` returns 401/403. If that fails, stop and report. With his OK, `npx sanity deploy`.
- [ ] **Step 5:** Commit `feat(prints): orders dataset schema, stores and clients`.

### Task 7: Stock and checkout functions

**Files:** Create `netlify/functions/stock.ts`, `netlify/functions/checkout.ts`, `netlify/functions/checkout.test.ts`.

**Interfaces:**
- Consumes: `readClient`, `ordersClient`, `stripe`, `createSanityEditionStore`, `reserveEdition`, `releaseReservation`, `remaining`, `printOffers`, `regionForCountry`, `countriesInRegion`, `shippingCents`, `newToken`.
- Produces: `GET /api/stock?slug=<slug>` → `{ large: number | null; small: number | null }` (remaining, `null` for a format with no offer), `Cache-Control: no-store`. `POST /api/checkout` body `{ slug: string; format: Format; country: string }` → `{ url: string }` or `{ error: 'sold-out' | 'unavailable' | 'country' }` with 409/400. `checkout.ts` exports `handleCheckout(input, deps)` where `deps` injects the artwork reader, store, Stripe and clock so it is testable.
- Behaviour: price and dimensions are read from Sanity at call time, never from the request. Order: validate country → region (reject excluded) → find offer (else `unavailable`) → `reserveEdition` (else `sold-out`) → create Stripe Checkout Session: `mode: 'payment'`, `payment_method_types: ['card']`, one `price_data` line (USD, name `"<title> — limited edition print <size label>"`), `shipping_address_collection.allowed_countries = countriesInRegion(region)`, one fixed-amount shipping option named `"DHL Express — <region name>"`, `phone_number_collection.enabled`, `expires_at = now + 30 min`, `metadata { slug, format, reservationId, token, region }`, `success_url = <SITE_URL>/collector?o=<token>`, `cancel_url` = artwork page, custom text stating import duties and taxes are paid by the collector on arrival. If Stripe throws, `releaseReservation` then rethrow.

- [ ] **Step 1: Failing tests** on `handleCheckout` with fakes: valid request creates one session with the right amounts (price cents + shipping cents shown separately), allowed countries limited to the region, `expires_at` 30 min ahead, metadata present; price in the request body is ignored; excluded country (`CU`) → `country` error and no reservation; piece without price → `unavailable`; 50 prior reservations → `sold-out`; Stripe failure releases the reservation (remaining restored); 60 parallel calls for one format create exactly 50 sessions.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement both functions (`export const config = { path: '/api/stock' }` etc.).
- [ ] **Step 4:** Run `npx vitest run`, expect PASS.
- [ ] **Step 5:** Commit `feat(prints): stock and checkout functions`.

### Task 8: Stripe webhook

**Files:** Create `netlify/functions/stripe-webhook.ts`, `stripe-webhook.test.ts`, `netlify/lib/email.ts`, `email.test.ts`.

**Interfaces:**
- Consumes: Task 3 `finalizeEdition`, Task 6 `Order`, `orderId`, `signKey`.
- Produces: `POST /api/stripe-webhook` (verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET` using the raw body; 400 on bad signature). Handles `checkout.session.completed` only (and `checkout.session.expired`, which calls `releaseReservation`). `handleCompleted(session, deps)`: build the order from session + metadata, call `finalizeEdition`; `issued` → send owner email and collector email; `already-processed` → return 200 with no emails; `sold-out` → `stripe.refunds.create` for the payment intent, email Guillermo (subject states "refunded automatically") and the collector an apology, create no order. Emails in `email.ts`: `ownerNotification(order, certificateUrl): { subject; html; text }` (name, address, email, phone, piece, size, `n / 50`, region, amounts, links to the order and the signed certificate URL `<SITE_URL>/api/certificate?id=<orderId>&key=<signKey>`), `collectorConfirmation(order): …` with the order link `<SITE_URL>/collector?o=<token>`, and `sendMail(...)` via Resend from `orders@glukart.com`, owner address `gluk.caribe@gmail.com` from env `OWNER_EMAIL`.

- [ ] **Step 1: Failing tests:** bad signature → 400 and nothing written; a completed event creates an order with edition 1; the **same event delivered twice** leaves one order, `sold === 1`, exactly 2 emails total; ten different events yield editions 1–10 with no duplicates; event when `sold === 50` → refund called once, no order, owner mail mentions the refund; `expired` event releases the reservation; owner email text contains the street address and edition `12 / 50`, collector email contains no street address.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement with injected deps (store, stripe, mailer, clock).
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5:** Commit `feat(prints): stripe webhook, emails, auto-refund`.

### Task 9: Order function and collector page

**Prerequisite:** Task 5 sign-off.

**Files:** Create `netlify/functions/order.ts`, `order.test.ts`, `src/pages/collector.astro`, `src/scripts/collector.ts`.

**Interfaces:**
- Produces: `GET /api/order?o=<token>` → `200 CollectorView` | `404 { error: 'not-found' }` for an unknown token | `400` for a malformed token. The webhook may not have run yet when the collector lands, so the page treats 404 as "still confirming" for the first 60 seconds, then shows the not-found state. Never returns street, postal code, phone or email.
- `collector.astro`: `<meta name="robots" content="noindex">`, page title "Your order", states: confirming (polls every 3 s, max 60 s), order (piece, format and size, edition `n / 50`, price paid, shipping and region, status with tracking link once `shipped`), not-found (generic wording, links home). Uses the signed-off mockup.

- [ ] **Step 1: Failing tests:** valid token → view without street/postal/phone/email; unknown token → 404 with an empty-of-data body; malformed token (`'../x'`, 5 chars) → 400 and no Sanity query made; `shipped` order exposes carrier and tracking URL; GROQ is parameterised (token passed as `$token`, never string-concatenated).
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement function and page; follow the brand checks in Global Constraints.
- [ ] **Step 4:** `npx vitest run && npx astro check && npm run build`. Expected: PASS, 0 errors, build succeeds. Open the page with a fixture order for Guillermo.
- [ ] **Step 5:** Commit `feat(prints): collector order page`.

### Task 10: Certificate

**Prerequisite:** Task 5 sign-off (wording and layout).

**Files:** Create `netlify/lib/certificate-pdf.ts`, `certificate-pdf.test.ts`, `netlify/functions/certificate.ts`, `certificate.test.ts`, font files `netlify/assets/fonts/Archivo-*.ttf`, `Karla-*.ttf` (from the repo's existing font sources), wordmark from `public/brand/`.

**Interfaces:**
- Produces: `renderCertificate(order: Order): Promise<Uint8Array>` (single-page PDF at the print's certificate size signed off in Task 5; contains title, year, medium, size, `editionNumber / 50`, date, collector name, signature line, wordmark, `glukart.com`, rupture rule). `GET /api/certificate?id=<orderId>&key=<hmac>` → `application/pdf` with `Content-Disposition: inline; filename="gluk-<slug>-<n>-of-50.pdf"`; invalid key → 403; unknown order → 404.

- [ ] **Step 1: Failing tests:** output starts with `%PDF`; extracted text contains the title, `12 / 50`, the collector's name; a title with accents and `ñ` (e.g. "Perdí el coco en un pueblo caribeño") renders without throwing; a very long title does not overflow the page (text width ≤ page width, measured with the embedded font); wrong key → 403; correct key → 200.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement with `pdf-lib` + `fontkit`.
- [ ] **Step 4:** Run tests, expect PASS. Render a sample certificate for a real piece, convert to PNG, open it for Guillermo, and compare against the mockup.
- [ ] **Step 5:** Commit `feat(prints): numbered certificate PDF`.

### Task 11: Buying block on artwork pages and Collect

**Prerequisite:** Task 5 sign-off.

**Files:** Create `src/components/PrintBlock.astro`, `src/scripts/print-block.ts`, `src/scripts/print-block.test.ts`. Modify `src/components/WallLabel.astro:43-62`, `src/pages/collect.astro:49-54`.

**Interfaces:**
- Consumes: `Artwork.printOffers` (Task 4), `/api/stock`, `/api/checkout`, `regionForCountry`/`countriesInRegion`.
- Produces: in `print-block.ts` `formatRemaining(n: number | null): string` (`"23 of 50 remaining"`, `"Sold out"`, `"Unavailable"`), `checkoutRequest(slug, format, country): RequestInit`. The block lists both formats with size and price, remaining count (fetched live), a country select ("Ship to", DHL Express price for the chosen region shown), a "Collect" action, and one plain line that import duties and taxes are paid on arrival. Pieces with no offer keep the existing "Prints · Inquire" button. If the stock fetch fails the block falls back to Inquire. On `sold-out` response the format flips to Sold out without reload. `/collect` card shows "Prints from $X" computed from offers.

- [ ] **Step 1: Failing tests:** `formatRemaining(23)`, `(0)` → "Sold out", `(null)`; `checkoutRequest` posts JSON `{slug, format, country}` and never includes a price; a `409 sold-out` response marks the format sold out.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement per the signed-off mockup; no "Buy now"/"Cart" wording.
- [ ] **Step 4:** `npx vitest run && npx astro check && npm run build`. Screenshot an artwork page, `/collect`, and a phone-width view; open them and compare side by side with the existing site for Guillermo.
- [ ] **Step 5:** Commit `feat(prints): print buying block`.

### Task 12: End-to-end in Stripe test mode

**Prerequisite:** Stripe test keys, Sanity orders token, Resend (or an agreed temporary mail target) from "Needs Guillermo".

- [ ] **Step 1:** Put keys in `.env` and `.env.example`. Run `npx netlify-cli dev` and `stripe listen --forward-to localhost:8888/api/stripe-webhook` (Guillermo logs in once to the Stripe CLI if needed, using the `!` prefix).
- [ ] **Step 2:** Price one piece in Studio (test value, removed afterwards). Buy with test card `4242 4242 4242 4242`. Expected: redirect to `/collector?o=...`, order appears with edition `1 / 50`, owner email arrives, certificate link opens a PDF with the same number.
- [ ] **Step 3:** Replay the webhook event. Expected: still one order, no extra emails. Buy the same piece in a second browser. Expected `2 / 50`.
- [ ] **Step 4:** Mark the order shipped with a tracking URL in Studio. Expected: collector page shows shipped and tracking after reload.
- [ ] **Step 5:** Run `npx vitest run && npx astro check && npm run build && npm run check:prints`; all green. Delete test orders, counters and the test price. Commit any fixes.

### Task 13: Go live

- [ ] **Step 1:** With Guillermo's OK, add env vars in Netlify (click-by-click, exact field labels): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_ORDERS_TOKEN`, `RESEND_API_KEY`, `OWNER_EMAIL`, `CERT_SECRET`, `SITE_URL`. Create the Stripe webhook endpoint `https://glukart.com/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.expired`.
- [ ] **Step 2:** Merge to `main`, push once, confirm the deploy. Run one test-mode purchase on the live site. Bundle the pending `actions/checkout`/`setup-node` `@v5` bump from the brief in this push.
- [ ] **Step 3:** Guillermo confirms: real DHL quote vs the shipping table, tax/customs position, excluded countries, prices set per piece. Only then, with his explicit OK, switch Stripe to live keys and run one real small purchase.
- [ ] **Step 4:** Update the project brief (Next Actions ticked, Log entry, Continuation Prompt) and the repo `CLAUDE.md` with the print-checkout rules learned.
