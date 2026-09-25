// Optional live weather for the data egg (spec §8). Only used when
// PUBLIC_LIVE_WEATHER=on — Open-Meteo's free API is non-commercial, so a paid
// plan (or another provider) must be chosen before enabling it.
import { CARACAS, MEXICO_CITY, SEA_POINTS } from './route-data';

export interface RouteWeather {
  origin: { air: number; humidity: number };
  base: { air: number; humidity: number };
  sea: { caribbean: number | null; pacific: number | null };
}

export const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${CARACAS.lat},${MEXICO_CITY.lat}` +
  `&longitude=${CARACAS.lon},${MEXICO_CITY.lon}&current=temperature_2m,relative_humidity_2m`;

export const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${SEA_POINTS.caribbean.lat},${SEA_POINTS.pacific.lat}` +
  `&longitude=${SEA_POINTS.caribbean.lon},${SEA_POINTS.pacific.lon}&current=sea_surface_temperature`;

export const WEATHER_CACHE_MS = 15 * 60 * 1000;
const CACHE_KEY = 'gluk:weather';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function current(list: unknown, index: number, field: string): unknown {
  if (!Array.isArray(list)) return undefined;
  const entry = list[index] as { current?: Record<string, unknown> } | undefined;
  return entry?.current?.[field];
}

export function parseWeather(forecast: unknown, marine: unknown): RouteWeather | null {
  if (!Array.isArray(forecast) || forecast.length < 2) return null;
  const values = [
    current(forecast, 0, 'temperature_2m'),
    current(forecast, 0, 'relative_humidity_2m'),
    current(forecast, 1, 'temperature_2m'),
    current(forecast, 1, 'relative_humidity_2m'),
  ];
  if (!values.every(isNum)) return null;
  const [oAir, oHum, bAir, bHum] = values as number[];
  const sea = (i: number) => {
    const v = current(marine, i, 'sea_surface_temperature');
    return isNum(v) ? v : null;
  };
  return { origin: { air: oAir, humidity: oHum }, base: { air: bAir, humidity: bHum }, sea: { caribbean: sea(0), pacific: sea(1) } };
}

interface JsonResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

export interface WeatherDeps {
  fetch: (url: string) => Promise<JsonResponse>;
  now: () => number;
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void } | null;
}

function readCache(deps: WeatherDeps): RouteWeather | null {
  try {
    const raw = deps.storage?.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { t: number; data: RouteWeather };
    return deps.now() - cached.t < WEATHER_CACHE_MS ? cached.data : null;
  } catch {
    return null;
  }
}

function writeCache(deps: WeatherDeps, data: RouteWeather): void {
  try {
    deps.storage?.setItem(CACHE_KEY, JSON.stringify({ t: deps.now(), data }));
  } catch {
    // Storage full or blocked: caching is optional.
  }
}

async function getJson(deps: WeatherDeps, url: string): Promise<unknown> {
  try {
    const res = await deps.fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function loadWeather(deps: WeatherDeps): Promise<RouteWeather | null> {
  const cached = readCache(deps);
  if (cached) return cached;
  const [forecast, marine] = await Promise.all([getJson(deps, FORECAST_URL), getJson(deps, MARINE_URL)]);
  const data = parseWeather(forecast, marine);
  if (data) writeCache(deps, data);
  return data;
}
