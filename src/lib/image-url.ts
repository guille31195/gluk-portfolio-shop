// Sized Sanity CDN image URLs. The data layer returns originals (up to ~35 MP
// camera files); every <img> should request only the width it displays.
// Non-Sanity URLs (local placeholders) pass through unchanged.
const SANITY_CDN = 'https://cdn.sanity.io/images/';

export const CARD_WIDTHS = [400, 800, 1200];
export const CARD_WIDTH = 800;
export const DETAIL_WIDTH = 2000;
export const THUMB_WIDTH = 200;

export function sizedImage(url: string, width: number): string {
  if (!url.startsWith(SANITY_CDN)) return url;
  const base = url.split('?')[0];
  return `${base}?w=${width}&auto=format&q=80`;
}

export function imageSrcset(url: string, widths: number[]): string | undefined {
  if (!url.startsWith(SANITY_CDN)) return undefined;
  return widths.map((w) => `${sizedImage(url, w)} ${w}w`).join(', ');
}

// Sanity asset filenames carry the original's pixel size (…-5000x6250.jpg),
// so a layout can know each image's proportions without fetching it.
export function imageAspect(url: string): number | null {
  const match = /-(\d+)x(\d+)\.[a-z]+(?:\?|$)/i.exec(url);
  if (!match) return null;
  const [w, h] = [Number(match[1]), Number(match[2])];
  return w > 0 && h > 0 ? w / h : null;
}
