// The Collect page: works a visitor can buy in some form. Sold originals stay
// listed because their prints may still be for sale.

import type { Artwork } from './artwork-map';

export function collectable(artworks: Artwork[]): Artwork[] {
  return artworks.filter((a) => a.originalStatus !== 'notForSale' || a.printOptions.length > 0);
}

// Artwork pages opened from Collect carry ?from=collect, so "back" returns there.
// A query param, not document.referrer: ClientRouter navigation never updates it.
export function backLink(search: string): { href: string; label: string } {
  return new URLSearchParams(search).get('from') === 'collect'
    ? { href: '/collect', label: 'Collect' }
    : { href: '/portfolio', label: 'Portfolio' };
}

export function inquiryHref(interest: 'original' | 'print', title: string): string {
  return `/contact?interest=${interest}&artwork=${encodeURIComponent(title)}`;
}
