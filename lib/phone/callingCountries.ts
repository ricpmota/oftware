import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  type CountryCode,
} from 'libphonenumber-js';

export type PhoneCountry = {
  iso: CountryCode;
  name: string;
  ddi: string;
  flag: string;
};

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'BR';
export const DEFAULT_PHONE_DDI = '55';

const PINNED_ISO: CountryCode[] = ['BR', 'US', 'PT', 'AR', 'CL'];

const DDI_FALLBACK_ISO: Record<string, CountryCode> = {
  '1': 'US',
  '7': 'RU',
  '44': 'GB',
};

function countryNamePt(iso: CountryCode): string {
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(iso) || iso;
  } catch {
    return iso;
  }
}

/** Bandeira emoji a partir do ISO-3166 alpha-2 (sem asset extra). */
export function isoFlagEmoji(iso: string): string {
  const cc = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)));
}

export function isPhoneCountryIso(value: string | null | undefined): value is CountryCode {
  return Boolean(value && isSupportedCountry(value));
}

let cachedList: PhoneCountry[] | null = null;

export function listPhoneCountries(): PhoneCountry[] {
  if (cachedList) return cachedList;

  const byIso = new Map<string, PhoneCountry>();
  for (const iso of getCountries()) {
    byIso.set(iso, {
      iso,
      name: countryNamePt(iso),
      ddi: String(getCountryCallingCode(iso)),
      flag: isoFlagEmoji(iso),
    });
  }

  const pinned = PINNED_ISO.map((iso) => byIso.get(iso)).filter(
    (c): c is PhoneCountry => Boolean(c),
  );
  const pinnedSet = new Set(PINNED_ISO);
  const rest = [...byIso.values()]
    .filter((c) => !pinnedSet.has(c.iso))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  cachedList = [...pinned, ...rest];
  return cachedList;
}

export function findPhoneCountry(iso: string | null | undefined): PhoneCountry | undefined {
  if (!iso) return undefined;
  const code = iso.trim().toUpperCase();
  return listPhoneCountries().find((c) => c.iso === code);
}

export function countriesWithDdi(ddi: string): PhoneCountry[] {
  const digits = ddi.replace(/\D/g, '');
  if (!digits) return [];
  return listPhoneCountries().filter((c) => c.ddi === digits);
}

function foldSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchPhoneCountries(query: string): PhoneCountry[] {
  const q = foldSearch(query);
  const ddiQuery = query.replace(/\D/g, '');
  const all = listPhoneCountries();
  if (!q && !ddiQuery) return all;

  return all.filter((c) => {
    if (ddiQuery && (c.ddi === ddiQuery || c.ddi.startsWith(ddiQuery) || ddiQuery.startsWith(c.ddi))) {
      return true;
    }
    const name = foldSearch(c.name);
    const iso = foldSearch(c.iso);
    return name.includes(q) || iso.includes(q) || `+${c.ddi}`.includes(q);
  });
}

/**
 * País para a UI. DDI sozinho não identifica (ex.: +1).
 * Sem ISO e sem DDI → Brasil (legado).
 */
export function resolvePhoneCountryIso(input: {
  telefonePais?: string | null;
  telefoneDdi?: string | null;
}): CountryCode {
  if (isPhoneCountryIso(input.telefonePais)) return input.telefonePais;

  const ddi = (input.telefoneDdi || '').replace(/\D/g, '');
  if (!ddi) return DEFAULT_PHONE_COUNTRY;

  const matches = countriesWithDdi(ddi);
  if (matches.length === 1) return matches[0].iso;

  const fallback = DDI_FALLBACK_ISO[ddi];
  if (fallback && matches.some((c) => c.iso === fallback)) return fallback;

  const pinned = PINNED_ISO.find((iso) => matches.some((c) => c.iso === iso));
  if (pinned) return pinned;

  return matches[0]?.iso ?? DEFAULT_PHONE_COUNTRY;
}

export function getPhoneCountryOrDefault(input: {
  telefonePais?: string | null;
  telefoneDdi?: string | null;
}): PhoneCountry {
  const iso = resolvePhoneCountryIso(input);
  return findPhoneCountry(iso) ?? {
    iso: DEFAULT_PHONE_COUNTRY,
    name: 'Brasil',
    ddi: DEFAULT_PHONE_DDI,
    flag: isoFlagEmoji(DEFAULT_PHONE_COUNTRY),
  };
}
