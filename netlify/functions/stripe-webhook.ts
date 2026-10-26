import type Stripe from 'stripe';
import { ordersClient, resend, stripe } from '../lib/clients';
import {
  certificateUrl,
  collectorConfirmation,
  defaultSiteUrl,
  ownerNotification,
  refundApology,
  refundedNotice,
  refundFailedAlert,
  resendMailer,
  type Mail,
  type Mailer,
} from '../lib/email';
import { json, serverError, type Reply } from '../lib/http';
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
const isRegion = (v: unknown): v is RegionId => typeof v === 'string' && v in REGION_NAMES;

const log = (msg: string) => console.error(`stripe-webhook: ${msg}`);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

type PrintMeta = { slug: string; format: Format; reservationId: string };

function printMeta(metadata: Stripe.Metadata | null): PrintMeta | null {
  const { slug, format, reservationId } = metadata ?? {};
  if (!slug || !reservationId || !isFormat(format)) return null;
  return { slug, format, reservationId };
}

// The order as it would be stored, minus the edition number, which only finalize knows.
function draftOrder(session: CompletedSession, createdAt: string): Order | null {
  const m = session.metadata ?? {};
  const meta = printMeta(m);
  if (!meta || !m.token || !isRegion(m.region)) return null;
  const shipping = session.collected_information?.shipping_details;
  const details = session.customer_details;
  const address = shipping?.address ?? details?.address;
  return {
    _id: orderId(session.id),
    _type: 'order',
    token: m.token,
    status: 'paid',
    artworkSlug: meta.slug,
    artworkTitle: m.artworkTitle ?? '',
    year: m.year ? Number(m.year) : null,
    medium: m.medium ?? '',
    format: meta.format,
    widthCm: Number(m.widthCm),
    heightCm: Number(m.heightCm),
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
}

// Emails go out after the order is stored: a failure is logged, never retried, because
// a retried event would find the order and send nothing.
async function bestEffort(deps: WebhookDeps, which: string, id: string, mail: Mail) {
  try {
    await deps.sendMail(mail);
  } catch (err) {
    log(`${which} email failed for ${id}: ${message(err)}`);
  }
}

async function refundSoldOut(order: Order, session: CompletedSession, deps: WebhookDeps): Promise<WebhookReply> {
  const pi = session.payment_intent;
  const paymentIntent = typeof pi === 'string' ? pi : pi?.id;
  try {
    if (!paymentIntent) throw new Error('session has no payment intent');
    await deps.stripe.refunds.create(
      { payment_intent: paymentIntent },
      { idempotencyKey: `refund-${session.id}` },
    );
  } catch (err) {
    log(`refund failed for ${session.id}: ${message(err)}`);
    await bestEffort(deps, 'refund-failed alert', order._id, {
      to: deps.ownerEmail,
      ...refundFailedAlert(order, paymentIntent ?? 'unknown', message(err)),
    });
    return RETRY;
  }
  await bestEffort(deps, 'owner refund', order._id, { to: deps.ownerEmail, ...refundedNotice(order, paymentIntent) });
  if (order.customer.email) {
    await bestEffort(deps, 'collector apology', order._id, { to: order.customer.email, ...refundApology(order) });
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
    log(`session ${session.id} has no print metadata`);
    return OK;
  }
  const meta = printMeta(session.metadata)!;
  const result = await finalizeEdition(
    deps.store,
    counterId(meta.slug, meta.format),
    meta.reservationId,
    deps.now(),
    (editionNumber) => ({ ...draft, editionNumber }),
    deps.retry,
  );
  if (result.status === 'already-processed') return OK;
  if (result.status === 'sold-out') return refundSoldOut(draft, session, deps);

  const order = { ...draft, editionNumber: result.editionNumber };
  const cert = certificateUrl(order._id, deps.certSecret, deps.siteUrl);
  await bestEffort(deps, 'owner', order._id, { to: deps.ownerEmail, ...ownerNotification(order, cert, deps.siteUrl) });
  if (order.customer.email) {
    await bestEffort(deps, 'collector', order._id, {
      to: order.customer.email,
      ...collectorConfirmation(order, deps.siteUrl),
    });
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
      sendMail: resendMailer(resend()),
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
