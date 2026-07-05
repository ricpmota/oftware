import type { DoctorSignatureProviderFormState } from '@/types/doctorSignatureProvider';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import {
  DEFAULT_APLICACAO_PAGE_BACKGROUND,
  DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_APLICACAO_PAGE_TEXT,
  DEFAULT_CONCLUSAO_PAGE_TEXT,
  DEFAULT_DR_PAGE_TEXT,
  publicPagesFormFromStored,
} from '@/lib/whiteLabel/publicPagesTheme';

export type MeuPerfilMedicoFormFields = {
  fotoPerfilUrl: string | null;
  crmNumero: string;
  crmEstado: string;
  endereco: string;
  cep: string;
  numero: string;
  nomeLocal: string;
  pontoReferencia: string;
  googleMapsUrl: string;
  telefone: string;
  instagramUsuario: string;
  cpfPessoal: string;
  cnpjEmpresa: string;
  genero: 'M' | 'F' | '';
  cidades: { estado: string; cidade: string }[];
  whiteLabelBrandName: string;
  whiteLabelDescription: string;
  whiteLabelOgImageUrl: string | null;
  whiteLabelPdfLogoUrl: string | null;
  whiteLabelFaviconUrl: string | null;
  whiteLabelPrimaryColor: string;
  whiteLabelDrPageBackgroundColor: string;
  whiteLabelDrPageTextColor: string;
  whiteLabelDrPageLogoUrl: string | null;
  whiteLabelAplicacaoPageBackgroundColor: string;
  whiteLabelAplicacaoPageTextColor: string;
  whiteLabelAplicacaoPageLogoUrl: string | null;
  whiteLabelConclusaoPageBackgroundColor: string;
  whiteLabelConclusaoPageTextColor: string;
  whiteLabelConclusaoPageLogoUrl: string | null;
  whiteLabelShowPoweredByOftware: boolean;
};

export function serializeMeuPerfilMedicoForm(
  perfil: MeuPerfilMedicoFormFields,
  signature: DoctorSignatureProviderFormState
): string {
  const cidades = [...perfil.cidades].sort((a, b) =>
    `${a.estado}-${a.cidade}`.localeCompare(`${b.estado}-${b.cidade}`, 'pt-BR')
  );

  return JSON.stringify({
    fotoPerfilUrl: perfil.fotoPerfilUrl?.trim() || null,
    crmNumero: perfil.crmNumero.trim(),
    crmEstado: perfil.crmEstado.trim(),
    endereco: perfil.endereco.trim(),
    cep: perfil.cep.replace(/\D/g, ''),
    numero: perfil.numero.trim(),
    nomeLocal: perfil.nomeLocal.trim(),
    pontoReferencia: perfil.pontoReferencia.trim(),
    googleMapsUrl: perfil.googleMapsUrl.trim(),
    telefone: perfil.telefone.trim(),
    instagramUsuario: perfil.instagramUsuario.trim(),
    cpfPessoal: perfil.cpfPessoal.replace(/\D/g, ''),
    cnpjEmpresa: perfil.cnpjEmpresa.replace(/\D/g, ''),
    genero: perfil.genero,
    cidades,
    whiteLabelBrandName: perfil.whiteLabelBrandName.trim(),
    whiteLabelDescription: perfil.whiteLabelDescription.trim(),
    whiteLabelOgImageUrl: perfil.whiteLabelOgImageUrl?.trim() || null,
    whiteLabelPdfLogoUrl: perfil.whiteLabelPdfLogoUrl?.trim() || null,
    whiteLabelFaviconUrl: perfil.whiteLabelFaviconUrl?.trim() || null,
    whiteLabelPrimaryColor: perfil.whiteLabelPrimaryColor.trim() || DEFAULT_WHITE_LABEL_PRIMARY_COLOR,
    whiteLabelDrPageBackgroundColor:
      perfil.whiteLabelDrPageBackgroundColor.trim() || DEFAULT_DR_PAGE_BACKGROUND,
    whiteLabelDrPageTextColor:
      perfil.whiteLabelDrPageTextColor.trim() || DEFAULT_DR_PAGE_TEXT,
    whiteLabelDrPageLogoUrl: perfil.whiteLabelDrPageLogoUrl?.trim() || null,
    whiteLabelAplicacaoPageBackgroundColor:
      perfil.whiteLabelAplicacaoPageBackgroundColor.trim() || DEFAULT_APLICACAO_PAGE_BACKGROUND,
    whiteLabelAplicacaoPageTextColor:
      perfil.whiteLabelAplicacaoPageTextColor.trim() || DEFAULT_APLICACAO_PAGE_TEXT,
    whiteLabelAplicacaoPageLogoUrl: perfil.whiteLabelAplicacaoPageLogoUrl?.trim() || null,
    whiteLabelConclusaoPageBackgroundColor:
      perfil.whiteLabelConclusaoPageBackgroundColor.trim() || DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
    whiteLabelConclusaoPageTextColor:
      perfil.whiteLabelConclusaoPageTextColor.trim() || DEFAULT_CONCLUSAO_PAGE_TEXT,
    whiteLabelConclusaoPageLogoUrl: perfil.whiteLabelConclusaoPageLogoUrl?.trim() || null,
    whiteLabelShowPoweredByOftware: perfil.whiteLabelShowPoweredByOftware,
    signature: {
      provider: signature.provider,
      customProviderName: signature.customProviderName.trim(),
      customProviderUrl: signature.customProviderUrl.trim(),
      customProviderNotes: signature.customProviderNotes.trim(),
    },
  });
}

