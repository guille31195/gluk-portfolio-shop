// Pure mapping for the aboutPage singleton (spec §5.5). Default text is
// Guillermo's BIO.pdf, verbatim: its first sentence is the statement, the rest
// is the body (one string per paragraph).
import { imageAspect } from './image-url';

export const DEFAULT_ABOUT = {
  statement: 'Gluk is a Caribbean artist born in Caracas, Venezuela.',
  body: [
    'Disruptive not in terms of subject matter, but in terms of method and attitude: he articulates ideas using non-traditional media and contemporary technologies alongside oil painting and tattooing. His symbolism, rhythm, and source of consciousness come from the Caribbean, the nucleus from which he approaches identity and representation. He currently lives and works in Mexico City.',
    'For Gluk, art is neither a neutral nor decorative space. It is a tool for confrontation and, at the same time, for care. Even in his most raw or violent explorations, there is a good intention to sustain something that he fears will be lost if he does not narrate it: a story, a bodily memory, a way of inhabiting the world without asking permission.',
    'He studied at NYU Shanghai, during which time, at the age of 20, he exhibited at the Yicangart Museum in Shanghai. Subsequently, he lived in Berlin for eight years, where he furthered his training in new media. During that period, in 2020, he produced Onde du Midi at the Louvre Museum (Paris) and developed interdisciplinary collaborations with artists such as Rawayana, Nicola Cruz, and Solomun, among others.',
    'On canvas, Gluk takes on a central gesture: painting in oil what the canon tends to relegate. By choosing oil—a noble, slow, and demanding medium—he places symbols and iconographies of the Caribbean and its contemporary identity at the heart of the pictorial tradition, elevating them without folklorizing them and shifting clichés from postcards to complex narratives.',
    'In the technological sphere, he converts data and urban signals into reactive experiences: visualizations, generative systems, and screens that respond to the body and context. He does not oppose painting and technology; he puts them in friction to raise questions about identity, memory, and power.',
    'His aesthetic is both precise and streetwise: elegant without being domesticated. No matter how harsh or ironic his themes may be, there is an underlying desire for tenderness. For the world—art, the body, the system—to be touched without being dominated.',
  ],
} as const;

// Gallery-CV list under the BIO, newest first. Facts from Guillermo, checked
// against public sources (Louvre press, Latin Grammy, Wehrmühle and Salón ACME
// archives) and his email on 2026-10-20.
export interface SelectedProject {
  year: number;
  title: string;
  role: string;
  note?: string;
  // Square image in public/, e.g. an album cover.
  cover?: string;
}

export interface Representation {
  gallery: string;
  place: string;
}

export const REPRESENTATION: readonly Representation[] = [
  { gallery: 'West Chelsea Contemporary', place: 'Austin, Texas' },
  { gallery: 'Mooni Gallery', place: 'New York and Mexico City' },
];

export const SELECTED_PROJECTS: readonly SelectedProject[] = [
  {
    year: 2026,
    title: 'THE GARAGE, 4BYSIX Vehicles For Change — Manchester',
    role: 'Group show',
    note: 'Valet parking en Las Mercedes',
    cover: '/projects/the-garage-valet-parking.jpg',
  },
  {
    year: 2026,
    title: 'Orestes Gómez — No me fui porque quise',
    role: 'Album cover',
    cover: '/projects/orestes-gomez-no-me-fui-porque-quise.jpg',
  },
  {
    year: 2024,
    title: 'Viniloversus — Mi Mejor Enemigo',
    role: 'Album cover',
    note: 'Latin Grammy nominee, Best Rock Album',
    cover: '/projects/viniloversus-mi-mejor-enemigo.jpg',
  },
  {
    year: 2020,
    title: 'L’Onde du Midi, Elias Crespin — Musée du Louvre, Paris',
    role: 'Production and installation team',
    note: 'Visual: Pascal Maillard',
    cover: '/projects/onde-du-midi-louvre.jpg',
  },
  { year: 2019, title: 'Art Biesenthal 2019 — Wehrmühle Biesenthal, Berlin', role: 'Group exhibition' },
  { year: 2019, title: 'eyeart – SENSEation — Brandenburger Tor Museum, Berlin', role: 'Interactive installation' },
  {
    year: 2018,
    title: 'Solomun +1 — Pacha Ibiza',
    role: 'Visuals for the season',
    cover: '/projects/solomun-plus-1.jpg',
  },
  {
    year: 2017,
    title: 'Salón ACME No. 5 — Mexico City',
    role: 'Production and fabrication',
    note: 'Carlos García-Noriega Bueno, guest project with Galería de Arte Mexicano',
  },
];

