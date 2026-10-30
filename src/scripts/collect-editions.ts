// Collect page: shows which edition number each print format is on ("Large No. 13 / 50").
// Reads the same /api/stock the artwork page uses; any failure leaves the row hidden.
import { EDITION_SIZE } from '../lib/prints/edition';
import type { Format } from '../lib/prints/print-sizes';

const NAMES: Record<Format, string> = { large: 'Large', small: 'Small' };

// Next free edition number, counting holds on payments in progress. Null: not a usable reading.
export function editionLabel(format: Format, remaining: unknown): string | null {
  if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null;
  if (remaining <= 0) return `${NAMES[format]} sold out`;
  const next = Math.max(1, EDITION_SIZE - Math.min(remaining, EDITION_SIZE) + 1);
  return `${NAMES[format]} No. ${next} / ${EDITION_SIZE}`;
}

async function fill(row: HTMLElement, signal: AbortSignal): Promise<void> {
  const slug = row.dataset.slug;
  const formats = (row.dataset.formats ?? '').split(',').filter((f): f is Format => f === 'large' || f === 'small');
  if (!slug || !formats.length) return;
  try {
    const res = await fetch(`/api/stock?slug=${encodeURIComponent(slug)}`, { signal });
    if (!res.ok) return;
    const body = (await res.json()) as Record<string, unknown>;
    const labels = formats.map((f) => editionLabel(f, body[f]));
    if (labels.some((l) => l === null)) return;
    const dd = row.querySelector('dd');
    if (!dd) return;
    dd.replaceChildren(...labels.map((l) => Object.assign(document.createElement('span'), { textContent: l })));
    row.hidden = false;
  } catch {
    // Stay hidden.
  }
}

let controller: AbortController | null = null;

document.addEventListener('astro:page-load', () => {
  controller?.abort();
  const rows = document.querySelectorAll<HTMLElement>('[data-edition-row]');
  if (!rows.length) return;
  controller = new AbortController();
  rows.forEach((row) => void fill(row, controller!.signal));
});