export function isMeuPerfilMedicoFormDirty(
  perfil: MeuPerfilMedicoFormFields,
  signature: DoctorSignatureProviderFormState,
  savedSnapshot: string
): boolean {
  if (!savedSnapshot) return false;
  return serializeMeuPerfilMedicoForm(perfil, signature) !== savedSnapshot;
}

/** Formulário Meu Perfil ficou para trás do documento `medicos` (ex.: wizard escreveu só em medicoPerfil). */
export function meuPerfilFormNeedsHydrateFromMedico(
  perfil: MeuPerfilMedicoFormFields,
  medico: {
    crm?: { numero?: string; estado?: string };
    telefone?: string;
    genero?: 'M' | 'F';
    cidades?: { estado: string; cidade: string }[];
    localizacao?: { endereco?: string; cep?: string };
    cpfPessoal?: string;
  } | null | undefined
): boolean {
  if (!medico) return false;
  if (!perfil.crmNumero?.trim() && !!medico.crm?.numero?.trim()) return true;
  if (!perfil.telefone?.trim() && !!medico.telefone?.trim()) return true;
  if (
    perfil.genero !== 'M' &&
    perfil.genero !== 'F' &&
    (medico.genero === 'M' || medico.genero === 'F')
  ) {
    return true;
  }
  if ((perfil.cidades?.length ?? 0) < 1 && (medico.cidades?.length ?? 0) > 0) return true;
  if (!perfil.endereco?.trim() && !!medico.localizacao?.endereco?.trim()) return true;
  if (!perfil.cep?.trim() && !!medico.localizacao?.cep?.trim()) return true;
  if (!perfil.cpfPessoal?.trim() && !!medico.cpfPessoal?.trim()) return true;
  return false;
}

/** Campos obrigatórios efetivos: formulário + fallback do documento `medicos`. */
export function resolveMeuPerfilMedicoRequiredFields(
  perfil: MeuPerfilMedicoFormFields,
  medico: {
    crm?: { numero?: string; estado?: string };
    telefone?: string;
    genero?: 'M' | 'F';
    cidades?: { estado: string; cidade: string }[];
  } | null | undefined
) {
  const generoFromPerfil = perfil.genero === 'M' || perfil.genero === 'F' ? perfil.genero : null;
  const generoFromMedico = medico?.genero === 'M' || medico?.genero === 'F' ? medico.genero : null;
  return {
    crmNumero: perfil.crmNumero?.trim() || medico?.crm?.numero?.trim() || '',
    crmEstado: perfil.crmEstado?.trim() || medico?.crm?.estado?.trim() || '',
    telefone: perfil.telefone?.trim() || medico?.telefone?.trim() || '',
    genero: (generoFromPerfil || generoFromMedico || '') as 'M' | 'F' | '',
    cidades: (perfil.cidades?.length ?? 0) > 0 ? perfil.cidades : medico?.cidades ?? [],
  };
}

export function isMeuPerfilMedicoSaveBlocked(loadingPerfil: boolean): boolean {
  return loadingPerfil;
}

export function isMedicoPerfilOperacaoCompleto(
  perfil: MeuPerfilMedicoFormFields,
  medico: Parameters<typeof resolveMeuPerfilMedicoRequiredFields>[1]
): boolean {
  const required = resolveMeuPerfilMedicoRequiredFields(perfil, medico);
  return (
    !!required.crmNumero &&
    !!required.telefone &&
    (required.genero === 'M' || required.genero === 'F') &&
    required.cidades.length > 0
  );
}

