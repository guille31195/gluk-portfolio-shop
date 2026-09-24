import { defineType, defineField } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'heroList',
      title: 'Hero words',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'The numbered list at the top of the home page. Default: Óleo, Tinta, Código.',
      validation: (Rule) => Rule.max(5),
    }),
    defineField({
      name: 'heroFootnote',
      title: 'Hero footnote',
      type: 'string',
      description: 'Small margin text beside the list. Default: Oil, ink and code, put in friction.',
    }),
    defineField({
      name: 'featuredWorks',
      title: 'Featured works',
      type: 'array',
      description: 'Shown on the home page in this order.',
      of: [{ type: 'reference', to: [{ type: 'artwork' }] }],
      validation: (Rule) => [
        Rule.max(5),
        Rule.unique(),
        Rule.min(3).warning('Feature at least 3 works so the home page feels complete.'),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Home Page' }),
  },
});
