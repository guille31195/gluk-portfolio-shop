// Contact form prefill from links like "Inquire" (spec §5.8). The result is
// assigned with `.value`/`.checked`, so it is never interpreted as HTML.

export const INTERESTS = [
  { value: 'original', label: 'An original' },
  { value: 'print', label: 'A print' },
  { value: 'tattoo', label: 'A tattoo' },
  { value: 'commission', label: 'A commission' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];
export const MAX_ARTWORK_LENGTH = 120;

export interface Prefill {
  interest: Interest | null;
  message: string;
}

export function readPrefill(search: string): Prefill {
  const params = new URLSearchParams(search);
  const rawInterest = params.get('interest');
  const interest = INTERESTS.find((i) => i.value === rawInterest)?.value ?? null;
  const artwork = (params.get('artwork') ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ARTWORK_LENGTH);
  return { interest, message: artwork ? `About: ${artwork}\n\n` : '' };
}
