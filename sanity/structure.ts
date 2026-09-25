import type { StructureResolver } from 'sanity/structure';

const singleton = (S: Parameters<StructureResolver>[0], title: string, type: string) =>
  S.listItem().title(title).child(S.document().schemaType(type).documentId(type));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      singleton(S, 'Home Page', 'homePage'),
      singleton(S, 'About Page', 'aboutPage'),
      singleton(S, 'Site Settings', 'siteSettings'),
      S.divider(),
      S.documentTypeListItem('artwork').title('Artwork'),
      S.documentTypeListItem('series').title('Series'),
      singleton(S, 'Tattoo Info', 'tattooInfo'),
    ]);
