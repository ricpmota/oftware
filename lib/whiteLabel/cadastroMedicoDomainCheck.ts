import type { DominioStatus } from '@/types/cadastroMedicoWhiteLabel';
import {
  DOMAIN_TLD_SEARCH_LIST,
  formatDomainPreview,
  type DomainTldOption,
} from '@/lib/whiteLabel/cadastroMedicoConstants';

const BLOCKED_SLUGS = new Set([
  'admin',
  'oftware',
  'google',
  'facebook',
  'instagram',
  'test',
  'teste',
  'www',
  'api',
  'mail',
]);

const REQUEST_TIMEOUT_MS = 15000;

export type DomainCheckResult = {
  status: DominioStatus;
  suggestions: string[];
  fqdn: string;
  wwwUrl: string;
  ext: string;
  source: 'registro.br' | 'rdap';
  providerStatus?: string;
  providerStatusCode?: number;
  apiTldSuggestions?: string[];
};

export type DomainSearchRow = DomainCheckResult & {
  group: DomainTldOption['group'];
  label: string;
  selectable: boolean;
};

export type DomainSearchResponse = {
  slug: string;
  preview: string;
  results: DomainSearchRow[];
  alternatives: string[];
};

type RegistroBrApiResponse = {
  status_code?: number;
  status?: string;
  fqdn?: string;
  suggestions?: string[];
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

export function buildFqdn(slug: string, extensaoDominio: string): string {
  const normalizedExt = extensaoDominio.startsWith('.') ? extensaoDominio : `.${extensaoDominio}`;
  return `${slug}${normalizedExt}`;
}

export function generateDomainSuggestions(input: {
  nome: string;
  sobrenome: string;
  nomeMarca: string;
  extensaoDominio: string;
  excludeFqdn?: string;
}): string[] {
  const ext = input.extensaoDominio.startsWith('.') ? input.extensaoDominio : `.${input.extensaoDominio}`;
  const nome = slugify(input.nome);
  const sobrenome = slugify(input.sobrenome);
  const marca = slugify(input.nomeMarca.replace(/^(instituto|clinica|metodo|dr|dra)\s*/i, ''));

  const base = nome && sobrenome ? `${nome}${sobrenome}` : marca || nome || 'marca';
  const variants = [`dr${base}`, `instituto${base}`, `clinica${base}`, `metodo${base}`, base];

  return [...new Set(variants.map((v) => formatDomainPreview(v, ext)))].filter((preview) => {
    const fqdn = preview.replace(/^www\./, '').toLowerCase();
    return fqdn !== (input.excludeFqdn || '').toLowerCase();
  });
}

export function mapRegistroBrStatusCode(code: number | undefined): DominioStatus {
  switch (code) {
    case 0:
    case 1:
    case 6:
    case 7:
      return 'disponivel';
    case 5:
    case 9:
      return 'em_analise';
    case 2:
    case 3:
    case 4:
    case 8:
    default:
      return 'indisponivel';
  }
}

export function mapRdapAvailability(registered: boolean): DominioStatus {
  return registered ? 'indisponivel' : 'disponivel';
}

function isSelectableStatus(status: DominioStatus): boolean {
  return status === 'disponivel' || status === 'em_analise';
}

function validateSlug(slug: string): string | null {
  if (slug.length < 3) return 'Informe um nome com pelo menos 3 caracteres.';
  if (BLOCKED_SLUGS.has(slug) || slug.startsWith('oft')) {
    return 'Este nome não pode ser utilizado.';
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) {
    return 'Use apenas letras, números e hífen.';
  }
  return null;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
}

function isBrTld(ext: string): boolean {
  return ext.endsWith('.br');
}

function getRdapUrl(fqdn: string, ext: string): string {
  if (ext === '.com') return `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(fqdn)}`;
  if (ext === '.net') return `https://rdap.verisign.com/net/v1/domain/${encodeURIComponent(fqdn)}`;
  if (ext === '.org') {
    return `https://rdap.publicinterestregistry.org/rdap/domain/${encodeURIComponent(fqdn)}`;
  }
  throw new Error(`Extensão RDAP não suportada: ${ext}`);
}

async function checkBrDomainAvailability(fqdn: string, ext: string): Promise<DomainCheckResult> {
  const res = await fetchWithTimeout(
    `https://brasilapi.com.br/api/registrobr/v1/${encodeURIComponent(fqdn)}`
  );

  if (res.status === 400) {
    return {
      status: 'indisponivel',
      suggestions: [],
      fqdn,
      wwwUrl: formatDomainPreview(fqdn.replace(ext, ''), ext),
      ext,
      source: 'registro.br',
      providerStatus: 'INVALID',
    };
  }

  if (!res.ok) {
    throw new Error('Não foi possível consultar o Registro.br no momento. Tente novamente.');
  }

  const data = (await res.json()) as RegistroBrApiResponse;
  const slug = fqdn.slice(0, fqdn.length - ext.length);
  const status = mapRegistroBrStatusCode(data.status_code);

  return {
    status,
    suggestions: [],
    fqdn: data.fqdn || fqdn,
    wwwUrl: formatDomainPreview(slug, ext),
    ext,
    source: 'registro.br',
    providerStatus: data.status,
    providerStatusCode: data.status_code,
    apiTldSuggestions: data.suggestions || [],
  };
}

async function checkRdapDomainAvailability(fqdn: string, ext: string): Promise<DomainCheckResult> {
  const res = await fetchWithTimeout(getRdapUrl(fqdn, ext));
  const slug = fqdn.slice(0, fqdn.length - ext.length);

  if (res.status === 404) {
    return {
      status: 'disponivel',
      suggestions: [],
      fqdn,
      wwwUrl: formatDomainPreview(slug, ext),
      ext,
      source: 'rdap',
      providerStatus: 'NOT_FOUND',
    };
  }

  if (res.status === 200) {
    return {
      status: 'indisponivel',
      suggestions: [],
      fqdn,
      wwwUrl: formatDomainPreview(slug, ext),
      ext,
      source: 'rdap',
      providerStatus: 'REGISTERED',
    };
  }

  if (res.status === 429) {
    throw new Error('Consulta temporariamente limitada. Aguarde alguns segundos e tente novamente.');
  }

  throw new Error(`Não foi possível consultar ${ext} no momento.`);
}

async function checkSingleDomain(
  slug: string,
  ext: string,
  tld: DomainTldOption
): Promise<DomainSearchRow> {
  const fqdn = buildFqdn(slug, ext);
  try {
    const result = isBrTld(ext)
      ? await checkBrDomainAvailability(fqdn, ext)
      : await checkRdapDomainAvailability(fqdn, ext);

    return {
      ...result,
      group: tld.group,
      label: tld.label,
      selectable: isSelectableStatus(result.status),
    };
  } catch {
    return {
      status: 'em_analise',
      suggestions: [],
      fqdn,
      wwwUrl: formatDomainPreview(slug, ext),
      ext,
      source: isBrTld(ext) ? 'registro.br' : 'rdap',
      providerStatus: 'CHECK_FAILED',
      group: tld.group,
      label: tld.label,
      selectable: false,
    };
  }
}

function buildApiAlternatives(slug: string, apiTldSuggestions: string[]): string[] {
  return [...new Set(
    apiTldSuggestions
      .map((suffix) => {
        const ext = suffix.startsWith('.') ? suffix : `.${suffix}`;
        if (!DOMAIN_TLD_SEARCH_LIST.some((t) => t.ext === ext)) return null;
        return formatDomainPreview(slug, ext);
      })
      .filter((v): v is string => Boolean(v))
  )];
}

export async function searchDomainAvailability(input: {
  dominioDesejado: string;
  nome?: string;
  sobrenome?: string;
  nomeMarca?: string;
}): Promise<DomainSearchResponse> {
  const slug = slugify(input.dominioDesejado);
  const slugError = validateSlug(slug);
  if (slugError) {
    throw new Error(slugError);
  }

  const results = await Promise.all(
    DOMAIN_TLD_SEARCH_LIST.map((tld) => checkSingleDomain(slug, tld.ext, tld))
  );

  const comBr = results.find((r) => r.ext === '.com.br');
  const apiAlternatives = buildApiAlternatives(slug, comBr?.apiTldSuggestions || []);

  const nameAlternatives = [
    ...generateDomainSuggestions({
      nome: input.nome || '',
      sobrenome: input.sobrenome || '',
      nomeMarca: input.nomeMarca || slug,
      extensaoDominio: '.com.br',
      excludeFqdn: buildFqdn(slug, '.com.br'),
    }),
    ...generateDomainSuggestions({
      nome: input.nome || '',
      sobrenome: input.sobrenome || '',
      nomeMarca: input.nomeMarca || slug,
      extensaoDominio: '.com',
      excludeFqdn: buildFqdn(slug, '.com'),
    }),
  ];

  const alternatives = [...new Set([...apiAlternatives, ...nameAlternatives])].slice(0, 12);

  return {
    slug,
    preview: formatDomainPreview(slug, '.com.br'),
    results,
    alternatives,
  };
}

export async function checkDomainAvailability(input: {
  dominioDesejado: string;
  extensaoDominio: string;
  nome?: string;
  sobrenome?: string;
  nomeMarca?: string;
}): Promise<DomainCheckResult> {
  const slug = slugify(input.dominioDesejado);
  const ext = input.extensaoDominio.startsWith('.') ? input.extensaoDominio : `.${input.extensaoDominio}`;
  const fqdn = buildFqdn(slug, ext);

  const slugError = validateSlug(slug);
  if (slugError) {
    return {
      status: 'indisponivel',
      suggestions: generateDomainSuggestions({
        nome: input.nome || '',
        sobrenome: input.sobrenome || '',
        nomeMarca: input.nomeMarca || slug,
        extensaoDominio: ext,
        excludeFqdn: fqdn,
      }),
      fqdn,
      wwwUrl: formatDomainPreview(slug, ext),
      ext,
      source: isBrTld(ext) ? 'registro.br' : 'rdap',
      providerStatus: 'INVALID_LOCAL',
    };
  }

  const tld = DOMAIN_TLD_SEARCH_LIST.find((t) => t.ext === ext);
  if (!tld) throw new Error('Extensão de domínio não suportada.');

  const row = await checkSingleDomain(slug, ext, tld);
  const result: DomainCheckResult = {
    status: row.status,
    suggestions: [],
    fqdn: row.fqdn,
    wwwUrl: row.wwwUrl,
    ext: row.ext,
    source: row.source,
    providerStatus: row.providerStatus,
    providerStatusCode: row.providerStatusCode,
    apiTldSuggestions: row.apiTldSuggestions,
  };

  if (result.status === 'indisponivel') {
    result.suggestions = generateDomainSuggestions({
      nome: input.nome || '',
      sobrenome: input.sobrenome || '',
      nomeMarca: input.nomeMarca || slug,
      extensaoDominio: ext,
      excludeFqdn: fqdn,
    });
    if (result.apiTldSuggestions?.length) {
      result.suggestions = [
        ...new Set([...buildApiAlternatives(slug, result.apiTldSuggestions), ...result.suggestions]),
      ];
    }
  }

  return result;
}
