export type PrintSize = { widthCm: number; heightCm: number };
export type Format = 'large' | 'small';

const MAX_LONG_SIDE_CM = 100;

export function parseDimensions(text: string | null): PrintSize | null {
  const match = text?.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const [widthCm, heightCm] = [match[1], match[2]].map((n) => Number(n.replace(',', '.')));
  return { widthCm, heightCm };
}

const tenth = (n: number) => Math.round(n * 10) / 10;

function fit(widthCm: number, heightCm: number, long: number): PrintSize {
  const ratio = Math.min(widthCm, heightCm) / Math.max(widthCm, heightCm);
  const short = tenth(long * ratio);
  return widthCm >= heightCm ? { widthCm: long, heightCm: short } : { widthCm: short, heightCm: long };
}

export function printSizes(widthCm: number, heightCm: number): Record<Format, PrintSize> {
  const longest = Math.max(widthCm, heightCm);
  const largeLong = Math.round(longest * Math.min(1, MAX_LONG_SIDE_CM / longest));
  const smallLong = Math.round(largeLong) / 2;
  return {
    large: fit(widthCm, heightCm, largeLong),
    small: fit(widthCm, heightCm, smallLong),
  };
}

export function sizeLabel(size: PrintSize): string {
  return `${size.widthCm} × ${size.heightCm} cm`;
}
