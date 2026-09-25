import { describe, it, expect } from 'vitest';
import {
  CARACAS,
  MEXICO_CITY,
  bearingDeg,
  compassPoint,
  distanceKm,
  formatClock,
  formatElevation,
  formatPercent,
  formatRoute,
  formatTemp,
  formatThousands,
} from './route-data';

describe('places', () => {
  it('holds the real coordinates, zones and elevations', () => {
    expect(CARACAS).toMatchObject({ short: 'CCS', timeZone: 'America/Caracas', lat: 10.4806, lon: -66.9036, elevation: 882 });
    expect(MEXICO_CITY).toMatchObject({ short: 'CDMX', timeZone: 'America/Mexico_City', lat: 19.4326, lon: -99.1332, elevation: 2230 });
  });
});

describe('formatClock', () => {
  const instant = new Date('2026-09-23T21:34:00Z');
  it('shows 24-hour local time in each city', () => {
    expect(formatClock(instant, 'America/Caracas')).toBe('17:34');
    expect(formatClock(instant, 'America/Mexico_City')).toBe('15:34');
  });
  it('keeps two-digit hours after midnight', () => {
    expect(formatClock(new Date('2026-09-24T04:05:00Z'), 'America/Caracas')).toBe('00:05');
  });
});

describe('route', () => {
  it('computes the real distance and heading Caracas → Mexico City', () => {
    expect(distanceKm(CARACAS, MEXICO_CITY)).toBe(3595);
    expect(bearingDeg(CARACAS, MEXICO_CITY)).toBe(289.9);
    expect(compassPoint(289.9)).toBe('WNW');
    expect(formatRoute(CARACAS, MEXICO_CITY)).toBe('3 595 km · 289.9° WNW');
  });
  it('maps compass points at the edges', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(359)).toBe('N');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(202.5)).toBe('SSW');
  });
});

describe('formatting', () => {
  it('groups thousands with spaces', () => {
    expect(formatThousands(882)).toBe('882');
    expect(formatThousands(2230)).toBe('2 230');
    expect(formatElevation(2230)).toBe('2 230 m');
  });
  it('formats temperatures and percentages, with a dash for missing values', () => {
    expect(formatTemp(26.4)).toBe('26.4°');
    expect(formatTemp(24)).toBe('24.0°');
    expect(formatTemp(null)).toBe('—');
    expect(formatPercent(88.4)).toBe('88%');
    expect(formatPercent(null)).toBe('—');
  });
});
