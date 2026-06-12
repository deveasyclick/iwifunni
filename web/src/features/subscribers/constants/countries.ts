import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';

const countryNames: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  GR: 'Greece',
  PL: 'Poland',
  CZ: 'Czech Republic',
  SK: 'Slovakia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  RS: 'Serbia',
  SI: 'Slovenia',
  LT: 'Lithuania',
  LV: 'Latvia',
  EE: 'Estonia',
  IS: 'Iceland',
  LU: 'Luxembourg',
  MT: 'Malta',
  CY: 'Cyprus',
  UA: 'Ukraine',
  RU: 'Russia',
  TR: 'Turkey',
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  TH: 'Thailand',
  VN: 'Vietnam',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
  ZA: 'South Africa',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  NZ: 'New Zealand',
};

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export interface Country {
  code: CountryCode;
  dial: string;
  name: string;
  flag: string;
}

let cachedCountries: Country[] | null = null;

export function getCountryList(): Country[] {
  if (cachedCountries) return cachedCountries;

  const countries: Country[] = getCountries()
    .filter((code) => countryNames[code])
    .map((code) => ({
      code,
      dial: `+${getCountryCallingCode(code)}`,
      name: countryNames[code],
      flag: getFlagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Move most relevant countries to the top
  const priority = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL'];
  const priorityCountries: Country[] = [];
  const remaining: Country[] = [];

  for (const country of countries) {
    if (priority.includes(country.code)) {
      priorityCountries.push(country);
    } else {
      remaining.push(country);
    }
  }

  cachedCountries = [...priorityCountries, ...remaining];
  return cachedCountries;
}
