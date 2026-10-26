import { defineType, defineField } from 'sanity';

// Written by the Stripe webhook. Only fulfilment fields are editable in Studio.
const locked = { readOnly: true } as const;

export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  liveEdit: true,
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Paid', value: 'paid' },
          { title: 'Shipped', value: 'shipped' },
          { title: 'Void', value: 'void' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'shippedAt', title: 'Shipped at', type: 'datetime' }),
    defineField({ name: 'carrier', title: 'Carrier', type: 'string' }),
    defineField({ name: 'trackingNumber', title: 'Tracking number', type: 'string' }),
    defineField({ name: 'trackingUrl', title: 'Tracking URL', type: 'url' }),
    defineField({ name: 'artworkTitle', title: 'Artwork', type: 'string', ...locked }),
    defineField({ name: 'artworkSlug', title: 'Artwork slug', type: 'string', ...locked }),
    defineField({ name: 'year', title: 'Year', type: 'number', ...locked }),
    defineField({ name: 'medium', title: 'Medium', type: 'string', ...locked }),
    defineField({ name: 'format', title: 'Format', type: 'string', ...locked }),
    defineField({ name: 'widthCm', title: 'Width (cm)', type: 'number', ...locked }),
    defineField({ name: 'heightCm', title: 'Height (cm)', type: 'number', ...locked }),
    defineField({ name: 'editionNumber', title: 'Edition number', type: 'number', ...locked }),
    defineField({ name: 'editionSize', title: 'Edition size', type: 'number', ...locked }),
    defineField({ name: 'priceCents', title: 'Price (US cents)', type: 'number', ...locked }),
    defineField({ name: 'shippingCents', title: 'Shipping (US cents)', type: 'number', ...locked }),
    defineField({ name: 'region', title: 'Shipping region', type: 'string', ...locked }),
    defineField({
      name: 'customer',
      title: 'Collector',
      type: 'object',
      ...locked,
      fields: [
        defineField({ name: 'name', title: 'Name', type: 'string' }),
        defineField({ name: 'email', title: 'Email', type: 'string' }),
        defineField({ name: 'phone', title: 'Phone', type: 'string' }),
        defineField({
          name: 'address',
          title: 'Address',
          type: 'object',
          fields: [
            defineField({ name: 'line1', title: 'Line 1', type: 'string' }),
            defineField({ name: 'line2', title: 'Line 2', type: 'string' }),
            defineField({ name: 'city', title: 'City', type: 'string' }),
            defineField({ name: 'state', title: 'State', type: 'string' }),
            defineField({ name: 'postalCode', title: 'Postal code', type: 'string' }),
            defineField({ name: 'country', title: 'Country', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({ name: 'createdAt', title: 'Created at', type: 'datetime', ...locked }),
    defineField({ name: 'stripeSessionId', title: 'Stripe session', type: 'string', ...locked }),
    defineField({ name: 'token', title: 'Collector link token', type: 'string', ...locked, hidden: true }),
  ],
  orderings: [{ title: 'Newest first', name: 'createdAtDesc', by: [{ field: 'createdAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'artworkTitle', edition: 'editionNumber', status: 'status', name: 'customer.name' },
    prepare: ({ title, edition, status, name }) => ({
      title: `Order — ${title} ${edition}/50`,
      subtitle: [status, name].filter(Boolean).join(' · '),
    }),
  },
});
