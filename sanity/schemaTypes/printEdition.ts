import { defineType, defineField } from 'sanity';

// Edition counter per piece and format, managed by the checkout functions only.
export const printEdition = defineType({
  name: 'printEdition',
  title: 'Print edition',
  type: 'document',
  liveEdit: true,
  readOnly: true,
  fields: [
    defineField({ name: 'sold', title: 'Sold', type: 'number' }),
    defineField({
      name: 'reservations',
      title: 'Open reservations',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'reservationId', title: 'Reservation', type: 'string' }),
            defineField({ name: 'expiresAt', title: 'Expires at', type: 'datetime' }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { id: '_id', sold: 'sold' },
    prepare: ({ id, sold }) => ({ title: String(id).replace(/^edition-/, ''), subtitle: `${sold ?? 0}/50 sold` }),
  },
});
