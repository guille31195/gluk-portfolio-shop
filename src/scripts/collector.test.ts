// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

const PAGE = `
  <section data-order>
    <figure data-piece hidden><img data-piece-img alt="" /></figure>
    <div data-panel="confirming" hidden></div>
    <div data-panel="order" hidden></div>
    <div data-panel="not-found" hidden></div>
    <div data-panel="error" hidden><a data-retry href="">Try again</a></div>
  </section>
`;

const panelShown = () => document.querySelector<HTMLElement>('[data-panel]:not([hidden])')?.dataset.panel;
const orderCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/order')).length;

beforeAll(async () => {
  await import('./collector');
});

beforeEach(() => {
  vi.useFakeTimers();
  history.replaceState(null, '', `/collector?o=${TOKEN}`);
  document.body.innerHTML = PAGE;
});

afterEach(() => {
  document.dispatchEvent(new Event('astro:before-swap'));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('collector page wiring', () => {
  it('stops polling when the page is swapped out', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"not-found"}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    document.dispatchEvent(new Event('astro:page-load'));
    await vi.advanceTimersByTimeAsync(6000);
    expect(panelShown()).toBe('confirming');
    expect(orderCalls(fetchMock)).toBe(3);

    document.dispatchEvent(new Event('astro:before-swap'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(orderCalls(fetchMock)).toBe(3);
  });

  it('stops a running poll when the next page has no order root', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"not-found"}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    document.dispatchEvent(new Event('astro:page-load'));
    await vi.advanceTimersByTimeAsync(3000);
    document.body.innerHTML = '<main></main>';
    document.dispatchEvent(new Event('astro:page-load'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(orderCalls(fetchMock)).toBe(2);
  });

  it('shows the error state when a request hangs for 10 s', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    document.dispatchEvent(new Event('astro:page-load'));
    await vi.advanceTimersByTimeAsync(9000);
    expect(panelShown()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1500);
    expect(panelShown()).toBe('error');
  });
});
