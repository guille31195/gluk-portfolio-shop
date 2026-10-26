import type Stripe from 'stripe';
import { ordersClient, resend, stripe } from '../lib/clients';
import {
  brokenSessionAlert,
  certificateUrl,
  collectorConfirmation,
  ownerNotification,
  refundApology,
  refundedNotice,
  refundFailedAlert,
  resendMailer,
  type Mail,
  type Mailer,
} from '../lib/email';
import { defaultSiteUrl, json, serverError, type Reply } from '../lib/http';
import { createSanityEditionStore } from '../lib/sanity-store';
import {
  counterId,
  EDITION_SIZE,
  finalizeEdition,
  releaseReservation,
  type EditionStore,
  type RetryOptions,
} from '../../src/lib/prints/edition';
import { orderId, type Order } from '../../src/lib/prints/order';
import type { Format } from '../../src/lib/prints/print-sizes';
import { REGION_NAMES, type RegionId } from '../../src/lib/prints/shipping';

export type WebhookStripe = {
  webhooks: { constructEventAsync(payload: string, header: string, secret: string): Promise<Stripe.Event> };
  refunds: {
    list(params: { payment_intent: string; limit: number }): Promise<{ data: { status: string | null }[] }>;
    create(params: { payment_intent: string }, options: { idempotencyKey: string }): Promise<{ id: string }>;
  };
};

export type WebhookDeps = {
  store: EditionStore;
  stripe: WebhookStripe;
  sendMail: Mailer;
  now: () => Date;
  webhookSecret: string;
  certSecret: string;
  ownerEmail: string;
  siteUrl: string;
  retry?: RetryOptions;
};

// The fields read from a Checkout Session. In API 2026-09-30 the shipping address is
// under collected_information.shipping_details; email and phone under customer_details.
export type CompletedSession = Pick<
  Stripe.Checkout.Session,
  | 'id'
  | 'payment_status'
  | 'payment_intent'
  | 'amount_subtotal'
  | 'shipping_cost'
  | 'metadata'
  | 'customer_details'
  | 'collected_information'
>;

export type WebhookReply = Reply<{ received: true } | { error: 'signature' | 'server' }>;

const OK: WebhookReply = { status: 200, body: { received: true } };
const RETRY: WebhookReply = { status: 500, body: { error: 'server' } };

const FORMATS: readonly Format[] = ['large', 'small'];
const isFormat = (v: unknown): v is Format => FORMATS.includes(v as Format);
const isRegion = (v: unknown): v is RegionId => typeof v === 'string' && Object.hasOwn(REGION_NAMES, v);

const log = (msg: string) => console.error(`stripe-webhook: ${msg}`);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Mail errors can echo a recipient address, so only the name and code are logged.
function errorKind(err: unknown): string {
  if (!(err instanceof Error)) return typeof err;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' || typeof code === 'number' ? `${err.name} (${code})` : err.name;
}

const paymentIntentId = (s: CompletedSession) =>
  typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;

