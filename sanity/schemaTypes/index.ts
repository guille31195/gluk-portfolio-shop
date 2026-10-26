import { artwork } from './artwork';
import { series } from './series';
import { tattooInfo } from './tattooInfo';
import { homePage } from './homePage';
import { aboutPage } from './aboutPage';
import { siteSettings } from './siteSettings';
import { order } from './order';
import { printEdition } from './printEdition';

export const schemaTypes = [
  artwork,
  series,
  tattooInfo,
  homePage,
  aboutPage,
  siteSettings,
];

// Private `orders` dataset only; never part of the public production schema.
export const ordersSchemaTypes = [order, printEdition];
