import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { MedicoInstagramBio } from '@/types/medicoInstagramBio';

export interface MedicoWhiteLabelStored {
  brandName?: string;
  description?: string;
  ogImageUrl?: string;
  /** Logo exibido no canto superior direito dos PDFs de prescrição e requisição de exames. */
  pdfLogoUrl?: string;
  /** Ícone da aba do navegador (favicon) white label. */
  faviconUrl?: string;
  primaryColor?: string;
  /** @deprecated use drPageBackgroundColor, aplicacaoPageBackgroundColor, conclusaoPageBackgroundColor */
  pageBackgroundColor?: string;
  /** @deprecated use drPageLogoUrl, aplicacaoPageLogoUrl, conclusaoPageLogoUrl */
  publicPageLogoUrl?: string;
  drPageBackgroundColor?: string;
  drPageTextColor?: string;
  drPageLogoUrl?: string;
  aplicacaoPageBackgroundColor?: string;
  aplicacaoPageTextColor?: string;
  aplicacaoPageLogoUrl?: string;
  conclusaoPageBackgroundColor?: string;
  conclusaoPageTextColor?: string;
  conclusaoPageLogoUrl?: string;
  showPoweredByOftware?: boolean;
}

/** Item salvo: título curto na lista; texto completo vai para o PDF ao escolher. */
export interface HipoteseDiagnosticaSalva {
  titulo: string;
  texto: string;
}

/** Modelo reutilizável de requisição de exames (perfil do médico, todos os pacientes). */
export interface ModeloPadraoExamesSalvo {
  id: string;
  nome: string;
  examesSelecionados: string[];
  examesCustomizados: string[];
  hipoteseDiagnostica: string;
  hipoteseDiagnosticaTitulo?: string;
  criadoEm: string;
}

export interface Medico {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  /** URL pública (ex.: Storage) da foto de perfil em recorte circular; definida no Metaadmin. */
  fotoPerfilUrl?: string | null;
  genero?: 'M' | 'F'; // Para exibir Dr./Dra.
  /** Usuário público do Instagram (sem @); ex.: "drfulano". Preenchido em Metaadmin. */
  instagramUsuario?: string | null;
  telefone?: string; // Telefone do médico (nacional, sem DDI concatenado)
  /** DDI sem '+'. Ausente = legado Brasil. */
  telefoneDdi?: string;
  /** ISO-3166 alpha-2 (ex.: "BR", "US", "PT"). */
  telefonePais?: string;
  /** CPF (pessoa física), opcional — usado no recibo quando o médico escolher exibir CPF. */
  cpfPessoal?: string;
  /** CNPJ da empresa (pessoa jurídica), opcional — usado no recibo quando o médico escolher exibir CNPJ. */
  cnpjEmpresa?: string;
  /**
   * Chave PIX do médico (CPF, e-mail, telefone ou chave aleatória).
   * Se preenchida, entra na mensagem de cobrança do Financeiro.
   */
  chavePix?: string | null;
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    cep?: string;
    /** Número do imóvel (complementa o logradouro do CEP). */
    numero?: string;
    /** Nome do consultório, clínica ou local de atendimento. */
    nomeLocal?: string;
    pontoReferencia?: string;
    /** Link compartilhado do Google Maps (maps.app.goo.gl, google.com/maps, etc.). */
    googleMapsUrl?: string;
    lat?: number;
    lng?: number;
  };
  cidades: {
    estado: string;
    cidade: string;
  }[];
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
  isVerificado?: boolean; // Verificação do médico pelo admin
  /**
   * Permissão para upload/gestão da Central do Mentorado.
   * Ausência do campo deve ser tratada como false.
   * Controlada exclusivamente em /metaadmingeral.
   */
  uploadMentor?: boolean;
  /** Análise inteligente (IA) na aba Dados Clínicos — ativado pelo metaadmingeral. */
  anamneseInteligenteAtivo?: boolean;
  /** Foto da CNH (verificação — enviada no chat de primeiro acesso). */
  docVerificacaoCnhUrl?: string | null;
  /** Selfie para verificação de identidade. */
  docVerificacaoSelfieUrl?: string | null;
  /** Foto do documento do CRM. */
  docVerificacaoCrmUrl?: string | null;
  temPlanoIndicacao?: boolean; // Se o médico tem plano de indicações ativo
  planoIndicacao?: {
    tipoValor: 'negociado' | 'fixo'; // Valor negociado com cada cliente ou fixo para todos
    tipoComissao: 'por_dose' | 'por_tratamento'; // Comissão por dose ou por tratamento completo
    // Se por_dose
    valorPorDose?: number; // Valor da comissão por dose (em R$)
    // Se por_tratamento
    tempoTratamentoMeses?: number; // Duração do tratamento em meses
    totalMedicamentoMg?: number; // Total de medicamento por tratamento em mg
    valorComissaoTratamento?: number; // Valor da comissão por tratamento completo (em R$)
  };
  /**
   * Hipóteses salvas no perfil do médico (requisição de exames).
   * Firestore pode ter legado `string[]`; normalizar com `normalizeHipotesesDiagnosticasSalvas`.
   */
  hipotesesDiagnosticasSalvas?: HipoteseDiagnosticaSalva[] | string[];
  /** Modelos padrão de requisição de exames (perfil do médico). */
  modelosPadraoExames?: ModeloPadraoExamesSalvo[];
  /** Preferência de provedor de assinatura digital (sem credenciais). */
  doctorSignatureProvider?: DoctorSignatureProvider;
  /** Identidade white label para links públicos enviados aos pacientes. */
  whiteLabel?: MedicoWhiteLabelStored;
  /** Configurações do hub /instagram/[crmUf] (Link da Bio). */
  instagramBio?: MedicoInstagramBio;
  /** Quando true, usa as 6 imagens padrão do Método (platformSettings/metodoImagens). */
  metodoImagensAtivo?: boolean;
  /** Organização da equipe (metaadmingeral / Comunicação). */
  organizationId?: string | null;
  /** IDs de documentos de nutricionistas com vínculo profissional aceito. */
  nutricionistaVinculadoIds?: string[];
  /** IDs de psiquiatras com vínculo profissional ativo (não concede ACL de paciente sozinho). */
  psiquiatraVinculadoIds?: string[];
  /** IDs de documentos de personal trainers com vínculo profissional aceito. */
  personalTrainerVinculadoIds?: string[];
}

