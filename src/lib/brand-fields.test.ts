import { describe, it, expect } from 'vitest';
import { fieldLayers, BRAND_FIELDS } from './brand-fields';

describe('fieldLayers', () => {
  const grid = [
    [[0, 0, 0], [255, 0, 0]],
    [[0, 0, 255], [255, 255, 255]],
    [[10, 20, 30], [40, 50, 60]],
  ];

  it('draws each sampled row as a left-to-right gradient', () => {
    const layers = fieldLayers(grid);
    expect(layers).toHaveLength(3);
    expect(layers[0].background).toBe('linear-gradient(to right, rgb(0 0 0) 0%, rgb(255 0 0) 100%)');
    expect(layers[2].background).toBe('linear-gradient(to right, rgb(10 20 30) 0%, rgb(40 50 60) 100%)');
  });

  it('fades each row in from the row above, so rows blend vertically', () => {
    const [first, second, third] = fieldLayers(grid);
    expect(first.mask).toBeNull();
    expect(second.mask).toBe('linear-gradient(to bottom, transparent 0%, #000 50%)');
    expect(third.mask).toBe('linear-gradient(to bottom, transparent 50%, #000 100%)');
  });

  it('has sampled data for every backdrop kind', () => {
    for (const kind of ['field-1', 'field-2', 'field-3', 'veil'] as const) {
      expect(BRAND_FIELDS[kind].length).toBeGreaterThan(1);
      expect(BRAND_FIELDS[kind][0].length).toBeGreaterThan(1);
    }
  });
});
