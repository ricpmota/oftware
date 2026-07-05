/** Aba do catálogo SISTEMA no /metaadmingeral. */
export type PrescricaoCatalogoAba = 'prescricao' | 'protocolo';

export interface PrescricaoPasta {
  id: string;
  medicoId: 'SISTEMA';
  catalogoAba: PrescricaoCatalogoAba;
  nome: string;
  ordem: number;
  /** Pastas padrão criadas pelo sistema (ex.: Recibo Médico). */
  sistemaPadrao?: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
