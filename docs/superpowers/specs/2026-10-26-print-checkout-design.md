# Limited edition print checkout — design

Date: 2026-10-26. Status: draft for Guillermo's approval.

## Intent and why

Guillermo (Gluk) wants collectors to buy limited edition prints directly on glukart.com, with no marketplace and no platform fee. The site is a static Astro build on Netlify with Sanity as the CMS. Prints today are "Prints · Inquire" only. This work adds real checkout, an order page for the collector, a studio-side fulfilment flow, and a numbered certificate. Success: a collector pays, immediately sees an official page with every detail of their purchase, Guillermo gets a notification, ships from his studio in Mexico via DHL Express, and the print arrives with a numbered certificate. Guillermo never has to hand-edit anything on the website for a sale to be processed.

## The flow (as Guillermo described it)

1. A collector opens an artwork page and sees the limited edition print in **two formats** (Large, Small). Each format is **limited to 50 per piece**, so 100 prints per piece at most. The page shows how many remain per format. A sold-out format is shown as sold out.
2. They choose a format and pay on the site through Stripe's hosted Checkout. Shipping is chosen and paid in the same checkout: **DHL Express only**, one flat price by destination region.
3. After paying they are sent to their own **collector page**, an official page with all details of their purchase: piece, format and size, edition number (e.g. 12/50), price paid, shipping, order status, tracking once shipped.
4. Guillermo receives a notification of each sale with everything needed to ship.
5. Guillermo arranges the shipment and sends the print from his studio in Mexico. He marks the order shipped (with tracking) and the collector page updates.
6. The print arrives with a numbered, official **certificate**.

## Sizes

Derived automatically from each artwork's dimensions in Sanity. Guillermo does not type sizes.

- **Large:** the original size if it fits within 100 × 100 cm. Otherwise scaled down proportionally until the longest side is 100 cm.
- **Small:** half of each side of Large (same proportions).
- Proportions must be exact. Only the long side is rounded (whole cm for Large, nearest 0.5 cm for Small); the short side is calculated from it. The artwork image is never cropped or stretched.
- Examples: 70 × 70 gives 70 × 70 and 35 × 35. 235 × 90 gives 100 × 38 and 50 × 19. 120 × 150 gives 80 × 100 and 40 × 50.
- Diptychs and multi-panel works (Violenta I / II): treat as a builder decision, flag it in the plan.

## Shipping

DHL Express only, charged at checkout, USD, flat per destination region. Padded for a 1 m tube so Guillermo never pays out of pocket:

| Region | Charged (USD) |
|---|---|
| Mexico | 20 |
| US & Canada | 50 |
| Latin America | 60 |
| Europe & UK | 60 |
| Rest of the world | 80 |

These live in one editable place (not scattered in code). Before launch they must be checked against a real DHL quote for a 100 cm tube. Guillermo's own source table (Express ranges: MX 10–14, US/CA 28–38, LatAm 38–48, EU/UK 35–48, RoW 45–65) is estimates via aggregators.

Country-to-region mapping is the builder's job; countries Guillermo cannot ship to are not offered.

## Prices

Per piece and per size, set by Guillermo in Sanity. Until a piece has prices, its page keeps "Prints · Inquire". USD. No prices are invented.

## Collector page

- Private page per order, reached from the confirmation (Stripe redirect and email link). Guillermo's guess for the access model: an unguessable link, no account or password, noindex. Builder may propose better if it stays friction-free.
- Shows only that collector's order. Visual design follows the Gluk site (see Brand).
- Updates when Guillermo marks the order shipped (status, carrier, tracking).

## Guillermo's notification and fulfilment

- Every paid order emails Guillermo at gluk.caribe@gmail.com: collector name, shipping address, email, phone if collected, piece, size, edition number, shipping region, amount, a link to the order and to the certificate PDF.
- Guillermo's guess: he marks orders "shipped" with tracking in Sanity Studio. Builder may place order management elsewhere if simpler, as long as he never edits code or JSON.

## Edition numbering

- Edition numbers (n of 50) are assigned at payment, per piece and per format, never duplicated, never past 50.
- The site must not sell past 50 even under simultaneous purchases. The builder decides how (for example reserving a number when checkout starts, with Stripe session expiry releasing it).
- Webhook handling must be idempotent: a retried Stripe event never creates a second order or number.
- The builder decides what stores the counters and orders (Sanity or Netlify storage). Anything requiring a secret (Stripe keys, Sanity write token) is set by Guillermo in dashboards; the builder gives click-by-click steps.

## Certificate

