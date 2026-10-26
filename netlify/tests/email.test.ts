import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  brokenSessionAlert,
  certificateUrl,
  collectorConfirmation,
  FROM,
  orderUrl,
  ownerNotification,
  refundApology,
  refundFailedAlert,
  refundedNotice,
  resendMailer,
} from '../lib/email';
import { defaultSiteUrl } from '../lib/http';
import { signKey, type Order } from '../../src/lib/prints/order';

const SITE = 'https://glukart.test';

const ORDER: Order = {
  _id: 'order-cs_test_1',
  _type: 'order',
  token: 'tok-abc',
  status: 'paid',
  artworkSlug: 'la-espera',
  artworkTitle: 'La Espera',
  year: 2024,
  medium: 'Oil on canvas',
  format: 'large',
  widthCm: 80,
  heightCm: 100,
  editionNumber: 12,
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
  createdAt: '2026-10-26T12:00:00.000Z',
  shippedAt: null,
  carrier: null,
  trackingNumber: null,
  trackingUrl: null,
  ownerNotifiedAt: null,
};

const CERT = certificateUrl(ORDER._id, 'cert-secret', SITE);

describe('links', () => {
  it('builds the order link from the token', () => {
    expect(orderUrl('tok-abc', SITE)).toBe(`${SITE}/collector?o=tok-abc`);
  });

  it('signs the certificate link with the order id', () => {
    const key = signKey(ORDER._id, 'cert-secret');
    expect(CERT).toBe(`${SITE}/api/certificate?id=order-cs_test_1&key=${key}`);
  });
});

describe('ownerNotification', () => {
  const mail = ownerNotification(ORDER, CERT, SITE);

  it('names the piece and edition in the subject', () => {
    expect(mail.subject).toContain('La Espera');
    expect(mail.subject).toContain('12 / 50');
  });

  it.each(['text', 'html'] as const)('carries everything needed to ship (%s)', (part) => {
    const body = mail[part];
    for (const fact of [
      'Ana Collector',
      'ana@example.com',
      '+34 600 000 000',
      'Calle Ejemplo 7',
      'Piso 1A',
      'Madrid',
      '28000',
      'Spain',
      'La Espera',
      'Large',
      '80 × 100 cm',
      '12 / 50',
      part === 'html' ? 'Europe &amp; UK' : 'Europe & UK',
      'DHL Express',
      '$450.00',
      '$60.00',
      '$510.00',
      'USD',
      `${SITE}/collector?o=tok-abc`,
    ]) {
      expect(body).toContain(fact);
    }
    expect(body).toContain(part === 'html' ? CERT.replace('&', '&amp;') : CERT);
  });

  it('leaves out the phone line when none was collected', () => {
    const mail = ownerNotification({ ...ORDER, customer: { ...ORDER.customer, phone: null } }, CERT, SITE);
    expect(mail.text).not.toMatch(/phone/i);
    expect(mail.text).not.toContain('null');
  });
});

describe('collectorConfirmation', () => {
  const mail = collectorConfirmation(ORDER, SITE);

  it('confirms the piece, format, size and edition with the order link', () => {
    expect(mail.subject).toContain('La Espera');
    expect(mail.subject).toContain('12 / 50');
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain('La Espera');
      expect(part).toContain('Large');
      expect(part).toContain('80 × 100 cm');
      expect(part).toContain('12 / 50');
      expect(part).toContain(`${SITE}/collector?o=tok-abc`);
    }
  });

  it('carries no street address and no phone', () => {
    for (const part of [mail.text, mail.html]) {
      expect(part).not.toContain('Calle Ejemplo');
      expect(part).not.toContain('Piso 1A');
      expect(part).not.toContain('28000');
      expect(part).not.toContain('+34 600 000 000');
    }
  });
});

describe('html escaping', () => {
  const hostile: Order = {
    ...ORDER,
    artworkTitle: 'Rojo & <b>Negro</b>',
    customer: {
      ...ORDER.customer,
      name: '<script>alert(1)</script>',
      address: { ...ORDER.customer.address, line1: '"><img src=x onerror=alert(1)>' },
    },
  };

  it.each([
    ['owner', ownerNotification(hostile, CERT, SITE)],
    ['collector', collectorConfirmation(hostile, SITE)],
    ['refunded', refundedNotice(hostile, 'pi_1')],
    ['apology', refundApology(hostile)],
    ['refund failed', refundFailedAlert(hostile, 'pi_1', '<i>boom</i>')],
  ])('escapes user strings in the %s email', (_, mail) => {
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).not.toContain('<b>Negro');
    expect(mail.html).not.toContain('<i>boom');
    expect(mail.html).toContain('Rojo &amp; &lt;b&gt;Negro&lt;/b&gt;');
  });

  it('escapes the session id in the broken-session alert', () => {
    const { html } = brokenSessionAlert('<i>cs</i>', 'pi_1');
    expect(html).not.toContain('<i>cs');
    expect(html).toContain('&lt;i&gt;cs&lt;/i&gt;');
  });

  it('keeps the plain text readable', () => {
    expect(ownerNotification(hostile, CERT, SITE).text).toContain('<script>alert(1)</script>');
  });
});

