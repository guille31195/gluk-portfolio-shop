import type { QueryParams, SanityClient } from '@sanity/client';
import { ordersClient } from '../lib/clients';
import { json, type Reply } from '../lib/http';
import { toCollectorView, type CollectorView, type Order } from '../../src/lib/prints/order';

export type OrderReader = (token: string) => Promise<Order | null>;

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,}$/;
export const ORDER_QUERY: string = '*[_type=="order" && token==$token][0]';

export function sanityOrderReader(client: SanityClient): OrderReader {
  return (token) => client.fetch<Order | null>(ORDER_QUERY, { token } as unknown as QueryParams); // `token` is a reserved option name in the client types only
}

export async function handleOrder(
  token: string | null,
  read: OrderReader,
): Promise<Reply<CollectorView | { error: 'invalid' | 'not-found' }>> {
  if (!token || !TOKEN_PATTERN.test(token)) return { status: 400, body: { error: 'invalid' } };
  const order = await read(token);
  if (!order || order.status === 'void') return { status: 404, body: { error: 'not-found' } };
  return { status: 200, body: toCollectorView(order) };
}

const reply = <T>(r: Reply<T>): Response => {
  const res = json(r);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return reply({ status: 405, body: { error: 'method' } });
  try {
    const token = new URL(req.url).searchParams.get('o');
    return reply(await handleOrder(token, (t) => sanityOrderReader(ordersClient())(t)));
  } catch (err) {
    console.error(`order: ${err instanceof Error ? err.message : String(err)}`);
    return reply({ status: 500, body: { error: 'server' } });
  }
};

export const config = { path: '/api/order' };
