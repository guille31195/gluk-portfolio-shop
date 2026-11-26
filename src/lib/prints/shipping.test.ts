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

  it('is case-insensitive', () => {
    expect(regionForCountry('mx')).toBe('MX');
  });

  it('returns null for empty or non-string input without throwing', () => {
    expect(regionForCountry('')).toBeNull();
    expect(regionForCountry(undefined as unknown as string)).toBeNull();
    expect(regionForCountry(null as unknown as string)).toBeNull();
  });

  it.each(['GP', 'MQ', 'GF', 'BL', 'MF', 'FK'])('places %s in LATAM', (iso) => {
    expect(regionForCountry(iso)).toBe('LATAM');
  });

  it('returns null for every excluded country', () => {
    for (const iso of EXCLUDED_COUNTRIES) expect(regionForCountry(iso)).toBeNull();
  });
});

describe('shipping rates', () => {
  it('converts USD to cents', () => {
    expect(shippingCents('US_CA')).toBe(7000);
    expect(shippingCents('MX')).toBe(2500);
  });

  it('defines a rate for every region', () => {
    expect(SHIPPING_RATES_USD).toEqual({ MX: 25, US_CA: 70, LATAM: 85, EU_UK: 95, ROW: 120 });
  });
});

describe('countriesInRegion', () => {
  it('lists only Mexico in MX and only US and CA in US_CA', () => {
    expect(countriesInRegion('MX')).toEqual(['MX']);
    expect(countriesInRegion('US_CA')).toEqual(['CA', 'US']);
  });

  it('returns a fresh array each call', () => {
    countriesInRegion('MX').push('ZZ');
    countriesInRegion('ROW').length = 0;
    expect(countriesInRegion('MX')).toEqual(['MX']);
    expect(countriesInRegion('ROW')).toContain('JP');
  });

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
