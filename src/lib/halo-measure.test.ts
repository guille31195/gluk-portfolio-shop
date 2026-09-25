import { describe, it, expect, vi } from 'vitest';
import { measureEdge } from './halo-measure';

describe('measureEdge', () => {
  it('returns null without fetching for non-Sanity or empty URLs', async () => {
    const fetchImpl = vi.fn();
    expect(await measureEdge('', { fetch: fetchImpl })).toBeNull();
    expect(await measureEdge('/placeholder-artwork.svg', { fetch: fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns null and warns when the fetch fails', async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await measureEdge('https://cdn.sanity.io/images/p/d/fail-1.jpg', { fetch: fetchImpl, warn });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('returns null and warns on a non-OK response', async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await measureEdge('https://cdn.sanity.io/images/p/d/fail-2.jpg', { fetch: fetchImpl, warn })).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('requests a 100px PNG thumbnail and caches per URL', async () => {
    const png = await (await import('sharp')).default({
      create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) });
    const url = 'https://cdn.sanity.io/images/p/d/black-3.jpg';
    expect(await measureEdge(url, { fetch: fetchImpl })).toBe(0);
    expect(await measureEdge(url, { fetch: fetchImpl })).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(`${url}?w=100&fm=png`, { signal: expect.any(AbortSignal) });
  });
});
