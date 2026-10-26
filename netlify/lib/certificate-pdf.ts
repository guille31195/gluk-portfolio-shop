import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Order } from '../../src/lib/prints/order';
import { sizeLabel } from '../../src/lib/prints/print-sizes';

// Certificate paper: one constant. All layout below is in cqw, 1% of page width.
export const PAGE_MM = { width: 297, height: 210 } as const; // A4 landscape
const PT_PER_MM = 72 / 25.4;
const PAGE = { w: PAGE_MM.width * PT_PER_MM, h: PAGE_MM.height * PT_PER_MM };
const CQW = PAGE.w / 100;
const MARGIN = { x: 7, top: 6 };
const CONTENT_W = 100 - 2 * MARGIN.x;
const TITLE = { size: 7.6, line: 0.92, baseline: 34.6, maxLines: 2 };
const KICKER_GAP = 3.4;

const INK = rgb(30 / 255, 22 / 255, 25 / 255); // --color-black #1E1619

// Wording beyond the facts is placeholder until Guillermo picks (repo copy rule).
// Only option A's layout is built; B and C change the wording only.
export type CertificateVariant = 'A' | 'B' | 'C';
export type CertificateCopy = {
  kicker: string;
  signature: string;
  labels: { year: string; original: string; size: string; edition: string; date: string; collector: string };
};
export const CERTIFICATE_COPY: Record<CertificateVariant, CertificateCopy> = {
  A: {
    kicker: 'Certificate of authenticity',
    signature: 'Gluk',
    labels: { year: 'Year', original: 'Original', size: 'Print size', edition: 'Edition', date: 'Date', collector: 'Collector' },
  },
  B: {
    kicker: 'Limited edition',
    signature: 'Gluk',
    labels: { year: 'Year', original: 'Original', size: 'Print size', edition: 'Edition', date: 'Date', collector: 'Collector' },
  },
  C: {
    kicker: 'Certificate of authenticity · Certificado de autenticidad',
    signature: 'Gluk',
    labels: {
      year: 'Year · Año',
      original: 'Original · Técnica',
      size: 'Print size · Tamaño',
      edition: 'Edition · Edición',
      date: 'Date · Fecha',
      collector: 'Collector · Coleccionista',
    },
  },
};
export const DEFAULT_VARIANT: CertificateVariant = 'A';

export type PlacedText = { text: string; size: number; width: number; x: number; y: number };

// Netlify copies `included_files` into the function bundle at the same
// site-relative path under LAMBDA_TASK_ROOT; locally and in tests the repo root
// (cwd) works, and import.meta.url-relative covers a bundle next to its sources.
function assetDir(): string {
  const candidates = [
    process.env.LAMBDA_TASK_ROOT && join(process.env.LAMBDA_TASK_ROOT, 'netlify/assets'),
    join(process.cwd(), 'netlify/assets'),
    join(dirname(fileURLToPath(import.meta.url)), '../assets'),
  ];
  const found = candidates.find((dir): dir is string => !!dir && existsSync(join(dir, 'wordmark-black.png')));
  if (!found) throw new Error('certificate assets not found');
  return found;
}

const BODY_FONT = 'fonts/Karla-Regular.ttf';
let bodyGlyphs: fontkit.Font | undefined;

// The collector name is drawn in Karla; a character it has no glyph for (CJK, Cyrillic,
// emoji) would print as an empty box, so such a name is left for Guillermo to write.
export function canPrintCollectorName(name: string): boolean {
  bodyGlyphs ??= fontkit.create(readFileSync(join(assetDir(), BODY_FONT)));
  return [...clean(name)].every((ch) => ch === ' ' || bodyGlyphs!.hasGlyphForCodePoint(ch.codePointAt(0)!));
}

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  return lines;
}

// Largest title size (up to TITLE.size cqw) whose wrapped lines all fit.
function fitTitle(text: string, font: PDFFont, maxW: number) {
  for (let size = TITLE.size; size > 1; size -= 0.1) {
    const lines = wrap(text, font, size * CQW, maxW);
    if (lines.length <= TITLE.maxLines && lines.every((l) => font.widthOfTextAtSize(l, size * CQW) <= maxW)) {
      return { size, lines };
    }
  }
  return { size: 1, lines: [text] };
}