export function publicPagesFieldsFromStoredWhiteLabel(
  whiteLabel: Parameters<typeof publicPagesFormFromStored>[0]
): Pick<
  MeuPerfilMedicoFormFields,
  | 'whiteLabelDrPageBackgroundColor'
  | 'whiteLabelDrPageTextColor'
  | 'whiteLabelDrPageLogoUrl'
  | 'whiteLabelAplicacaoPageBackgroundColor'
  | 'whiteLabelAplicacaoPageTextColor'
  | 'whiteLabelAplicacaoPageLogoUrl'
  | 'whiteLabelConclusaoPageBackgroundColor'
  | 'whiteLabelConclusaoPageTextColor'
  | 'whiteLabelConclusaoPageLogoUrl'
> {
  const pages = publicPagesFormFromStored(whiteLabel);
  return {
    whiteLabelDrPageBackgroundColor: pages.drPageBackgroundColor,
    whiteLabelDrPageTextColor: pages.drPageTextColor,
    whiteLabelDrPageLogoUrl: pages.drPageLogoUrl,
    whiteLabelAplicacaoPageBackgroundColor: pages.aplicacaoPageBackgroundColor,
    whiteLabelAplicacaoPageTextColor: pages.aplicacaoPageTextColor,
    whiteLabelAplicacaoPageLogoUrl: pages.aplicacaoPageLogoUrl,
    whiteLabelConclusaoPageBackgroundColor: pages.conclusaoPageBackgroundColor,
    whiteLabelConclusaoPageTextColor: pages.conclusaoPageTextColor,
    whiteLabelConclusaoPageLogoUrl: pages.conclusaoPageLogoUrl,
  };
}

/** Valores para o editor de páginas públicas (aba Identidade). */
export function publicPagesValuesFromPerfilForm(perfil: MeuPerfilMedicoFormFields) {
  return {
    drPageBackgroundColor: perfil.whiteLabelDrPageBackgroundColor,
    drPageTextColor: perfil.whiteLabelDrPageTextColor,
    drPageLogoUrl: perfil.whiteLabelDrPageLogoUrl,
    aplicacaoPageBackgroundColor: perfil.whiteLabelAplicacaoPageBackgroundColor,
    aplicacaoPageTextColor: perfil.whiteLabelAplicacaoPageTextColor,
    aplicacaoPageLogoUrl: perfil.whiteLabelAplicacaoPageLogoUrl,
    conclusaoPageBackgroundColor: perfil.whiteLabelConclusaoPageBackgroundColor,
    conclusaoPageTextColor: perfil.whiteLabelConclusaoPageTextColor,
    conclusaoPageLogoUrl: perfil.whiteLabelConclusaoPageLogoUrl,
    primaryColor: perfil.whiteLabelPrimaryColor,
    showPoweredByOftware: perfil.whiteLabelShowPoweredByOftware,
  };
}

/** Converte patch do editor para campos do formulário Meu Perfil. */
export function publicPagesPatchToPerfilForm(
  patch: Partial<ReturnType<typeof publicPagesValuesFromPerfilForm>>
): Partial<MeuPerfilMedicoFormFields> {
  const out: Partial<MeuPerfilMedicoFormFields> = {};
  if (patch.drPageBackgroundColor !== undefined) {
    out.whiteLabelDrPageBackgroundColor = patch.drPageBackgroundColor;
  }
  if (patch.drPageTextColor !== undefined) {
    out.whiteLabelDrPageTextColor = patch.drPageTextColor;
  }
  if (patch.drPageLogoUrl !== undefined) {
    out.whiteLabelDrPageLogoUrl = patch.drPageLogoUrl;
  }
  if (patch.aplicacaoPageBackgroundColor !== undefined) {
    out.whiteLabelAplicacaoPageBackgroundColor = patch.aplicacaoPageBackgroundColor;
  }
  if (patch.aplicacaoPageTextColor !== undefined) {
    out.whiteLabelAplicacaoPageTextColor = patch.aplicacaoPageTextColor;
  }
  if (patch.aplicacaoPageLogoUrl !== undefined) {
    out.whiteLabelAplicacaoPageLogoUrl = patch.aplicacaoPageLogoUrl;
  }
  if (patch.conclusaoPageBackgroundColor !== undefined) {
    out.whiteLabelConclusaoPageBackgroundColor = patch.conclusaoPageBackgroundColor;
  }
  if (patch.conclusaoPageTextColor !== undefined) {
    out.whiteLabelConclusaoPageTextColor = patch.conclusaoPageTextColor;
  }
  if (patch.conclusaoPageLogoUrl !== undefined) {
    out.whiteLabelConclusaoPageLogoUrl = patch.conclusaoPageLogoUrl;
  }
  if (patch.primaryColor !== undefined) {
    out.whiteLabelPrimaryColor = patch.primaryColor;
  }
  if (patch.showPoweredByOftware !== undefined) {
    out.whiteLabelShowPoweredByOftware = patch.showPoweredByOftware;
  }
  return out;
}
