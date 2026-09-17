import { defineType, defineField } from 'sanity';

export const tattooInfo = defineType({
  name: 'tattooInfo',
  title: 'Tattoo Info',
  type: 'document',
  fields: [
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