- A numbered PDF per order, designed in the Gluk look (wordmark, rupture rule, Archivo/Karla). Guillermo prints and signs it at the studio. It is generated from the order, so it always matches the edition number.
- Content: artwork title, year, medium of the original, print size, edition "n / 50", date, collector name, a signature line for Gluk, the wordmark, glukart.com. Any wording beyond those facts is placeholder and needs Guillermo's pick from options before shipping (repo copy rule).
- Guillermo's guess: the certificate is downloaded by him per order (from the notification email or order link); the collector does not download it, since the physical one ships with the print. To confirm.

## Brand and wording constraints (from the repo CLAUDE.md)

- Gallery language: "Collect", "collector", "Inquire". Never "Shop", "Buy now" or "Cart" in visible labels.
- The site must feel expensive. Design restraint: few elements, extreme scale contrast, no stickers, tags or invented slogans.
- Every UI plan names the brand-book elements it applies and is verified by a visual comparison against the brand book, not only mechanics.
- Open every visual result for Guillermo directly.

## Goals

- Real checkout that cannot oversell, cannot double-number, and cannot lose an order.
- Collector gets an official order page and a numbered certificate with their print.
- Guillermo's ongoing work per sale: read an email, ship, mark shipped.

## Non-goals

- Originals stay inquiry-only (and the At auction status stays as is).
- No user accounts, carts, discount codes or multi-item orders in v1 (one print per order). Builder to flag if multi-item is cheap.
- No automatic DHL label purchase or tracking lookup in v1.
- No print-on-demand provider: Guillermo ships from his studio.
- No sales tax / VAT handling designed here (see open items).

## Anti-goals (failure even if it technically works)

- Guillermo pays out of pocket for shipping.
- A page or email that looks generic or cheap.
- A paid order with no edition number, or two collectors with the same number.
- Guillermo needing to touch code, JSON files or dashboards to process a normal sale.

## Constraints

- Static Astro site on Netlify (Personal plan, credit-based builds: a rebuild costs 15 credits, so a sale must not trigger a rebuild). Per-order and per-edition data must not require a site deploy. Netlify functions are expected for checkout and webhooks.
- Sanity project `48jkcmcb`, dataset `production`, Studio at gluk-studio.sanity.studio.
- Stripe test mode throughout the build. Live mode only after Guillermo creates the Stripe account and approves.
- Existing `printOption` schema (size, price in cents, stripePriceId, soldOut) was a placeholder and may be replaced.

## Left to the builder

Storage of orders and counters, reservation and expiry strategy, webhook design, function layout, PDF generation method, how the collector link is secured, country-to-region mapping, email delivery method, the multi-panel pieces, exact page layouts (shown to Guillermo as mockups for sign-off).

## Calls made after the builder check (Claude's calls, not Guillermo's decisions)

- **Dimensions:** the build parses each artwork's `dimensions` ("W × H cm") and fails loudly on anything unparseable. A check compares the image's aspect ratio to the stated dimensions and flags mismatches for Guillermo instead of guessing. Prints are never cropped or stretched.
- **Reservation:** a number is reserved when checkout starts and held for 30 minutes (Stripe's minimum session expiry), then released. The edition number itself is assigned at payment confirmation. Gaps and out-of-order numbers are acceptable. The "remaining" count treats held reservations as taken.
- **Failed or late payments:** card payments only. Refunds and cancellations are handled by hand in the Stripe dashboard and the order is marked void in Studio. A payment that arrives after its reservation expired with no stock left is refunded automatically and Guillermo is told.
- **Storage:** orders and counters live in Sanity, so Studio is his admin screen. A Sanity write token is held only in a Netlify function. Guillermo creates it.
- **Multi-panel works (Violenta I / II):** each panel stays inquiry-only for prints until Guillermo decides.
- **Order page privacy:** long random token, address shown masked (city and country only), no expiry.
- **Emails:** sent from glukart.com through a transactional email provider (Resend by default), branded confirmation containing the order link. Needs a provider account and SPF/DKIM records at Porkbun, set up early.
- **Stock and prices on a static page:** remaining count comes from a small live endpoint. The checkout function reads the price from Sanity at checkout time. A price edit shows on the page at the next content-driven rebuild.
- **Duties and countries (confirmed by Guillermo 2026-10-26):** the collector pays import duties and taxes on arrival, and the checkout says so. Ship to every country DHL Express serves from Mexico except sanctioned or restricted ones (country list is Claude's call).

## Needs Guillermo (cannot be automated)

- Stripe account, API keys and webhook secret.
- Prices per piece and size.
- A real DHL quote for a 100 cm tube to confirm the shipping table.
- Pick of certificate wording and visual sign-off on the certificate, product block and collector page.
- Tax/VAT and customs position for international prints (legal/tax).
