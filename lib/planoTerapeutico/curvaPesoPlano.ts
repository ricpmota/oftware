/**
 * Curva de peso e fases visuais do plano — camada de apresentação (sem alterar motor clínico).
 */
import type { PontoCurvaPeso } from '@/types/planoTerapeuticoInterativo';
import type { FaseTratamentoSegmento } from '@/lib/treatment-designer/types';
import { limitarPerdaKgAoTeto } from '@/lib/planoTerapeutico/limitePerdaPonderal';

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Semana em que a meta é atingida, ajustada pela dose inicial (apresentação). */
export function calcularSemanaMetaComDose(
  perdaEfetivaKg: number,
  semanaMetaRitmo: number,
  doseMg: number,
  doseReferenciaMg: number,
  duracaoMaxSemanas: number
): number {
  if (perdaEfetivaKg <= 0 || semanaMetaRitmo <= 0) {
    return Math.max(1, duracaoMaxSemanas);
  }
  const fatorDose =
    doseReferenciaMg > 0 ? Math.max(0.75, Math.min(1.6, doseMg / doseReferenciaMg)) : 1;
  const perdaSemanalRitmo = perdaEfetivaKg / semanaMetaRitmo;
  const perdaSemanalAjustada = perdaSemanalRitmo * fatorDose;
  const semana = Math.ceil(perdaEfetivaKg / Math.max(0.1, perdaSemanalAjustada));
  return Math.min(Math.max(1, semana), Math.max(1, duracaoMaxSemanas));
}

/**
 * Perda até a meta com platô de manutenção até o fim do período.
 * Mesma lógica para personalizado, trimestral e semestral.
 */
export function gerarCurvaPesoComManutencao(
  pesoInicio: number,
  perdaKg: number,
  duracaoSemanas: number,
  semanaMetaAtingida: number
): PontoCurvaPeso[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  const perdaLimitada = limitarPerdaKgAoTeto(pesoInicio, Math.max(0, perdaKg));
  const pesoAlvo = arredondar1(Math.max(0, pesoInicio - perdaLimitada));
  const semanaFimPerda = Math.min(Math.max(1, Math.round(semanaMetaAtingida)), semanas);
  const pontos: PontoCurvaPeso[] = [{ semana: 0, pesoKg: arredondar1(pesoInicio) }];

  for (let s = 1; s <= semanas; s++) {
    if (s >= semanaFimPerda) {
      pontos.push({ semana: s, pesoKg: pesoAlvo });
      continue;
    }
    const t = s / semanaFimPerda;
    const eased = 1 - Math.pow(1 - t, 1.15);
    const peso = pesoInicio - perdaLimitada * eased;
    pontos.push({ semana: s, pesoKg: arredondar1(Math.max(pesoAlvo, peso)) });
  }

  if (pontos[pontos.length - 1].pesoKg !== pesoAlvo) {
    pontos[pontos.length - 1] = { semana: semanas, pesoKg: pesoAlvo };
  }

  return pontos;
}

/** Fases visuais do gráfico com base na semana em que a meta é atingida. */
export function montarFasesVisuaisPlano(
  duracaoSemanas: number,
  semanaMetaAtingida: number
): FaseTratamentoSegmento[] {
  const total = Math.max(1, Math.round(duracaoSemanas));
  const semanaMeta = Math.min(Math.max(1, Math.round(semanaMetaAtingida)), total);
  const fimAdaptacao = Math.min(2, Math.max(1, Math.floor(semanaMeta * 0.2)));

  const fases: FaseTratamentoSegmento[] = [
    {
      id: 'adaptacao',
      rotulo: 'Adaptação',
      semanaInicio: 0,
      semanaFim: fimAdaptacao,
      duracaoSemanas: fimAdaptacao,
    },
    {
      id: 'perda_peso',
      rotulo: 'Perda de peso',
      semanaInicio: fimAdaptacao,
      semanaFim: semanaMeta,
      duracaoSemanas: Math.max(1, semanaMeta - fimAdaptacao),
    },
  ];

  if (semanaMeta >= total) return fases;

  const restante = total - semanaMeta;
  const fimConsolidacao = semanaMeta + Math.max(1, Math.round(restante * 0.55));

  fases.push({
    id: 'consolidacao',
    rotulo: 'Consolidação',
    semanaInicio: semanaMeta,
    semanaFim: Math.min(fimConsolidacao, total),
    duracaoSemanas: Math.min(fimConsolidacao, total) - semanaMeta,
  });

  if (fimConsolidacao < total) {
    fases.push({
      id: 'pos_meta',
      rotulo: 'Estratégia pós-meta',
      semanaInicio: fimConsolidacao,
      semanaFim: total,
      duracaoSemanas: total - fimConsolidacao,
    });
  }

  return fases;
}

export function faseIdNaSemana(
  fases: FaseTratamentoSegmento[],
  semana: number
): FaseTratamentoSegmento['id'] {
  const hit = fases.find((f) => semana >= f.semanaInicio && semana <= f.semanaFim);
  return hit?.id ?? 'perda_peso';
}
