import { ordersClient, readClient } from '../lib/clients';
import { sanityArtworkReader, SLUG_PATTERN, type ArtworkReader } from '../lib/artworks';
import { json, serverError, type Reply } from '../lib/http';
import { createSanityEditionStore } from '../lib/sanity-store';
import { counterId, remaining, type EditionStore } from '../../src/lib/prints/edition';
import { printOffers } from '../../src/lib/prints/offer';
import type { Format } from '../../src/lib/prints/print-sizes';

export type Stock = Record<Format, number | null>;
export type StockDeps = { readArtwork: ArtworkReader; store: EditionStore; now: () => Date };

export async function handleStock(slug: string | null, deps: StockDeps): Promise<Reply<Stock | { error: 'invalid' }>> {
  if (!slug || !SLUG_PATTERN.test(slug)) return { status: 400, body: { error: 'invalid' } };

  const stock: Stock = { large: null, small: null };
  const artwork = await deps.readArtwork(slug);
  if (!artwork) return { status: 200, body: stock };

  const now = deps.now();
  await Promise.all(
    printOffers(artwork).map(async ({ format }) => {
      stock[format] = remaining(await deps.store.load(counterId(slug, format)), now);
    }),
  );
  return { status: 200, body: stock };
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ status: 405, body: { error: 'method' } });
  try {
    const slug = new URL(req.url).searchParams.get('slug');
    const deps = {
      readArtwork: sanityArtworkReader(readClient()),
      store: createSanityEditionStore(ordersClient()),
      now: () => new Date(),
    };
    return json(await handleStock(slug, deps));
  } catch (err) {
    return serverError('stock', err);
  }
};

export const config = { path: '/api/stock' };
