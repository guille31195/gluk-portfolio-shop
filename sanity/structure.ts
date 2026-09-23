import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Home Page')
        .child(
          S.document().schemaType('homePage').documentId('homePage')
        ),
      S.documentTypeListItem('artwork').title('Artwork'),
      S.documentTypeListItem('journalPost').title('Journal Posts'),
      S.listItem()
        .title('Tattoo Info')
        .child(
          S.document().schemaType('tattooInfo').documentId('tattooInfo')
        ),
    ]);
