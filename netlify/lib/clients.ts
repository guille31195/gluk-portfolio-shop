import { createClient, type SanityClient } from '@sanity/client';
import { Resend } from 'resend';
import Stripe from 'stripe';

const API_VERSION = '2026-09-16';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const projectId = () => process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb';

export function readClient(): SanityClient {
  return createClient({
    projectId: projectId(),
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
    apiVersion: API_VERSION,
    useCdn: false,
  });
}

export function ordersClient(): SanityClient {
  return createClient({
    projectId: projectId(),
    dataset: 'orders',
    apiVersion: API_VERSION,
    useCdn: false,
    token: env('SANITY_ORDERS_TOKEN'),
  });
}

export function stripe(): Stripe {
  return new Stripe(env('STRIPE_SECRET_KEY'));
}

export function resend(): Resend {
  return new Resend(env('RESEND_API_KEY'));
}
