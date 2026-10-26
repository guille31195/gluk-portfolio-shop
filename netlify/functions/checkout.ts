import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { ordersClient, readClient, stripe } from '../lib/clients';
import { sanityArtworkReader, SLUG_PATTERN, type ArtworkReader } from '../lib/artworks';
import { json, serverError, type Reply } from '../lib/http';
import { createSanityEditionStore } from '../lib/sanity-store';
import {
  counterId,
  releaseReservation,
  reserveEdition,
  RESERVATION_MINUTES,
  type EditionStore,
  type RetryOptions,
} from '../../src/lib/prints/edition';
import { printOffers } from '../../src/lib/prints/offer';
import { newToken } from '../../src/lib/prints/order';
import type { Format } from '../../src/lib/prints/print-sizes';
import { countriesInRegion, REGION_NAMES, regionForCountry, shippingCents } from '../../src/lib/prints/shipping';

export type CheckoutStripe = {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; url: string | null }>;
    };
  };
};

export type CheckoutDeps = {
  readArtwork: ArtworkReader;
  store: EditionStore;
  stripe: CheckoutStripe;
  now: () => Date;
  newToken: () => string;
  siteUrl: string;
  retry?: RetryOptions;
};

export type CheckoutError = 'invalid' | 'country' | 'unavailable' | 'sold-out' | 'busy' | 'payment-provider';
export type CheckoutReply = Reply<{ url: string } | { error: CheckoutError }>;

const DUTIES_NOTE =
  'Import duties and taxes are not included. They are charged by the destination country on arrival and paid by the collector.';

// Stripe refuses an expires_at under 30 minutes from the moment it creates the session,
// which is a little after `now`. The session gets this margin and the reservation is
// held for the same span, so the reservation always outlives the session.
const EXPIRY_MARGIN_MS = 30_000;

const FORMATS: readonly Format[] = ['large', 'small'];
const META_MAX = 500;

type Input = { slug: string; format: Format; country: string };

function parseInput(body: unknown): Input | null {
  if (typeof body !== 'object' || body === null) return null;
  const { slug, format, country } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return null;
  if (!FORMATS.includes(format as Format)) return null;
  if (typeof country !== 'string' || !/^[A-Za-z]{2}$/.test(country)) return null;
  return { slug, format: format as Format, country };
}

const fail = (status: number, error: CheckoutError): CheckoutReply => ({ status, body: { error } });

export async function handleCheckout(body: unknown, deps: CheckoutDeps): Promise<CheckoutReply> {
  const input = parseInput(body);
  if (!input) return fail(400, 'invalid');

  const region = regionForCountry(input.country);
  if (!region) return fail(400, 'country');

  const artwork = await deps.readArtwork(input.slug);
  const offer = artwork && printOffers(artwork).find((o) => o.format === input.format);
  if (!artwork || !offer) return fail(400, 'unavailable');

  const now = deps.now();
  // Reserving as of now + margin holds the number for RESERVATION_MINUTES plus the margin.
  const heldFrom = new Date(now.getTime() + EXPIRY_MARGIN_MS);
  const edition = counterId(input.slug, input.format);
  const reservationId = randomUUID();
  let reserved: 'reserved' | 'sold-out';
  try {
    reserved = await reserveEdition(deps.store, edition, reservationId, heldFrom, deps.retry);
  } catch {
    return fail(503, 'busy');
  }
  if (reserved === 'sold-out') return fail(409, 'sold-out');

  const token = deps.newToken();
  const expiresAt = Math.floor((heldFrom.getTime() + RESERVATION_MINUTES * 60_000) / 1000);
  try {
    const session = await deps.stripe.checkout.sessions.create({
      mode: 'payment',
      allowed_payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: offer.priceCents,
            product_data: { name: `${artwork.title} — limited edition print ${offer.sizeLabel}` },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: countriesInRegion(region) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: `DHL Express — ${REGION_NAMES[region]}`,
            fixed_amount: { amount: shippingCents(region), currency: 'usd' },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      expires_at: expiresAt,
      success_url: `${deps.siteUrl}/collector?o=${token}`,
      cancel_url: `${deps.siteUrl}/artwork/${input.slug}`,
      custom_text: { submit: { message: DUTIES_NOTE } },
      metadata: {
        slug: input.slug,
        format: input.format,
        reservationId,
        token,
        region,
        artworkTitle: artwork.title.slice(0, META_MAX),
        year: artwork.year == null ? '' : String(artwork.year),
        medium: artwork.medium.slice(0, META_MAX),
        widthCm: String(offer.size.widthCm),
        heightCm: String(offer.size.heightCm),
      },
    });
    if (!session.url) throw new Error(`Stripe session ${session.id} has no url`);
    return { status: 200, body: { url: session.url } };
  } catch (err) {
    console.error(`checkout: Stripe session failed: ${err instanceof Error ? err.message : String(err)}`);
    await releaseReservation(deps.store, edition, reservationId).catch(() => {});
    return fail(502, 'payment-provider');
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ status: 405, body: { error: 'method' } });
  try {
    const body = await req.json().catch(() => null);
    const deps: CheckoutDeps = {
      readArtwork: sanityArtworkReader(readClient()),
      store: createSanityEditionStore(ordersClient()),
      stripe: stripe(),
      now: () => new Date(),
      newToken,
      siteUrl: process.env.SITE_URL ?? 'https://glukart.com',
    };
    return json(await handleCheckout(body, deps));
  } catch (err) {
    return serverError('checkout', err);
  }
};

export const config = { path: '/api/checkout' };
