import { defineType, defineField } from 'sanity';

export const tattooInfo = defineType({
  name: 'tattooInfo',
  title: 'Tattoo Info',
  type: 'document',
  fields: [
    defineField({ name: 'statement', title: 'Statement', type: 'text', rows: 3 }),
    defineField({
      name: 'process',
      title: 'Process steps',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Shown as a numbered list.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
  ],
});