// Plain text with no markup characters, so it is safe to wrap directly.
export const DEFAULT_ABOUT_BODY_HTML = DEFAULT_ABOUT.body.map((p) => `<p>${p}</p>`).join('');

export const ABOUT_PORTRAIT_WIDTHS = [640, 960, 1200, 1800, 2400] as const;
const ABOUT_PORTRAIT_DEFAULT_WIDTH = 1200;

// The portrait box (see about.astro) is 100vw × 70vh on phones and 44vw × 100vh
// on desktop, filled with object-fit: cover. A landscape photo renders wider
// than its column, so srcset must be picked by that cropped width or the
// browser downloads a file too small and upscales it.
function portraitSizes(src: string): string {
  const aspect = imageAspect(src);
  if (!aspect) return '(max-width: 860px) 100vw, 44vw';
  const vh = (boxHeight: number) => `${Math.round(aspect * boxHeight)}vh`;
  return `(max-width: 860px) max(100vw, ${vh(70)}), max(44vw, ${vh(100)})`;
}

export interface RawHotspot {
  x: number;
  y: number;
}

export interface RawAboutPage {
  portrait?: { asset: { _ref: string; _type: string } | null; hotspot?: RawHotspot | null } | null;
  portraitAlt?: string | null;
  statement?: string | null;
  body?: unknown[] | null;
  photoCredit?: string | null;
}

export interface AboutPortrait {
  src: string;
  srcset: string;
  sizes: string;
  alt: string;
  focalPoint: string;
}

export interface AboutPage {
  portrait: AboutPortrait | null;
  statement: string;
  bodyHtml: string;
  photoCredit: string | null;
  // Set when the credit is an Instagram handle ("@name").
  photoCreditUrl: string | null;
}

export interface AboutDeps {
  imageUrl: (image: NonNullable<RawAboutPage['portrait']>, width: number) => string;
  toHtml: (blocks: unknown[]) => string;
}

function toPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function focalPoint(hotspot: RawHotspot | null | undefined): string {
  if (!hotspot) return '50% 50%';
  return `${toPercent(hotspot.x)} ${toPercent(hotspot.y)}`;
}

export function mapAboutPage(raw: RawAboutPage | null, deps: AboutDeps): AboutPage {
  const portrait = raw?.portrait;
  const photoCredit = raw?.photoCredit?.trim() || null;
  const handle = photoCredit?.match(/^@([A-Za-z0-9._]+)$/)?.[1];
  return {
    portrait: portrait?.asset
      ? {
          src: deps.imageUrl(portrait, ABOUT_PORTRAIT_DEFAULT_WIDTH),
          srcset: ABOUT_PORTRAIT_WIDTHS.map((w) => `${deps.imageUrl(portrait, w)} ${w}w`).join(', '),
          sizes: portraitSizes(deps.imageUrl(portrait, ABOUT_PORTRAIT_DEFAULT_WIDTH)),
          alt: raw?.portraitAlt?.trim() || 'GLUK',
          focalPoint: focalPoint(portrait.hotspot),
        }
      : null,
    statement: raw?.statement?.trim() || DEFAULT_ABOUT.statement,
    bodyHtml: raw?.body && raw.body.length > 0 ? deps.toHtml(raw.body) : DEFAULT_ABOUT_BODY_HTML,
    photoCredit,
    photoCreditUrl: handle ? `https://www.instagram.com/${handle}/` : null,
  };
}
