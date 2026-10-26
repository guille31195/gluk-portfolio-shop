import { describe, expect, it } from 'vitest';
import {
  EXCLUDED_COUNTRIES,
  SHIPPING_RATES_USD,
  countriesInRegion,
  regionForCountry,
  shippingCents,
  type RegionId,
} from './shipping';

const REGIONS: RegionId[] = ['MX', 'US_CA', 'LATAM', 'EU_UK', 'ROW'];

describe('regionForCountry', () => {
  it.each([
    ['MX', 'MX'],
    ['US', 'US_CA'],
    ['CA', 'US_CA'],
    ['VE', 'LATAM'],
    ['BR', 'LATAM'],
    ['ES', 'EU_UK'],
    ['GB', 'EU_UK'],
    ['DE', 'EU_UK'],
    ['JP', 'ROW'],
    ['AU', 'ROW'],
  ])('maps %s to %s', (iso, region) => {
    expect(regionForCountry(iso)).toBe(region);
  });

  it.each(['CU', 'XX'])('returns null for %s', (iso) => {
    expect(regionForCountry(iso)).toBeNull();
  });

  it('returns null for every excluded country', () => {
    for (const iso of EXCLUDED_COUNTRIES) expect(regionForCountry(iso)).toBeNull();
  });
});

describe('shipping rates', () => {
  it('converts USD to cents', () => {
    expect(shippingCents('US_CA')).toBe(5000);
    expect(shippingCents('MX')).toBe(2000);
  });

  it('defines a rate for every region', () => {
    expect(SHIPPING_RATES_USD).toEqual({ MX: 20, US_CA: 50, LATAM: 60, EU_UK: 60, ROW: 80 });
  });
});

describe('countriesInRegion', () => {
  it('never lists a country in two regions', () => {
    const all = REGIONS.flatMap(countriesInRegion);
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps excluded countries out of ROW', () => {
    const row = countriesInRegion('ROW');
    for (const iso of EXCLUDED_COUNTRIES) expect(row).not.toContain(iso);
  });

  it('returns sorted ISO-2 codes that round-trip', () => {
    for (const region of REGIONS) {
      const list = countriesInRegion(region);
      expect(list).toEqual([...list].sort());
      for (const iso of list) {
        expect(iso).toMatch(/^[A-Z]{2}$/);
        expect(regionForCountry(iso)).toBe(region);
      }
    }
  });
});
