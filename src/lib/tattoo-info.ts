import { hasAsset, type RawImage, type RawImageSlot } from './artwork-map';

export interface RawTattooInfo {
  statement?: string | null;
  process?: (string | null)[] | null;
  body?: unknown[] | null;
  images?: RawImageSlot[] | null;
}

export interface TattooInfo {
  statement: string | null;
  process: string[];
  bodyHtml: string;
  images: string[];
}

export interface TattooDeps {
  urlFor: (image: RawImage) => string;
  toHtml: (blocks: unknown[]) => string;
}

export function mapTattooInfo(raw: RawTattooInfo | null, deps: TattooDeps): TattooInfo {
  return {
    statement: raw?.statement?.trim() || null,
    process: (raw?.process ?? []).map((step) => step?.trim() ?? '').filter((step) => step.length > 0),
    bodyHtml: raw?.body && raw.body.length > 0 ? deps.toHtml(raw.body) : '',
    images: (raw?.images ?? []).filter(hasAsset).map(deps.urlFor),
  };
}
