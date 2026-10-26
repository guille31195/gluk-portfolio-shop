import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { CERTIFICATE_COPY, CERTIFICATE_LIMITS, renderCertificate, renderCertificateDetailed } from '../lib/certificate-pdf';
import { handleCertificate, ID_PATTERN, CERTIFICATE_QUERY, sanityCertificateReader, toResponse } from '../functions/certificate';
import { signKey, type Order } from '../../src/lib/prints/order';

const SECRET = 'test-cert-secret';

const ORDER: Order = {
  _id: 'order-cs_test_123',
  _type: 'order',
  token: 'tok',
  status: 'paid',
  artworkSlug: 'perdi-el-coco',
  artworkTitle: 'Perdí el coco en un pueblo caribeño',
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
  stripeSessionId: 'cs_test_123',
  customer: {
    name: 'Ana Collector',
    email: 'ana@example.test',
    phone: null,
    address: { line1: '17 Calle Streetname', line2: null, city: 'Madrid', state: null, postalCode: '28013', country: 'ES' },
  },
  createdAt: '2026-10-26T12:00:00.000Z',
  shippedAt: null,
  carrier: null,
  trackingNumber: null,
  trackingUrl: null,
};

// Fonts are embedded as glyph ids, so text is checked on the placed-text list
// that renderCertificateDetailed returns alongside the PDF (same draw calls).
const placed = async (o: Order) => (await renderCertificateDetailed(o)).texts;

describe('renderCertificate', () => {
  it('produces a single-page A4 landscape PDF', async () => {
    const bytes = await renderCertificate(ORDER);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width / 72 * 25.4).toBeCloseTo(297, 1);
    expect(height / 72 * 25.4).toBeCloseTo(210, 1);
  });

  it('places the title, edition, collector and facts', async () => {
    const all = (await placed(ORDER)).map((t) => t.text);
    expect(all.join(' ')).toContain('Perdí el coco en un pueblo caribeño'); // wrapped over two lines
    expect(all).toEqual(
      expect.arrayContaining([
        '12 / 50',
        'Ana Collector',
        '2024',
        'Oil on canvas',
        '80 × 100 cm',
        '26 October 2026',
        'GLUKART.COM',
      ]),
    );
  });

  it('does not place the collector address or email', async () => {
    const all = (await placed(ORDER)).map((t) => t.text).join(' ');
    expect(all).not.toMatch(/Streetname|Madrid|28013|example\.test/);
  });

  it('renders accents and ñ without throwing', async () => {
    await expect(renderCertificate({ ...ORDER, artworkTitle: 'Perdí el coco en un pueblo caribeño' })).resolves.toBeInstanceOf(Uint8Array);
  });

  it('keeps a very long title inside the margins', async () => {
    const long = 'Una pintura con un título extraordinariamente largo que nadie debería poner a una obra ' + 'x'.repeat(40);
    const texts = await placed({ ...ORDER, artworkTitle: long });
    const titleLines = texts.filter((t) => t.size > 1.9 && t.text !== 'GLUKART.COM');
    expect(titleLines.length).toBeGreaterThan(0);
    for (const t of titleLines) expect(t.width).toBeLessThanOrEqual(CERTIFICATE_LIMITS.contentWidthCqw);
  });

  it('shrinks a long collector name and medium to fit their column', async () => {
    const texts = await placed({ ...ORDER, customer: { ...ORDER.customer, name: 'N'.repeat(80) }, medium: 'M'.repeat(80) });
    for (const t of texts) expect(t.x + t.width).toBeLessThanOrEqual(100 - CERTIFICATE_LIMITS.marginXCqw + 0.001);
  });

  it('leaves out an unknown year instead of inventing one', async () => {
    const all = (await placed({ ...ORDER, year: null })).map((t) => t.text);
    expect(all).not.toContain('Year'.toUpperCase());
  });

  it('switches wording by variant', async () => {
    const b = (await renderCertificateDetailed(ORDER, 'B')).texts.map((t) => t.text);
    expect(b).toContain(CERTIFICATE_COPY.B.kicker);
    expect(Object.keys(CERTIFICATE_COPY)).toEqual(['A', 'B', 'C']);
  });
});

describe('handleCertificate', () => {
  const id = ORDER._id;
  const deps = (order: Order | null = ORDER, secret: string | undefined = SECRET) => ({
    secret,
    read: vi.fn(async (i: string) => (order && i === order._id ? order : null)),
    render: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
  });

  it('serves the PDF for a correct key', async () => {
    const d = deps();
    const r = await handleCertificate(id, signKey(id, SECRET), d);
    expect(r.status).toBe(200);
    expect(r.body).toBeInstanceOf(Uint8Array);
    expect(r.filename).toBe('gluk-perdi-el-coco-12-of-50.pdf');
    expect(d.read).toHaveBeenCalledWith(id);
  });

  it('answers with PDF headers', () => {
    const res = toResponse({ status: 200, body: new Uint8Array([1]), filename: 'gluk-x-1-of-50.pdf' });
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="gluk-x-1-of-50.pdf"');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it.each([['wrong key', 'nope'], ['null key', null]])('rejects %s with 403 before reading the order', async (_n, key) => {
    const d = deps();
    expect((await handleCertificate(id, key, d)).status).toBe(403);
    expect(d.read).not.toHaveBeenCalled();
  });

  it('404s an unknown order', async () => {
    const other = 'order-cs_test_999';
    expect((await handleCertificate(other, signKey(other, SECRET), deps())).status).toBe(404);
  });

  it('404s a void order', async () => {
    expect((await handleCertificate(id, signKey(id, SECRET), deps({ ...ORDER, status: 'void' }))).status).toBe(404);
  });

  it.each([null, '', 'cs_test_1', 'order-', 'order-a b', 'order-../x'])('400s bad id %j', async (bad) => {
    expect((await handleCertificate(bad, 'k', deps())).status).toBe(400);
  });

  it('500s without CERT_SECRET and never reads the order', async () => {
    const d = { ...deps(), secret: undefined };
    const r = await handleCertificate(id, 'k', d);
    expect(r).toEqual({ status: 500, body: { error: 'server' } });
    expect(d.read).not.toHaveBeenCalled();
  });
});

describe('sanityCertificateReader', () => {
  it('queries by _id with a parameter', async () => {
    const fetch = vi.fn(async () => ORDER);
    await sanityCertificateReader({ fetch } as never)(ORDER._id);
    expect(fetch).toHaveBeenCalledWith(CERTIFICATE_QUERY, { id: ORDER._id });
    expect(CERTIFICATE_QUERY).toContain('$id');
    expect(ID_PATTERN.test(ORDER._id)).toBe(true);
  });
});
