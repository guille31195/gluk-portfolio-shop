import { defineType, defineField } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'image',
      description:
        'Full-screen photo at the top of the home page. Set the hotspot on the subject — phones crop around it.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'portraitAlt',
      title: 'Portrait alt text',
      type: 'string',
      description: 'Describes the photo for screen readers.',
      validation: (Rule) =>
        Rule.custom((alt, context) => {
          const doc = context.document as { portrait?: { asset?: unknown } } | undefined;
          if (doc?.portrait?.asset && !alt?.trim()) {
            return 'Alt text is required when a portrait is set.';
          }
          return true;
        }),
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
