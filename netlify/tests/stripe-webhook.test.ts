import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleWebhook,
  type CompletedSession,
  type WebhookDeps,
  type WebhookStripe,
} from '../functions/stripe-webhook';
import * as email from '../lib/email';
import type { Mail } from '../lib/email';

vi.mock('../lib/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/email')>();
  return { ...actual, ownerNotification: vi.fn(actual.ownerNotification) };
});
import { counterId, EDITION_SIZE, type EditionCounter } from '../../src/lib/prints/edition';
import { createFakeStore } from '../../src/lib/prints/edition.fake';
import { orderId, signKey, type Order } from '../../src/lib/prints/order';

const NOW = new Date('2026-10-26T12:00:00.000Z');
const EVENT_CREATED = Math.floor(NOW.getTime() / 1000) - 5;
const SITE = 'https://glukart.test';
const OWNER = 'owner@example.com';
const WEBHOOK_SECRET = 'whsec_test_secret';
const CERT_SECRET = 'cert-secret';
const RACE = { maxAttempts: 200, backoffMs: 0 };
const LARGE = counterId('la-espera', 'large');
const HELD = new Date(NOW.getTime() + 20 * 60_000).toISOString();

// Only used for its signature helpers; no request reaches the API.
const stripeLib = new Stripe('sk_test_unused');

// Shape verified against stripe-node 23 (API 2026-09-30): the shipping address lives
// under collected_information.shipping_details; email and phone under customer_details.
function paidSession(n = 1, over: Partial<CompletedSession> = {}): CompletedSession {
  return {
    id: `cs_test_${n}`,
    payment_status: 'paid',
    payment_intent: `pi_test_${n}`,
    amount_subtotal: 45000,
    shipping_cost: { amount_subtotal: 6000, amount_tax: 0, amount_total: 6000, shipping_rate: 'shr_1' },
    metadata: {
      slug: 'la-espera',
      format: 'large',
      reservationId: `res-${n}`,
      token: `tok-${n}`,
      region: 'EU_UK',
      artworkTitle: 'La Espera',
      year: '2024',
      medium: 'Oil on canvas',
      widthCm: '80',
      heightCm: '100',
    },
    customer_details: {
      address: { city: 'Madrid', country: 'ES', line1: 'Billing 1', line2: null, postal_code: '28001', state: null },
      business_name: null,
      email: 'ana@example.com',
      individual_name: null,
      name: 'Ana Billing',
      phone: '+34 600 000 000',
      tax_exempt: 'none',
      tax_ids: [],
    },
    collected_information: {
      business_name: null,
      individual_name: null,
      shipping_details: {
        name: 'Ana Collector',
        address: {
          city: 'Madrid',
          country: 'ES',
          line1: 'Calle Ejemplo 7',
          line2: 'Piso 1A',
          postal_code: '28000',
          state: null,
        },
      },
    },
    ...over,
  };
}

function eventBody(type: string, object: unknown, id = 'evt_1') {
  return JSON.stringify({ id, object: 'event', type, created: EVENT_CREATED, data: { object } });
}

async function signed(body: string, secret = WEBHOOK_SECRET) {
  return stripeLib.webhooks.generateTestHeaderStringAsync({ payload: body, secret });
}

function counter(sold: number, reservationIds: string[] = []): EditionCounter {
  return { id: LARGE, rev: 'r0', sold, reservations: reservationIds.map((reservationId) => ({ reservationId, expiresAt: HELD })) };
}

type RefundRow = { status: string | null };

function setup({
  initial = [] as EditionCounter[],
  failRefund = false,
  failMail = (_: Mail): boolean => false,
  existingRefunds = [] as RefundRow[],
} = {}) {
  const store = createFakeStore(initial);
  const mails: Mail[] = [];
  const refunds: { params: { payment_intent: string }; options: { idempotencyKey: string } }[] = [];
  const stripe: WebhookStripe = {
    webhooks: stripeLib.webhooks,
    refunds: {
      async list() {
        const made = refunds.filter(() => !failRefund).map((): RefundRow => ({ status: 'succeeded' }));
        return { data: [...existingRefunds, ...made].slice(0, 1) };
      },
      async create(params, options) {
        refunds.push({ params, options });
        if (failRefund) throw new Error('card_declined');
        return { id: `re_${refunds.length}` };
      },
    },
  };
  const deps: WebhookDeps = {
    store,
    stripe,
    sendMail: async (mail) => {
      if (failMail(mail)) throw Object.assign(new Error(`smtp down for ${mail.to}`), { code: 'ECONNRESET' });
      mails.push(mail);
    },
    now: () => NOW,
    webhookSecret: WEBHOOK_SECRET,
    certSecret: CERT_SECRET,
    ownerEmail: OWNER,
    siteUrl: SITE,
    retry: RACE,
  };
  return { store, mails, refunds, deps };
}

