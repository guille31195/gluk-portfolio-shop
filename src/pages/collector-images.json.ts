// Built to /collector-images.json: artwork slug -> first image, public site
// data only, so the collector page can show the piece without the order API
// carrying an image.
import type { APIRoute } from 'astro';
import { getAllArtworks } from '../lib/sanity';

export const GET: APIRoute = async () => {
  const images: Record<string, string> = {};
  for (const artwork of await getAllArtworks()) {
    if (artwork.images[0]) images[artwork.slug] = artwork.images[0];
  }
  return new Response(JSON.stringify(images), { headers: { 'Content-Type': 'application/json' } });
};
