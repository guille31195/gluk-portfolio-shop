// Collector order page: reads ?o=<token>, polls /api/order, fills the panels.
import { describeOrder, resolveOrder, type FlowState } from '../lib/prints/collector-flow';
import { imageAspect, sizedImage } from '../lib/image-url';
import type { CollectorView } from '../lib/prints/order';

let controller: AbortController | null = null;

const REQUEST_TIMEOUT_MS = 10_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The page signal plus a timeout, so one hung request cannot stall the page.
async function request<T>(signal: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const own = new AbortController();
  const stop = () => own.abort();
  signal.addEventListener('abort', stop);
  const timer = setTimeout(stop, REQUEST_TIMEOUT_MS);
  try {
    return await run(own.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
  }
}

const fetchOrder = (token: string, signal: AbortSignal) =>
  request(signal, async (s) => {
    const res = await fetch(`/api/order?o=${encodeURIComponent(token)}`, { signal: s, cache: 'no-store' });
    return { status: res.status, body: res.status === 200 ? await res.json() : null };
  });

function show(root: HTMLElement, kind: string): void {
  root.dataset.state = kind;
  for (const panel of root.querySelectorAll<HTMLElement>('[data-panel]')) panel.hidden = panel.dataset.panel !== kind;
  if (kind !== 'order') root.querySelector<HTMLElement>('[data-piece]')!.hidden = true;
}

function text(root: HTMLElement, key: string, value: string): void {
  const el = root.querySelector<HTMLElement>(`[data-f="${key}"]`);
  if (el) el.textContent = value;
}

async function showPiece(root: HTMLElement, order: CollectorView, signal: AbortSignal): Promise<void> {
  try {
    const images = await request(signal, async (s) => {
      const res = await fetch('/collector-images.json', { signal: s });
      return res.ok ? ((await res.json()) as Record<string, string>) : {};
    });
    const url = images[order.artworkSlug];
    if (!url || signal.aborted) return;
    const img = root.querySelector<HTMLImageElement>('[data-piece-img]')!;
    img.src = sizedImage(url, 1200);
    img.alt = order.artworkTitle;
    // Reserve the picture's proportions so the page does not jump when it loads.
    const aspect = imageAspect(url);
    if (aspect) img.style.aspectRatio = String(aspect);
    root.querySelector<HTMLElement>('[data-piece]')!.hidden = false;
  } catch {
    // The page reads fine without the picture.
  }
}

function showOrder(root: HTMLElement, order: CollectorView, signal: AbortSignal): void {
  const d = describeOrder(order);
  text(root, 'date', `Order · ${d.date}`);
  for (const key of ['edition', 'title', 'format', 'price', 'shipping', 'shipTo', 'collector'] as const) text(root, key, d[key]);
  text(root, 'status', d.shippedOn ? `${d.status} · ${d.shippedOn}` : d.status);
  const rows = root.querySelectorAll<HTMLElement>('[data-tracking-row]');
  for (const row of rows) row.hidden = !d.tracking;
  if (d.tracking) {
    text(root, 'trackingNumber', d.tracking.number);
    const link = root.querySelector<HTMLAnchorElement>('[data-f-link="tracking"]')!;
    link.hidden = !d.tracking.url;
    if (d.tracking.url) link.href = d.tracking.url;
  }
  show(root, 'order');
  void showPiece(root, order, signal);
}

function render(root: HTMLElement, state: FlowState, signal: AbortSignal): void {
  if (state.kind === 'order') showOrder(root, state.order, signal);
  else show(root, state.kind);
}

async function init(): Promise<void> {
  controller?.abort();
  const root = document.querySelector<HTMLElement>('[data-order]');
  if (!root) return;
  controller = new AbortController();
  const { signal } = controller;
  const params = new URLSearchParams(location.search);

  if (import.meta.env.DEV) {
    const demo = params.get('demo');
    if (demo === 'confirming' || demo === 'notfound' || demo === 'error') {
      render(root, { kind: demo === 'notfound' ? 'not-found' : demo }, signal);
      return;
    }
    if (demo) {
      const { DEMO_ORDERS } = await import('./collector-demo');
      if (DEMO_ORDERS[demo]) {
        render(root, { kind: 'order', order: DEMO_ORDERS[demo] }, signal);
        return;
      }
    }
  }

  const retry = root.querySelector<HTMLAnchorElement>('[data-retry]');
  if (retry) retry.href = location.href;
  const state = await resolveOrder(params.get('o'), {
    fetchOrder: (token) => fetchOrder(token, signal),
    wait,
    now: Date.now,
    onConfirming: () => show(root, 'confirming'),
    signal,
  });
  if (state) render(root, state, signal);
}

// Leaving the page must stop the poll loop.
document.addEventListener('astro:before-swap', () => controller?.abort());
document.addEventListener('astro:page-load', () => void init());
