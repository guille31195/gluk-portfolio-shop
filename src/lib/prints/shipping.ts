export type RegionId = 'MX' | 'US_CA' | 'LATAM' | 'EU_UK' | 'ROW';

// Flat USD rates. TODO before launch: verify against a real DHL quote.
export const SHIPPING_RATES_USD: Record<RegionId, number> = {
  MX: 20,
  US_CA: 50,
  LATAM: 60,
  EU_UK: 60,
  ROW: 80,
};

export const EXCLUDED_COUNTRIES: readonly string[] = ['CU', 'IR', 'KP', 'SY', 'RU', 'BY'];

const words = (s: string) => s.split(/\s+/).filter(Boolean);

const MX = ['MX'];
const US_CA = ['US', 'CA'];
const LATAM = words(`
  AG AI AR AW BB BO BQ BR BS BZ CL CO CR CW DM DO EC GD GT GY HN HT JM KN KY LC
  MS NI PA PE PR PY SR SV SX TC TT UY VC VE VG
`);
const EU_UK = words(`
  AD AL AT BA BE BG CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT
  JE LI LT LU LV MC ME MK MT NL NO PL PT RO RS SE SI SK SM VA XK
`);

// Countries Stripe Checkout accepts in allowed_countries. Re-check against Stripe's docs before launch.
const STRIPE_COUNTRIES = words(`
  AC AD AE AF AG AI AL AM AO AQ AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT
  BV BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET
  FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM
  IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD
  ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF
  PG PH PK PL PM PN PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST
  SV SX SZ TA TC TD TF TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK
  YE YT ZA ZM ZW
`);

const NAMED: Record<Exclude<RegionId, 'ROW'>, string[]> = { MX, US_CA, LATAM, EU_UK };
const taken = new Set([...Object.values(NAMED).flat(), ...EXCLUDED_COUNTRIES]);

const COUNTRIES: Record<RegionId, string[]> = {
  MX: [...MX].sort(),
  US_CA: [...US_CA].sort(),
  LATAM: [...LATAM].sort(),
  EU_UK: [...EU_UK].sort(),
  ROW: STRIPE_COUNTRIES.filter((iso) => !taken.has(iso)).sort(),
};

const REGION_BY_COUNTRY = new Map<string, RegionId>(
  (Object.keys(COUNTRIES) as RegionId[]).flatMap((region) =>
    COUNTRIES[region].map((iso) => [iso, region] as const),
  ),
);

export function regionForCountry(iso2: string): RegionId | null {
  return REGION_BY_COUNTRY.get(iso2.toUpperCase()) ?? null;
}

export function countriesInRegion(region: RegionId): string[] {
  return [...COUNTRIES[region]];
}

export function shippingCents(region: RegionId): number {
  return SHIPPING_RATES_USD[region] * 100;
}