async function deliver(deps: WebhookDeps, type: string, object: unknown, id = 'evt_1') {
  const body = eventBody(type, object, id);
  return handleWebhook(body, await signed(body), deps);
}

const orders = (store: ReturnType<typeof createFakeStore>) => [...store.created.values()] as Order[];

let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  info = vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('signature', () => {
  it('rejects a bad signature with 400 and writes nothing', async () => {
    const { store, mails, deps } = setup({ initial: [counter(0, ['res-1'])] });
    const body = eventBody('checkout.session.completed', paidSession());
    const res = await handleWebhook(body, await signed(body, 'whsec_wrong'), deps);
    expect(res.status).toBe(400);
    expect(store.created.size).toBe(0);
    expect((await store.load(LARGE)).sold).toBe(0);
    expect(mails).toHaveLength(0);
  });

  it('rejects a missing signature and a tampered body', async () => {
    const { store, deps } = setup();
    const body = eventBody('checkout.session.completed', paidSession());
    expect((await handleWebhook(body, null, deps)).status).toBe(400);
    const header = await signed(body);
    expect((await handleWebhook(body.replace('45000', '1'), header, deps)).status).toBe(400);
    expect(store.created.size).toBe(0);
  });
});

describe('checkout.session.completed', () => {
  it('creates the order with edition 1 from the session', async () => {
    const { store, deps } = setup({ initial: [counter(0, ['res-1'])] });
    const res = await deliver(deps, 'checkout.session.completed', paidSession());

    expect(res.status).toBe(200);
    const c = await store.load(LARGE);
    expect(c.sold).toBe(1);
    expect(c.reservations).toHaveLength(0);
    expect(orders(store)).toEqual([
      {
        _id: orderId('cs_test_1'),
        _type: 'order',
        token: 'tok-1',
        status: 'paid',
        artworkSlug: 'la-espera',
        artworkTitle: 'La Espera',
        year: 2024,
        medium: 'Oil on canvas',
        format: 'large',
        widthCm: 80,
        heightCm: 100,
        editionNumber: 1,
        editionSize: 50,
        priceCents: 45000,
        shippingCents: 6000,
        region: 'EU_UK',
        stripeSessionId: 'cs_test_1',
        customer: {
          name: 'Ana Collector',
          email: 'ana@example.com',
          phone: '+34 600 000 000',
          address: {
            line1: 'Calle Ejemplo 7',
            line2: 'Piso 1A',
            city: 'Madrid',
            state: null,
            postalCode: '28000',
            country: 'ES',
          },
        },
        createdAt: new Date(EVENT_CREATED * 1000).toISOString(),
        shippedAt: null,
        carrier: null,
        trackingNumber: null,
        trackingUrl: null,
      },
    ]);
  });

  it('reads an empty year as null and a missing phone as null', async () => {
    const { store, deps } = setup();
    const s = paidSession();
    s.metadata = { ...s.metadata, year: '' };
    s.customer_details = { ...s.customer_details!, phone: null };
    await deliver(deps, 'checkout.session.completed', s);
    const [order] = orders(store);
    expect(order.year).toBeNull();
    expect(order.customer.phone).toBeNull();
  });

  it('emails Guillermo the full address and the collector none of it', async () => {
    const { mails, deps } = setup({ initial: [counter(11)] });
    await deliver(deps, 'checkout.session.completed', paidSession());

    expect(mails.map((m) => m.to)).toEqual([OWNER, 'ana@example.com']);
    const [owner, collector] = mails;
    expect(owner.text).toContain('Calle Ejemplo 7');
    expect(owner.text).toContain('12 / 50');
    const id = orderId('cs_test_1');
    expect(owner.text).toContain(`${SITE}/api/certificate?id=${id}&key=${signKey(id, CERT_SECRET)}`);
    expect(collector.text).toContain('12 / 50');
    expect(collector.text).toContain(`${SITE}/collector?o=tok-1`);
    expect(collector.text).not.toContain('Calle Ejemplo');
    expect(collector.html).not.toContain('Calle Ejemplo');
  });

  it('handles the same event twice as one order, one number, two emails', async () => {
    const { store, mails, refunds, deps } = setup({ initial: [counter(0, ['res-1'])] });
    const body = eventBody('checkout.session.completed', paidSession());
    const header = await signed(body);
    expect((await handleWebhook(body, header, deps)).status).toBe(200);
    expect((await handleWebhook(body, header, deps)).status).toBe(200);

    expect(store.created.size).toBe(1);
    expect((await store.load(LARGE)).sold).toBe(1);
    expect(mails).toHaveLength(2);
    expect(refunds).toHaveLength(0);
  });

  it('handles the same event delivered twice at once', async () => {
    const { store, mails, deps } = setup();
    const body = eventBody('checkout.session.completed', paidSession());
    const header = await signed(body);
    await Promise.all([handleWebhook(body, header, deps), handleWebhook(body, header, deps)]);
    expect(store.created.size).toBe(1);
    expect((await store.load(LARGE)).sold).toBe(1);
    expect(mails).toHaveLength(2);
  });

  it('numbers ten different payments 1 to 10 without duplicates', async () => {
    const { store, deps } = setup();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        deliver(deps, 'checkout.session.completed', paidSession(i + 1), `evt_${i + 1}`),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    const numbers = orders(store).map((o) => o.editionNumber).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((await store.load(LARGE)).sold).toBe(10);
  });

  it('ignores a session that is not paid yet', async () => {
    const { store, mails, deps } = setup();
    const res = await deliver(deps, 'checkout.session.completed', paidSession(1, { payment_status: 'unpaid' }));
    expect(res.status).toBe(200);
    expect(store.created.size).toBe(0);
    expect(mails).toHaveLength(0);
  });

  it('keeps the order and answers 200 when an email fails, logging which one', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, deps } = setup({ failMail: (m) => m.to === OWNER });
    const res = await deliver(deps, 'checkout.session.completed', paidSession());

    expect(res.status).toBe(200);
    expect(store.created.size).toBe(1);
    expect(mails.map((m) => m.to)).toEqual(['ana@example.com']);
    expect(log).toHaveBeenCalledWith(`stripe-webhook: owner email failed for ${orderId('cs_test_1')}: Error (ECONNRESET)`);
    expect(log.mock.calls.flat().join(' ')).not.toContain(OWNER);
  });

  it('answers 500 so Stripe retries when the edition ledger stays contended', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, deps } = setup();
    store.save = async () => 'conflict';
    const res = await handleWebhook(
      eventBody('checkout.session.completed', paidSession()),
      await signed(eventBody('checkout.session.completed', paidSession())),
      { ...deps, retry: { maxAttempts: 2, backoffMs: 0 } },
    );
    expect(res.status).toBe(500);
    expect(mails).toHaveLength(0);
    expect(log).toHaveBeenCalled();
  });
});

