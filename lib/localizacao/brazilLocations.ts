import { estadosBrasil } from '@/data/localizacao/estados-brasil';
import { fonteLocalidadesIbge } from '@/data/localizacao/fonte';
import municipiosBrasil from '@/data/localizacao/municipios-brasil.json';

export type BrazilState = {
  nome: string;
  sigla: string;
};

export type BrazilMunicipality = {
  nome: string;
  uf: string;
  codigoIbge: string;
};

export { fonteLocalidadesIbge };

/**
 * Comparação e autocomplete. Não é o valor a gravar.
 * O nome oficial continua o do IBGE, por exemplo "João Pessoa".
 */
export function normalizeLocationSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const states: readonly BrazilState[] = Object.freeze(
  [...estadosBrasil]
    .map((estado) => Object.freeze({ nome: estado.nome, sigla: estado.sigla }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
);

const stateByNormalized = new Map<string, BrazilState>();

for (const state of states) {
  registerStateKey(normalizeLocationSearch(state.sigla), state);
  registerStateKey(normalizeLocationSearch(state.nome), state);
}

function registerStateKey(key: string, state: BrazilState) {
  const existing = stateByNormalized.get(key);
  if (existing && existing.sigla !== state.sigla) {
    throw new Error(`Localização: chave de UF ambígua "${key}" (${existing.sigla} e ${state.sigla}).`);
  }
  stateByNormalized.set(key, state);
}

type MunicipalityBucket = {
  municipalities: BrazilMunicipality[];
  searchNames: string[];
};

const municipalitiesByState = new Map<string, MunicipalityBucket>();
const municipalityByIbgeCode = new Map<string, BrazilMunicipality>();
const municipalityByNormalizedKey = new Map<string, BrazilMunicipality>();

for (const raw of municipiosBrasil) {
  const municipality: BrazilMunicipality = Object.freeze({
    nome: raw.nome,
    uf: raw.uf,
    codigoIbge: raw.codigoIbge,
  });

  if (municipalityByIbgeCode.has(municipality.codigoIbge)) {
    throw new Error(`Localização: código IBGE duplicado ${municipality.codigoIbge}.`);
  }
  municipalityByIbgeCode.set(municipality.codigoIbge, municipality);

  const normalizedKey = `${municipality.uf}|${normalizeLocationSearch(municipality.nome)}`;
  const previous = municipalityByNormalizedKey.get(normalizedKey);
  if (previous) {
    throw new Error(
      `Localização: município ambíguo em ${municipality.uf}: "${previous.nome}" (${previous.codigoIbge}) e "${municipality.nome}" (${municipality.codigoIbge}).`
    );
  }
  municipalityByNormalizedKey.set(normalizedKey, municipality);

  let bucket = municipalitiesByState.get(municipality.uf);
  if (!bucket) {
    bucket = { municipalities: [], searchNames: [] };
    municipalitiesByState.set(municipality.uf, bucket);
  }
  bucket.municipalities.push(municipality);
  bucket.searchNames.push(normalizeLocationSearch(municipality.nome));
}

for (const bucket of municipalitiesByState.values()) {
  const order = bucket.municipalities.map((_, index) => index);
  order.sort((left, right) =>
    bucket.municipalities[left].nome.localeCompare(bucket.municipalities[right].nome, 'pt-BR')
  );
  bucket.municipalities = order.map((index) => bucket.municipalities[index]);
  bucket.searchNames = order.map((index) => bucket.searchNames[index]);
  Object.freeze(bucket.municipalities);
  Object.freeze(bucket.searchNames);
}

export function getBrazilStates(): readonly BrazilState[] {
  return states;
}

export function resolveBrazilState(value: string): BrazilState | null {
  const key = normalizeLocationSearch(value);
  if (!key) return null;
  return stateByNormalized.get(key) ?? null;
}

export function getMunicipalitiesByState(uf: string): readonly BrazilMunicipality[] {
  const state = resolveBrazilState(uf);
  if (!state) return [];
  return municipalitiesByState.get(state.sigla)?.municipalities ?? [];
}

export function searchMunicipalities(uf: string, query: string): BrazilMunicipality[] {
  const state = resolveBrazilState(uf);
  const normalizedQuery = normalizeLocationSearch(query);
  if (!state || !normalizedQuery) return [];

  const bucket = municipalitiesByState.get(state.sigla);
  if (!bucket) return [];

  const startsWith: BrazilMunicipality[] = [];
  const contains: BrazilMunicipality[] = [];
  for (let index = 0; index < bucket.municipalities.length; index += 1) {
    const searchName = bucket.searchNames[index];
    if (searchName.startsWith(normalizedQuery)) startsWith.push(bucket.municipalities[index]);
    else if (searchName.includes(normalizedQuery)) contains.push(bucket.municipalities[index]);
  }
  return [...startsWith, ...contains];
}

export function findMunicipality(uf: string, city: string): BrazilMunicipality | null {
  const state = resolveBrazilState(uf);
  const normalizedCity = normalizeLocationSearch(city);
  if (!state || !normalizedCity) return null;
  return municipalityByNormalizedKey.get(`${state.sigla}|${normalizedCity}`) ?? null;
}

export function findMunicipalityByIbgeCode(codigoIbge: string): BrazilMunicipality | null {
  const code = codigoIbge.trim();
  if (!/^\d{7}$/.test(code)) return null;
  return municipalityByIbgeCode.get(code) ?? null;
}
