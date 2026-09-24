// Build-time only: fetch a 100px thumbnail from the Sanity CDN and measure its
// edge luminance. Failures never break the build — they return null (halo off).
import sharp from 'sharp';
import { edgeLuminance } from './halo';

const SANITY_CDN = 'https://cdn.sanity.io/images/';

interface FetchLike {
  (url: string): Promise<{ ok: boolean; status?: number; arrayBuffer(): Promise<ArrayBuffer> }>;
}

export interface MeasureDeps {
  fetch?: FetchLike;
  warn?: (message: string) => void;
}

const cache = new Map<string, Promise<number | null>>();

export function measureEdge(imageUrl: string, deps: MeasureDeps = {}): Promise<number | null> {
  if (!imageUrl.startsWith(SANITY_CDN)) return Promise.resolve(null);
  const cached = cache.get(imageUrl);
  if (cached) return cached;
  const fetchImpl = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const warn = deps.warn ?? ((message: string) => console.warn(message));
  const pending = (async () => {
    try {
      const res = await fetchImpl(`${imageUrl.split('?')[0]}?w=100&fm=png`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const input = Buffer.from(await res.arrayBuffer());
      const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      return edgeLuminance(data, info.width, info.height, info.channels);
    } catch (error) {
      warn(`[halo] could not measure ${imageUrl}: ${(error as Error).message}`);
      return null;
    }
  })();
  cache.set(imageUrl, pending);
  return pending;
}
