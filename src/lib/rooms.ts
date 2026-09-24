// Portfolio "rooms" (spec §5.3): one room per series, standalone works last.
import { MEDIUMS, type Artwork, type Medium } from './artwork-map';
import { pad2, toRoman } from './numerals';

export interface Room {
  key: string;
  numeral: string;
  name: string;
  kind: 'series' | 'diptych' | 'standalone';
  works: Artwork[];
}

const STANDALONE_KEY = 'standalone';

function byPositionThenTitle(a: Artwork, b: Artwork): number {
  const pa = a.seriesPosition ?? Number.POSITIVE_INFINITY;
  const pb = b.seriesPosition ?? Number.POSITIVE_INFINITY;
  return pa !== pb ? pa - pb : a.title.localeCompare(b.title);
}

// Standalone works: newest year first, works without a year after, then A–Z.
// Keeps the order stable on every build while no years are entered.
function byYearThenTitle(a: Artwork, b: Artwork): number {
  const ya = a.year ?? Number.NEGATIVE_INFINITY;
  const yb = b.year ?? Number.NEGATIVE_INFINITY;
  return ya !== yb ? yb - ya : a.title.localeCompare(b.title);
}

export function groupIntoRooms(artworks: Artwork[]): Room[] {
  const series = new Map<string, { order: number; room: Omit<Room, 'numeral'> }>();
  const standalone: Artwork[] = [];
  for (const artwork of artworks) {
    if (!artwork.series) {
      standalone.push(artwork);
      continue;
    }
    const entry = series.get(artwork.series.slug) ?? {
      order: artwork.series.order,
      room: { key: artwork.series.slug, name: artwork.series.name, kind: artwork.series.kind, works: [] },
    };
    entry.room.works.push(artwork);
    series.set(artwork.series.slug, entry);
  }
  const ordered = [...series.values()]
    .sort((a, b) => a.order - b.order || a.room.name.localeCompare(b.room.name))
    .map((entry) => ({ ...entry.room, works: [...entry.room.works].sort(byPositionThenTitle) }));
  const rooms: Omit<Room, 'numeral'>[] =
    standalone.length > 0
      ? [...ordered, { key: STANDALONE_KEY, name: 'Standalone works', kind: 'standalone', works: [...standalone].sort(byYearThenTitle) }]
      : ordered;
  return rooms.map((room, i) => ({ ...room, numeral: toRoman(i + 1) }));
}

export function roomCountLabel(room: Room): string {
  const count = `${pad2(room.works.length)} ${room.works.length === 1 ? 'work' : 'works'}`;
  if (room.kind === 'series') return `Series · ${count}`;
  if (room.kind === 'diptych') return `Diptych · ${count}`;
  return count;
}

export interface MediumCount {
  medium: Medium;
  count: number;
}

export function mediumCounts(artworks: Artwork[]): { total: number; mediums: MediumCount[] } {
  return {
    total: artworks.length,
    mediums: MEDIUMS.map((medium) => ({ medium, count: artworks.filter((a) => a.medium === medium).length })).filter(
      (entry) => entry.count > 0
    ),
  };
}

export function wallLabelHeading(artwork: Artwork, rooms: Room[]): string {
  if (!artwork.series) return 'Standalone work';
  const room = rooms.find((r) => r.key === artwork.series!.slug);
  if (!room) return artwork.series.name;
  const index = room.works.findIndex((w) => w.slug === artwork.slug);
  return `${room.numeral} · ${room.name} · ${pad2(index + 1)} / ${pad2(room.works.length)}`;
}
