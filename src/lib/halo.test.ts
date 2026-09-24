import { describe, it, expect } from 'vitest';
import { HALO_EDGE_THRESHOLD, edgeLuminance, resolveHalos, type HaloInput } from './halo';

// width×height RGB image; `fill(x, y)` returns a 0–255 gray level.
function image(width: number, height: number, fill: (x: number, y: number) => number, channels = 3): number[] {
  const out: number[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = fill(x, y);
      out.push(v, v, v);
      if (channels === 4) out.push(255);
    }
  return out;
}

const border = (w: number, h: number, band: number) => (x: number, y: number) =>
  x < band || y < band || x >= w - band || y >= h - band;

describe('edgeLuminance', () => {
  it('is 0 for an all-black image and 1 for an all-white image', () => {
    expect(edgeLuminance(image(20, 20, () => 0), 20, 20, 3)).toBe(0);
    expect(edgeLuminance(image(20, 20, () => 255), 20, 20, 3)).toBeCloseTo(1, 5);
  });

  it('only looks at the border band', () => {
    const blackBorderWhiteCenter = image(50, 50, (x, y) => (border(50, 50, 4)(x, y) ? 0 : 255));
    expect(edgeLuminance(blackBorderWhiteCenter, 50, 50, 3)).toBe(0);
    const whiteBorderBlackCenter = image(50, 50, (x, y) => (border(50, 50, 4)(x, y) ? 255 : 0));
    expect(edgeLuminance(whiteBorderBlackCenter, 50, 50, 3)).toBeCloseTo(1, 5);
  });

  it('ignores the alpha channel', () => {
    expect(edgeLuminance(image(10, 10, () => 0, 4), 10, 10, 4)).toBe(0);
  });

  it('uses at least a 1-pixel band on tiny images', () => {
    expect(edgeLuminance(image(3, 3, () => 255), 3, 3, 3)).toBeCloseTo(1, 5);
  });
});

function item(slug: string, overrides: Partial<HaloInput> = {}): HaloInput {
  return { slug, haloSetting: 'auto', series: null, edge: 0.5, ...overrides };
}

describe('resolveHalos', () => {
  it('turns the halo on only for dark edges when set to auto', () => {
    const result = resolveHalos([
      item('dark', { edge: HALO_EDGE_THRESHOLD - 0.001 }),
      item('bright', { edge: 0.3 }),
      item('unknown', { edge: null }),
    ]);
    expect(result.get('dark')).toBe(true);
    expect(result.get('bright')).toBe(false);
    expect(result.get('unknown')).toBe(false);
  });

  it('respects per-artwork always/never', () => {
    const result = resolveHalos([
      item('forced-on', { haloSetting: 'always', edge: 0.9 }),
      item('forced-off', { haloSetting: 'never', edge: 0 }),
    ]);
    expect(result.get('forced-on')).toBe(true);
    expect(result.get('forced-off')).toBe(false);
  });

  it('gives a whole auto series the halo when any member needs it', () => {
    const violenta = { slug: 'violenta', halo: 'auto' as const };
    const result = resolveHalos([
      item('violenta-i', { series: violenta, edge: 0.042 }),
      item('violenta-ii', { series: violenta, edge: 0.007 }),
      item('other', { edge: 0.042 }),
    ]);
    expect(result.get('violenta-i')).toBe(true);
    expect(result.get('violenta-ii')).toBe(true);
    expect(result.get('other')).toBe(false);
  });

  it('lets a series-level always/never win over members', () => {
    const on = { slug: 'on', halo: 'always' as const };
    const off = { slug: 'off', halo: 'never' as const };
    const result = resolveHalos([
      item('a', { series: on, edge: 0.9 }),
      item('b', { series: off, edge: 0, haloSetting: 'always' }),
    ]);
    expect(result.get('a')).toBe(true);
    expect(result.get('b')).toBe(false);
  });
});
