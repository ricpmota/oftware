import type { CheckInSemanal, CheckInSemanalScore, PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import {
  calcularScoreCheckInSemanal,
  type CheckInSemanalScoreResultado,
} from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import { ehPrimeiraSemanaDoProtocolo } from '@/lib/aplicacao/resolverWeekIndexAplicacaoPublica';
import { semanaIndexFromRegistro } from '@/utils/evolucaoAplicacaoHelpers';

export function calcularVariacoesParaSeguimento(
  paciente: PacienteCompleto,
  seg: SeguimentoSemanal
): { variacaoPeso: number | null; variacaoCircunferencia: number | null } {
  const evolucao = paciente.evolucaoSeguimento ?? [];
  const weekIndex = seg.weekIndex ?? (seg as { numeroSemana?: number }).numeroSemana ?? 0;
  const peso = seg.peso;
  const circ = seg.circunferenciaAbdominal;

  if (peso == null) return { variacaoPeso: null, variacaoCircunferencia: null };

  const ehSemanaUm = ehPrimeiraSemanaDoProtocolo(paciente, weekIndex);
  const circunfAtualNum = circ != null && !Number.isNaN(circ) ? circ : null;

  if (ehSemanaUm) {
    return {
      variacaoPeso: 0,
      variacaoCircunferencia: circunfAtualNum != null ? 0 : null,
    };
  }

  const evolucaoOrdenada = [...evolucao].sort(
    (a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0)
  );
  const anteriores = evolucaoOrdenada.filter((r) => (r.weekIndex ?? 0) < weekIndex);
  const ultimoAnterior = anteriores.length > 0 ? anteriores[anteriores.length - 1] : null;

  const pesoAnterior =
    ultimoAnterior?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso;
  const circunfAnterior =
    ultimoAnterior?.circunferenciaAbdominal ??
    paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;

  let variacaoPeso: number | null = null;
  let variacaoCircunferencia: number | null = null;

  if (pesoAnterior != null && typeof pesoAnterior === 'number') {
    variacaoPeso = peso - pesoAnterior;
  }
  if (
    circunfAtualNum != null &&
    circunfAnterior != null &&
    typeof circunfAnterior === 'number'
  ) {
    variacaoCircunferencia = circunfAtualNum - circunfAnterior;
  }

  return { variacaoPeso, variacaoCircunferencia };
}

function scoreSalvoParaResultado(score: CheckInSemanalScore): CheckInSemanalScoreResultado {
  return {
    score: score.score,
    categoria: score.categoria,
    medalha: score.medalha,
    titulo: score.titulo,
    mensagemPaciente: score.mensagemPaciente,
    pontos: score.pontos,
    fatoresPositivos: score.fatoresPositivos ?? [],
    pontosDeAtencao: score.pontosDeAtencao ?? [],
  };
}

function toDateLocal(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Registro de evolução corresponde à aplicação planejada (mesma semana + data ±3 dias). */
export function registroCorrespondeAplicacao(
  registro: SeguimentoSemanal,
  aplicacao: { semana: number; data: Date }
): boolean {
  const weekIndex = semanaIndexFromRegistro(registro);
  if (weekIndex !== Number(aplicacao.semana)) return false;
  const dataReg = toDateLocal(registro.dataRegistro);
  if (!dataReg) return false;
  const dataPrev = new Date(aplicacao.data);
  dataReg.setHours(0, 0, 0, 0);
  dataPrev.setHours(0, 0, 0, 0);
  const diffDias = Math.abs((dataReg.getTime() - dataPrev.getTime()) / (1000 * 60 * 60 * 24));
  return diffDias <= 3;
}

export type CheckInSemanalDetalhe = {
  semana: number;
  checkInSemanal?: CheckInSemanal;
  score: CheckInSemanalScoreResultado;
  registro: SeguimentoSemanal;
};

function montarCheckInDetalhe(
  paciente: PacienteCompleto,
  seg: SeguimentoSemanal
): CheckInSemanalDetalhe | null {
  const score = resolveCheckInSemanalScore(paciente, seg);
  if (score?.score == null) return null;
  return {
    semana: seg.weekIndex,
    checkInSemanal: seg.checkInSemanal,
    score,
    registro: seg,
  };
}

/** Score do check-in apenas quando a aplicação foi respondida (semana + data correspondentes). */
export function obterCheckInScoreParaAplicacao(
  paciente: PacienteCompleto,
  aplicacao: { semana: number; data: Date },
  registro: SeguimentoSemanal | null | undefined
): number | null {
  if (!registro || !registroCorrespondeAplicacao(registro, aplicacao)) return null;
  const score = resolveCheckInSemanalScore(paciente, registro);
  return score?.score ?? null;
}

/** Detalhe do check-in apenas para a aplicação respondida correspondente. */
export function obterCheckInSemanalDetalheParaAplicacao(
  paciente: PacienteCompleto,
  aplicacao: { semana: number; data: Date },
  registro: SeguimentoSemanal | null | undefined
): CheckInSemanalDetalhe | null {
  if (!registro || !registroCorrespondeAplicacao(registro, aplicacao)) return null;
  return montarCheckInDetalhe(paciente, registro);
}

/** Retorna score persistido ou recalcula em leitura quando houver dados suficientes. */
export function resolveCheckInSemanalScore(
  paciente: PacienteCompleto,
  seg: SeguimentoSemanal
): CheckInSemanalScoreResultado | null {
  const semana = seg.weekIndex ?? (seg as { numeroSemana?: number }).numeroSemana ?? 0;
  // Primeira semana do protocolo (Marco Zero) não tem score de check-in
  if (ehPrimeiraSemanaDoProtocolo(paciente, semana) || seg.marcoZero) return null;

  if (seg.checkInSemanalScore?.score != null) {
    return scoreSalvoParaResultado(seg.checkInSemanalScore);
  }

  if (!seg.checkInSemanal) return null;

  const { variacaoPeso, variacaoCircunferencia } = calcularVariacoesParaSeguimento(paciente, seg);

  return calcularScoreCheckInSemanal({
    variacaoPeso,
    variacaoCircunferencia,
    temCircunferenciaAtual:
      seg.circunferenciaAbdominal != null && !Number.isNaN(seg.circunferenciaAbdominal),
    checkInSemanal: seg.checkInSemanal,
  });
}

/** Score direto do registro (ex.: pasta Evolução), sem exigir match de data do calendário. */
export function obterCheckInScoreDeRegistro(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal | null | undefined
): number | null {
  if (!registro) return null;
  return resolveCheckInSemanalScore(paciente, registro)?.score ?? null;
}

/** Detalhe do check-in direto do registro. */
export function obterCheckInSemanalDetalheDeRegistro(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal | null | undefined
): CheckInSemanalDetalhe | null {
  if (!registro) return null;
  return montarCheckInDetalhe(paciente, registro);
}