export function normalizeHipotesesDiagnosticasSalvas(raw: unknown): HipoteseDiagnosticaSalva[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      const texto = item.trim();
      const linha = texto.split('\n')[0].trim();
      const tituloCurto =
        (linha.length > 72 ? `${linha.slice(0, 69)}…` : linha) || `Hipótese ${i + 1}`;
      return { titulo: tituloCurto, texto: texto || tituloCurto };
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const texto = String(o.texto ?? '').trim();
      let titulo = String(o.titulo ?? '').trim();
      if (!titulo && texto) {
        const linha = texto.split('\n')[0].trim();
        titulo = linha.length > 72 ? `${linha.slice(0, 69)}…` : linha;
      }
      if (!titulo) titulo = `Hipótese ${i + 1}`;
      return { titulo: titulo.slice(0, 120), texto: texto || titulo };
    }
    return { titulo: `Hipótese ${i + 1}`, texto: '' };
  });
}

export function normalizeModelosPadraoExames(raw: unknown): ModeloPadraoExamesSalvo[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const nome = String(o.nome ?? '').trim();
      if (!nome) return null;
      const examesSelecionados = Array.isArray(o.examesSelecionados)
        ? o.examesSelecionados.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        : [];
      const examesCustomizados = Array.isArray(o.examesCustomizados)
        ? o.examesCustomizados.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        : [];
      const id = String(o.id ?? '').trim() || `modelo-${i + 1}`;
      const hipoteseDiagnosticaTitulo = String(o.hipoteseDiagnosticaTitulo ?? '').trim();
      return {
        id,
        nome: nome.slice(0, 80),
        examesSelecionados,
        examesCustomizados,
        hipoteseDiagnostica: String(o.hipoteseDiagnostica ?? '').trim(),
        hipoteseDiagnosticaTitulo: hipoteseDiagnosticaTitulo ? hipoteseDiagnosticaTitulo.slice(0, 120) : undefined,
        criadoEm: String(o.criadoEm ?? '').trim() || new Date().toISOString(),
      } satisfies ModeloPadraoExamesSalvo;
    })
    .filter((item): item is ModeloPadraoExamesSalvo => item !== null);
}

export interface CidadeAtendimento {
  estado: string;
  cidade: string;
}

