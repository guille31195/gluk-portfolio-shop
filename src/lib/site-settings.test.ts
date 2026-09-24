import { describe, it, expect } from 'vitest';
import { DEFAULT_SITE_SETTINGS, mapSiteSettings } from './site-settings';

describe('mapSiteSettings', () => {
  it('uses the real defaults when the document is missing', () => {
    expect(mapSiteSettings(null)).toEqual({
      email: 'gluk.caribe@gmail.com',
      instagramHandle: 'gluk______',
      instagramUrl: 'https://www.instagram.com/gluk______/',
      studioCity: 'Ciudad de México',
      tattooInstagramHandle: 'gluk.tattooo',
      tattooInstagramUrl: 'https://www.instagram.com/gluk.tattooo/',
      substackUrl: DEFAULT_SITE_SETTINGS.substackUrl,
    });
    expect(DEFAULT_SITE_SETTINGS.instagramHandle).toBe('gluk______');
  });

  it('normalizes the Substack address to its origin and ignores non-https values', () => {
    expect(mapSiteSettings({ substackUrl: ' https://name.substack.com/archive?x=1 ' }).substackUrl).toBe(
      'https://name.substack.com'
    );
    expect(mapSiteSettings({ substackUrl: 'javascript:alert(1)' }).substackUrl).toBe(DEFAULT_SITE_SETTINGS.substackUrl);
    expect(mapSiteSettings({ substackUrl: 'not a url' }).substackUrl).toBe(DEFAULT_SITE_SETTINGS.substackUrl);
  });

  it('strips @ from the tattoo handle too', () => {
    const result = mapSiteSettings({ tattooInstagramHandle: '@ink.account' });
    expect(result.tattooInstagramHandle).toBe('ink.account');
    expect(result.tattooInstagramUrl).toBe('https://www.instagram.com/ink.account/');
  });

  it('strips a leading @ and whitespace from the handle', () => {
    const result = mapSiteSettings({ email: null, instagramHandle: ' @someone ', studioCity: null });
    expect(result.instagramHandle).toBe('someone');
    expect(result.instagramUrl).toBe('https://www.instagram.com/someone/');
  });

  it('falls back field by field on blanks', () => {
    const result = mapSiteSettings({ email: ' ', instagramHandle: '', studioCity: 'Caracas' });
    expect(result.email).toBe('gluk.caribe@gmail.com');
    expect(result.instagramHandle).toBe('gluk______');
    expect(result.studioCity).toBe('Caracas');
  });
});
