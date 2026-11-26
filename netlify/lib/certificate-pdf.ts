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
const PAGE_H_CQW = PAGE.h / CQW;
const MARGIN = { x: 6, y: 5 };
// Left column: the photograph of the work bought. Right column: everything else.
const PHOTO_COL = { x: MARGIN.x, w: 42 };
const RIGHT = { x: MARGIN.x + PHOTO_COL.w + 6, w: 100 - 2 * MARGIN.x - PHOTO_COL.w - 6 };
const RIGHT_END = RIGHT.x + RIGHT.w;
const TITLE = { size: 3, line: 0.92, baseline: 31.3, maxLines: 2 };
const FACT = { label: 10, row: 4 };

const INK = rgb(30 / 255, 22 / 255, 25 / 255); // --color-black #1E1619

export type CertificateCopy = {
  kicker: string;
  signature: string;
  labels: { year: string; original: string; size: string; date: string; collector: string };
};
export const CERTIFICATE_COPY: CertificateCopy = {
  kicker: 'Limited edition print · Certificate of authenticity',
  signature: 'Gluk',
  labels: { year: 'Year', original: 'Original', size: 'Print size', date: 'Date', collector: 'Collector' },
};

// JPEG bytes of the purchased work, as fetched for this order. Optional: without it the
// left column stays empty rather than failing the certificate.
export type CertificatePhoto = Uint8Array;

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
  photo?: CertificatePhoto,
): Promise<{ pdf: Uint8Array; texts: PlacedText[]; collectorNamePrinted: boolean; photoPlaced: boolean }> {
  const copy = CERTIFICATE_COPY;
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

  // Photograph of the work bought, never cropped, as large as the left column allows.
  let photoPlaced = false;
  if (photo) {
    try {
      const image = await doc.embedJpg(photo);
      const boxW = PHOTO_COL.w;
      const boxH = PAGE_H_CQW - 2 * MARGIN.y;
      const scale = Math.min(boxW / image.width, boxH / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      page.drawImage(image, { x: X(PHOTO_COL.x + (boxW - w) / 2), y: Y(MARGIN.y + (boxH - h) / 2 + h), width: w * CQW, height: h * CQW });
      photoPlaced = true;
    } catch {
      // Unreadable image: the certificate is still valid without it.
    }
  }

  // Header: wordmark, glukart.com, rupture rule.
  const wmH = 4.4;
  page.drawImage(wordmark, {
    x: X(RIGHT.x),
    y: Y(MARGIN.y + wmH),
    width: wmH * (wordmark.width / wordmark.height) * CQW,
    height: wmH * CQW,
    opacity: 0.92,
  });
  text('GLUKART.COM', body, 1.1, RIGHT_END, MARGIN.y + 1.7, { spacing: 0.22, align: 'right' });
  const ruleTop = MARGIN.y + wmH + 2;
  page.drawImage(rule, { x: X(RIGHT.x), y: Y(ruleTop + 0.5), width: RIGHT.w * CQW, height: 0.5 * CQW });

  // Kicker, edition number (the biggest thing on the sheet), then the title.
  text(copy.kicker.toUpperCase(), body, 0.95, RIGHT.x, 17.6, { spacing: 0.2, opacity: 0.6 });
  text(`${order.editionNumber} / ${order.editionSize}`, display, 9, RIGHT.x, 26.2, { spacing: -0.025 });
  const title = fitTitle(clean(order.artworkTitle), display, RIGHT.w * CQW);
  const step = title.size * TITLE.line;
  title.lines.forEach((l, i) => text(l, display, title.size, RIGHT.x, TITLE.baseline + step * i, { spacing: -0.025 }));

  // Facts: one column, hairline above each row. Missing facts are left out, except a
  // collector name the font cannot draw (null): that row keeps a blank line to write on.
  const collectorNamePrinted = canPrintCollectorName(order.customer.name);
  const facts = (
    [
      [copy.labels.year, order.year == null ? '' : String(order.year)],
      [copy.labels.original, clean(order.medium)],
      [copy.labels.size, sizeLabel(order)],
      [copy.labels.date, formatDate(order.createdAt)],
      [copy.labels.collector, collectorNamePrinted ? clean(order.customer.name) : null],
    ] as [string, string | null][]
  ).filter(([, value]) => value !== '');
  const factsTop = TITLE.baseline + step * (title.lines.length - 1) + 2.8;
  const ddW = RIGHT.w - FACT.label;
  facts.forEach(([label, value], i) => {
    const top = factsTop + i * FACT.row;
    page.drawLine({ start: { x: X(RIGHT.x), y: Y(top) }, end: { x: X(RIGHT_END), y: Y(top) }, thickness: 0.5, color: INK, opacity: 0.25 });
    text(label.toUpperCase(), body, 1, RIGHT.x, top + 2.6, { spacing: 0.2, opacity: 0.6 });
    if (value === null) {
      const y = Y(top + 3);
      page.drawLine({ start: { x: X(RIGHT.x + FACT.label), y }, end: { x: X(RIGHT_END), y }, thickness: 0.5, color: INK, opacity: 0.5 });
      return;
    }
    const size = Math.min(1.45, (1.45 * ddW * CQW) / body.widthOfTextAtSize(value, 1.45 * CQW));
    text(value, body, size, RIGHT.x + FACT.label, top + 2.6);
  });

  // Signature: space to sign above the line, name below it, bottom right.
  const sigY = PAGE_H_CQW - MARGIN.y - 2.3;
  const sigX = RIGHT_END - 20;
  page.drawLine({ start: { x: X(sigX), y: Y(sigY) }, end: { x: X(RIGHT_END), y: Y(sigY) }, thickness: 0.7, color: INK });
  text(copy.signature.toUpperCase(), body, 1, sigX, sigY + 1.8, { spacing: 0.2 });

  // No object streams: keeps the file simple to inspect; text is checked via `texts`.
  const pdf = await doc.save({ useObjectStreams: false });
  return { pdf, texts, collectorNamePrinted, photoPlaced };
}

export async function renderCertificate(order: Order, photo?: CertificatePhoto): Promise<Uint8Array> {
  return (await renderCertificateDetailed(order, photo)).pdf;
}

export const CERTIFICATE_LIMITS = { contentWidthCqw: RIGHT.w, marginXCqw: MARGIN.x, pageWidthCqw: 100 };
