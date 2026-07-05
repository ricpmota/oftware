import type { MedicoWhiteLabelStored } from '@/types/medico';
import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';

/** As 6 imagens padrão do Método (fonte: conta ricpmota.med@gmail.com). */
export type MetodoImagensTemplate = {
  ogImageUrl: string | null;
  faviconUrl: string | null;
  pdfLogoUrl: string | null;
  drPageLogoUrl: string | null;
  aplicacaoPageLogoUrl: string | null;
  conclusaoPageLogoUrl: string | null;
  syncedAt?: string | null;
  sourceMedicoId?: string | null;
  sourceEmail?: string | null;
};

export const METODO_IMAGENS_SOURCE_EMAIL = 'ricpmota.med@gmail.com';

export function extractMetodoImagensFromWhiteLabel(
  wl?: MedicoWhiteLabelStored | null
): MetodoImagensTemplate {
  return {
    ogImageUrl: wl?.ogImageUrl?.trim() || null,
    faviconUrl: wl?.faviconUrl?.trim() || null,
    pdfLogoUrl: wl?.pdfLogoUrl?.trim() || null,
    drPageLogoUrl: wl?.drPageLogoUrl?.trim() || null,
    aplicacaoPageLogoUrl: wl?.aplicacaoPageLogoUrl?.trim() || null,
    conclusaoPageLogoUrl: wl?.conclusaoPageLogoUrl?.trim() || null,
  };
}

/** Substitui as 6 URLs de imagem quando o médico está no padrão Método. */
export function applyMetodoImagensToWhiteLabel(
  whiteLabel: MedicoWhiteLabelStored | null | undefined,
  template: MetodoImagensTemplate | null | undefined,
  metodoAtivo: boolean
): MedicoWhiteLabelStored | undefined {
  if (!metodoAtivo || !template) {
    return whiteLabel ?? undefined;
  }
  const base = { ...(whiteLabel ?? {}) };
  if (template.ogImageUrl) base.ogImageUrl = template.ogImageUrl;
  if (template.faviconUrl) base.faviconUrl = template.faviconUrl;
  if (template.pdfLogoUrl) base.pdfLogoUrl = template.pdfLogoUrl;
  if (template.drPageLogoUrl) base.drPageLogoUrl = template.drPageLogoUrl;
  if (template.aplicacaoPageLogoUrl) base.aplicacaoPageLogoUrl = template.aplicacaoPageLogoUrl;
  if (template.conclusaoPageLogoUrl) base.conclusaoPageLogoUrl = template.conclusaoPageLogoUrl;
  return base;
}

export function isMetodoImagensAtivo(medico: { metodoImagensAtivo?: boolean } | null | undefined): boolean {
  return medico?.metodoImagensAtivo === true;
}

/** Médico no padrão Método não pode trocar as 6 imagens — só a conta fonte (admin geral). */
export function isMetodoImagensUiLocked(
  medico: { metodoImagensAtivo?: boolean; email?: string | null } | null | undefined
): boolean {
  if (!isMetodoImagensAtivo(medico)) return false;
  if (isMetaAdminGeralEmail(medico?.email)) return false;
  return true;
}

const METODO_IMAGE_KEYS = [
  'ogImageUrl',
  'faviconUrl',
  'pdfLogoUrl',
  'drPageLogoUrl',
  'aplicacaoPageLogoUrl',
  'conclusaoPageLogoUrl',
] as const;

/** URLs das 6 imagens para exibição travada (template Método). */
export function metodoLockedImageUrlsFromTemplate(
  template: MetodoImagensTemplate | null | undefined
): Pick<MetodoImagensTemplate, (typeof METODO_IMAGE_KEYS)[number]> | null {
  if (!template) return null;
  return {
    ogImageUrl: template.ogImageUrl,
    faviconUrl: template.faviconUrl,
    pdfLogoUrl: template.pdfLogoUrl,
    drPageLogoUrl: template.drPageLogoUrl,
    aplicacaoPageLogoUrl: template.aplicacaoPageLogoUrl,
    conclusaoPageLogoUrl: template.conclusaoPageLogoUrl,
  };
}

/** Ao salvar perfil com Método ativo, preserva imagens salvas (não sobrescreve com o formulário). */
export function metodoPreserveStoredImageUrls(
  form: {
    ogImageUrl: string | null;
    pdfLogoUrl: string | null;
    faviconUrl: string | null;
    drPageLogoUrl: string | null;
    aplicacaoPageLogoUrl: string | null;
    conclusaoPageLogoUrl: string | null;
  },
  stored: MedicoWhiteLabelStored | null | undefined,
  locked: boolean
) {
  if (!locked) return form;
  return {
    ogImageUrl: stored?.ogImageUrl ?? null,
    pdfLogoUrl: stored?.pdfLogoUrl ?? null,
    faviconUrl: stored?.faviconUrl ?? null,
    drPageLogoUrl: stored?.drPageLogoUrl ?? null,
    aplicacaoPageLogoUrl: stored?.aplicacaoPageLogoUrl ?? null,
    conclusaoPageLogoUrl: stored?.conclusaoPageLogoUrl ?? null,
  };
}
