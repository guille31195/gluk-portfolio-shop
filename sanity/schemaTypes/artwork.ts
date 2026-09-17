import { defineType, defineField } from 'sanity';

export const artwork = defineType({
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
      options: {
        list: [
          { title: 'Oil Painting', value: 'oil-painting' },
          { title: 'Tattoo', value: 'tattoo' },
          { title: 'Sculpture', value: 'sculpture' },
          { title: 'Mixed Media', value: 'mixed-media' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'string',
    }),
    defineField({
      name: 'availableAsOriginal',
      title: 'Available as Original',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'printOptions',
      title: 'Print Options',
      type: 'array',
      of: [{ type: 'printOption' }],
    }),
  ],
});
