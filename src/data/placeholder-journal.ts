export interface JournalPost {
  slug: string;
  title: string;
  date: string; // ISO 8601
  coverImage: string;
  body: string;
}

export const journalPosts: JournalPost[] = [
  {
    slug: 'placeholder-post-1',
    title: 'Placeholder Journal Post',
    date: '2026-09-16',
    coverImage: '/placeholder-artwork.svg',
    body: 'Placeholder journal content — real posts pending.',
  },
];
