import { defineType, defineField } from 'sanity';
import { HALO_OPTIONS } from './haloOptions';

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
      name: 'materials',
      title: 'Materials',
      type: 'string',
      description: 'Shown on the artwork page instead of the medium, e.g. "Oil on canvas".',
    }),
    defineField({
      name: 'series',
      title: 'Series',
      type: 'reference',
      to: [{ type: 'series' }],
      description: 'Leave empty for a standalone work.',
    }),
    defineField({
      name: 'seriesPosition',
      title: 'Position in series',
      type: 'number',
      description: '1, 2, 3… Order of this work inside its series.',
      hidden: ({ document }) => !document?.series,
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: 'halo',
      title: 'Halo',
      type: 'string',
      options: { list: HALO_OPTIONS, layout: 'radio' },
      initialValue: 'auto',
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
      name: 'originalStatus',
      title: 'Original',
      type: 'string',
      options: {
        list: [
          { title: 'Available — show "Inquire"', value: 'available' },
          { title: 'Sold — show "Sold"', value: 'sold' },
          { title: 'Not for sale — hide', value: 'notForSale' },
        ],
        layout: 'radio',
      },
      initialValue: 'notForSale',
    }),
    defineField({
      name: 'printOptions',
      title: 'Print Options',
      type: 'array',
      of: [{ type: 'printOption' }],
    }),
  ],
});