describe('sold out at payment', () => {
  it('refunds once, creates no order and tells both sides', async () => {
    const { store, mails, refunds, deps } = setup({ initial: [counter(EDITION_SIZE)] });
    const res = await deliver(deps, 'checkout.session.completed', paidSession(7));

    expect(res.status).toBe(200);
    expect(refunds).toEqual([
      { params: { payment_intent: 'pi_test_7' }, options: { idempotencyKey: 'refund-cs_test_7' } },
    ]);
    expect(store.created.size).toBe(0);
    expect((await store.load(LARGE)).sold).toBe(EDITION_SIZE);
    expect(mails.map((m) => m.to)).toEqual([OWNER, 'ana@example.com']);
    expect(mails[0].subject).toMatch(/refunded automatically/i);
    expect(mails[0].text).toMatch(/refund/i);
    expect(mails[1].text).toMatch(/refund/i);
  });

  it('raises ACTION NEEDED and answers 500 when the refund fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, refunds, deps } = setup({ initial: [counter(EDITION_SIZE)], failRefund: true });
    const res = await deliver(deps, 'checkout.session.completed', paidSession(7));

    expect(res.status).toBe(500);
    expect(refunds).toHaveLength(1);
    expect(store.created.size).toBe(0);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(OWNER);
    expect(mails[0].subject.startsWith('ACTION NEEDED')).toBe(true);
    expect(mails[0].text).toContain('card_declined');
    expect(log).toHaveBeenCalled();
  });
});

describe('checkout.session.expired', () => {
  it('releases the reservation', async () => {
    const { store, deps } = setup({ initial: [counter(0, ['res-1', 'res-2'])] });
    const res = await deliver(deps, 'checkout.session.expired', paidSession(1, { payment_status: 'unpaid' }));
    expect(res.status).toBe(200);
    expect((await store.load(LARGE)).reservations.map((r) => r.reservationId)).toEqual(['res-2']);
  });

  it('ignores a session without print metadata', async () => {
    const { store, deps } = setup({ initial: [counter(0, ['res-1'])] });
    const res = await deliver(deps, 'checkout.session.expired', paidSession(1, { metadata: {} }));
    expect(res.status).toBe(200);
    expect((await store.load(LARGE)).reservations).toHaveLength(1);
  });
});

