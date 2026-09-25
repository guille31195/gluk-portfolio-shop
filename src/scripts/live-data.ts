// Live clocks (home egg, contact) and the data-egg toggle. Weather only loads
// when PUBLIC_LIVE_WEATHER=on (spec §8).
import { formatClock, formatPercent, formatTemp } from '../lib/route-data';
import { loadWeather, type RouteWeather } from '../lib/weather';

let clockTimer: number | undefined;

function tickClocks(): void {
  const now = new Date();
  for (const el of document.querySelectorAll<HTMLElement>('[data-clock]')) {
    el.textContent = formatClock(now, el.dataset.clock!);
  }
}

function fillWeather(egg: HTMLElement, w: RouteWeather): void {
  const set = (key: string, value: string) => {
    const cell = egg.querySelector<HTMLElement>(`[data-w="${key}"]`);
    if (cell) cell.textContent = value;
  };
  set('ccs-air', formatTemp(w.origin.air));
  set('cdmx-air', formatTemp(w.base.air));
  set('ccs-humidity', formatPercent(w.origin.humidity));
  set('cdmx-humidity', formatPercent(w.base.humidity));
  set('ccs-sea', formatTemp(w.sea.caribbean));
  set('cdmx-sea', formatTemp(w.sea.pacific));
  for (const row of egg.querySelectorAll<HTMLElement>('[data-weather-row], [data-weather-note]')) row.hidden = false;
}

function initLiveData(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-live]')) el.hidden = false;
  tickClocks();
  window.clearInterval(clockTimer);
  clockTimer = window.setInterval(tickClocks, 30_000);

  const egg = document.querySelector<HTMLElement>('[data-egg]');
  const toggle = egg?.querySelector<HTMLButtonElement>('[data-egg-toggle]');
  if (!egg || !toggle) return;
  toggle.addEventListener('click', () => {
    const open = egg.toggleAttribute('data-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  if (import.meta.env.PUBLIC_LIVE_WEATHER !== 'on') return;
  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  loadWeather({ fetch: (url) => window.fetch(url), now: Date.now, storage }).then((weather) => {
    if (weather && egg.isConnected) fillWeather(egg, weather);
  });
}

document.addEventListener('astro:page-load', initLiveData);
