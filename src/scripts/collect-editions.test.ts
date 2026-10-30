// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { editionLabel } from './collect-editions';

describe('editionLabel', () => {
  it('shows the next edition number', () => {
    expect(editionLabel('large', 50)).toBe('Large No. 1 / 50');
    expect(editionLabel('small', 38)).toBe('Small No. 13 / 50');
    expect(editionLabel('large', 1)).toBe('Large No. 50 / 50');
  });

  it('says sold out when none remain', () => {
    expect(editionLabel('small', 0)).toBe('Small sold out');
  });

  it('refuses a reading that is not a number', () => {
    expect(editionLabel('large', null)).toBeNull();
    expect(editionLabel('large', 'x')).toBeNull();
  });
});
