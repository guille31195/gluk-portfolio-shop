import { defineType, defineField } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({ name: 'portrait', title: 'Portrait', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'portraitAlt',
      title: 'Portrait alt text',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((alt, context) => {
          const doc = context.document as { portrait?: { asset?: unknown } } | undefined;
          return doc?.portrait?.asset && !alt?.trim() ? 'Alt text is required when a portrait is set.' : true;
        }),
    }),
    defineField({ name: 'statement', title: 'Statement (large)', type: 'text', rows: 3 }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'photoCredit', title: 'Photography credit', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'About Page' }) },
});
