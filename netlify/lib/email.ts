import { signKey, type Order } from '../../src/lib/prints/order';
import { sizeLabel } from '../../src/lib/prints/print-sizes';
import { REGION_NAMES } from '../../src/lib/prints/shipping';
import { canPrintCollectorName } from './certificate-pdf';
import { defaultSiteUrl } from './http';

export const FROM = 'Gluk <orders@glukart.com>';

export type Message = { subject: string; html: string; text: string };
export type Mail = Message & { to: string };
export type Mailer = (mail: Mail) => Promise<void>;

export function orderUrl(token: string, site = defaultSiteUrl()): string {
  return `${site}/collector?o=${encodeURIComponent(token)}`;
}

export function certificateUrl(id: string, secret: string, site = defaultSiteUrl()): string {
  return `${site}/api/certificate?id=${encodeURIComponent(id)}&key=${signKey(id, secret)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const countryName = (iso: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso) ?? iso;
  } catch {
    return iso;
  }
};

const formatName = (o: Order) => (o.format === 'large' ? 'Large' : 'Small');
const size = (o: Order) => sizeLabel({ widthCm: o.widthCm, heightCm: o.heightCm });
const edition = (o: Order) => `${o.editionNumber} / ${o.editionSize}`;
const total = (o: Order) => o.priceCents + o.shippingCents;
const piece = (o: Order) => `${o.artworkTitle} · ${formatName(o)} · ${size(o)}`;

// Countries whose labels read "City, State Postal"; elsewhere "Postal City", state below.
const CITY_STATE_POSTAL = new Set(['US', 'CA', 'AU', 'MX']);

function addressLines(o: Order): string[] {
  const a = o.customer.address;
  const join = (parts: (string | null)[], sep: string) => parts.filter(Boolean).join(sep);
  const locality = CITY_STATE_POSTAL.has(a.country)
    ? [join([a.city, join([a.state, a.postalCode], ' ')], ', ')]
    : [join([a.postalCode, a.city], ' '), a.state];
  return [o.customer.name, a.line1, a.line2, ...locality, countryName(a.country)].filter(
    (line): line is string => Boolean(line),
  );
}

const contactLines = (o: Order) => [o.customer.name, o.customer.email, o.customer.phone].filter((l): l is string => Boolean(l));

// Rows are [label, plain-text value, optional link]. Values are escaped here, once.
type Row = [label: string, value: string, href?: string];

const textRows = (rows: Row[]) => rows.map(([label, value]) => `${label}:\n${value}`).join('\n\n');

function htmlRows(rows: Row[]): string {
  const cell = (value: string, href?: string) => {
    const body = escapeHtml(value).replace(/\n/g, '<br>');
    return href ? `<a href="${escapeHtml(href)}" style="color:#0C5FA0;word-break:break-all">${body}</a>` : body;
  };
  return rows
    .map(
      ([label, value, href]) =>
        `<tr><td style="padding:6px 12px 6px 0;border-top:1px solid #ddd;color:#666;vertical-align:top;width:9em">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;border-top:1px solid #ddd;vertical-align:top">${cell(value, href)}</td></tr>`,
    )
    .join('');
}

// Plain, functional layout for Guillermo's own notifications.
function plainHtml(heading: string, intro: string[], rows: Row[]): string {
  const paras = intro.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join('');
  return (
    `<!doctype html><html><body style="margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">` +
    `<div style="max-width:640px;padding:24px 20px">` +
    `<h1 style="font-size:18px;margin:0 0 16px">${escapeHtml(heading)}</h1>${paras}` +
    (rows.length ? `<table style="border-collapse:collapse;width:100%;margin:16px 0">${htmlRows(rows)}</table>` : '') +
    `</div></body></html>`
  );
}

const plainText = (heading: string, intro: string[], rows: Row[]) =>
  [heading, ...intro, textRows(rows)].join('\n\n') + '\n';

function amountRows(o: Order): Row[] {
  return [
    ['Print', `${usd(o.priceCents)} USD`],
    ['Shipping', `${usd(o.shippingCents)} USD · DHL Express, ${REGION_NAMES[o.region]}`],
    ['Total paid', `${usd(total(o))} USD`],
  ];
}

// Unknown (font unreadable) counts as printable: the certificate link would fail anyway.
function namePrintable(name: string): boolean {
  try {
    return canPrintCollectorName(name);
  } catch {
    return true;
  }
}

export function ownerNotification(order: Order, certUrl: string, site = defaultSiteUrl()): Message {
  const heading = 'New print sale. Ship via DHL Express.';
  const rows: Row[] = [
    ['Piece', piece(order)],
    ['Edition', edition(order)],
    ...amountRows(order),
    ['Collector', contactLines(order).join('\n')],
    ['Ship to', addressLines(order).join('\n')],
    ['Region', `${REGION_NAMES[order.region]} · DHL Express`],
    ['Order', orderUrl(order.token, site), orderUrl(order.token, site)],
    ['Certificate (PDF)', certUrl, certUrl],
  ];
  const intro = ['The collector pays import duties and taxes on arrival.'];
  if (!namePrintable(order.customer.name)) {
    intro.push('Collector name could not be printed on the certificate: write it by hand.');
  }
  return {
    subject: `Sale: ${order.artworkTitle}, ${formatName(order)}, edition ${edition(order)} · ship to ${countryName(order.customer.address.country)}`,
    html: plainHtml(heading, intro, rows),
    text: plainText(heading, intro, rows),
  };
}

