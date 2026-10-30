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

// Both sides must be whole centimetres in the Large and the Small (half of Large), so Large
// sides are even numbers. The ratio may drift at most this much from the original's.
const MAX_RATIO_DRIFT = 0.005;

function wholeLarge(widthCm: number, heightCm: number): PrintSize {
  const long = Math.max(widthCm, heightCm);
  const ratio = Math.min(widthCm, heightCm) / long;
  for (let largeLong = MAX_LONG_SIDE_CM; largeLong >= 2; largeLong -= 2) {
    const ideal = largeLong * ratio;
    const short = Math.round(ideal / 2) * 2;
    if (Math.abs(short - ideal) / ideal <= MAX_RATIO_DRIFT) {
      return widthCm >= heightCm ? { widthCm: largeLong, heightCm: short } : { widthCm: short, heightCm: largeLong };
    }
  }
  return fit(widthCm, heightCm, MAX_LONG_SIDE_CM);
}

function half(size: PrintSize): PrintSize {
  return { widthCm: size.widthCm / 2, heightCm: size.heightCm / 2 };
}

export function printSizes(widthCm: number, heightCm: number): Record<Format, PrintSize> {
  const longest = Math.max(widthCm, heightCm);
  if (longest > MAX_LONG_SIDE_CM) {
    const large = wholeLarge(widthCm, heightCm);
    return { large, small: half(large) };
  }
  const smallLong = Math.round(longest) / 2;
  return {
    large: fit(widthCm, heightCm, Math.round(longest)),
    small: fit(widthCm, heightCm, smallLong),
  };
}

export function sizeLabel(size: PrintSize): string {
  return `${size.widthCm} × ${size.heightCm} cm`;
}
