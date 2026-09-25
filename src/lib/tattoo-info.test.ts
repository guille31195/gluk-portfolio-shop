import { describe, it, expect } from 'vitest';
import { mapTattooInfo } from './tattoo-info';

const deps = {
  urlFor: (image: { asset: { _ref: string } }) => `https://cdn.sanity.io/images/p/d/${image.asset._ref}.jpg`,
  toHtml: (blocks: unknown[]) => (blocks.length ? '<p>body</p>' : ''),
};

describe('mapTattooInfo', () => {
  it('returns an empty page when the document is missing', () => {
    expect(mapTattooInfo(null, deps)).toEqual({ statement: null, process: [], bodyHtml: '', images: [] });
  });

  it('maps a complete document, trimming and dropping blank process steps', () => {
    expect(
      mapTattooInfo(
        {
          statement: ' A statement ',
          process: [' one ', '', null, 'two'],
          body: [{ _type: 'block' }],
          images: [{ asset: { _ref: 't1', _type: 'reference' } }],
        },
        deps
      )
    ).toEqual({
      statement: 'A statement',
      process: ['one', 'two'],
      bodyHtml: '<p>body</p>',
      images: ['https://cdn.sanity.io/images/p/d/t1.jpg'],
    });
  });

  it('treats a blank statement as missing', () => {
    expect(mapTattooInfo({ statement: '  ', process: null, body: null, images: null }, deps).statement).toBeNull();
  });

  it('drops an image slot with no asset (an upload started and cancelled in Studio)', () => {
    const images = [{ asset: { _ref: 't1', _type: 'reference' } }, { asset: null }, {}];
    expect(mapTattooInfo({ statement: null, process: null, body: null, images }, deps).images).toEqual([
      'https://cdn.sanity.io/images/p/d/t1.jpg',
    ]);
  });
});
