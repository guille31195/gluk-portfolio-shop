// Collector order page: reads ?o=<token>, polls /api/order, fills the panels.
import { describeOrder, resolveOrder, type FlowState } from '../lib/prints/collector-flow';
import { sizedImage } from '../lib/image-url';
import type { CollectorView } from '../lib/prints/order';

let controller: AbortController | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchOrder(token: string, signal: AbortSignal) {
  const res = await fetch(`/api/order?o=${encodeURIComponent(token)}`, { signal, cache: 'no-store' });
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

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
    const res = await fetch('/collector-images.json', { signal });
    if (!res.ok) return;
    const url = ((await res.json()) as Record<string, string>)[order.artworkSlug];
    if (!url || signal.aborted) return;
    const img = root.querySelector<HTMLImageElement>('[data-piece-img]')!;
    img.src = sizedImage(url, 1200);
    img.alt = order.artworkTitle;
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
  const root = document.querySelector<HTMLElement>('[data-order]');
  if (!root) return;
  controller?.abort();
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

document.addEventListener('astro:page-load', () => void init());
