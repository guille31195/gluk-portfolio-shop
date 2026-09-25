// Halo resolution (spec §6.2): dark-edged paintings disappear on the veil, so
// they get a soft glow behind the canvas. Pure; see halo-measure.ts for I/O.
import type { HaloSetting } from './artwork-map';

// Measured 2026-09-23: darkest edges 0.006–0.007, next darkest 0.042.
export const HALO_EDGE_THRESHOLD = 0.02;
export const HALO_EDGE_BAND = 0.08;

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Mean relative luminance (0–1) of the outer `band` fraction of the image.
export function edgeLuminance(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  channels: number,
  band = HALO_EDGE_BAND
): number {
  const b = Math.max(1, Math.round(Math.min(width, height) * band));
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= b && x < width - b && y >= b && y < height - b) continue;
      const i = (y * width + x) * channels;
      sum += 0.2126 * toLinear(pixels[i]) + 0.7152 * toLinear(pixels[i + 1]) + 0.0722 * toLinear(pixels[i + 2]);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

export interface HaloInput {
  slug: string;
  haloSetting: HaloSetting;
  series: { slug: string; halo: HaloSetting } | null;
  edge: number | null;
}

function ownHalo(item: HaloInput): boolean {
  if (item.haloSetting === 'always') return true;
  if (item.haloSetting === 'never') return false;
  return item.edge !== null && item.edge < HALO_EDGE_THRESHOLD;
}

// A series shares one treatment: its own always/never wins, otherwise the
// darkest member decides (any member on → all on).
export function resolveHalos(items: HaloInput[]): Map<string, boolean> {
  const result = new Map<string, boolean>();
  const seriesOn = new Map<string, boolean>();
  for (const item of items) {
    const own = ownHalo(item);
    result.set(item.slug, own);
    if (item.series) seriesOn.set(item.series.slug, (seriesOn.get(item.series.slug) ?? false) || own);
  }
  for (const item of items) {
    if (!item.series) continue;
    const setting = item.series.halo;
    result.set(item.slug, setting === 'always' ? true : setting === 'never' ? false : seriesOn.get(item.series.slug)!);
  }
  return result;
}
