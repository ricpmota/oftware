import type { PacienteCompleto, PlanoInjetavelAplicacao } from '@/types/obesidade';
import { dataGradeSemanal, ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';
import { parseYyyyMmDdToLocalDate } from '@/utils/esquemaDoseSemanaDateFormat';

export type InjetavelPlanejadoItem = {
  data: Date;
  paciente: PacienteCompleto;
  aplicacaoId: string;
  protocoloId: string;
  protocoloNome: string;
  semana: number;
  observacao?: string;
  realizado: boolean;
};

function toLocalDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value);
  const td = (value as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return parseYyyyMmDdToLocalDate(value.trim());
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function leMapString(
  map: Record<string, string> | undefined,
  semana: number
): string | undefined {
  if (!map) return undefined;
  const a = map[String(semana)];
  const b = map[semana as unknown as string];
  const s = (typeof a === 'string' ? a : typeof b === 'string' ? b : '')?.trim();
  return s || undefined;
}

function leMapBool(
  map: Record<string, boolean> | undefined,
  semana: number
): boolean {
  if (!map) return false;
  if (map[String(semana)] === true) return true;
  if (map[semana as unknown as string] === true) return true;
  return false;
}

/** Data planejada da semana de um protocolo injetável. */
export function dataInjetavelSemana(
  aplicacao: PlanoInjetavelAplicacao,
  semana: number
): Date | null {
  const start = toLocalDate(aplicacao.startDate);
  if (!start) return null;
  start.setHours(0, 0, 0, 0);
  const overrideYmd = leMapString(aplicacao.datasAplicacaoIndividuais, semana);
  if (overrideYmd) {
    const parsed = parseYyyyMmDdToLocalDate(overrideYmd);
    if (parsed) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }
  return dataGradeSemanal(start, semana);
}

/**
 * Lista aplicações de protocolos injetáveis do paciente no intervalo [inicio, fim].
 * Semanas canceladas são omitidas.
 */
export function listarInjetaveisPlanejadosNoPeriodo(
  paciente: PacienteCompleto,
  inicio: Date,
  fim: Date
): InjetavelPlanejadoItem[] {
  const apps = paciente.planoTerapeutico?.injetaveisAplicacoes;
  if (!Array.isArray(apps) || apps.length === 0) return [];

  const inicioN = new Date(inicio);
  inicioN.setHours(0, 0, 0, 0);
  const fimN = new Date(fim);
  fimN.setHours(23, 59, 59, 999);

  const out: InjetavelPlanejadoItem[] = [];

  for (const app of apps) {
    if (!app?.id) continue;
    if (!app.protocoloNome && !app.protocoloId) continue;
    const nSem = Number(app.numeroSemanasTratamento) || 0;
    if (nSem < 1) continue;
    const canceladas = new Set(app.semanasCanceladas || []);

    for (let semana = 1; semana <= nSem; semana++) {
      if (canceladas.has(semana)) continue;
      const data = dataInjetavelSemana(app, semana);
      if (!data) continue;
      if (data.getTime() < inicioN.getTime() || data.getTime() > fimN.getTime()) continue;

      const obs = leMapString(app.observacoesPorSemana, semana);
      out.push({
        data,
        paciente,
        aplicacaoId: app.id,
        protocoloId: app.protocoloId || '',
        protocoloNome: app.protocoloNome || 'Protocolo',
        semana,
        observacao: obs,
        realizado: leMapBool(app.realizadoPorSemana, semana),
      });
    }
  }

  return out;
}

/** Marca/desmarca realizado no plano (imutável). */
export function pacienteComInjetavelRealizado(
  paciente: PacienteCompleto,
  aplicacaoId: string,
  semana: number,
  realizado: boolean
): PacienteCompleto {
  const apps = paciente.planoTerapeutico?.injetaveisAplicacoes || [];
  const nextApps = apps.map((a) => {
    if (a.id !== aplicacaoId) return a;
    const map = { ...(a.realizadoPorSemana || {}) };
    if (realizado) {
      map[String(semana)] = true;
    } else {
      delete map[String(semana)];
      delete map[semana as unknown as string];
    }
    return {
      ...a,
      realizadoPorSemana: Object.keys(map).length > 0 ? map : undefined,
    };
  });

  return {
    ...paciente,
    planoTerapeutico: {
      ...paciente.planoTerapeutico,
      metas: paciente.planoTerapeutico?.metas || {},
      injetaveisAplicacoes: nextApps,
    },
  };
}

/** Chave estável para UI (calendário). */
export function chaveInjetavelCalendario(item: {
  paciente: { id?: string };
  aplicacaoId: string;
  semana: number;
  data: Date;
}): string {
  return `${item.paciente.id || 'p'}:${item.aplicacaoId}:${item.semana}:${ymdLocal(item.data)}`;
}