export function collectorConfirmation(order: Order, site = defaultSiteUrl()): Message {
  const link = orderUrl(order.token, site);
  const e = escapeHtml;
  const details = `${formatName(order)} · ${size(order)} · Limited edition print`;
  const note = 'Your order page shows the status, and the tracking number once it ships.';
  const duties = 'Import duties and taxes are paid by the collector on arrival.';
  const html =
    `<!doctype html><html><body style="margin:0;background:#1E1619;color:#F1EEE8;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55">` +
    `<div style="max-width:560px;padding:36px 24px">` +
    `<img src="${e(site)}/brand/wordmark-white.png" alt="GLUK" height="28" style="display:block;height:28px;width:auto;margin-bottom:32px">` +
    `<p style="margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.6">Order confirmed</p>` +
    `<h1 style="margin:8px 0 20px;font-size:30px;line-height:1.05;font-weight:800">${e(order.artworkTitle)}</h1>` +
    `<p style="margin:0 0 8px;font-size:24px;font-weight:300">${e(edition(order))}</p>` +
    `<p style="margin:0 0 4px">${e(details)}</p>` +
    `<p style="margin:0 0 28px;opacity:.6">Ships from the studio in Mexico by DHL Express.</p>` +
    `<p style="margin:0 0 28px"><a href="${e(link)}" style="display:inline-block;padding:12px 22px;border:1px solid #F1EEE8;color:#F1EEE8;text-decoration:none;letter-spacing:.12em;text-transform:uppercase;font-size:13px">View your order</a></p>` +
    `<p style="margin:0 0 6px;font-size:14px;opacity:.6">${e(note)} ${e(duties)}</p>` +
    `<p style="margin:0 0 32px;font-size:13px;opacity:.6;word-break:break-all"><a href="${e(link)}" style="color:#F1EEE8">${e(link)}</a></p>` +
    `<p style="margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.55">glukart.com</p>` +
    `</div></body></html>`;
  const text = [
    'Order confirmed',
    order.artworkTitle,
    edition(order),
    details,
    'Ships from the studio in Mexico by DHL Express.',
    `View your order: ${link}`,
    `${note} ${duties}`,
    'glukart.com',
  ].join('\n\n') + '\n';
  return { subject: `Your Gluk print · ${order.artworkTitle}, ${edition(order)}`, html, text };
}

function refundRows(order: Order, paymentIntent: string): Row[] {
  return [
    ['Piece', piece(order)],
    ...amountRows(order),
    ['Collector', contactLines(order).join('\n')],
    ['Payment', paymentIntent],
    ['Stripe session', order.stripeSessionId],
  ];
}

export function refundedNotice(order: Order, paymentIntent: string): Message {
  const heading = 'A payment was refunded automatically.';
  const intro = [
    `The ${formatName(order).toLowerCase()} edition of ${order.artworkTitle} was sold out when the payment arrived (the reservation had expired and the last number went to another collector).`,
    'The full amount was refunded through Stripe and no order was created. The collector was sent an apology email.',
  ];
  const rows = refundRows(order, paymentIntent);
  return {
    subject: `Refunded automatically: ${order.artworkTitle}, ${formatName(order)} was sold out`,
    html: plainHtml(heading, intro, rows),
    text: plainText(heading, intro, rows),
  };
}

export function refundApology(order: Order): Message {
  const heading = 'Your payment has been refunded.';
  const intro = [
    `We are sorry. The last print of ${order.artworkTitle} (${formatName(order)} · ${size(order)}) was collected while your payment was being completed, so the edition is sold out.`,
    `Your payment of ${usd(total(order))} USD has been refunded in full to the card you used.`,
    'Gluk · glukart.com',
  ];
  return {
    subject: `Your payment for ${order.artworkTitle} has been refunded`,
    html: plainHtml(heading, intro, []),
    text: [heading, ...intro].join('\n\n') + '\n',
  };
}

export function refundFailedAlert(order: Order, paymentIntent: string, error: string): Message {
  const heading = 'ACTION NEEDED: refund this payment by hand in Stripe.';
  const intro = [
    `The ${formatName(order).toLowerCase()} edition of ${order.artworkTitle} was sold out when this payment arrived, and the automatic refund failed.`,
    `Stripe said: ${error}`,
    'No order was created. Stripe will retry the webhook, but please refund this payment in the Stripe dashboard and write to the collector.',
  ];
  const rows = refundRows(order, paymentIntent);
  return {
    subject: `ACTION NEEDED: refund failed for ${order.artworkTitle} (sold out)`,
    html: plainHtml(heading, intro, rows),
    text: plainText(heading, intro, rows),
  };
}

type ResendLike = {
  emails: {
    send(payload: { from: string; to: string; subject: string; html: string; text: string }): Promise<{
      error: { message: string; name?: string } | null;
    }>;
  };
};

// The client is created on first send, so a missing API key fails that email, not the order.
export function resendMailer(client: () => ResendLike): Mailer {
  let resend: ResendLike | undefined;
  return async ({ to, subject, html, text }) => {
    resend ??= client();
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) throw Object.assign(new Error(error.message), { name: error.name || 'ResendError' });
  };
}

export function brokenSessionAlert(sessionId: string, paymentIntent: string): Message {
  const heading = 'ACTION NEEDED: a paid checkout could not become an order.';
  const intro = [
    'Stripe reported a paid checkout from the site whose order details were incomplete, so no order or edition number was created and no email went to the collector.',
    'Open the payment in the Stripe dashboard, then either create the order by hand or refund it.',
  ];
  const rows: Row[] = [
    ['Stripe session', sessionId],
    ['Payment', paymentIntent],
  ];
  return {
    subject: `ACTION NEEDED: paid session ${sessionId} could not become an order`,
    html: plainHtml(heading, intro, rows),
    text: plainText(heading, intro, rows),
  };
}
