import {
  findMunicipality,
  findMunicipalityByIbgeCode,
  normalizeLocationSearch,
  resolveBrazilState,
  searchMunicipalities,
  type BrazilMunicipality,
  type BrazilState,
} from '@/lib/localizacao/brazilLocations';

export const PATIENT_LOCATION_SUGGESTION_LIMIT = 8;

export const PATIENT_LOCATION_MESSAGES = {
  unresolved: 'Selecione uma cidade da lista. O texto informado não corresponde a um município oficial.',
  inconsistent: 'O código da cidade não confere com o estado e o nome. Selecione a cidade novamente.',
  required: 'Selecione o estado e uma cidade da lista.',
  requiredCity: 'Selecione uma cidade da lista.',
} as const;

export type PatientLocationValue = {
  estado: string;
  cidade: string;
  codigoIbge: string;
};

export type PatientLocationInput = {
  estado?: string | null;
  cidade?: string | null;
  codigoIbge?: string | null;
};

export type PatientLocationInterpretation =
  | { status: 'empty' }
  | { status: 'state-only'; estado: string }
  | { status: 'valid'; value: PatientLocationValue }
  | { status: 'unresolved'; estado: string; cidade: string }
  | { status: 'inconsistent'; estado: string; cidade: string; codigoIbge: string };

export function formatBrazilStateOption(state: BrazilState): string {
  return `${state.nome} (${state.sigla})`;
}

export function patientLocationSignature(value?: PatientLocationInput | null): string {
  if (!value) return '';
  return `${value.estado ?? ''}|${value.cidade ?? ''}|${value.codigoIbge ?? ''}`;
}

function trimmed(value?: string | null): string {
  return (value ?? '').trim();
}

function officialValue(municipality: BrazilMunicipality): PatientLocationValue {
  return {
    estado: municipality.uf,
    cidade: municipality.nome,
    codigoIbge: municipality.codigoIbge,
  };
}

export function interpretPatientLocation(input?: PatientLocationInput | null): PatientLocationInterpretation {
  const estadoRaw = trimmed(input?.estado);
  const cidadeRaw = trimmed(input?.cidade);
  const codigoRaw = trimmed(input?.codigoIbge);
  if (!estadoRaw && !cidadeRaw && !codigoRaw) return { status: 'empty' };

  const state = estadoRaw ? resolveBrazilState(estadoRaw) : null;

  if (codigoRaw) {
    const byCode = findMunicipalityByIbgeCode(codigoRaw);
    const stateOk = !estadoRaw || (state !== null && state.sigla === byCode?.uf);
    const cityOk =
      !cidadeRaw || (byCode !== null && normalizeLocationSearch(cidadeRaw) === normalizeLocationSearch(byCode.nome));
    if (!byCode || !stateOk || !cityOk) {
      return {
        status: 'inconsistent',
        estado: state?.sigla || estadoRaw,
        cidade: cidadeRaw,
        codigoIbge: codigoRaw,
      };
    }
    return { status: 'valid', value: officialValue(byCode) };
  }

  if (estadoRaw && !state) {
    return cidadeRaw
      ? { status: 'unresolved', estado: estadoRaw, cidade: cidadeRaw }
      : { status: 'unresolved', estado: estadoRaw, cidade: '' };
  }

  if (!state && cidadeRaw) return { status: 'unresolved', estado: '', cidade: cidadeRaw };
  if (state && !cidadeRaw) return { status: 'state-only', estado: state.sigla };

  const found = state && cidadeRaw ? findMunicipality(state.sigla, cidadeRaw) : null;
  if (found) return { status: 'valid', value: officialValue(found) };
  return { status: 'unresolved', estado: state?.sigla || estadoRaw, cidade: cidadeRaw };
}

export function gravacaoLocalizacaoPerfil(
  interpretation: PatientLocationInterpretation
): { estado: string; cidade: string; codigoIbge: string } | null {
  if (!isPatientLocationAcceptable(interpretation, false)) return null;
  if (interpretation.status === 'valid') return interpretation.value;
  return { estado: '', cidade: '', codigoIbge: '' };
}

export function isPatientLocationAcceptable(
  interpretation: PatientLocationInterpretation,
  required: boolean
): boolean {
  if (interpretation.status === 'valid') return true;
  return !required && interpretation.status === 'empty';
}

export function locationSuggestions(
  uf: string,
  query: string,
  limit = PATIENT_LOCATION_SUGGESTION_LIMIT
): { items: BrazilMunicipality[]; truncated: boolean } {
  const matches = searchMunicipalities(uf, query);
  return {
    items: matches.slice(0, limit),
    truncated: matches.length > limit,
  };
}

export function retainSelectionForQuery(
  selected: PatientLocationValue | null,
  query: string
): PatientLocationValue | null {
  if (!selected) return null;
  return query === selected.cidade ? selected : null;
}

export function applyStateChange(
  current: { estado: string; cityQuery: string; selected: PatientLocationValue | null },
  nextEstado: string
): { estado: string; cityQuery: string; selected: PatientLocationValue | null; clearedCity: boolean } {
  const resolved = nextEstado ? resolveBrazilState(nextEstado) : null;
  const estado = nextEstado ? (resolved?.sigla ?? nextEstado) : '';
  if (estado === current.estado) {
    return { ...current, estado, clearedCity: false };
  }
  return { estado, cityQuery: '', selected: null, clearedCity: true };
}

export function patientLocationKeyAction(input: {
  key: string;
  open: boolean;
  activeIndex: number;
  suggestionCount: number;
}): { open: boolean; activeIndex: number; select: boolean; preventDefault: boolean } {
  const last = Math.max(0, input.suggestionCount - 1);
  if (input.key === 'ArrowDown') {
    if (!input.open) return { open: true, activeIndex: 0, select: false, preventDefault: true };
    return {
      open: true,
      activeIndex: Math.min(input.activeIndex + 1, last),
      select: false,
      preventDefault: true,
    };
  }
  if (input.key === 'ArrowUp') {
    if (!input.open) return { open: true, activeIndex: 0, select: false, preventDefault: true };
    return {
      open: true,
      activeIndex: Math.max(input.activeIndex - 1, 0),
      select: false,
      preventDefault: true,
    };
  }
  if (input.key === 'Enter') {
    return {
      open: input.open && input.suggestionCount > 0 ? false : input.open,
      activeIndex: input.activeIndex,
      select: input.open && input.suggestionCount > 0,
      preventDefault: true,
    };
  }
  if (input.key === 'Escape') {
    return { open: false, activeIndex: input.activeIndex, select: false, preventDefault: true };
  }
  return { open: input.open, activeIndex: input.activeIndex, select: false, preventDefault: false };
}

export function patientLocationMessage(input: {
  required: boolean;
  touched: boolean;
  cityBlurred: boolean;
  estado: string;
  cityQuery: string;
  selected: PatientLocationValue | null;
  notice: 'unresolved' | 'inconsistent' | null;
}): string | null {
  const selectedMatches =
    input.selected !== null && input.selected.estado === input.estado && input.cityQuery === input.selected.cidade;
  if (selectedMatches) return null;
  if (input.notice === 'inconsistent') return PATIENT_LOCATION_MESSAGES.inconsistent;
  if (input.notice === 'unresolved' || (input.cityBlurred && input.cityQuery.trim() && !input.selected)) {
    return PATIENT_LOCATION_MESSAGES.unresolved;
  }
  if (input.required && input.touched && !input.cityQuery.trim()) {
    return input.estado ? PATIENT_LOCATION_MESSAGES.requiredCity : PATIENT_LOCATION_MESSAGES.required;
  }
  return null;
}
