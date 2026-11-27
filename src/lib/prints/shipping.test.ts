import { describe, expect, it } from 'vitest';
import { printSizes } from './print-sizes';
import {
  EXCLUDED_COUNTRIES,
  OVERSIZE_LONG_SIDE_CM,
  OVERSIZE_SHIPPING_USD,
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
    expect(shippingCents('US_CA')).toBe(11500);
    expect(shippingCents('MX')).toBe(4000);
  });

  it('charges a flat 200 USD in every region for a work longer than 1 m', () => {
    for (const region of REGIONS) {
      expect(shippingCents(region, { widthCm: 90, heightCm: 100.5 })).toBe(20000);
      expect(shippingCents(region, { widthCm: 101, heightCm: 40 })).toBe(OVERSIZE_SHIPPING_USD * 100);
    }
  });

  it('keeps the regional rate at exactly 1 m and below', () => {
    expect(shippingCents('US_CA', { widthCm: 70, heightCm: 100 })).toBe(11500);
    expect(shippingCents('EU_UK', { widthCm: 50, heightCm: 60 })).toBe(15500);
  });

  it('never meets the oversize rule for a print, so the price on artwork pages is always right', () => {
    for (const [w, h] of [[70, 90], [235, 90], [300, 300], [120, 150], [40, 40]]) {
      for (const size of Object.values(printSizes(w, h))) {
        expect(Math.max(size.widthCm, size.heightCm)).toBeLessThanOrEqual(OVERSIZE_LONG_SIDE_CM);
      }
    }
  });

  it('defines a rate for every region', () => {
    expect(SHIPPING_RATES_USD).toEqual({ MX: 40, US_CA: 115, LATAM: 140, EU_UK: 155, ROW: 195 });
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
