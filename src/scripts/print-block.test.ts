// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyStock,
  checkoutRequest,
  countryOptions,
  firstSelectable,
  formatAvailability,
  initPrintBlock,
  markSoldOut,
  selectableFormats,
  shippingForCountry,
} from './print-block';

describe('formatAvailability', () => {
  it('shows no count while the format is available', () => {
    expect(formatAvailability(23)).toBe('');
    expect(formatAvailability(1)).toBe('');
  });
  it('says Sold out at zero and Unavailable without a count', () => {
    expect(formatAvailability(0)).toBe('Sold out');
    expect(formatAvailability(null)).toBe('Unavailable');
  });
});

describe('checkoutRequest', () => {
  it('posts slug, format and country as JSON and never a price', () => {
    const init = checkoutRequest('motopirueta-4', 'large', 'ES');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ slug: 'motopirueta-4', format: 'large', country: 'ES' });
    expect(Object.keys(body).some((k) => /price|amount|cents/i.test(k))).toBe(false);
  });
});

describe('stock state', () => {
  it('accepts a stock response for the offered formats', () => {
    expect(applyStock({ large: 37, small: 4 }, ['large', 'small'])).toEqual({ large: 37, small: 4 });
  });
  it('treats formats that are not offered as unavailable', () => {
    expect(applyStock({ large: 37, small: 4 }, ['small'])).toEqual({ large: null, small: 4 });
  });
  it('rejects a malformed response', () => {
    expect(applyStock(null, ['large'])).toBeNull();
    expect(applyStock({ large: 'x', small: 1 }, ['large', 'small'])).toBeNull();
    expect(applyStock({ error: 'invalid' }, ['large'])).toBeNull();
  });
  it('marks a format sold out and lists what can still be collected', () => {
    const state = markSoldOut({ large: 37, small: 4 }, 'large');
    expect(state).toEqual({ large: 0, small: 4 });
    expect(selectableFormats(state)).toEqual(['small']);
    expect(firstSelectable({ large: 0, small: 0 })).toBeNull();
    expect(firstSelectable({ large: 3, small: 4 })).toBe('large');
  });
});

describe('shippingForCountry', () => {
  it('returns region, name and flat price', () => {
    expect(shippingForCountry('ES')).toEqual({ region: 'EU_UK', regionName: 'Europe & UK', priceUsd: 95 });
    expect(shippingForCountry('mx')).toEqual({ region: 'MX', regionName: 'Mexico', priceUsd: 25 });
  });
  it('returns null for excluded or unknown countries', () => {
    expect(shippingForCountry('RU')).toBeNull();
    expect(shippingForCountry('ZZ')).toBeNull();
  });
});

describe('countryOptions', () => {
  const options = countryOptions();
  it('never lists excluded countries', () => {
    const codes = options.map((o) => o.code);
    for (const iso of ['CU', 'IR', 'KP', 'SY', 'RU', 'BY']) expect(codes).not.toContain(iso);
    expect(codes).toContain('MX');
  });
  it('is sorted by English name with readable names', () => {
    const names = options.map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(options.find((o) => o.code === 'ES')?.name).toBe('Spain');
  });
});

const BLOCK = `
  <div data-print-block data-slug="motopirueta-4">
    <p data-heading>Limited edition prints</p>
    <ul data-formats>
      <li data-format="large"><label><input type="radio" name="f" value="large" disabled>
        <span data-left>Checking availability</span></label></li>
      <li data-format="small"><label><input type="radio" name="f" value="small" disabled>
        <span data-left>Checking availability</span></label></li>
    </ul>
    <div data-ship hidden><select data-country></select><span data-cost></span></div>
    <div data-actions hidden><button type="button" data-collect disabled>Collect</button><span id="hint" data-hint>Choose a format and a country</span><p data-message role="status"></p></div>
    <p data-soldout hidden>Sold out</p>
    <a data-inquire href="/contact?interest=print" hidden>Inquire</a>
  </div>`;

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

