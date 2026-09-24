// Where GLUK comes from and where he is (spec §8). Everything here is computed
// locally — no network, no cost.

export interface Place {
  name: string;
  short: string;
  timeZone: string;
  lat: number;
  lon: number;
  elevation: number;
}

export const CARACAS: Place = {
  name: 'Caracas',
  short: 'CCS',
  timeZone: 'America/Caracas',
  lat: 10.4806,
  lon: -66.9036,
  elevation: 882,
};

export const MEXICO_CITY: Place = {
  name: 'Ciudad de México',
  short: 'CDMX',
  timeZone: 'America/Mexico_City',
  lat: 19.4326,
  lon: -99.1332,
  elevation: 2230,
};

export const SEA_POINTS = {
  caribbean: { name: 'Caribbean, off La Guaira', lat: 10.65, lon: -66.93 },
  pacific: { name: 'Pacific, off Acapulco', lat: 16.8, lon: -99.9 },
} as const;

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

export function distanceKm(a: Place, b: Place): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)));
}

export function bearingDeg(a: Place, b: Place): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return Math.round(deg * 10) / 10;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassPoint(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function formatThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatRoute(a: Place, b: Place): string {
  const bearing = bearingDeg(a, b);
  return `${formatThousands(distanceKm(a, b))} km · ${bearing.toFixed(1)}° ${compassPoint(bearing)}`;
}

export function formatElevation(m: number): string {
  return `${formatThousands(m)} m`;
}

export function formatTemp(c: number | null): string {
  return c === null ? '—' : `${c.toFixed(1)}°`;
}

export function formatPercent(p: number | null): string {
  return p === null ? '—' : `${Math.round(p)}%`;
}
