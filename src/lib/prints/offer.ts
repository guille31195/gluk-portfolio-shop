import type { Artwork } from '../artwork-map';
import { parseDimensions, printSizes, sizeLabel } from './print-sizes';
import type { Format, PrintSize } from './print-sizes';

export type PrintOffer = { format: Format; size: PrintSize; sizeLabel: string; priceCents: number };

type OfferInput = Pick<Artwork, 'dimensions'> & { printPriceLarge: number | null; printPriceSmall: number | null };

const FORMATS: readonly Format[] = ['large', 'small'];

// Bad data never throws: a format with a missing or invalid price, or a piece
// whose dimensions do not parse to positive sides, simply gets no offer.
export function printOffers(artwork: OfferInput): PrintOffer[] {
  const dims = parseDimensions(artwork.dimensions);
  if (!dims || !(dims.widthCm > 0) || !(dims.heightCm > 0)) return [];
  const sizes = printSizes(dims.widthCm, dims.heightCm);
  const prices: Record<Format, number | null> = { large: artwork.printPriceLarge, small: artwork.printPriceSmall };
  return FORMATS.flatMap((format) => {
    const price = prices[format];
    if (price == null || !Number.isFinite(price) || price < 1) return [];
    return [{ format, size: sizes[format], sizeLabel: sizeLabel(sizes[format]), priceCents: Math.round(price * 100) }];
  });
}
