import { describe, it, expect } from 'vitest';
import { INTERESTS, MAX_ARTWORK_LENGTH, readPrefill } from './contact-prefill';

describe('INTERESTS', () => {
  it('lists the four approved choices in order', () => {
    expect(INTERESTS.map((i) => i.label)).toEqual(['An original', 'A print', 'A tattoo', 'A commission']);
  });
});

describe('readPrefill', () => {
  it('is empty for no query', () => {
    expect(readPrefill('')).toEqual({ interest: null, message: '' });
  });

  it('reads a known interest and an artwork title', () => {
    expect(readPrefill('?interest=original&artwork=Motopirueta%204')).toEqual({
      interest: 'original',
      message: 'About: Motopirueta 4\n\n',
    });
  });

  it('ignores unknown interests', () => {
    expect(readPrefill('?interest=free-stuff').interest).toBeNull();
  });

  it('clamps very long artwork names and strips control characters', () => {
    const long = 'x'.repeat(5000);
    const result = readPrefill(`?artwork=${long}`);
    expect(result.message).toBe(`About: ${'x'.repeat(MAX_ARTWORK_LENGTH)}\n\n`);
    expect(readPrefill('?artwork=a%00b%0Ac').message).toBe('About: a b c\n\n');
  });

  it('keeps HTML-looking text as plain text (inserted with .value, never innerHTML)', () => {
    expect(readPrefill('?artwork=%3Cimg%20src%3Dx%3E').message).toBe('About: <img src=x>\n\n');
  });

  it('ignores a blank artwork', () => {
    expect(readPrefill('?interest=tattoo&artwork=%20%20').message).toBe('');
  });
});
