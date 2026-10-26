import { describe, expect, it, vi } from 'vitest';
import { config, handleCheckout, missingWebhookConfig, type CheckoutDeps, type CheckoutStripe } from '../functions/checkout';
import type { PrintableArtwork } from '../lib/artworks';
import { counterId, EDITION_SIZE, remaining, type EditionCounter } from '../../src/lib/prints/edition';
import { createFakeStore } from '../../src/lib/prints/edition.fake';

type SessionParams = Parameters<CheckoutStripe['checkout']['sessions']['create']>[0];

const NOW = new Date('2026-10-26T12:00:00.000Z');
const NOW_S = NOW.getTime() / 1000;
const SITE = 'https://glukart.test';
const RACE = { maxAttempts: 200, backoffMs: 0 };

const PIECE: PrintableArtwork = {
  slug: 'la-espera',
  title: 'La Espera',
  year: 2024,
  medium: 'Oil on canvas',
  dimensions: '120 x 150 cm',
  printPriceLarge: 450,
  printPriceSmall: null,
};

const LARGE = counterId('la-espera', 'large');

function setup({ initial = [] as EditionCounter[], failStripe = false } = {}) {
  const store = createFakeStore(initial);
  const sessions: SessionParams[] = [];
  let tokens = 0;
  const stripe: CheckoutStripe = {
    checkout: {
      sessions: {
        async create(params) {
          if (failStripe) throw new Error('Stripe is down');
          sessions.push(params);
          return { id: `cs_test_${sessions.length}`, url: `https://checkout.stripe.test/${sessions.length}` };
        },
      },
    },
  };
  const deps: CheckoutDeps = {
    readArtwork: async (slug) => (slug === PIECE.slug ? PIECE : null),
    store,
    stripe,
    now: () => NOW,
    newToken: () => `token-${++tokens}`,
    siteUrl: SITE,
    missingConfig: () => [],
    retry: RACE,
  };
  return { store, sessions, deps };
}

const valid = { slug: 'la-espera', format: 'large', country: 'US' };

