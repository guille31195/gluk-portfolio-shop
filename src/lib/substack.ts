// The journal lives on Guillermo's Substack. At build time we read its public
// RSS feed; failures never break the build (the page shows "No entries yet").
import { XMLParser } from 'fast-xml-parser';

export interface JournalEntry {
  title: string;
  url: string;
  date: string; // ISO 8601
  cover: string | null;
}

export const feedUrl = (origin: string) => `${origin}/feed`;

const isHttps = (value: unknown): value is string => typeof value === 'string' && value.startsWith('https://');

// The feed's cover is a 256px Substack CDN thumbnail; the journal shows it at
// 14rem, so request a copy wide enough for 2× screens. Only the CDN's own
// options (before the /https%3A… source) are rewritten.
export const COVER_WIDTH = 640;
export function coverAtWidth(url: string): string {
  const match = /^(https:\/\/substackcdn\.com\/image\/fetch\/[^/]*?)w_\d+/.exec(url);
  return match ? url.replace(match[0], `${match[1]}w_${COVER_WIDTH}`) : url;
}

export function parseFeed(xml: string): JournalEntry[] {
  let doc: unknown;
  try {
    doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
  } catch {
    return [];
  }
  const raw = (doc as { rss?: { channel?: { item?: unknown } } })?.rss?.channel?.item;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[];
  const entries: JournalEntry[] = [];
  for (const item of items) {
    const title = String(item.title ?? '').trim();
    const url = String(item.link ?? '').trim();
    const time = Date.parse(String(item.pubDate ?? ''));
    if (!title || !isHttps(url) || Number.isNaN(time)) continue;
    const enclosure = item.enclosure as Record<string, unknown> | undefined;
    const type = String(enclosure?.['@_type'] ?? '');
    const cover = isHttps(enclosure?.['@_url']) && type.startsWith('image/') ? coverAtWidth(enclosure!['@_url'] as string) : null;
    entries.push({ title, url, date: new Date(time).toISOString(), cover });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

interface TextResponse {
  ok: boolean;
  status?: number;
  text(): Promise<string>;
}

export interface JournalDeps {
  fetch?: (url: string) => Promise<TextResponse>;
  warn?: (message: string) => void;
}

export async function loadJournal(origin: string | null, deps: JournalDeps = {}): Promise<JournalEntry[]> {
  if (!origin) return [];
  const fetchImpl = deps.fetch ?? ((url: string) => globalThis.fetch(url) as Promise<TextResponse>);
  const warn = deps.warn ?? ((message: string) => console.warn(message));
  try {
    const res = await fetchImpl(feedUrl(origin));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text());
  } catch (error) {
    warn(`[journal] could not read ${feedUrl(origin)}: ${(error as Error).message}`);
    return [];
  }
}
