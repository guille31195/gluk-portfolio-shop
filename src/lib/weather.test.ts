import { describe, it, expect, vi } from 'vitest';
import { FORECAST_URL, MARINE_URL, WEATHER_CACHE_MS, loadWeather, parseWeather } from './weather';

// Shapes captured from the live Open-Meteo API on 2026-09-23.
const forecast = [
  { current: { temperature_2m: 24.2, relative_humidity_2m: 88 } },
  { current: { temperature_2m: 24.6, relative_humidity_2m: 39 } },
];
const marine = [{ current: { sea_surface_temperature: 26.4 } }, { current: { sea_surface_temperature: 30.9 } }];
const parsed = {
  origin: { air: 24.2, humidity: 88 },
  base: { air: 24.6, humidity: 39 },
  sea: { caribbean: 26.4, pacific: 30.9 },
};

describe('parseWeather', () => {
  it('reads both cities and both seas', () => {
    expect(parseWeather(forecast, marine)).toEqual(parsed);
  });
  it('keeps air data when the marine response is missing or malformed', () => {
    expect(parseWeather(forecast, null)).toEqual({ ...parsed, sea: { caribbean: null, pacific: null } });
    expect(parseWeather(forecast, [{ current: { sea_surface_temperature: 'hot' } }])?.sea).toEqual({
      caribbean: null,
      pacific: null,
    });
  });
  it('returns null when the forecast is not two locations of numbers', () => {
    expect(parseWeather(null, marine)).toBeNull();
    expect(parseWeather({ current: {} }, marine)).toBeNull();
    expect(parseWeather([forecast[0]], marine)).toBeNull();
    expect(parseWeather([{ current: { temperature_2m: '24' } }, forecast[1]], marine)).toBeNull();
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, json: async () => body });
}

describe('loadWeather', () => {
  it('fetches both endpoints, parses and caches', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const storage = memoryStorage();
    expect(await loadWeather({ fetch: fetchImpl, now: () => 1000, storage })).toEqual(parsed);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.data['gluk:weather'])).toEqual({ t: 1000, data: parsed });
  });

  it('uses a fresh cache without fetching', async () => {
    const fetchImpl = vi.fn();
    const storage = memoryStorage({ 'gluk:weather': JSON.stringify({ t: 0, data: parsed }) });
    expect(await loadWeather({ fetch: fetchImpl, now: () => WEATHER_CACHE_MS - 1, storage })).toEqual(parsed);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refetches when the cache is stale or corrupt', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const stale = memoryStorage({ 'gluk:weather': JSON.stringify({ t: 0, data: parsed }) });
    await loadWeather({ fetch: fetchImpl, now: () => WEATHER_CACHE_MS + 1, storage: stale });
    const corrupt = memoryStorage({ 'gluk:weather': '{not json' });
    await loadWeather({ fetch: fetchImpl, now: () => 5, storage: corrupt });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('returns null when the forecast fetch fails, and never throws', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    expect(await loadWeather({ fetch: fetchImpl, now: () => 0, storage: null })).toBeNull();
  });

  it('still returns air data when only the marine fetch fails', async () => {
    const fetchImpl = vi.fn((url: string) => (url === FORECAST_URL ? okJson(forecast) : Promise.reject(new Error('x'))));
    expect((await loadWeather({ fetch: fetchImpl, now: () => 0, storage: null }))?.sea).toEqual({
      caribbean: null,
      pacific: null,
    });
  });

  it('survives a storage that throws', async () => {
    const fetchImpl = vi.fn((url: string) => okJson(url === FORECAST_URL ? forecast : marine));
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(await loadWeather({ fetch: fetchImpl, now: () => 0, storage: throwing })).toEqual(parsed);
  });

  it('points at the two cities and the two sea points', () => {
    expect(FORECAST_URL).toContain('latitude=10.4806,19.4326');
    expect(FORECAST_URL).toContain('longitude=-66.9036,-99.1332');
    expect(MARINE_URL).toContain('latitude=10.65,16.8');
    expect(MARINE_URL).toContain('longitude=-66.93,-99.9');
  });
});
