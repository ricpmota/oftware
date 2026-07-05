import type { ModalidadePlanoAutomaticoId } from '@/lib/treatment-negotiation/types';

export const LABEL_ANALISE_EXAMES = 'Análise de Exames';

export const PLANO_PERSONALIZADO_CARD = {
  titulo: 'Plano Personalizado',
  subtitulo: 'Plano ajustado exclusivamente para você.',
  badge: 'Personalizado',
  descricao:
    'Este plano poderá ser adaptado conforme o acordo entre médico e paciente.',
} as const;

export const MODALIDADES_BASE_OPCOES: {
  id: ModalidadePlanoAutomaticoId;
  rotulo: string;
}[] = [
  { id: 'mensal', rotulo: 'Mensal' },
  { id: 'trimestral', rotulo: 'Trimestral' },
  { id: 'semestral', rotulo: 'Semestral' },
];
