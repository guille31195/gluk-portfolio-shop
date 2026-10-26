import type { SanityClient } from '@sanity/client';
import { ordersClient } from '../lib/clients';
import { renderCertificate } from '../lib/certificate-pdf';
import { json, serverError } from '../lib/http';
import { verifyKey, type Order } from '../../src/lib/prints/order';

export type CertificateOrderReader = (id: string) => Promise<Order | null>;
export type CertificateDeps = {
  secret: string | undefined;
  read: CertificateOrderReader;
  render: (order: Order) => Promise<Uint8Array>;
};
export type CertificateReply = { status: number; body: Uint8Array | { error: string }; filename?: string };

export const ID_PATTERN = /^order-[A-Za-z0-9_]+$/;
export const CERTIFICATE_QUERY: string = '*[_type=="order" && _id==$id][0]';

export function sanityCertificateReader(client: SanityClient): CertificateOrderReader {
  return (id) => client.fetch<Order | null>(CERTIFICATE_QUERY, { id });
}

const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'print';

export async function handleCertificate(
  id: string | null,
  key: string | null,
  deps: CertificateDeps,
): Promise<CertificateReply> {
  if (!id || !ID_PATTERN.test(id)) return { status: 400, body: { error: 'invalid' } };
  if (!deps.secret) return { status: 500, body: { error: 'server' } };
  if (!verifyKey(id, key, deps.secret)) return { status: 403, body: { error: 'forbidden' } };
  const order = await deps.read(id);
  if (!order || order.status === 'void') return { status: 404, body: { error: 'not-found' } };
  return {
    status: 200,
    body: await deps.render(order),
    filename: `gluk-${slugify(order.artworkSlug || order.artworkTitle)}-${order.editionNumber}-of-${order.editionSize}.pdf`,
  };
}

export function toResponse(r: CertificateReply): Response {
  if (!(r.body instanceof Uint8Array)) {
    const res = json({ status: r.status, body: r.body });
    res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  }
  return new Response(new Uint8Array(r.body), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${r.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return toResponse({ status: 405, body: { error: 'method' } });
  try {
    const params = new URL(req.url).searchParams;
    return toResponse(
      await handleCertificate(params.get('id'), params.get('key'), {
        secret: process.env.CERT_SECRET,
        read: (id) => sanityCertificateReader(ordersClient())(id),
        render: (order) => renderCertificate(order),
      }),
    );
  } catch (err) {
    return serverError('certificate', err);
  }
};

export const config = { path: '/api/certificate' };