// A positive number written by our checkout; '' or anything else is invalid.
function positive(value: string | undefined): number | null {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

type PrintMeta = { slug: string; format: Format; reservationId: string };

function printMeta(metadata: Stripe.Metadata | null): PrintMeta | null {
  const { slug, format, reservationId } = metadata ?? {};
  if (!slug || !reservationId || !isFormat(format)) return null;
  return { slug, format, reservationId };
}

// The order as it would be stored, minus the edition number, which only finalize knows.
// Null when the metadata our checkout writes is incomplete or malformed.
function draftOrder(session: CompletedSession, createdAt: string): { order: Order; meta: PrintMeta } | null {
  const m = session.metadata ?? {};
  const meta = printMeta(m);
  const widthCm = positive(m.widthCm);
  const heightCm = positive(m.heightCm);
  const year = m.year ? positive(m.year) : null;
  if (!meta || !m.token || !isRegion(m.region) || widthCm === null || heightCm === null) return null;
  if (m.year && year === null) return null;
  const shipping = session.collected_information?.shipping_details;
  const details = session.customer_details;
  const address = shipping?.address ?? details?.address;
  const order: Order = {
    _id: orderId(session.id),
    _type: 'order',
    token: m.token,
    status: 'paid',
    artworkSlug: meta.slug,
    artworkTitle: m.artworkTitle ?? '',
    year,
    medium: m.medium ?? '',
    format: meta.format,
    widthCm,
    heightCm,
    editionNumber: 0,
    editionSize: EDITION_SIZE,
    priceCents: session.amount_subtotal ?? 0,
    shippingCents: session.shipping_cost?.amount_total ?? 0,
    region: m.region,
    stripeSessionId: session.id,
    customer: {
      name: shipping?.name ?? details?.name ?? '',
      email: details?.email ?? '',
      phone: details?.phone ?? null,
      address: {
        line1: address?.line1 ?? '',
        line2: address?.line2 ?? null,
        city: address?.city ?? '',
        state: address?.state ?? null,
        postalCode: address?.postal_code ?? '',
        country: address?.country ?? '',
      },
    },
    createdAt,
    shippedAt: null,
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
  };
  return { order, meta };
}

// Emails are built and sent after the outcome is settled: any failure, including a
// template that throws, is logged and never retried, because a retried event would
// find the order and send nothing.
async function bestEffort(deps: WebhookDeps, which: string, id: string, mail: () => Mail) {
  try {
    await deps.sendMail(mail());
  } catch (err) {
    log(`${which} email failed for ${id}: ${errorKind(err)}`);
  }
}

const LIVE_REFUND = (r: { status: string | null }) => r.status !== 'failed' && r.status !== 'canceled';

async function refundSoldOut(order: Order, session: CompletedSession, deps: WebhookDeps): Promise<WebhookReply> {
  const paymentIntent = paymentIntentId(session);
  try {
    if (!paymentIntent) throw new Error('session has no payment intent');
    // A redelivery, or a refund Guillermo already made by hand, needs nothing more.
    const existing = await deps.stripe.refunds.list({ payment_intent: paymentIntent, limit: 1 });
    if (existing.data.some(LIVE_REFUND)) {
      log(`refund already exists for ${session.id}`);
      return OK;
    }
    await deps.stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-${session.id}` });
  } catch (err) {
    log(`refund failed for ${session.id}: ${message(err)}`);
    await bestEffort(deps, 'refund-failed alert', order._id, () => ({
      to: deps.ownerEmail,
      ...refundFailedAlert(order, paymentIntent ?? 'unknown', message(err)),
    }));
    return RETRY;
  }
  await bestEffort(deps, 'owner refund', order._id, () => ({
    to: deps.ownerEmail,
    ...refundedNotice(order, paymentIntent),
  }));
  if (order.customer.email) {
    await bestEffort(deps, 'collector apology', order._id, () => ({ to: order.customer.email, ...refundApology(order) }));
  }
  return OK;
}

export async function handleCompleted(
  session: CompletedSession,
  createdAt: string,
  deps: WebhookDeps,
): Promise<WebhookReply> {
  if (session.payment_status !== 'paid') return OK;
  const draft = draftOrder(session, createdAt);
  if (!draft) {
    const m = session.metadata ?? {};
    if (!m.slug && !m.reservationId) return OK; // not a print checkout (e.g. a dashboard payment link)
    log(`paid session ${session.id} has invalid print metadata`);
    await bestEffort(deps, 'broken-session alert', session.id, () => ({
      to: deps.ownerEmail,
      ...brokenSessionAlert(session.id, paymentIntentId(session) ?? 'unknown'),
    }));
    return OK;
  }
  const { order: base, meta } = draft;
  const result = await finalizeEdition(
    deps.store,
    counterId(meta.slug, meta.format),
    meta.reservationId,
    deps.now(),
    (editionNumber) => ({ ...base, editionNumber }),
    deps.retry,
  );
  if (result.status === 'already-processed') return OK;
  if (result.status === 'sold-out') return refundSoldOut(base, session, deps);

  const order = { ...base, editionNumber: result.editionNumber };
  console.log(`stripe-webhook: issued edition ${order.editionNumber} for ${order._id}`);
  await bestEffort(deps, 'owner', order._id, () => ({
    to: deps.ownerEmail,
    ...ownerNotification(order, certificateUrl(order._id, deps.certSecret, deps.siteUrl), deps.siteUrl),
  }));
  if (order.customer.email) {
    await bestEffort(deps, 'collector', order._id, () => ({
      to: order.customer.email,
      ...collectorConfirmation(order, deps.siteUrl),
    }));
  }
  return OK;
}

export async function handleExpired(session: Pick<CompletedSession, 'metadata'>, deps: WebhookDeps): Promise<WebhookReply> {
  const meta = printMeta(session.metadata);
  if (meta) await releaseReservation(deps.store, counterId(meta.slug, meta.format), meta.reservationId);
  return OK;
}

export async function handleWebhook(body: string, signature: string | null, deps: WebhookDeps): Promise<WebhookReply> {
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error('missing signature');
    event = await deps.stripe.webhooks.constructEventAsync(body, signature, deps.webhookSecret);
  } catch {
    return { status: 400, body: { error: 'signature' } };
  }
  try {
    if (event.type === 'checkout.session.completed') {
      return await handleCompleted(event.data.object, new Date(event.created * 1000).toISOString(), deps);
    }
    if (event.type === 'checkout.session.expired') return await handleExpired(event.data.object, deps);
    return OK;
  } catch (err) {
    log(`${event.type} ${event.id} failed: ${message(err)}`);
    return RETRY;
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ status: 405, body: { error: 'method' } });
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const certSecret = process.env.CERT_SECRET;
    if (!webhookSecret || !certSecret) throw new Error('webhook is not configured');
    const body = await req.text();
    const deps: WebhookDeps = {
      store: createSanityEditionStore(ordersClient()),
      stripe: stripe(),
      sendMail: resendMailer(resend),
      now: () => new Date(),
      webhookSecret,
      certSecret,
      ownerEmail: process.env.OWNER_EMAIL || 'gluk.caribe@gmail.com',
      siteUrl: defaultSiteUrl(),
    };
    return json(await handleWebhook(body, req.headers.get('stripe-signature'), deps));
  } catch (err) {
    return serverError('stripe-webhook', err);
  }
};

export const config = { path: '/api/stripe-webhook' };