it('acknowledges unknown event types without acting', async () => {
  const { store, mails, deps } = setup();
  const res = await deliver(deps, 'payment_intent.succeeded', { id: 'pi_1', object: 'payment_intent' });
  expect(res.status).toBe(200);
  expect(store.created.size).toBe(0);
  expect(mails).toHaveLength(0);
});

describe('review fixes', () => {
  it('logs the issued edition without personal data', async () => {
    const { deps } = setup({ initial: [counter(4)] });
    await deliver(deps, 'checkout.session.completed', paidSession());
    expect(info).toHaveBeenCalledWith(`stripe-webhook: issued edition 5 for ${orderId('cs_test_1')}`);
  });

  it('handles a sold-out event delivered twice as one refund and two emails', async () => {
    const { mails, refunds, deps } = setup({ initial: [counter(EDITION_SIZE)] });
    const body = eventBody('checkout.session.completed', paidSession(7));
    const header = await signed(body);
    expect((await handleWebhook(body, header, deps)).status).toBe(200);
    expect((await handleWebhook(body, header, deps)).status).toBe(200);
    expect(refunds).toHaveLength(1);
    expect(mails).toHaveLength(2);
  });

  it('does nothing more when the payment already has a refund', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, refunds, deps } = setup({
      initial: [counter(EDITION_SIZE)],
      existingRefunds: [{ status: 'succeeded' }],
    });
    const res = await deliver(deps, 'checkout.session.completed', paidSession(7));
    expect(res.status).toBe(200);
    expect(refunds).toHaveLength(0);
    expect(mails).toHaveLength(0);
    expect(store.created.size).toBe(0);
    expect(log).toHaveBeenCalledWith('stripe-webhook: refund already exists for cs_test_7');
  });

  it('refunds again when the only earlier refund failed', async () => {
    const { mails, refunds, deps } = setup({ initial: [counter(EDITION_SIZE)], existingRefunds: [{ status: 'failed' }] });
    expect((await deliver(deps, 'checkout.session.completed', paidSession(7))).status).toBe(200);
    expect(refunds).toHaveLength(1);
    expect(mails).toHaveLength(2);
  });

  it.each([
    ['a missing token', { token: '' }],
    ['an unknown region', { region: 'toString' }],
    ['an unknown format', { format: 'medium' }],
    ['a non-numeric width', { widthCm: 'abc' }],
    ['an empty height', { heightCm: '' }],
    ['a non-numeric year', { year: 'MMXXIV' }],
  ])('alerts Guillermo about a paid print session with %s', async (_, bad) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, deps } = setup();
    const s = paidSession(3);
    s.metadata = { ...s.metadata, ...bad };
    const res = await deliver(deps, 'checkout.session.completed', s);

    expect(res.status).toBe(200);
    expect(store.created.size).toBe(0);
    expect(mails).toHaveLength(1);
    const [alert] = mails;
    expect(alert.to).toBe(OWNER);
    expect(alert.subject).toBe('ACTION NEEDED: paid session cs_test_3 could not become an order');
    expect(alert.text).toContain('pi_test_3');
    for (const pii of ['ana@example.com', 'Calle Ejemplo', 'Ana Collector', '+34 600']) {
      expect(alert.text).not.toContain(pii);
      expect(alert.html).not.toContain(pii);
    }
    expect(log).toHaveBeenCalledWith('stripe-webhook: paid session cs_test_3 has invalid print metadata');
  });

  it('stays silent for a paid session with no print metadata at all', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, mails, deps } = setup();
    const res = await deliver(deps, 'checkout.session.completed', paidSession(1, { metadata: {} }));
    expect(res.status).toBe(200);
    expect(store.created.size).toBe(0);
    expect(mails).toHaveLength(0);
    expect(log).not.toHaveBeenCalled();
  });

  it('keeps the order and still emails the collector when a template throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(email.ownerNotification).mockImplementationOnce(() => {
      throw new TypeError('template broke');
    });
    const { store, mails, deps } = setup();
    const res = await deliver(deps, 'checkout.session.completed', paidSession());
    expect(res.status).toBe(200);
    expect(store.created.size).toBe(1);
    expect(mails.map((m) => m.to)).toEqual(['ana@example.com']);
    expect(log).toHaveBeenCalledWith(`stripe-webhook: owner email failed for ${orderId('cs_test_1')}: TypeError`);
  });

  it('keeps the order when the mail client cannot be created', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { store, deps } = setup();
    const sendMail = email.resendMailer(() => {
      throw new Error('Missing environment variable RESEND_API_KEY');
    });
    const res = await deliver({ ...deps, sendMail }, 'checkout.session.completed', paidSession());
    expect(res.status).toBe(200);
    expect(store.created.size).toBe(1);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
