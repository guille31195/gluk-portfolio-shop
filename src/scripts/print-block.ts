// Print buying block on artwork pages: live stock, ship-to price and the
// hand-off to Stripe Checkout. Binds on every page load and aborts on swap.
import { EDITION_SIZE } from '../lib/prints/edition';
import type { Format } from '../lib/prints/print-sizes';
import {
  EXCLUDED_COUNTRIES,
  REGION_NAMES,
  SHIPPING_RATES_USD,
  countriesInRegion,
  regionForCountry,
  type RegionId,
} from '../lib/prints/shipping';

export type StockState = Record<Format, number | null>;
export type Shipping = { region: RegionId; regionName: string; priceUsd: number };

const FORMATS: readonly Format[] = ['large', 'small'];
const REGIONS = Object.keys(REGION_NAMES) as RegionId[];

export function formatRemaining(n: number | null): string {
  if (n === null) return 'Unavailable';
  if (n <= 0) return 'Sold out';
  return `${n} of ${EDITION_SIZE} remaining`;
}

export function checkoutRequest(slug: string, format: Format, country: string): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, format, country }),
  };
}

// Null when the response is not a stock reply (the block then falls back to Inquire).
export function applyStock(raw: unknown, offered: readonly Format[]): StockState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const state: StockState = { large: null, small: null };
  for (const format of FORMATS) {
    const value = body[format];
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return null;
    state[format] = offered.includes(format) ? value : null;
  }
  return state;
}

export function markSoldOut(state: StockState, format: Format): StockState {
  return { ...state, [format]: 0 };
}

export function selectableFormats(state: StockState): Format[] {
  return FORMATS.filter((format) => (state[format] ?? 0) > 0);
}

export function firstSelectable(state: StockState): Format | null {
  return selectableFormats(state)[0] ?? null;
}

export function shippingForCountry(iso2: string): Shipping | null {
  const region = regionForCountry(iso2);
  if (!region) return null;
  return { region, regionName: REGION_NAMES[region], priceUsd: SHIPPING_RATES_USD[region] };
}

export function countryOptions(locale = 'en'): { code: string; name: string }[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    names = null;
  }
  const nameOf = (code: string) => {
    try {
      return names?.of(code) || code;
    } catch {
      return code;
    }
  };
  return REGIONS.flatMap((region) => countriesInRegion(region))
    .filter((code) => !EXCLUDED_COUNTRIES.includes(code))
    .map((code) => ({ code, name: nameOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export type PrintBlockDeps = {
  fetch: typeof fetch;
  assign: (url: string) => void;
  timeoutMs: number;
};

const MESSAGES = {
  busy: 'Please try again in a moment.',
  soldOut: 'That format has just sold out.',
  country: 'We cannot ship to that country online yet. Please inquire.',
  other: 'Something went wrong. Please inquire instead.',
};

export function initPrintBlock(root: HTMLElement, deps: PrintBlockDeps): () => void {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const slug = root.dataset.slug ?? '';
  const items = [...root.querySelectorAll<HTMLElement>('[data-format]')];
  const offered = items.map((li) => li.dataset.format as Format);
  const radios = new Map(items.map((li) => [li.dataset.format as Format, li.querySelector<HTMLInputElement>('input')!]));
  const ship = q('[data-ship]');
  const actions = q('[data-actions]');
  const select = q<HTMLSelectElement>('[data-country]');
  const cost = q('[data-cost]');
  const region = q('[data-region]');
  const button = q<HTMLButtonElement>('[data-collect]');
  const message = q('[data-message]');
  const soldOut = q('[data-soldout]');
  const inquire = q('[data-inquire]');
  const formats = q('[data-formats]');
  const heading = q('[data-heading]');
  if (!ship || !actions || !select || !cost || !button || !message || !soldOut || !inquire) return () => {};

  const lifetime = new AbortController();
  let state: StockState = { large: null, small: null };
  let busy = false;

  const selected = () => FORMATS.find((f) => radios.get(f)?.checked) ?? null;

  const render = () => {
    for (const li of items) {
      const format = li.dataset.format as Format;
      const count = state[format];
      const out = (count ?? 0) <= 0;
      li.classList.toggle('out', out);
      radios.get(format)!.disabled = out;
      li.querySelector('[data-left]')!.textContent = formatRemaining(count);
    }
    const current = selected();
    if (!current || (state[current] ?? 0) <= 0) {
      const next = firstSelectable(state);
      for (const [format, radio] of radios) radio.checked = format === next;
    }
    const gone = selectableFormats(state).length === 0;
    ship.hidden = gone;
    actions.hidden = gone;
    soldOut.hidden = !gone;
    inquire.hidden = !gone && message.dataset.failed !== 'true';
    button.disabled = busy || gone || !shippingForCountry(select.value) || !selected();
  };

  // Stock unreadable: the whole block becomes the plain Inquire button.
  const fallback = () => {
    ship.hidden = true;
    actions.hidden = true;
    soldOut.hidden = true;
    inquire.hidden = false;
    if (formats) formats.hidden = true;
    if (heading) heading.textContent = 'Prints';
  };

  const fail = (text: string) => {
    message.textContent = text;
    message.dataset.failed = 'true';
  };

  select.append(new Option('Ship to', ''));
  for (const { code, name } of countryOptions()) select.append(new Option(name, code));

  root.addEventListener('change', (event) => {
    if (event.target === select) {
      const info = shippingForCountry(select.value);
      cost.textContent = info ? `$${info.priceUsd}` : '';
      if (region) region.textContent = info ? info.regionName : '';
    }
    message.textContent = '';
    render();
  });

  button.addEventListener('click', async () => {
    const format = selected();
    if (busy || !format || !shippingForCountry(select.value)) return;
    busy = true;
    button.setAttribute('aria-busy', 'true');
    message.textContent = '';
    render();
    try {
      const res = await deps.fetch('/api/checkout', checkoutRequest(slug, format, select.value));
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && typeof body.url === 'string') {
        deps.assign(body.url);
        return;
      }
      if (res.status === 409 || body.error === 'sold-out') {
        state = markSoldOut(state, format);
        message.textContent = MESSAGES.soldOut;
      } else if (body.error === 'busy') {
        message.textContent = MESSAGES.busy;
      } else {
        fail(body.error === 'country' ? MESSAGES.country : MESSAGES.other);
      }
    } catch {
      fail(MESSAGES.other);
    }
    busy = false;
    button.removeAttribute('aria-busy');
    render();
  });

  const timer = setTimeout(() => lifetime.abort(), deps.timeoutMs);
  deps
    .fetch(`/api/stock?slug=${encodeURIComponent(slug)}`, { signal: lifetime.signal })
    .then(async (res) => (res.ok ? applyStock(await res.json(), offered) : null))
    .then((next) => {
      if (!next) return fallback();
      state = next;
      render();
    })
    .catch(fallback)
    .finally(() => clearTimeout(timer));

  return () => {
    clearTimeout(timer);
    lifetime.abort();
  };
}

let dispose: (() => void) | null = null;

document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-print-block]');
  if (!root) return;
  dispose = initPrintBlock(root, {
    fetch: (...args) => window.fetch(...args),
    assign: (url) => window.location.assign(url),
    timeoutMs: 8000,
  });
});
document.addEventListener('astro:before-swap', () => {
  dispose?.();
  dispose = null;
});
