export const CADASTRO_MEDICO_DRAFT_STORAGE_KEY = 'whitelabel_cadastro_medico_draft_id';

export const CADASTRO_MEDICO_COLLECTION = 'cadastroMedicoWhiteLabel';

export const CADASTRO_MEDICO_TOTAL_STEPS = 7;

export const CADASTRO_MEDICO_STEP_TITLES = [
  'Como você deseja aparecer para seus pacientes?',
  'Escolha o endereço do seu site',
  'Para onde enviaremos seus materiais?',
  'Dados para emissão do contrato',
  'Dados financeiros',
  'Fotos e identidade visual',
  'Confirmação dos dados',
] as const;

export type DomainTldOption = {
  ext: string;
  label: string;
  group: 'Brasil' | 'Internacional';
};

/** Extensões consultadas em lote (estilo busca GoDaddy). */
export const DOMAIN_TLD_SEARCH_LIST: DomainTldOption[] = [
  { ext: '.com.br', label: '.com.br', group: 'Brasil' },
  { ext: '.com', label: '.com', group: 'Internacional' },
  { ext: '.net.br', label: '.net.br', group: 'Brasil' },
  { ext: '.med.br', label: '.med.br', group: 'Brasil' },
  { ext: '.app.br', label: '.app.br', group: 'Brasil' },
  { ext: '.blog.br', label: '.blog.br', group: 'Brasil' },
  { ext: '.net', label: '.net', group: 'Internacional' },
  { ext: '.org', label: '.org', group: 'Internacional' },
];

/** @deprecated use DOMAIN_TLD_SEARCH_LIST */
export const EXTENSAO_DOMINIO_OPTIONS = ['.com', '.com.br'] as const;

export function formatDomainPreview(slug: string, ext: string): string {
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  const cleanSlug = slug.trim();
  if (!cleanSlug) return 'www.seudominio.com.br';
  return `www.${cleanSlug}${normalizedExt}`;
}

export function parseFqdnToSlugAndExt(fqdn: string): { slug: string; ext: string } | null {
  const normalized = fqdn.trim().toLowerCase().replace(/^www\./, '');
  const exts = [...DOMAIN_TLD_SEARCH_LIST.map((t) => t.ext)].sort((a, b) => b.length - a.length);
  for (const ext of exts) {
    if (normalized.endsWith(ext)) {
      return { slug: normalized.slice(0, -ext.length), ext };
    }
  }
  return null;
}

export const ESTADOS_BR_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const;

export const DIA_VENCIMENTO_OPTIONS = ['05', '10', '15', '20', '25'] as const;

export const ESTADO_CIVIL_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União estável',
] as const;

export function createEmptyCadastroMedicoForm(): Record<string, string> {
  return {
    tratamento: '',
    nome: '',
    sobrenome: '',
    nomeMarca: '',
    especialidade: '',
    cidade: '',
    estado: '',
    dominioDesejado: '',
    extensaoDominio: '',
    statusDominio: '',
    cepEntrega: '',
    ruaEntrega: '',
    numeroEntrega: '',
    complementoEntrega: '',
    bairroEntrega: '',
    cidadeEntrega: '',
    estadoEntrega: '',
    pontoReferenciaEntrega: '',
    nomeRecebedor: '',
    telefoneEntrega: '',
    nomeCompletoContrato: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    estadoCivil: '',
    nacionalidade: 'Brasileira',
    crm: '',
    crmUf: '',
    emailContrato: '',
    whatsappContrato: '',
    usarMesmoEnderecoEntrega: 'sim',
    cepContrato: '',
    ruaContrato: '',
    numeroContrato: '',
    complementoContrato: '',
    bairroContrato: '',
    cidadeContrato: '',
    estadoContrato: '',
    tipoPessoa: 'fisica',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    emailFinanceiro: '',
    diaVencimento: '',
    instagram: '',
    facebook: '',
    siteAtual: '',
    fraseMarca: '',
    descricaoProfissional: '',
    publicoAlvo: '',
    servicosDivulgacao: '',
    enviarDepois: '',
    fotoProfissionalUrl: '',
    logoUrl: '',
    imagemCapaUrl: '',
    documentoFotoUrl: '',
    comprovanteEnderecoUrl: '',
    confirmoVeracidade: '',
    autorizoUsoDados: '',
  };
}