async function setup(stock: unknown, checkout?: () => Promise<Response>, assign = vi.fn()) {
  document.body.innerHTML = BLOCK;
  const fetch = vi.fn((url: string) => (url.startsWith('/api/stock') ? reply(200, stock) : checkout!()));
  initPrintBlock($('[data-print-block]'), { fetch: fetch as unknown as typeof globalThis.fetch, assign, timeoutMs: 50 });
  await flush();
  return { fetch, assign };
}

function chooseCountry(code: string) {
  const select = $<HTMLSelectElement>('[data-country]');
  select.value = code;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('initPrintBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('enables Collect only once a country is chosen and selects the first format with stock', async () => {
    await setup({ large: 0, small: 4 });
    expect($('[data-collect]').hasAttribute('disabled')).toBe(true);
    expect($<HTMLInputElement>('input[value="small"]').checked).toBe(true);
    expect($<HTMLInputElement>('input[value="large"]').disabled).toBe(true);
    chooseCountry('ES');
    expect($('[data-collect]').hasAttribute('disabled')).toBe(false);
    expect($('[data-cost]').textContent).toBe('$95');
  });

  it('goes to the checkout url on success and posts no price', async () => {
    const { fetch, assign } = await setup({ large: 3, small: 4 }, () => reply(200, { url: 'https://pay.example/x' }));
    chooseCountry('MX');
    $<HTMLButtonElement>('[data-collect]').click();
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect(assign).toHaveBeenCalledWith('https://pay.example/x');
    const posts = fetch.mock.calls.filter(([u]) => u === '/api/checkout');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(((posts[0] as unknown[])[1] as RequestInit).body as string)).toEqual({
      slug: 'motopirueta-4',
      format: 'large',
      country: 'MX',
    });
  });

  it('flips a sold-out format and moves the selection', async () => {
    await setup({ large: 3, small: 4 }, () => reply(409, { error: 'sold-out' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect($('[data-format="large"] [data-left]').textContent).toBe('Currently unavailable');
    expect($<HTMLInputElement>('input[value="large"]').disabled).toBe(true);
    expect($<HTMLInputElement>('input[value="small"]').checked).toBe(true);
  });

  it('shows a retry message and the Inquire link when busy, keeping Collect usable', async () => {
    await setup({ large: 3, small: 4 }, () => reply(503, { error: 'busy' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    expect($('[data-collect]').hasAttribute('disabled')).toBe(true);
    expect($('[data-collect]').getAttribute('aria-busy')).toBe('true');
    await flush();
    expect($('[data-message]').textContent).toBe('Please try again in a moment.');
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
    expect($('[data-collect]').hasAttribute('disabled')).toBe(false);
    expect($('[data-collect]').hasAttribute('aria-busy')).toBe(false);
  });

  it('adds the Inquire link after an unexpected error', async () => {
    await setup({ large: 3, small: 4 }, () => reply(500, { error: 'server' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
  });

  it('shows the inline message and Inquire when checkout is not available', async () => {
    await setup({ large: 3, small: 4 }, () => reply(503, { error: 'unavailable' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect($('[data-message]').textContent).toBe('Something went wrong. Please inquire instead.');
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
    expect($('[data-collect]').hasAttribute('disabled')).toBe(false);
  });

  it('leaves unchanged stock lines untouched so live regions do not re-announce', async () => {
    await setup({ large: 3, small: 4 });
    const observer = new MutationObserver(() => {});
    for (const left of document.querySelectorAll('[data-left]')) {
      observer.observe(left, { childList: true, characterData: true, subtree: true });
    }
    chooseCountry('ES');
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
    expect($('[data-format="large"] [data-left]').textContent).toBe('');
  });

  it('falls back to Inquire when stock cannot be read', async () => {
    document.body.innerHTML = BLOCK;
    const fetch = vi.fn(() => Promise.reject(new Error('offline')));
    initPrintBlock($('[data-print-block]'), { fetch: fetch as unknown as typeof globalThis.fetch, assign: vi.fn(), timeoutMs: 50 });
    await flush();
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
    expect($('[data-ship]').hasAttribute('hidden')).toBe(true);
    expect($('[data-actions]').hasAttribute('hidden')).toBe(true);
    expect($('[data-formats]').hasAttribute('hidden')).toBe(true);
    expect($('[data-heading]').textContent).toBe('Prints');
  });

  it('falls back to Inquire when no offered format has a stock figure', async () => {
    await setup({ large: null, small: null });
    expect($('[data-soldout]').hasAttribute('hidden')).toBe(true);
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
  });

  it('falls back to Inquire when the stock request hangs past the timeout', async () => {
    document.body.innerHTML = BLOCK;
    const fetch = vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new Error('aborted')));
    }));
    initPrintBlock($('[data-print-block]'), { fetch: fetch as unknown as typeof globalThis.fetch, assign: vi.fn(), timeoutMs: 20 });
    await new Promise((r) => setTimeout(r, 60));
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
    expect($('[data-formats]').hasAttribute('hidden')).toBe(true);
  });

  it('describes the disabled Collect button and drops the hint once enabled', async () => {
    await setup({ large: 3, small: 4 });
    expect($('[data-collect]').getAttribute('aria-describedby')).toBe('hint');
    chooseCountry('ES');
    expect($('[data-collect]').hasAttribute('aria-describedby')).toBe(false);
  });

  it('ignores Collect when the selected format has become unavailable', async () => {
    const { fetch } = await setup({ large: 3, small: 4 }, () => reply(409, { error: 'sold-out' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    $('[data-collect]').removeAttribute('disabled');
    $<HTMLInputElement>('input[value="large"]').checked = true;
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect(fetch.mock.calls.filter(([u]) => u === '/api/checkout')).toHaveLength(1);
  });

  it('refuses a checkout url that is not https', async () => {
    const { assign } = await setup({ large: 3, small: 4 }, () => reply(200, { url: 'javascript:alert(1)' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect(assign).not.toHaveBeenCalled();
    expect($('[data-message]').textContent).not.toBe('');
  });

  it('does not navigate after the block is disposed mid-checkout', async () => {
    document.body.innerHTML = BLOCK;
    let release: (r: Response) => void = () => {};
    const assign = vi.fn();
    const fetch = vi.fn((url: string) =>
      url.startsWith('/api/stock') ? reply(200, { large: 3, small: 4 }) : new Promise<Response>((res) => (release = res)),
    );
    const dispose = initPrintBlock($('[data-print-block]'), { fetch: fetch as unknown as typeof globalThis.fetch, assign, timeoutMs: 50 });
    await flush();
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    dispose();
    release(new Response(JSON.stringify({ url: 'https://pay.example/x' }), { status: 200 }));
    await flush();
    expect(assign).not.toHaveBeenCalled();
  });

  it('resets and re-reads stock when restored from the back-forward cache', async () => {
    const { fetch } = await setup({ large: 3, small: 4 }, () => reply(200, { url: 'https://pay.example/x' }));
    chooseCountry('ES');
    $<HTMLButtonElement>('[data-collect]').click();
    await flush();
    expect($('[data-collect]').hasAttribute('disabled')).toBe(true);
    const stockCalls = () => fetch.mock.calls.filter(([u]) => String(u).startsWith('/api/stock')).length;
    expect(stockCalls()).toBe(1);
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    await flush();
    expect($('[data-collect]').hasAttribute('disabled')).toBe(false);
    expect($('[data-collect]').hasAttribute('aria-busy')).toBe(false);
    expect(stockCalls()).toBe(2);
  });

  it('reads Currently unavailable and offers Inquire when every format is gone', async () => {
    await setup({ large: 0, small: 0 });
    expect($('[data-soldout]').hasAttribute('hidden')).toBe(false);
    expect($('[data-inquire]').hasAttribute('hidden')).toBe(false);
    expect($('[data-actions]').hasAttribute('hidden')).toBe(true);
  });
});
