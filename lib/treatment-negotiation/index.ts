/**
 * TreatmentNegotiation — Mesa de Negociação Terapêutica
 *
 * Toda negociação ocorre exclusivamente no Plano Personalizado.
 * Planos Mensal, Trimestral e Semestral permanecem automáticos e imutáveis.
 */
export * from '@/lib/treatment-negotiation/types';
export * from '@/lib/treatment-negotiation/constants';
export * from '@/lib/treatment-negotiation/duplicatePlanoBase';
export * from '@/lib/treatment-negotiation/recalcularPlanoNegociado';
export * from '@/lib/treatment-negotiation/negociacaoState';
export * from '@/lib/treatment-negotiation/parametrosDefaults';
export * from '@/lib/treatment-negotiation/doseSemanalUtils';
export * from '@/lib/treatment-negotiation/auditoriaLocal';
export * from '@/lib/treatment-negotiation/composicaoManual';
export * from '@/lib/treatment-negotiation/negociacaoSessao';
export * from '@/lib/treatment-negotiation/investimentoAuto';
export * from '@/lib/treatment-negotiation/normalizarParametrosNegociacao';
export { TreatmentNegotiationService } from '@/lib/treatment-negotiation/TreatmentNegotiationService';