describe('handleCheckout', () => {
  it('creates one session with the print price and the region shipping shown separately', async () => {
    const { store, sessions, deps } = setup();
    const res = await handleCheckout(valid, deps);

    expect(res).toEqual({ status: 200, body: { url: 'https://checkout.stripe.test/1' } });
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.mode).toBe('payment');
    expect(s.allowed_payment_method_types).toEqual(['card']);
    expect(s.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 45000,
          product_data: { name: 'La Espera — limited edition print 80 × 100 cm' },
        },
      },
    ]);
    expect(s.shipping_options).toEqual([
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'DHL Express — United States & Canada',
          fixed_amount: { amount: 5000, currency: 'usd' },
        },
      },
    ]);
    expect(s.shipping_address_collection?.allowed_countries).toEqual(['CA', 'US']);
    expect(s.phone_number_collection).toEqual({ enabled: true });
    expect(s.success_url).toBe(`${SITE}/collector?o=token-1`);
    expect(s.cancel_url).toBe(`${SITE}/artwork/la-espera`);
    const note = (s.custom_text?.submit as { message: string }).message;
    expect(note).toMatch(/import duties and taxes/i);
    expect(note).toMatch(/collector/i);
    expect(note.length).toBeLessThanOrEqual(1200);

    const counter = await store.load(LARGE);
    expect(counter.reservations).toHaveLength(1);
    expect(s.metadata).toEqual({
      slug: 'la-espera',
      format: 'large',
      reservationId: counter.reservations[0].reservationId,
      token: 'token-1',
      region: 'US_CA',
      artworkTitle: 'La Espera',
      year: '2024',
      medium: 'Oil on canvas',
      widthCm: '80',
      heightCm: '100',
    });
  });

  it('expires the session about 30 minutes ahead, never after the reservation', async () => {
    const { store, sessions, deps } = setup();
    await handleCheckout(valid, deps);

    const expiresAt = sessions[0].expires_at!;
    expect(expiresAt).toBeGreaterThanOrEqual(NOW_S + 30 * 60);
    expect(expiresAt).toBeLessThanOrEqual(NOW_S + 31 * 60);
    const held = new Date((await store.load(LARGE)).reservations[0].expiresAt).getTime() / 1000;
    expect(held).toBeGreaterThanOrEqual(expiresAt);
  });

  it('ignores price and size sent in the request', async () => {
    const { sessions, deps } = setup();
    await handleCheckout({ ...valid, price: 1, priceCents: 100, unit_amount: 100, widthCm: 999 }, deps);
    expect(sessions[0].line_items?.[0].price_data?.unit_amount).toBe(45000);
    expect(sessions[0].metadata?.widthCm).toBe('80');
  });

  it('ships to the rest of the world at the ROW rate, without excluded countries', async () => {
    const { sessions, deps } = setup();
    await handleCheckout({ ...valid, country: 'jp' }, deps);
    const s = sessions[0];
    const allowed = s.shipping_address_collection!.allowed_countries;
    expect(allowed).toContain('JP');
    expect(allowed).not.toContain('CU');
    expect(allowed).not.toContain('US');
    expect(s.shipping_options?.[0].shipping_rate_data?.display_name).toBe('DHL Express — Rest of the world');
    expect(s.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount).toBe(8000);
    expect(s.metadata?.region).toBe('ROW');
  });

  it('rejects an excluded country without reserving', async () => {
    const { store, sessions, deps } = setup();
    expect(await handleCheckout({ ...valid, country: 'CU' }, deps)).toEqual({ status: 400, body: { error: 'country' } });
    expect(sessions).toHaveLength(0);
    expect((await store.load(LARGE)).reservations).toHaveLength(0);
  });

  it('answers unavailable for a format with no price or an unknown piece', async () => {
    const { sessions, deps } = setup();
    const unavailable = { status: 400, body: { error: 'unavailable' } };
    expect(await handleCheckout({ ...valid, format: 'small' }, deps)).toEqual(unavailable);
    expect(await handleCheckout({ ...valid, slug: 'no-such-piece' }, deps)).toEqual(unavailable);
    expect(sessions).toHaveLength(0);
  });

  it('answers sold-out once 50 are reserved', async () => {
    const expiresAt = new Date(NOW.getTime() + 10 * 60_000).toISOString();
    const reservations = Array.from({ length: EDITION_SIZE }, (_, i) => ({ reservationId: `r${i}`, expiresAt }));
    const { sessions, deps } = setup({ initial: [{ id: LARGE, rev: 'r0', sold: 0, reservations }] });
    expect(await handleCheckout(valid, deps)).toEqual({ status: 409, body: { error: 'sold-out' } });
    expect(sessions).toHaveLength(0);
  });

  it('releases the reservation when Stripe fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, deps } = setup({ failStripe: true });
    expect(await handleCheckout(valid, deps)).toEqual({ status: 502, body: { error: 'payment-provider' } });
    expect(remaining(await store.load(LARGE), NOW)).toBe(EDITION_SIZE);
    expect(log).toHaveBeenCalledWith('checkout: Stripe session failed: Stripe is down');
    log.mockRestore();
  });

  it('answers busy when the edition ledger stays contended', async () => {
    const { store, sessions, deps } = setup();
    store.save = async () => 'conflict';
    const res = await handleCheckout(valid, { ...deps, retry: { maxAttempts: 3, backoffMs: 0 } });
    expect(res).toEqual({ status: 503, body: { error: 'busy' } });
    expect(sessions).toHaveLength(0);
  });

  it('creates exactly 50 sessions from 60 parallel requests', async () => {
    const { store, sessions, deps } = setup();
    const results = await Promise.all(Array.from({ length: 60 }, () => handleCheckout(valid, deps)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(EDITION_SIZE);
    expect(results.filter((r) => r.status === 409)).toHaveLength(10);
    expect(sessions).toHaveLength(EDITION_SIZE);
    expect(remaining(await store.load(LARGE), NOW)).toBe(0);
  });

  it.each([
    ['a non-object body', 'nope'],
    ['a missing body', null],
    ['an unknown format', { ...valid, format: 'medium' }],
    ['a three-letter country', { ...valid, country: 'USA' }],
    ['a numeric country', { ...valid, country: 12 }],
    ['a malformed slug', { ...valid, slug: '../La Espera' }],
  ])('rejects %s', async (_, body) => {
    const { sessions, deps } = setup();
    expect(await handleCheckout(body, deps)).toEqual({ status: 400, body: { error: 'invalid' } });
    expect(sessions).toHaveLength(0);
  });
});

describe('configuration gate', () => {
  it('refuses with 503 unavailable and reserves nothing while the webhook cannot issue orders', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, sessions, deps } = setup();
    const res = await handleCheckout(valid, { ...deps, missingConfig: () => ['CERT_SECRET', 'RESEND_API_KEY'] });
    expect(res).toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(sessions).toHaveLength(0);
    expect((await store.load(LARGE)).reservations).toHaveLength(0);
    expect(log).toHaveBeenCalledWith('checkout: not configured, missing CERT_SECRET, RESEND_API_KEY');
    log.mockRestore();
  });

  it('lists the names of missing or empty webhook variables only', () => {
    expect(missingWebhookConfig({ CERT_SECRET: 'x', STRIPE_WEBHOOK_SECRET: 'whsec_x', RESEND_API_KEY: 're_x' })).toEqual([]);
    expect(missingWebhookConfig({ CERT_SECRET: '', RESEND_API_KEY: 're_x' })).toEqual(['CERT_SECRET', 'STRIPE_WEBHOOK_SECRET']);
  });

  it('rate-limits the endpoint per IP and domain', () => {
    expect(config).toEqual({
      path: '/api/checkout',
      rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
    });
  });
});
