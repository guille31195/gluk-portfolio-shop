export const MEDIUMS = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'] as const;
export type Medium = typeof MEDIUMS[number];

export interface PrintOption {
  size: string;
  price: number; // cents, USD
  stripePriceId: string;
}

export interface Artwork {
  slug: string;
  title: string;
  medium: Medium;
  year: number;
  dimensions: string;
  description: string;
  images: string[];
  availableAsOriginal: boolean;
  printOptions: PrintOption[];
}

export const artworks: Artwork[] = [
  {
    slug: 'placeholder-oil-1',
    title: 'Placeholder Oil Painting',
    medium: 'oil-painting',
    year: 2026,
    dimensions: '60 x 90 cm, oil on canvas',
    description: 'Placeholder description — real artwork content pending.',
    images: ['/placeholder-artwork.svg'],
    availableAsOriginal: true,
    printOptions: [
      { size: '12x18 in', price: 4500, stripePriceId: 'price_placeholder_1' },
    ],
  },
  {
    slug: 'placeholder-tattoo-1',
    title: 'Placeholder Tattoo Flash',
    medium: 'tattoo',
    year: 2026,
    dimensions: 'N/A',
    description: 'Placeholder description — real artwork content pending.',
    images: ['/placeholder-artwork.svg'],
    availableAsOriginal: false,
    printOptions: [],
  },
  {
    slug: 'placeholder-sculpture-1',
    title: 'Placeholder Sculpture',
    medium: 'sculpture',
    year: 2026,
    dimensions: '40 x 20 x 20 cm, mixed materials',
    description: 'Placeholder description — real artwork content pending.',
    images: ['/placeholder-artwork.svg'],
    availableAsOriginal: true,
    printOptions: [],
  },
  {
    slug: 'placeholder-mixed-1',
    title: 'Placeholder Mixed Media Piece',
    medium: 'mixed-media',
    year: 2026,
    dimensions: '50 x 70 cm',
    description: 'Placeholder description — real artwork content pending.',
    images: ['/placeholder-artwork.svg'],
    availableAsOriginal: true,
    printOptions: [
      { size: '8x10 in', price: 3000, stripePriceId: 'price_placeholder_2' },
    ],
  },
];

export function getArtworksByMedium(list: Artwork[], medium: Medium): Artwork[] {
  return list.filter((artwork) => artwork.medium === medium);
}

export function formatMedium(medium: Medium): string {
  return medium.replace(/-/g, ' ');
}
