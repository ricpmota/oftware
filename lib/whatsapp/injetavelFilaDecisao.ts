import type { PacienteCompleto } from '@/types/obesidade';

export type DecisaoLembreteInjetavelWhatsapp =
  | { pular: true; motivo: string; sairDaFila: boolean }
  | { pular: false; realizada: boolean };

/** Ids dos protocolos injetáveis ainda gravados no plano. */
export function idsProtocolosInjetaveis(plano: unknown): Set<string> {
  if (!plano || typeof plano !== 'object') return new Set();
  const apps = (plano as { injetaveisAplicacoes?: unknown }).injetaveisAplicacoes;
  if (!Array.isArray(apps)) return new Set();
  const ids = new Set<string>();
  for (const raw of apps) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String((raw as { id?: unknown }).id ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * O cron só envia lembrete de injetável se o protocolo ainda está no plano.
 * Protocolo apagado (ou semana cancelada) sai da fila, como a aplicação de tirzepatida.
 */
export function decisaoLembreteInjetavelWhatsapp(
  paciente: PacienteCompleto,
  aplicacaoId: string | undefined,
  semana: number,
): DecisaoLembreteInjetavelWhatsapp {
  if (paciente.statusTratamento !== 'em_tratamento') {
    return { pular: true, motivo: 'Paciente não está em tratamento.', sairDaFila: false };
  }

  const id = (aplicacaoId || '').trim();
  const apps = paciente.planoTerapeutico?.injetaveisAplicacoes || [];
  const app = id ? apps.find((item) => item.id === id) : undefined;
  if (!app) {
    return {
      pular: true,
      motivo: 'Protocolo injetável não existe mais no plano terapêutico.',
      sairDaFila: true,
    };
  }

  const nSem = Number(app.numeroSemanasTratamento) || 0;
  const canceladas = new Set(app.semanasCanceladas || []);
  if (!Number.isFinite(semana) || semana < 1 || semana > nSem || canceladas.has(semana)) {
    return {
      pular: true,
      motivo: 'Aplicação de injetável não existe mais no plano terapêutico.',
      sairDaFila: true,
    };
  }

  const map = app.realizadoPorSemana || {};
  const realizada = map[String(semana)] === true || map[semana as unknown as string] === true;
  return { pular: false, realizada };
}
