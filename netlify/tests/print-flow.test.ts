import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { handleCertificate } from '../functions/certificate';
import { handleCheckout, type CheckoutDeps, type CheckoutStripe } from '../functions/checkout';
import { handleOrder } from '../functions/order';
import { handleWebhook, type WebhookDeps, type WebhookStripe } from '../functions/stripe-webhook';
import type { PrintableArtwork } from '../lib/artworks';
import { renderCertificate } from '../lib/certificate-pdf';
import type { Mail } from '../lib/email';
import { EDITION_SIZE } from '../../src/lib/prints/edition';
import { createFakeStore } from '../../src/lib/prints/edition.fake';
import { newToken, orderId, signKey, type Order } from '../../src/lib/prints/order';

type SessionParams = Parameters<CheckoutStripe['checkout']['sessions']['create']>[0];
type SessionObject = Record<string, unknown> & { id: string; metadata: Record<string, string> };

const T0 = new Date('2026-10-26T12:00:00.000Z');
const SITE = 'https://glukart.test';
const OWNER = 'owner@example.com';
const CERT_SECRET = 'cert-secret';
const RACE = { maxAttempts: 400, backoffMs: 0 };
const STREET = '742 Evergreen Terrace';
const BUYER = 'ana@example.com';

const PIECE: PrintableArtwork = {
  slug: 'la-espera',
  title: 'La Espera',
  year: 2024,
  medium: 'Oil on canvas',
  dimensions: '120 x 150 cm',
  printPriceLarge: 450,
  printPriceSmall: 150,
};

function setup() {
  const store = createFakeStore();
  const sessions = new Map<string, SessionParams>();
  const mails: Mail[] = [];
  const refunds: string[] = [];

  const checkoutStripe: CheckoutStripe = {
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_${sessions.size + 1}`;
          sessions.set(id, params);
          return { id, url: `https://checkout.stripe.test/${id}` };
        },
      },
    },
  };
  const webhookStripe: WebhookStripe = {
    webhooks: { constructEventAsync: async (payload) => JSON.parse(payload) as Stripe.Event },
    refunds: {
      list: async ({ payment_intent }) => ({ data: refunds.includes(payment_intent) ? [{ status: 'succeeded' }] : [] }),
      async create({ payment_intent }) {
        refunds.push(payment_intent);
        return { id: `re_${refunds.length}` };
      },
    },
  };

  const checkoutDeps: CheckoutDeps = {
    readArtwork: async (slug) => (slug === PIECE.slug ? PIECE : null),
    store,
    stripe: checkoutStripe,
    now: () => T0,
    newToken,
    siteUrl: SITE,
    retry: RACE,
  };
  let webhookNow = new Date(T0.getTime() + 5 * 60_000);
  const webhookDeps: WebhookDeps = {
    store,
    stripe: webhookStripe,
    sendMail: async (mail) => {
      mails.push(mail);
    },
    now: () => webhookNow,
    webhookSecret: 'whsec',
    certSecret: CERT_SECRET,
    ownerEmail: OWNER,
    siteUrl: SITE,
    retry: RACE,
  };

  const orders = () => [...store.created.values()] as Order[];
  const byToken = async (token: string) => orders().find((o) => o.token === token) ?? null;
  const byId = async (id: string) => orders().find((o) => o._id === id) ?? null;

  // The event as Stripe returns it for a paid session (API 2026-09-30 shape).
  function completedEvent(id: string): Stripe.Event {
    const p = sessions.get(id)!;
    const n = Number(id.replace(/\D/g, ''));
    const session = {
      id,
      payment_status: 'paid',
      payment_intent: `pi_${id}`,
      amount_subtotal: p.line_items![0].price_data!.unit_amount,
      shipping_cost: { amount_total: p.shipping_options![0].shipping_rate_data!.fixed_amount!.amount },
      metadata: { ...p.metadata },
      customer_details: {
        name: `Buyer ${n}`,
        email: n === 1 ? BUYER : `buyer${n}@example.com`,
        phone: '+1 555 0100',
        address: { line1: 'Billing Lane 1', line2: null, city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' },
      },
      collected_information: {
        shipping_details: {
          name: `Buyer ${n}`,
          address: { line1: STREET, line2: 'Apt 3', city: 'Springfield', state: 'OR', postal_code: '97477', country: 'US' },
        },
      },
    };
    return { id: `evt_${id}`, type: 'checkout.session.completed', created: Math.floor(webhookNow.getTime() / 1000), data: { object: session } } as unknown as Stripe.Event;
  }

  // Another paid session for the same piece, with a hold that is not in the ledger.
  function strangerEvent(i: number): Stripe.Event {
    const base = completedEvent('cs_test_1');
    const object = base.data.object as unknown as SessionObject;
    const metadata = { ...object.metadata, reservationId: `lost-${i}`, token: `lost-token-${i}` };
    return {
      ...base,
      id: `evt_stranger_${i}`,
      data: { object: { ...object, id: `cs_stranger_${i}`, payment_intent: `pi_stranger_${i}`, metadata } },
    } as unknown as Stripe.Event;
  }

  const deliver = (event: Stripe.Event) => handleWebhook(JSON.stringify(event), 'sig', webhookDeps);
  const checkout = (country = 'US', format = 'large') => handleCheckout({ slug: 'la-espera', format, country }, checkoutDeps);
  const setWebhookNow = (d: Date) => {
    webhookNow = d;
  };
  return { sessions, mails, refunds, orders, byToken, byId, completedEvent, strangerEvent, deliver, checkout, setWebhookNow };
}

