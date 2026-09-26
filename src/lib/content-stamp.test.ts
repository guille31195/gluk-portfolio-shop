import { describe, it, expect } from 'vitest';
import { decide, journalStamp, sanityStamp, type ContentStamp } from './content-stamp';

const live: ContentStamp = { sanity: '42@2026-09-26T20:08:58Z', journal: 'https://glukcaribe.substack.com/p/uno' };
const same = { ...live, feedOk: true };

describe('sanityStamp', () => {
  it('combines document count and latest edit', () => {
    expect(sanityStamp({ count: 42, latest: '2026-09-26T20:08:58Z' })).toBe('42@2026-09-26T20:08:58Z');
  });
  it('handles an empty dataset', () => {
    expect(sanityStamp({ count: 0, latest: null })).toBe('0@none');
  });
});

describe('journalStamp', () => {
  it('is the newest entry url (entries arrive newest first)', () => {
    expect(journalStamp([{ url: 'https://a.substack.com/p/new' }, { url: 'https://a.substack.com/p/old' }])).toBe(
      'https://a.substack.com/p/new'
    );
  });
  it('is null without entries', () => {
    expect(journalStamp([])).toBeNull();
  });
});

describe('decide', () => {
  it('does nothing when nothing changed', () => {
    expect(decide(live, same).rebuild).toBe(false);
  });

  it('rebuilds after a Sanity edit', () => {
    const d = decide(live, { ...same, sanity: '42@2026-09-27T09:00:00Z' });
    expect(d).toEqual({ rebuild: true, reason: 'Sanity content changed' });
  });

  it('rebuilds after a Sanity deletion (count drops, latest edit may not move)', () => {
    expect(decide(live, { ...same, sanity: '41@2026-09-26T20:08:58Z' }).rebuild).toBe(true);
  });

  it('rebuilds after a new Substack post', () => {
    const d = decide(live, { ...same, journal: 'https://glukcaribe.substack.com/p/dos' });
    expect(d).toEqual({ rebuild: true, reason: 'new Substack post' });
  });

  it('ignores the journal when the feed could not be read', () => {
    expect(decide(live, { ...same, journal: null, feedOk: false }).rebuild).toBe(false);
  });

  it('still rebuilds for Sanity changes while the feed is down', () => {
    expect(decide(live, { ...same, sanity: '43@2026-09-27T09:00:00Z', journal: null, feedOk: false }).rebuild).toBe(true);
  });

  it('rebuilds when the live site has no valid stamp yet', () => {
    expect(decide(null, same)).toEqual({ rebuild: true, reason: 'live site has no content stamp' });
    expect(decide({ sanity: 5 }, same).rebuild).toBe(true);
  });
});
