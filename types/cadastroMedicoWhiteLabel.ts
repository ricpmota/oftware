export type CadastroMedicoStatus = 'rascunho' | 'concluido';

export type DominioStatus = 'disponivel' | 'em_analise' | 'indisponivel';

export type CadastroMedicoFormData = {
  // Etapa 1 — Identidade pública
  tratamento: string;
  nome: string;
  sobrenome: string;
  nomeMarca: string;
  especialidade: string;
  cidade: string;
  estado: string;

  // Etapa 2 — Domínio
  dominioDesejado: string;
  extensaoDominio: string;
  statusDominio: DominioStatus | '';

  // Etapa 3 — Endereço de entrega
  cepEntrega: string;
  ruaEntrega: string;
  numeroEntrega: string;
  complementoEntrega: string;
  bairroEntrega: string;
  cidadeEntrega: string;
  estadoEntrega: string;
  pontoReferenciaEntrega: string;
  nomeRecebedor: string;
  telefoneEntrega: string;

  // Etapa 4 — Dados contratuais
  nomeCompletoContrato: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  estadoCivil: string;
  nacionalidade: string;
  crm: string;
  crmUf: string;
  emailContrato: string;
  whatsappContrato: string;
  usarMesmoEnderecoEntrega: string;
  cepContrato: string;
  ruaContrato: string;
  numeroContrato: string;
  complementoContrato: string;
  bairroContrato: string;
  cidadeContrato: string;
  estadoContrato: string;

  // Etapa 5 — Dados financeiros
  tipoPessoa: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  emailFinanceiro: string;
  diaVencimento: string;

  // Etapa 6 — Personalização do site
  instagram: string;
  facebook: string;
  siteAtual: string;
  fraseMarca: string;
  descricaoProfissional: string;
  publicoAlvo: string;
  servicosDivulgacao: string;

  // Etapa 7 — Fotos (opcional)
  enviarDepois: string;
  fotoProfissionalUrl: string;
  logoUrl: string;
  imagemCapaUrl: string;
  documentoFotoUrl: string;
  comprovanteEnderecoUrl: string;

  // Etapa 8 — Confirmação
  confirmoVeracidade: string;
  autorizoUsoDados: string;
};

export type CadastroMedicoWhiteLabel = CadastroMedicoFormData & {
  id: string;
  status: CadastroMedicoStatus;
  currentStep: number;
  origem: 'whitelabel_cadastromedico';
  createdAt: Date | null;
  updatedAt: Date | null;
  concluidoAt: Date | null;
};

export const CADASTRO_MEDICO_FORM_KEYS = [
  'tratamento',
  'nome',
  'sobrenome',
  'nomeMarca',
  'especialidade',
  'cidade',
  'estado',
  'dominioDesejado',
  'extensaoDominio',
  'statusDominio',
  'cepEntrega',
  'ruaEntrega',
  'numeroEntrega',
  'complementoEntrega',
  'bairroEntrega',
  'cidadeEntrega',
  'estadoEntrega',
  'pontoReferenciaEntrega',
  'nomeRecebedor',
  'telefoneEntrega',
  'nomeCompletoContrato',
  'cpf',
  'rg',
  'dataNascimento',
  'estadoCivil',
  'nacionalidade',
  'crm',
  'crmUf',
  'emailContrato',
  'whatsappContrato',
  'usarMesmoEnderecoEntrega',
  'cepContrato',
  'ruaContrato',
  'numeroContrato',
  'complementoContrato',
  'bairroContrato',
  'cidadeContrato',
  'estadoContrato',
  'tipoPessoa',
  'cnpj',
  'razaoSocial',
  'nomeFantasia',
  'emailFinanceiro',
  'diaVencimento',
  'instagram',
  'facebook',
  'siteAtual',
  'fraseMarca',
  'descricaoProfissional',
  'publicoAlvo',
  'servicosDivulgacao',
  'enviarDepois',
  'fotoProfissionalUrl',
  'logoUrl',
  'imagemCapaUrl',
  'documentoFotoUrl',
  'comprovanteEnderecoUrl',
  'confirmoVeracidade',
  'autorizoUsoDados',
] as const satisfies readonly (keyof CadastroMedicoFormData)[];