const ownerMails = (mails: Mail[]) => mails.filter((m) => m.to === OWNER);
const collectorMails = (mails: Mail[]) => mails.filter((m) => m.to !== OWNER);

describe('print purchase flow (offline)', () => {
  it('(a) sells edition 1 / 50 and keeps the street address out of the collector side', async () => {
    const t = setup();
    expect((await t.checkout('US', 'large')).status).toBe(200);
    const params = t.sessions.get('cs_test_1')!;
    expect(params.metadata).toMatchObject({ widthCm: '80', heightCm: '100', format: 'large', region: 'US_CA' });
    const token = String(params.metadata!.token);

    expect((await handleOrder(token, t.byToken)).status).toBe(404);

    expect((await t.deliver(t.completedEvent('cs_test_1'))).status).toBe(200);
    const [order] = t.orders();
    expect(order).toMatchObject({ priceCents: 45000, shippingCents: 5000, editionNumber: 1, editionSize: 50, status: 'paid' });

    const owner = ownerMails(t.mails);
    const collector = collectorMails(t.mails);
    expect(owner).toHaveLength(1);
    expect(collector).toHaveLength(1);
    const certUrl = `${SITE}/api/certificate?id=${order._id}&key=${signKey(order._id, CERT_SECRET)}`;
    expect(owner[0].html).toContain(STREET);
    expect(owner[0].text).toContain(STREET);
    expect(owner[0].text).toContain('1 / 50');
    expect(owner[0].text).toContain(certUrl);
    expect(collector[0].to).toBe(BUYER);
    expect(collector[0].html + collector[0].text).not.toContain(STREET);
    expect(collector[0].html + collector[0].text).not.toContain('97477');

    const view = await handleOrder(token, t.byToken);
    expect(view.status).toBe(200);
    expect(view.body).toMatchObject({ editionNumber: 1, editionSize: 50, priceCents: 45000, shippingCents: 5000, city: 'Springfield', country: 'US' });
    const exposed = JSON.stringify(view.body);
    for (const hidden of [STREET, '97477', BUYER, '+1 555 0100', 'Apt 3']) expect(exposed).not.toContain(hidden);

    const url = new URL(certUrl);
    const cert = await handleCertificate(url.searchParams.get('id'), url.searchParams.get('key'), {
      secret: CERT_SECRET,
      read: t.byId,
      render: renderCertificate,
    });
    expect(cert.status).toBe(200);
    expect(Buffer.from(cert.body as Uint8Array).subarray(0, 4).toString()).toBe('%PDF');

    // Marked shipped in Studio: the collector view now carries the tracking.
    Object.assign(order, {
      status: 'shipped',
      shippedAt: '2026-10-30T10:00:00.000Z',
      carrier: 'DHL Express',
      trackingNumber: '1234567890',
      trackingUrl: 'https://dhl.test/track/1234567890',
    });
    const shipped = await handleOrder(token, t.byToken);
    expect(shipped.body).toMatchObject({ status: 'shipped', carrier: 'DHL Express', trackingNumber: '1234567890' });
  });

  it('(b) 60 parallel checkouts and 60 payments yield exactly editions 1..50', async () => {
    const t = setup();
    const replies = await Promise.all(Array.from({ length: 60 }, () => t.checkout('US', 'large')));
    expect(replies.filter((r) => r.status === 200)).toHaveLength(50);
    const refused = replies.filter((r) => r.status !== 200);
    expect(refused).toHaveLength(10);
    for (const r of refused) expect(r).toEqual({ status: 409, body: { error: 'sold-out' } });
    expect(t.sessions.size).toBe(50);

    // Ten extra payments carry holds the ledger does not know, as if paid after the hold was lost.
    const events = [
      ...[...t.sessions.keys()].map((id) => t.completedEvent(id)),
      ...Array.from({ length: 10 }, (_, i) => t.strangerEvent(i)),
    ];
    const results = await Promise.all(events.map(t.deliver));
    expect(results.every((r) => r.status === 200)).toBe(true);

    const numbers = t.orders().map((o) => o.editionNumber).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: EDITION_SIZE }, (_, i) => i + 1));
    expect(new Set(t.orders().map((o) => o._id)).size).toBe(EDITION_SIZE);
    expect(t.refunds).toHaveLength(10);
    expect(ownerMails(t.mails).filter((m) => m.subject.startsWith('Sale:'))).toHaveLength(EDITION_SIZE);
  });

  it('(c) the same event delivered 3 times concurrently makes one order and two emails', async () => {
    const t = setup();
    await t.checkout('US', 'large');
    const event = t.completedEvent('cs_test_1');
    const replies = await Promise.all([t.deliver(event), t.deliver(event), t.deliver(event)]);
    expect(replies.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(t.orders()).toHaveLength(1);
    expect(t.orders()[0].editionNumber).toBe(1);
    expect(t.mails).toHaveLength(2);
    expect(t.refunds).toHaveLength(0);
  });

  describe('(d) late payment', () => {
    it('after the hold expired, a free edition still issues the order', async () => {
      const t = setup();
      await t.checkout('US', 'large');
      t.setWebhookNow(new Date(T0.getTime() + 3 * 3600_000));
      expect((await t.deliver(t.completedEvent('cs_test_1'))).status).toBe(200);
      expect(t.orders()).toHaveLength(1);
      expect(t.orders()[0].editionNumber).toBe(1);
      expect(t.refunds).toHaveLength(0);
    });

    it('when the edition is full, the payment is refunded and no order is issued', async () => {
      const t = setup();
      await t.checkout('US', 'large');
      const late = t.completedEvent('cs_test_1');
      t.setWebhookNow(new Date(T0.getTime() + 3 * 3600_000));
      for (let i = 0; i < EDITION_SIZE; i++) await t.deliver(t.strangerEvent(i));
      expect(t.orders()).toHaveLength(EDITION_SIZE);
      t.mails.length = 0;

      expect((await t.deliver(late)).status).toBe(200);
      expect(t.orders()).toHaveLength(EDITION_SIZE);
      expect(t.orders().some((o) => o._id === orderId('cs_test_1'))).toBe(false);
      expect(t.refunds).toEqual(['pi_cs_test_1']);
      expect(ownerMails(t.mails)).toHaveLength(1);
      expect(ownerMails(t.mails)[0].subject).toMatch(/^Refunded automatically/);
      expect(ownerMails(t.mails)[0].text).toContain('refunded');
      expect(collectorMails(t.mails)).toHaveLength(1);
      expect(collectorMails(t.mails)[0].subject).toMatch(/refunded/);
    });
  });

  it('(e) a tampered certificate key is refused before any order lookup', async () => {
    const t = setup();
    await t.checkout('US', 'large');
    await t.deliver(t.completedEvent('cs_test_1'));
    const id = orderId('cs_test_1');
    const key = signKey(id, CERT_SECRET);
    const read = vi.fn(t.byId);
    const deps = { secret: CERT_SECRET, read, render: renderCertificate };

    const flipped = `${key.slice(0, -1)}${key.endsWith('A') ? 'B' : 'A'}`;
    for (const bad of [flipped, signKey(id, 'other-secret'), '', 'x']) {
      expect((await handleCertificate(id, bad, deps)).status).toBe(403);
    }
    expect((await handleCertificate('order-cs_test_999', key, deps)).status).toBe(403);
    expect(read).not.toHaveBeenCalled();
  });
});
