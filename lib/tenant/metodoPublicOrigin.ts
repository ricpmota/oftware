import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';

/**
 * Portal do paciente (Meta) — organização Método Emagrecer.
 *
 * Regra: retorno do paciente ao sistema SEMPRE usa /meta (nunca só o domínio raiz).
 */
export const METODO_PACIENTE_META_URL = buildOrganizacaoPublicUrl('/meta');

/** Página de exames laboratoriais no portal do paciente. */
export const METODO_PACIENTE_META_EXAMES_URL = `${METODO_PACIENTE_META_URL}?menu=exames`;

/** Página de exames → aba Imagens no portal do paciente. */
export const METODO_PACIENTE_META_EXAMES_IMAGENS_URL = `${METODO_PACIENTE_META_URL}?menu=exames&aba=imagens`;

/** Página de Aplicações no portal do paciente. */
export const METODO_PACIENTE_META_APLICACOES_URL = `${METODO_PACIENTE_META_URL}?menu=aplicacoes`;

/** Caixa de entrada de mensagens no portal do paciente. */
export const METODO_PACIENTE_META_MENSAGENS_URL = `${METODO_PACIENTE_META_URL}?menu=mensagens`;

/** Página Personal (treino) no portal do paciente. */
export const METODO_PACIENTE_META_PERSONAL_URL = `${METODO_PACIENTE_META_URL}?menu=personal`;

/** Página Nutri → Cardápio no portal do paciente. */
export const METODO_PACIENTE_META_NUTRI_CARDAPIO_URL = `${METODO_PACIENTE_META_URL}?menu=nutri&aba=cardapio`;

/** Após envio da aplicação com contrato pendente — prioriza abertura do modal de assinatura. */
export const METODO_PACIENTE_META_FROM_APLICACAO_URL = `${METODO_PACIENTE_META_URL}?from=aplicacao&contrato=1`;

export function goToMetodoPacienteMeta(options?: { fromAplicacao?: boolean }): void {
  if (typeof window === 'undefined') return;
  window.location.assign(
    options?.fromAplicacao ? METODO_PACIENTE_META_FROM_APLICACAO_URL : METODO_PACIENTE_META_URL
  );
}
