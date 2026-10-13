import type { PacienteCompleto } from '@/types/obesidade';
import {
  dataPrevistaSemanaTratamento,
  primeiraDoseDoPlano,
  semanaInicioCicloDoPlano,
  ymdLocal,
} from '@/utils/datasAplicacaoSemanaPlano';
import { protocoloDaSemanaGlobal, semanaRelativaNoProtocolo } from '@/utils/tirzepatidaProtocoloDisplay';

function toWeek(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 0;
}

function toLocalDay(value: Date | string | undefined | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function mesmoDia(a: Date, b: Date): boolean {
  return ymdLocal(a) === ymdLocal(b);
}

/**
 * Converte a semana do link /aplicacao para o weekIndex global do ciclo.
 *
 * Links da 1ª aplicação do protocolo 2+ às vezes chegam com `semana=1`
 * (semana relativa). Sem este remap, o registro sobrescreve a semana 1 do
 * protocolo 1 e a Evolução do protocolo atual não marca a dose como aplicada.
 */
export function resolverWeekIndexAplicacaoPublica(params: {
  paciente: PacienteCompleto;
  semanaLink: unknown;
  dataLink?: Date | string | null;
}): number {
  const semana = toWeek(params.semanaLink);
  const inicio = semanaInicioCicloDoPlano(params.paciente.planoTerapeutico);
  if (semana < 1) return inicio;

  if (semana >= inicio) return semana;

  const plano = params.paciente.planoTerapeutico;
  if (!plano || !primeiraDoseDoPlano(plano)) return semana;

  const mapped = inicio + semana - 1;
  const dataLink = toLocalDay(params.dataLink ?? null);
  if (!dataLink) return semana;

  const evolucao = params.paciente.evolucaoSeguimento;
  const previstaMapped = dataPrevistaSemanaTratamento(plano, mapped, evolucao);
  if (mesmoDia(previstaMapped, dataLink)) return mapped;

  if (semana === 1) {
    const previstaInicio = dataPrevistaSemanaTratamento(plano, inicio, evolucao);
    if (mesmoDia(previstaInicio, dataLink)) return inicio;
  }

  return semana;
}

/** Primeira semana do protocolo que contém o weekIndex (ciclo 1 = 1; ciclo 2 = semanaInicioCiclo). */
export function ehPrimeiraSemanaDoProtocolo(
  paciente: PacienteCompleto | null | undefined,
  weekIndex: number
): boolean {
  const w = toWeek(weekIndex);
  if (w < 1) return false;
  const proto = protocoloDaSemanaGlobal(paciente, w);
  return semanaRelativaNoProtocolo(w, proto.semanaInicioCiclo) === 1;
}
