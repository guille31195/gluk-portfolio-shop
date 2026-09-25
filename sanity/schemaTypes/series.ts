import { defineType, defineField } from 'sanity';
import { HALO_OPTIONS } from './haloOptions';

export const series = defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order on the portfolio page',
      type: 'number',
      description: '1 shows first.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: { list: [{ title: 'Series', value: 'series' }, { title: 'Diptych', value: 'diptych' }] },
      initialValue: 'series',
    }),
    defineField({
      name: 'halo',
      title: 'Halo for the whole series',
      type: 'string',
      options: { list: HALO_OPTIONS, layout: 'radio' },
      initialValue: 'auto',
      description: 'Auto = on if any painting in the series has dark edges.',
    }),
  ],
  orderings: [{ title: 'Portfolio order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
