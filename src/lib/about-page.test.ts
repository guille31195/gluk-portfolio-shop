import { describe, it, expect } from 'vitest';
import { ABOUT_PORTRAIT_WIDTHS, DEFAULT_ABOUT, DEFAULT_ABOUT_BODY_HTML, focalPoint, mapAboutPage } from './about-page';

const deps = {
  imageUrl: (_image: unknown, width: number) => `https://cdn.test/p.jpg?w=${width}`,
  toHtml: (blocks: unknown[]) => `<p>${blocks.length} blocks</p>`,
};

describe('mapAboutPage', () => {
  it('uses the BIO.pdf text and no portrait when the document is missing', () => {
    expect(mapAboutPage(null, deps)).toEqual({
      portrait: null,
      statement: DEFAULT_ABOUT.statement,
      bodyHtml: DEFAULT_ABOUT_BODY_HTML,
      photoCredit: null,
      photoCreditUrl: null,
    });
  });

  it('keeps the default text verbatim from BIO.pdf', () => {
    expect(DEFAULT_ABOUT.statement).toBe('Gluk is a Caribbean artist born in Caracas, Venezuela.');
    expect(DEFAULT_ABOUT.body).toHaveLength(6);
    expect(DEFAULT_ABOUT.body[0]).toMatch(/^Disruptive not in terms of subject matter, /);
    expect(DEFAULT_ABOUT.body[0]).toMatch(/He currently lives and works in Mexico City\.$/);
    expect(DEFAULT_ABOUT.body[5]).toMatch(/to be touched without being dominated\.$/);
  });

  it('renders every default body paragraph as its own <p>', () => {
    expect(DEFAULT_ABOUT_BODY_HTML).toBe(DEFAULT_ABOUT.body.map((p) => `<p>${p}</p>`).join(''));
  });

  it('maps a complete document', () => {
    const result = mapAboutPage(
      {
        portrait: { asset: { _ref: 'img', _type: 'reference' }, hotspot: { x: 0.5, y: 0.3 } },
        portraitAlt: 'Portrait of GLUK in the studio',
        statement: 'Custom statement',
        body: [{ _type: 'block' }],
        photoCredit: '  Someone  ',
      },
      deps
    );
    expect(result.portrait).toEqual({
      src: 'https://cdn.test/p.jpg?w=1200',
      srcset: ABOUT_PORTRAIT_WIDTHS.map((w) => `https://cdn.test/p.jpg?w=${w} ${w}w`).join(', '),
      alt: 'Portrait of GLUK in the studio',
      focalPoint: '50% 30%',
    });
    expect(result.statement).toBe('Custom statement');
    expect(result.bodyHtml).toBe('<p>1 blocks</p>');
    expect(result.photoCredit).toBe('Someone');
    expect(result.photoCreditUrl).toBeNull();
  });

  it('links an Instagram handle credit', () => {
    const result = mapAboutPage({ photoCredit: ' @topomaseda ' }, deps);
    expect(result.photoCredit).toBe('@topomaseda');
    expect(result.photoCreditUrl).toBe('https://www.instagram.com/topomaseda/');
  });

  it('treats blank strings and empty body as missing', () => {
    const result = mapAboutPage(
      { portrait: { asset: null }, portraitAlt: null, statement: '   ', body: [], photoCredit: ' ' },
      deps
    );
    expect(result.portrait).toBeNull();
    expect(result.statement).toBe(DEFAULT_ABOUT.statement);
    expect(result.bodyHtml).toBe(DEFAULT_ABOUT_BODY_HTML);
    expect(result.photoCredit).toBeNull();
    expect(result.photoCreditUrl).toBeNull();
  });

  it('falls back to "GLUK" alt text', () => {
    const result = mapAboutPage({ portrait: { asset: { _ref: 'x', _type: 'reference' } }, portraitAlt: ' ' }, deps);
    expect(result.portrait?.alt).toBe('GLUK');
  });
});

describe('focalPoint', () => {
  it('centers when there is no hotspot', () => {
    expect(focalPoint(null)).toBe('50% 50%');
    expect(focalPoint(undefined)).toBe('50% 50%');
  });

  it('converts a hotspot to a CSS object-position', () => {
    expect(focalPoint({ x: 0.25, y: 0.333 })).toBe('25% 33.3%');
  });
});
