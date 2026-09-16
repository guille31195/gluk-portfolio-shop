import { describe, it, expect } from 'vitest';
import { formatPrice } from './format-price';

describe('formatPrice', () => {
  it('formats whole-dollar cents as USD currency', () => {
    expect(formatPrice(4500)).toBe('$45.00');
  });

  it('formats cents with a fractional dollar amount', () => {
    expect(formatPrice(3099)).toBe('$30.99');
  });
});