describe('refund emails', () => {
  it('tells Guillermo the order was refunded automatically and why', () => {
    const mail = refundedNotice(ORDER, 'pi_123');
    expect(mail.subject).toMatch(/refunded automatically/i);
    expect(mail.subject).toContain('La Espera');
    expect(mail.text).toMatch(/sold out/i);
    expect(mail.text).toContain('pi_123');
    expect(mail.text).toContain('ana@example.com');
    expect(mail.text).toContain('$510.00');
  });

  it('apologises to the collector without an address or promises', () => {
    const mail = refundApology(ORDER);
    expect(mail.text).toContain('La Espera');
    expect(mail.text).toMatch(/refund/i);
    expect(mail.text).toContain('$510.00');
    expect(mail.text).not.toContain('Calle Ejemplo');
  });

  it('flags a failed refund as urgent', () => {
    const mail = refundFailedAlert(ORDER, 'pi_123', 'card_declined');
    expect(mail.subject.startsWith('ACTION NEEDED')).toBe(true);
    expect(mail.text).toContain('pi_123');
    expect(mail.text).toContain('card_declined');
    expect(mail.text).toContain('ana@example.com');
  });
});

describe('resendMailer', () => {
  const mail = { to: 'a@example.com', subject: 'S', html: '<p>H</p>', text: 'H' };

  it('sends from orders@glukart.com', async () => {
    const sent: unknown[] = [];
    const send = resendMailer(() => ({ emails: { send: async (p) => (sent.push(p), { data: { id: 'e1' }, error: null }) } }));
    await send(mail);
    expect(FROM).toContain('orders@glukart.com');
    expect(sent).toEqual([{ from: FROM, ...mail }]);
  });

  it('throws when Resend reports an error', async () => {
    const send = resendMailer(() => ({
      emails: { send: async () => ({ data: null, error: { message: 'domain not verified', name: 'validation_error' } }) },
    }));
    await expect(send(mail)).rejects.toMatchObject({ name: 'validation_error', message: 'domain not verified' });
  });
});

describe('resendMailer client', () => {
  const mail = { to: 'a@example.com', subject: 'S', html: '<p>H</p>', text: 'H' };

  it('creates the client on first send, once, so a missing key fails the send only', async () => {
    const factory = vi.fn(() => {
      throw new Error('Missing environment variable RESEND_API_KEY');
    });
    const send = resendMailer(factory);
    expect(factory).not.toHaveBeenCalled();
    await expect(send(mail)).rejects.toThrow('RESEND_API_KEY');

    let made = 0;
    const ok = resendMailer(() => (made++, { emails: { send: async () => ({ error: null }) } }));
    await ok(mail);
    await ok(mail);
    expect(made).toBe(1);
  });
});

describe('site url', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('falls back to glukart.com when SITE_URL is unset or empty', () => {
    vi.stubEnv('SITE_URL', '');
    expect(defaultSiteUrl()).toBe('https://glukart.com');
    expect(orderUrl('t')).toBe('https://glukart.com/collector?o=t');
    vi.stubEnv('SITE_URL', 'https://preview.glukart.test');
    expect(orderUrl('t')).toBe('https://preview.glukart.test/collector?o=t');
  });

  it('drops trailing slashes from SITE_URL', () => {
    vi.stubEnv('SITE_URL', 'https://glukart.com/');
    expect(defaultSiteUrl()).toBe('https://glukart.com');
    expect(orderUrl('t')).toBe('https://glukart.com/collector?o=t');
    vi.stubEnv('SITE_URL', 'https://glukart.com//');
    expect(defaultSiteUrl()).toBe('https://glukart.com');
  });
});

describe('ship-to address order', () => {
  const shipTo = (text: string) => text.split('\n\n').find((block) => block.startsWith('Ship to:'))!.split('\n').slice(1);

  it('writes City, State Postal for the United States', () => {
    const us = { line1: '742 Evergreen Terrace', line2: 'Apt 3', city: 'Springfield', state: 'OR', postalCode: '97477', country: 'US' };
    const mail = ownerNotification({ ...ORDER, customer: { ...ORDER.customer, address: us } }, CERT, SITE);
    expect(shipTo(mail.text)).toEqual(['Ana Collector', '742 Evergreen Terrace', 'Apt 3', 'Springfield, OR 97477', 'United States']);
  });

  it('writes Postal City for Spain', () => {
    expect(shipTo(ownerNotification(ORDER, CERT, SITE).text)).toEqual([
      'Ana Collector',
      'Calle Ejemplo 7',
      'Piso 1A',
      '28000 Madrid',
      'Spain',
    ]);
  });
});

describe('collector name the certificate cannot print', () => {
  const NOTE = 'Collector name could not be printed on the certificate: write it by hand';

  it('tells Guillermo to write a non-Latin name by hand', () => {
    const mail = ownerNotification({ ...ORDER, customer: { ...ORDER.customer, name: '山田 太郎' } }, CERT, SITE);
    expect(mail.text).toContain(NOTE);
    expect(mail.html).toContain(NOTE);
  });

  it('says nothing for a name the certificate prints', () => {
    expect(ownerNotification(ORDER, CERT, SITE).text).not.toContain(NOTE);
  });
});
