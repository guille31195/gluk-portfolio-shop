# Print checkout: go-live checklist

Everything here needs an account, a secret, money or Guillermo's sign-off, so none of it
was done during the build. Work top to bottom. Until steps 1 to 4 are done, the site
answers "Something went wrong. Please inquire instead." on Collect and nobody can pay:
`/api/checkout` refuses with 503 while `CERT_SECRET`, `STRIPE_WEBHOOK_SECRET` or
`RESEND_API_KEY` is missing (the function log names the missing variable, never its value).

Dashboard labels below are written from the build notes, not checked on screen. Where a
step says "check the label in the dashboard", look for the closest match and send a
screenshot if nothing fits.

## 1. Sanity: private `orders` dataset and token

1. In a terminal in the repo:
   `npx sanity dataset create orders --visibility private`
2. Verify it is private: `npx sanity dataset visibility get orders` must print `private`.
   Note: an anonymous query to a private dataset answers 200 with an empty result, not
   401/403, so an empty dataset proves nothing. To test for real, create a throwaway
   document with the CLI, query it with no token (it must come back as `[]`), then
   delete it. Private datasets need the Sanity Growth plan (done 2026-10-28; on the Free
   plan the CLI creates the dataset public with a warning).
3. Create the token at sanity.io/manage → project 48jkcmcb → API → Tokens → Add API token
   (check the label in the dashboard). Name: `netlify-orders`. Permission: **Editor**.
   Copy it once; it goes into `SANITY_ORDERS_TOKEN` in step 4.
4. Deploy Studio (`npx sanity deploy`). Studio now has two workspaces: the site content
   at `/production` and orders at `/orders`. The old root URL of the Studio changes, so
   update any bookmark.

## 2. Resend: domain and test send

1. In Resend, add the domain `glukart.com` (check the label in the dashboard).
2. Resend shows DNS records (SPF and DKIM, sometimes a return-path MX). Add each one at
   Porkbun → glukart.com → DNS: copy the type, host and value exactly as Resend shows
   them. Ask for click-by-click help with a screenshot of Resend's record list if needed.
3. Wait until Resend marks the domain verified.
4. Create an API key (sending access is enough). It goes into `RESEND_API_KEY`.
5. Send one test email from `orders@glukart.com` to `gluk.caribe@gmail.com` from the
   Resend dashboard and confirm it arrives in the inbox, not spam.

## 3. Stripe (test mode first)

1. Adaptive Pricing: Guillermo chose to leave it ON (2026-10-29), since turning it off limits
   the buyer's payment options. On API versions from 2025-03-31 the Checkout Session stays
   in USD and the buyer's local amount is in `presentment_details`; the webhook reads
   `amount_subtotal` and `shipping_cost.amount_total` from the re-fetched session, so orders
   stay in USD. Buyers who pay in their own currency pay a 2 to 4% conversion fee to Stripe.
   Docs conflict for older versions: confirm in the test purchase with a foreign test card
   that the order records the USD price.
2. Create the webhook endpoint (Developers → Webhooks → Add endpoint, check the label in
   the dashboard):
   - URL: `https://glukart.com/api/stripe-webhook`
   - Events: `checkout.session.completed` and `checkout.session.expired`
   - API version: `2026-09-30.endive` if the form lets you pick one. If not, leave the
     default; the webhook re-reads each session with its own pinned version.
3. Copy the endpoint's signing secret (starts with `whsec_`). It goes into
   `STRIPE_WEBHOOK_SECRET`.
4. **Live keys only after Guillermo's OK.** Until then use the test secret key
   (`sk_test_...`) and the test-mode webhook secret.

## 4. Netlify environment variables

Netlify → site → Site configuration → Environment variables → Add a variable (check the
label in the dashboard). Add all seven, scope "Functions" at least:

| Name | Value | Where it comes from |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` now, `sk_live_...` after OK | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook endpoint (step 3) |
| `SANITY_ORDERS_TOKEN` | Editor token | Sanity (step 1) |
| `RESEND_API_KEY` | `re_...` | Resend (step 2) |
| `CERT_SECRET` | a long random string | generate: `openssl rand -base64 48` |
| `OWNER_EMAIL` | `gluk.caribe@gmail.com` | where sale emails go |
| `SITE_URL` | `https://glukart.com` | the public site address |

`CERT_SECRET` signs the certificate links. Never change it after the first sale, or the
links in earlier emails stop working.

Redeploy after adding them (variables are read at deploy time).

## 5. Checks after the first deploy

1. **Rate limit.** `/api/checkout` declares Netlify's per-function rate limit (10 requests
   per 60 seconds per IP and domain). Confirm in the Netlify dashboard that rate limiting
   is active on the site's plan; if the plan does not include it, say so and decide
   whether that is acceptable.
2. **Certificate assets.** Open one certificate link from a test order. A PDF with the
   wordmark and fonts must appear. A 500 means `netlify/assets` was not bundled with the
   function.
3. **Sanity 409 mapping, one live concurrent test** (orders dataset, test mode):
   - stale revision: two writes to the same edition counter with the same revision; the
     second must come back as `conflict` (the checkout retries it),
   - duplicate create: creating an order whose `_id` already exists must come back as
     `exists` (the webhook treats it as already processed).
   If either returns a plain error, `netlify/lib/sanity-store.ts` needs adjusting.
4. **DHL quote.** Get a real DHL Express quote for a 100 cm tube to each region and compare
   it with the shipping table in `src/lib/prints/shipping.ts`.
5. One full test-mode purchase: pay with Stripe's test card, check the order page, both
   emails, the order in Studio `/orders`, and the certificate link.

## 6. Data to fix before prices go on

These five pieces have a first image whose proportion does not match the stated
dimensions (swapped width and height, or a detail shot first). Print sizes come from the
dimensions, so check each one in Studio:

- Bájale 2 Gallito
- Pobrecita la vaquita
- Pobrecita la vaquita (invertido)
- Violenta I
- Violenta II

Then set the print prices in Studio (Large and Small per piece). A piece without a price
cannot be bought online. `npm run check:prints` lists what is still missing.

## 7. Sign-off

- Certificate: signed off 2026-10-28 as one photo design (photograph of the work bought, edition
  number leading). Wording lives in `CERTIFICATE_COPY` in `netlify/lib/certificate-pdf.ts`.
- Mockups: print block, collector order page, certificate, owner email.
- Live Stripe keys: swap `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the live
  values (and create the live webhook endpoint the same way as step 3) only after this.

## 8. When something goes wrong

Labels in the Stripe dashboard change: where this says "check the label", look for the
closest match.

- **An email titled "ACTION NEEDED" arrives.** It means a collector paid but the site could
  not turn the payment into an order (no shipping street, or damaged order details), or an
  automatic refund failed. The email gives the Stripe session id and the payment id
  (`pi_...`). In Stripe, search Payments for that `pi_...` id (check the label), then either
  refund it or contact the collector and create the order by hand. No edition number was
  used for it.
- **A Stripe payment has no "New print sale" email.** The order exists in Studio under
  `/orders` but the email failed (Resend problem, domain not verified). Stripe does not
  resend by itself in this case. In Stripe, open the webhook endpoint, find the
  `checkout.session.completed` event for that payment and use its resend option (check the
  label). The site then sends the owner email again and records it on the order. Turning on
  Stripe's own "successful payment" email notifications is a useful backstop.
- **A collector's page says "not found".** Check Studio `/orders` for the order. The private
  link is in the collector's confirmation email.

Nothing else is removed or changed by going live.
