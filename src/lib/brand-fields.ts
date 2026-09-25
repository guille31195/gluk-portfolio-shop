// Brand gradient fields as CSS layers. The colours are sampled from the brand
// kit on a grid by scripts/build-brand-assets.mjs; each sampled row becomes a
// horizontal gradient, and each row fades in over the one above it, so the
// stack interpolates the field in both directions at any screen resolution.
import data from './brand-fields.data.json';

export type BrandFieldKind = 'field-1' | 'field-2' | 'field-3' | 'veil';
type Rgb = number[];

export const BRAND_FIELDS = data as Record<BrandFieldKind, Rgb[][]>;

export interface FieldLayer {
  background: string;
  mask: string | null;
}

const pct = (i: number, n: number) => `${Math.round((i / (n - 1)) * 1000) / 10}%`;

export function fieldLayers(grid: Rgb[][]): FieldLayer[] {
  return grid.map((row, r) => ({
    background: `linear-gradient(to right, ${row.map(([red, g, b], c) => `rgb(${red} ${g} ${b}) ${pct(c, row.length)}`).join(', ')})`,
    mask: r === 0 ? null : `linear-gradient(to bottom, transparent ${pct(r - 1, grid.length)}, #000 ${pct(r, grid.length)})`,
  }));
}
