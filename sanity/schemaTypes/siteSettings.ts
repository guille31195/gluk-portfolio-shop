import { defineType, defineField } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'email', title: 'Public email', type: 'string', validation: (Rule) => Rule.email() }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram handle',
      type: 'string',
      description: 'Without the @.',
    }),
    defineField({ name: 'studioCity', title: 'Studio city', type: 'string' }),
    defineField({
      name: 'tattooInstagramHandle',
      title: 'Tattoo Instagram handle',
      type: 'string',
      description: 'Without the @. Linked from the Tattoo page.',
    }),
    defineField({
      name: 'substackUrl',
      title: 'Substack address',
      type: 'url',
      description: 'e.g. https://name.substack.com — the Journal page lists its posts (updated on each site build).',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