export async function renderCertificateDetailed(
  order: Order,
  variant: CertificateVariant = DEFAULT_VARIANT,
): Promise<{ pdf: Uint8Array; texts: PlacedText[]; collectorNamePrinted: boolean }> {
  const copy = CERTIFICATE_COPY[variant];
  const dir = assetDir();
  const [titleFont, lightFont, bodyFont, wordmarkBytes, ruleBytes] = await Promise.all([
    readFile(join(dir, 'fonts/ArchivoExpanded-ExtraBold.ttf')),
    readFile(join(dir, 'fonts/Archivo-Light.ttf')),
    readFile(join(dir, BODY_FONT)),
    readFile(join(dir, 'wordmark-black.png')),
    readFile(join(dir, 'rupture-rule.png')),
  ]);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${clean(order.artworkTitle)} ${order.editionNumber} / ${order.editionSize}`);
  doc.setAuthor('Gluk');
  const page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  // Not subset: pdf.js renders fontkit-subset glyphs of these TTFs as .notdef boxes.
  const [display, light, body, wordmark, rule] = await Promise.all([
    doc.embedFont(titleFont, { subset: false }),
    doc.embedFont(lightFont, { subset: false }),
    doc.embedFont(bodyFont, { subset: false }),
    doc.embedPng(wordmarkBytes),
    doc.embedPng(ruleBytes),
  ]);

  const texts: PlacedText[] = [];
  const X = (cqw: number) => cqw * CQW;
  const Y = (cqwFromTop: number) => PAGE.h - cqwFromTop * CQW;

  function text(
    s: string,
    font: PDFFont,
    sizeCqw: number,
    x: number,
    y: number,
    { spacing = 0, opacity = 1, align = 'left' }: { spacing?: number; opacity?: number; align?: 'left' | 'right' } = {},
  ) {
    const size = sizeCqw * CQW;
    const track = spacing * size;
    const chars = [...s];
    const width = font.widthOfTextAtSize(s, size) + track * (chars.length - 1);
    let cx = align === 'right' ? X(x) - width : X(x);
    texts.push({ text: s, size: sizeCqw, width: width / CQW, x: cx / CQW, y });
    if (!track) {
      page.drawText(s, { x: cx, y: Y(y), size, font, color: INK, opacity });
      return;
    }
    for (const ch of chars) {
      page.drawText(ch, { x: cx, y: Y(y), size, font, color: INK, opacity });
      cx += font.widthOfTextAtSize(ch, size) + track;
    }
  }

  // Header: wordmark, glukart.com, rupture rule.
  const wmH = 5.2;
  page.drawImage(wordmark, {
    x: X(MARGIN.x),
    y: Y(MARGIN.top + wmH),
    width: wmH * (wordmark.width / wordmark.height) * CQW,
    height: wmH * CQW,
    opacity: 0.92,
  });
  text('GLUKART.COM', body, 1.15, 100 - MARGIN.x, MARGIN.top + 1.15 * 1.1, { spacing: 0.22, align: 'right' });
  const ruleTop = MARGIN.top + wmH + 2.2;
  page.drawImage(rule, { x: X(MARGIN.x), y: Y(ruleTop + 0.5), width: CONTENT_W * CQW, height: 0.5 * CQW });

  // Title (wraps, then shrinks) with the kicker above it.
  const title = fitTitle(clean(order.artworkTitle), display, CONTENT_W * CQW);
  const step = title.size * TITLE.line;
  const firstBase = TITLE.baseline - step * (title.lines.length - 1);
  title.lines.forEach((l, i) => text(l, display, title.size, MARGIN.x, firstBase + step * i, { spacing: -0.025 }));
  text(copy.kicker, light, 1.9, MARGIN.x, firstBase - title.size * 0.7 - KICKER_GAP, { spacing: -0.01 });

  // Facts: two columns, hairline above each row. Missing facts are left out, except a
  // collector name the font cannot draw (null): that row keeps a blank line to write on.
  const collectorNamePrinted = canPrintCollectorName(order.customer.name);
  const facts = (
    [
      [copy.labels.year, order.year == null ? '' : String(order.year)],
      [copy.labels.original, clean(order.medium)],
      [copy.labels.size, sizeLabel(order)],
      [copy.labels.edition, `${order.editionNumber} / ${order.editionSize}`],
      [copy.labels.date, formatDate(order.createdAt)],
      [copy.labels.collector, collectorNamePrinted ? clean(order.customer.name) : null],
    ] as [string, string | null][]
  ).filter(([, value]) => value !== '');
  const COL_W = (CONTENT_W - 5) / 2;
  facts.forEach(([label, value], i) => {
    const colX = MARGIN.x + (i % 2) * (COL_W + 5);
    const top = 38.4 + Math.floor(i / 2) * 4.3;
    page.drawLine({ start: { x: X(colX), y: Y(top) }, end: { x: X(colX + COL_W), y: Y(top) }, thickness: 0.5, color: INK, opacity: 0.25 });
    text(label.toUpperCase(), body, 1.05, colX, top + 2.7, { spacing: 0.2, opacity: 0.6 });
    const ddW = COL_W - 11;
    if (value === null) {
      const y = Y(top + 3.1);
      page.drawLine({ start: { x: X(colX + 11), y }, end: { x: X(colX + COL_W), y }, thickness: 0.5, color: INK, opacity: 0.5 });
      return;
    }
    const size = Math.min(1.5, (1.5 * ddW * CQW) / body.widthOfTextAtSize(value, 1.5 * CQW));
    text(value, body, size, colX + 11, top + 2.7);
  });

  // Signature line for Gluk, in the right column.
  const sigX = MARGIN.x + (CONTENT_W - 6) / 2 + 6;
  page.drawLine({ start: { x: X(sigX), y: Y(56.5) }, end: { x: X(100 - MARGIN.x), y: Y(56.5) }, thickness: 0.7, color: INK });
  text(copy.signature.toUpperCase(), body, 1.05, sigX, 64.3, { spacing: 0.2 });

  // No object streams: keeps the file simple to inspect; text is checked via `texts`.
  const pdf = await doc.save({ useObjectStreams: false });
  return { pdf, texts, collectorNamePrinted };
}

export async function renderCertificate(order: Order, variant: CertificateVariant = DEFAULT_VARIANT): Promise<Uint8Array> {
  return (await renderCertificateDetailed(order, variant)).pdf;
}

export const CERTIFICATE_LIMITS = { contentWidthCqw: CONTENT_W, marginXCqw: MARGIN.x, pageWidthCqw: 100 };
