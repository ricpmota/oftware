import {
  findMunicipality,
  findMunicipalityByIbgeCode,
  resolveBrazilState,
  type BrazilMunicipality,
} from '@/lib/localizacao/brazilLocations';

/**
 * Classificação somente leitura da localização já gravada.
 * Não corrige Firestore e não usa aproximação.
 */
export const PATIENT_LOCATION_CATEGORIES = [
  'A_CANONICO',
  'B_RESOLVIVEL_SEM_CODIGO',
  'C_RESOLVIVEL_NORMALIZACAO',
  'D_CODIGO_INCONSISTENTE',
  'E_ESTADO_AUSENTE',
  'F_CIDADE_AUSENTE',
  'G_LOCALIZACAO_AUSENTE',
  'H_NAO_RESOLVIVEL',
  'I_ESTADO_INVALIDO',
] as const;

export type PatientLocationCategory = (typeof PATIENT_LOCATION_CATEGORIES)[number];

export type PatientLocationProposal = {
  estado: string;
  cidade: string;
  codigoIbge: string;
};

export type PatientLocationCodigoStatus = {
  presente: boolean;
  /** Sete dígitos e existente na base. */
  valido: boolean;
  /** Preenchido, mas formato inválido ou código fora da base. */
  invalido: boolean;
  /** Preenchido e não corresponde ao estado/cidade armazenados. */
  inconsistente: boolean;
};

export type ClassifiedPatientLocation = {
  categoria: PatientLocationCategory;
  proposta: PatientLocationProposal | null;
  codigoIbge: PatientLocationCodigoStatus;
  ufResolvida: string | null;
};

export type PatientLocationInputFields = {
  estado?: string | null;
  cidade?: string | null;
  codigoIbge?: string | null;
};

function text(value?: string | null): string {
  return (value ?? '').trim();
}

function proposal(municipio: BrazilMunicipality): PatientLocationProposal {
  return {
    estado: municipio.uf,
    cidade: municipio.nome,
    codigoIbge: municipio.codigoIbge,
  };
}

function exactOfficial(estado: string, cidade: string, municipio: BrazilMunicipality): boolean {
  return estado === municipio.uf && cidade === municipio.nome;
}

function codigoStatus(
  codigo: string,
  municipioDoCodigo: BrazilMunicipality | null,
  coerente: boolean
): PatientLocationCodigoStatus {
  const presente = codigo.length > 0;
  const valido = municipioDoCodigo !== null;
  return {
    presente,
    valido,
    invalido: presente && !valido,
    inconsistente: presente && !coerente,
  };
}

/**
 * Uma categoria principal por endereço.
 * A correspondência usa só resolveBrazilState e findMunicipality / findMunicipalityByIbgeCode.
 */
export function classifyPatientLocation(input?: PatientLocationInputFields | null): ClassifiedPatientLocation {
  const estado = text(input?.estado);
  const cidade = text(input?.cidade);
  const codigo = text(input?.codigoIbge);
  const municipioDoCodigo = codigo ? findMunicipalityByIbgeCode(codigo) : null;
  const estadoResolvido = estado ? resolveBrazilState(estado) : null;

  if (!estado && !cidade && !codigo) {
    return {
      categoria: 'G_LOCALIZACAO_AUSENTE',
      proposta: null,
      codigoIbge: codigoStatus(codigo, null, false),
      ufResolvida: null,
    };
  }

  if (!estado && !cidade && codigo) {
    return {
      categoria: 'D_CODIGO_INCONSISTENTE',
      proposta: null,
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, false),
      ufResolvida: null,
    };
  }

  if (estado && !estadoResolvido) {
    return {
      categoria: 'I_ESTADO_INVALIDO',
      proposta: null,
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, false),
      ufResolvida: null,
    };
  }

  if (cidade && !estado) {
    return {
      categoria: 'E_ESTADO_AUSENTE',
      proposta: null,
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, false),
      ufResolvida: null,
    };
  }

  if (estado && !cidade) {
    return {
      categoria: 'F_CIDADE_AUSENTE',
      proposta: null,
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, false),
      ufResolvida: estadoResolvido?.sigla ?? null,
    };
  }

  const municipio = findMunicipality(estado, cidade);
  const coerente =
    municipio !== null &&
    codigo.length > 0 &&
    municipioDoCodigo !== null &&
    municipioDoCodigo.codigoIbge === municipio.codigoIbge;
  const status = codigoStatus(codigo, municipioDoCodigo, coerente || codigo.length === 0 ? !codigo || coerente : false);

  if (codigo && !coerente) {
    return {
      categoria: 'D_CODIGO_INCONSISTENTE',
      proposta: null,
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, false),
      ufResolvida: estadoResolvido?.sigla ?? null,
    };
  }

  if (!municipio) {
    return {
      categoria: 'H_NAO_RESOLVIVEL',
      proposta: null,
      codigoIbge: status,
      ufResolvida: estadoResolvido?.sigla ?? null,
    };
  }

  const oficial = exactOfficial(estado, cidade, municipio);
  if (oficial && codigo && coerente) {
    return {
      categoria: 'A_CANONICO',
      proposta: proposal(municipio),
      codigoIbge: codigoStatus(codigo, municipioDoCodigo, true),
      ufResolvida: municipio.uf,
    };
  }

  if (oficial && !codigo) {
    return {
      categoria: 'B_RESOLVIVEL_SEM_CODIGO',
      proposta: proposal(municipio),
      codigoIbge: codigoStatus(codigo, null, false),
      ufResolvida: municipio.uf,
    };
  }

  return {
    categoria: 'C_RESOLVIVEL_NORMALIZACAO',
    proposta: proposal(municipio),
    codigoIbge: codigoStatus(codigo, municipioDoCodigo, coerente),
    ufResolvida: municipio.uf,
  };
}

export function categoriaEhCandidataAutomatica(categoria: PatientLocationCategory): boolean {
  return categoria === 'B_RESOLVIVEL_SEM_CODIGO' || categoria === 'C_RESOLVIVEL_NORMALIZACAO';
}
