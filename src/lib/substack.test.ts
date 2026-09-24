import { describe, it, expect, vi } from 'vitest';
import { feedUrl, loadJournal, parseFeed } from './substack';

// Synthetic feed in the shape Substack serves at <origin>/feed (RSS 2.0).
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Test</title>
  <item>
    <title><![CDATA[Older entry]]></title>
    <link>https://name.substack.com/p/older</link>
    <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title><![CDATA[Newer & bolder]]></title>
    <link>https://name.substack.com/p/newer</link>
    <pubDate>Mon, 22 Sep 2026 10:00:00 GMT</pubDate>
    <enclosure url="https://substackcdn.com/image/fetch/cover.jpg" length="0" type="image/jpeg"/>
  </item>
  <item>
    <title><![CDATA[Bad link]]></title>
    <link>javascript:alert(1)</link>
    <pubDate>Mon, 22 Sep 2026 10:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe('parseFeed', () => {
  it('reads entries newest first, with cover when present', () => {
    expect(parseFeed(FEED)).toEqual([
      {
        title: 'Newer & bolder',
        url: 'https://name.substack.com/p/newer',
        date: '2026-09-22T10:00:00.000Z',
        cover: 'https://substackcdn.com/image/fetch/cover.jpg',
      },
      { title: 'Older entry', url: 'https://name.substack.com/p/older', date: '2026-09-01T10:00:00.000Z', cover: null },
    ]);
  });

  it('handles a single-item feed and an empty or broken one', () => {
    // One <item> parses as an object, not an array.
    const one = `<rss><channel><item><title>Solo</title><link>https://name.substack.com/p/solo</link><pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseFeed(one).map((e) => e.title)).toEqual(['Solo']);
    expect(parseFeed('<rss><channel></channel></rss>')).toEqual([]);
    expect(parseFeed('not xml at all')).toEqual([]);
  });
});

describe('loadJournal', () => {
  it('returns [] without fetching when no Substack address is set', async () => {
    const fetchImpl = vi.fn();
    expect(await loadJournal(null, { fetch: fetchImpl })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches <origin>/feed and parses it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => FEED });
    const entries = await loadJournal('https://name.substack.com', { fetch: fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(feedUrl('https://name.substack.com'));
    expect(feedUrl('https://name.substack.com')).toBe('https://name.substack.com/feed');
    expect(entries).toHaveLength(2);
  });

  it('returns [] and warns when Substack is unreachable, never throws', async () => {
    const warn = vi.fn();
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await loadJournal('https://name.substack.com', { fetch: failing, warn })).toEqual([]);
    const notOk = vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' });
    expect(await loadJournal('https://name.substack.com', { fetch: notOk, warn })).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
