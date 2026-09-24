import { describe, it, expect } from 'vitest';
import type { Artwork, SeriesInfo } from './artwork-map';
import { groupIntoRooms, mediumCounts, roomCountLabel, wallLabelHeading } from './rooms';

const moto: SeriesInfo = { slug: 'motopirueta', name: 'Motopirueta', order: 1, kind: 'series', halo: 'auto' };
const violenta: SeriesInfo = { slug: 'violenta', name: 'Violenta', order: 2, kind: 'diptych', halo: 'auto' };

function art(slug: string, overrides: Partial<Artwork> = {}): Artwork {
  return {
    slug,
    title: slug,
    medium: 'oil-painting',
    year: null,
    dimensions: null,
    description: null,
    images: [],
    originalStatus: 'notForSale',
    printOptions: [],
    series: null,
    seriesPosition: null,
    haloSetting: 'auto',
    halo: false,
    ...overrides,
  };
}

const works = [
  art('johnny'),
  art('violenta-ii', { series: violenta, seriesPosition: 2 }),
  art('moto-2', { series: moto, seriesPosition: 2 }),
  art('violenta-i', { series: violenta, seriesPosition: 1 }),
  art('moto-1', { series: moto, seriesPosition: 1 }),
  art('bajale', { medium: 'mixed-media' }),
];

describe('groupIntoRooms', () => {
  it('orders series rooms by series order, works by position, standalone last', () => {
    const rooms = groupIntoRooms(works);
    expect(rooms.map((r) => [r.numeral, r.name, r.kind, r.works.map((w) => w.slug)])).toEqual([
      ['I', 'Motopirueta', 'series', ['moto-1', 'moto-2']],
      ['II', 'Violenta', 'diptych', ['violenta-i', 'violenta-ii']],
      ['III', 'Standalone works', 'standalone', ['bajale', 'johnny']],
    ]);
  });

  it('puts works without a position after positioned ones, by title', () => {
    const rooms = groupIntoRooms([
      art('b', { series: moto, seriesPosition: null }),
      art('a', { series: moto, seriesPosition: null }),
      art('c', { series: moto, seriesPosition: 1 }),
    ]);
    expect(rooms[0].works.map((w) => w.slug)).toEqual(['c', 'a', 'b']);
  });

  it('orders standalone works by year (newest first, missing years last), then by title', () => {
    const rooms = groupIntoRooms([
      art('perdi', { title: 'Perdí el coco' }),
      art('johnny', { title: 'Johnny Efectivo' }),
      art('old', { title: 'Zeta', year: 2019 }),
      art('bajale', { title: 'Bájale 2 Gallito' }),
      art('new', { title: 'Alfa', year: 2024 }),
    ]);
    expect(rooms[0].works.map((w) => w.slug)).toEqual(['new', 'old', 'bajale', 'johnny', 'perdi']);
  });

  it('returns one standalone room when no series exist yet', () => {
    const rooms = groupIntoRooms([art('x'), art('y')]);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ numeral: 'I', kind: 'standalone', name: 'Standalone works' });
  });

  it('returns no rooms for no artworks', () => {
    expect(groupIntoRooms([])).toEqual([]);
  });
});

describe('roomCountLabel', () => {
  it('names the kind and pads the count', () => {
    const rooms = groupIntoRooms(works);
    expect(rooms.map(roomCountLabel)).toEqual(['Series · 02 works', 'Diptych · 02 works', '02 works']);
  });

  it('uses the singular for one work', () => {
    expect(roomCountLabel(groupIntoRooms([art('solo')])[0])).toBe('01 work');
  });
});

describe('mediumCounts', () => {
  it('counts per medium in MEDIUMS order and skips empty mediums', () => {
    expect(mediumCounts(works)).toEqual({
      total: 6,
      mediums: [
        { medium: 'oil-painting', count: 5 },
        { medium: 'mixed-media', count: 1 },
      ],
    });
  });
});

describe('wallLabelHeading', () => {
  const rooms = groupIntoRooms(works);

  it('shows numeral, series and position out of total', () => {
    expect(wallLabelHeading(works[2], rooms)).toBe('I · Motopirueta · 02 / 02');
  });

  it('says standalone for works without a series', () => {
    expect(wallLabelHeading(works[0], rooms)).toBe('Standalone work');
  });
});
