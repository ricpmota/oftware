import type { HistoricoProtocoloTirzepatida, PacienteCompleto, PlanoTerapeutico } from '@/types/obesidade';
import {
  primeiraDoseDoPlano,
  semanaIndexConclusao,
  semanaInicioCicloDoPlano,
} from '@/utils/datasAplicacaoSemanaPlano';
import {
  deveArquivarConclusao,
  mergeHistoricoConclusaoNoPlano,
  snapshotConclusaoParaHistorico,
} from '@/utils/conclusaoTratamentoHistorico';

function newCicloId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ciclo-tirz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toLocalDateSafe(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value);
  const td = (value as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** Conclusão do ciclo ativo preenchida (data ou depoimento/peso). */
export function podeCriarNovoProtocoloTirzepatida(paciente: PacienteCompleto): boolean {
  const plano = paciente.planoTerapeutico;
  if (!plano || !primeiraDoseDoPlano(plano)) return false;
  const ct = plano.conclusaoTratamento as { dataConclusao?: unknown } | undefined;
  if (toLocalDateSafe(ct?.dataConclusao)) return true;
  return deveArquivarConclusao(ct);
}

export function snapshotProtocoloTirzepatidaAtual(
  plano: PlanoTerapeutico,
  indice: number
): HistoricoProtocoloTirzepatida {
  return {
    id: newCicloId(),
    indice,
    startDate: plano.startDate,
    dataInicioTratamento: plano.dataInicioTratamento,
    injectionDayOfWeek: plano.injectionDayOfWeek,
    numeroSemanasTratamento: plano.numeroSemanasTratamento,
    semanaInicioCiclo: plano.semanaInicioCiclo ?? 1,
    currentDoseMg: plano.currentDoseMg,
    lastDoseChangeAt: plano.lastDoseChangeAt,
    nextReviewDate: plano.nextReviewDate,
    titrationStatus: plano.titrationStatus,
    titrationNotes: plano.titrationNotes,
    esquemaDosesCustomizado: plano.esquemaDosesCustomizado
      ? { ...plano.esquemaDosesCustomizado }
      : undefined,
    semanasCanceladas: plano.semanasCanceladas ? [...plano.semanasCanceladas] : undefined,
    datasAplicacaoIndividuais: plano.datasAplicacaoIndividuais
      ? { ...plano.datasAplicacaoIndividuais }
      : undefined,
    doseAtual: plano.doseAtual ? { ...plano.doseAtual } : undefined,
    metas: plano.metas ? { ...plano.metas } : undefined,
    conclusaoTratamento: plano.conclusaoTratamento
      ? { ...plano.conclusaoTratamento }
      : undefined,
    arquivadoEm: new Date(),
  };
}

/**
 * Arquiva o ciclo ativo e abre o seguinte: a primeira semana é a da conclusão + 1.
 * A evolução semanal permanece (weekIndex contínuo). O médico define a nova data de início.
 */
export function criarNovoProtocoloTirzepatida(paciente: PacienteCompleto): PacienteCompleto {
  const plano = paciente.planoTerapeutico;
  if (!plano || !podeCriarNovoProtocoloTirzepatida(paciente)) return paciente;

  const historico = [...(plano.historicoProtocolosTirzepatida || [])];
  const indiceArquivado = historico.length + 1;
  historico.push(snapshotProtocoloTirzepatidaAtual(plano, indiceArquivado));

  const semanaInicioNovo = semanaIndexConclusao(plano) + 1;
  const duracao = Number(plano.numeroSemanasTratamento);
  const numeroSemanasNovo =
    Number.isFinite(duracao) && duracao >= 1 ? Math.min(200, Math.floor(duracao)) : 18;

  let planoBase: Record<string, unknown> = { ...(plano as Record<string, unknown>) };
  const ct = plano.conclusaoTratamento;
  if (deveArquivarConclusao(ct)) {
    const snap = snapshotConclusaoParaHistorico(ct as Record<string, unknown>, {
      estrelas: null,
      evolucaoSeguimento: (paciente.evolucaoSeguimento || []) as unknown[],
    });
    planoBase = mergeHistoricoConclusaoNoPlano(planoBase, snap);
  }

  return {
    ...paciente,
    statusTratamento: 'em_tratamento',
    planoTerapeutico: {
      ...(planoBase as PlanoTerapeutico),
      historicoProtocolosTirzepatida: historico,
      semanaInicioCiclo: semanaInicioNovo,
      startDate: undefined,
      dataInicioTratamento: undefined,
      injectionDayOfWeek: undefined,
      datasAplicacaoIndividuais: undefined,
      semanasCanceladas: undefined,
      esquemaDosesCustomizado: undefined,
      conclusaoTratamento: undefined,
      numeroSemanasTratamento: numeroSemanasNovo,
      titrationStatus: 'INICIADO',
      titrationNotes: undefined,
      lastDoseChangeAt: undefined,
      nextReviewDate: undefined,
      metas: plano.metas ? { ...plano.metas } : { },
    },
  };
}

function weekIndexSeguimento(entrada: { weekIndex?: number; numeroSemana?: number }): number {
  const w = entrada.weekIndex ?? entrada.numeroSemana ?? 0;
  return typeof w === 'number' && Number.isFinite(w) ? w : 0;
}

function conclusaoCompativel(arquivada: unknown, atual: unknown): boolean {
  if (!arquivada || !atual || typeof arquivada !== 'object' || typeof atual !== 'object') return false;
  const a = arquivada as Record<string, unknown>;
  const b = atual as Record<string, unknown>;
  const depA = typeof a.depoimento === 'string' ? a.depoimento.trim() : '';
  const depB = typeof b.depoimento === 'string' ? b.depoimento.trim() : '';
  if (depA && depB && depA === depB) return true;
  if (typeof a.pesoFinalKg === 'number' && a.pesoFinalKg === b.pesoFinalKg) return true;
  const dataA = toLocalDateSafe(a.dataConclusao);
  const dataB = toLocalDateSafe(b.dataConclusao);
  return Boolean(dataA && dataB && dataA.getTime() === dataB.getTime());
}

/** Remove o ciclo ativo e não restaura protocolo anterior. O status do paciente permanece. */
export function limparPlanoTirzepatidaAtivo(paciente: PacienteCompleto): PacienteCompleto {
  const planoAtual = paciente.planoTerapeutico;
  const alertasSemVinculoSemana = (paciente.alertas || []).filter((a) => a.linkedWeek == null);
  const inicioCiclo = semanaInicioCicloDoPlano(planoAtual);
  const evolucaoMantida = (paciente.evolucaoSeguimento || []).filter((e) => {
    const w = weekIndexSeguimento(e);
    return w > 0 && w < inicioCiclo;
  });
  const planoLimpo: PacienteCompleto['planoTerapeutico'] = {
    metas: planoAtual?.metas || {},
    ...(planoAtual?.injetaveisAplicacoes
      ? { injetaveisAplicacoes: planoAtual.injetaveisAplicacoes }
      : {}),
    ...(planoAtual?.historicoConclusoesTratamento
      ? { historicoConclusoesTratamento: planoAtual.historicoConclusoesTratamento }
      : {}),
    ...(planoAtual?.historicoProtocolosTirzepatida
      ? { historicoProtocolosTirzepatida: planoAtual.historicoProtocolosTirzepatida }
      : {}),
    ...(inicioCiclo > 1 ? { semanaInicioCiclo: inicioCiclo } : {}),
  };
  return {
    ...paciente,
    evolucaoSeguimento: evolucaoMantida,
    alertas: alertasSemVinculoSemana,
    planoTerapeutico: planoLimpo,
  };
}

/**
 * Apaga o protocolo ativo.
 * Se houver protocolo anterior arquivado, ele volta a ser o plano vigente e o
 * status do paciente volta para Concluído. Sem histórico, o plano ativo é limpo.
 */
export function apagarProtocoloTirzepatidaAtivo(paciente: PacienteCompleto): PacienteCompleto {
  const plano = paciente.planoTerapeutico;
  const historico = [...(plano?.historicoProtocolosTirzepatida || [])];
  const anterior = historico.pop();
  if (!anterior) return limparPlanoTirzepatidaAtivo(paciente);

  const inicioApagado = semanaInicioCicloDoPlano(plano);
  const evolucaoMantida = (paciente.evolucaoSeguimento || []).filter((e) => {
    const w = weekIndexSeguimento(e);
    return w > 0 && w < inicioApagado;
  });
  const alertas = (paciente.alertas || []).filter(
    (a) => a.linkedWeek == null || a.linkedWeek < inicioApagado
  );

  let historicoConclusoes = Array.isArray(plano?.historicoConclusoesTratamento)
    ? [...plano.historicoConclusoesTratamento]
    : [];
  const ultimo = historicoConclusoes[historicoConclusoes.length - 1];
  if (conclusaoCompativel(ultimo, anterior.conclusaoTratamento)) {
    historicoConclusoes = historicoConclusoes.slice(0, -1);
  }

  const planoRestaurado: PlanoTerapeutico = {
    metas: anterior.metas || plano?.metas || {},
    startDate: anterior.startDate as Date | undefined,
    dataInicioTratamento: anterior.dataInicioTratamento as Date | undefined,
    injectionDayOfWeek: anterior.injectionDayOfWeek,
    numeroSemanasTratamento: anterior.numeroSemanasTratamento,
    semanaInicioCiclo: anterior.semanaInicioCiclo ?? 1,
    currentDoseMg: anterior.currentDoseMg,
    lastDoseChangeAt: anterior.lastDoseChangeAt as Date | undefined,
    nextReviewDate: anterior.nextReviewDate as Date | undefined,
    titrationStatus: anterior.titrationStatus,
    titrationNotes: anterior.titrationNotes,
    esquemaDosesCustomizado: anterior.esquemaDosesCustomizado,
    semanasCanceladas: anterior.semanasCanceladas,
    datasAplicacaoIndividuais: anterior.datasAplicacaoIndividuais,
    doseAtual: anterior.doseAtual,
    conclusaoTratamento: anterior.conclusaoTratamento,
    ...(plano?.injetaveisAplicacoes ? { injetaveisAplicacoes: plano.injetaveisAplicacoes } : {}),
    ...(historico.length > 0 ? { historicoProtocolosTirzepatida: historico } : {}),
    ...(historicoConclusoes.length > 0
      ? { historicoConclusoesTratamento: historicoConclusoes }
      : {}),
  };

  return {
    ...paciente,
    statusTratamento: 'concluido',
    evolucaoSeguimento: evolucaoMantida,
    alertas,
    planoTerapeutico: planoRestaurado,
  };
}

export function mensagemConfirmacaoApagarProtocolo(paciente: PacienteCompleto): string {
  const historico = paciente.planoTerapeutico?.historicoProtocolosTirzepatida || [];
  const indiceAtivo = historico.length + 1;
  const inicio = semanaInicioCicloDoPlano(paciente.planoTerapeutico);
  const nRegistros = (paciente.evolucaoSeguimento || []).filter(
    (e) => weekIndexSeguimento(e) >= inicio
  ).length;
  const registros =
    nRegistros > 0
      ? `${nRegistros} registro(s) semanal(is) deste protocolo`
      : 'os registros semanais deste protocolo (se houver)';

  if (historico.length > 0) {
    const anterior = historico[historico.length - 1];
    const indiceAnterior = anterior.indice || historico.length;
    return (
      `Apagar o Protocolo ${String(indiceAtivo).padStart(2, '0')}?\n\n` +
      `O paciente volta ao Protocolo ${String(indiceAnterior).padStart(2, '0')}, com status Concluído.\n\n` +
      `Isso remove ${registros}.\n\n` +
      `Os lembretes de aplicação do WhatsApp deixam de ser enviados.\n\n` +
      `Esta ação não pode ser desfeita.`
    );
  }

  return (
    `Deseja realmente apagar o plano terapêutico deste paciente?\n\n` +
    `Isso remove a data de início, as doses/semanas do plano e ${registros}.\n\n` +
    `Os lembretes de aplicação do WhatsApp deixam de ser enviados.\n\n` +
    `O paciente perderá esses registros. Esta ação não pode ser desfeita.`
  );
}

export function montarPacienteDoProtocoloArquivado(
  paciente: PacienteCompleto,
  snap: HistoricoProtocoloTirzepatida
): PacienteCompleto {
  return {
    ...paciente,
    planoTerapeutico: {
      metas: snap.metas || paciente.planoTerapeutico?.metas || {},
      startDate: snap.startDate as Date | undefined,
      dataInicioTratamento: snap.dataInicioTratamento as Date | undefined,
      injectionDayOfWeek: snap.injectionDayOfWeek,
      numeroSemanasTratamento: snap.numeroSemanasTratamento,
      semanaInicioCiclo: snap.semanaInicioCiclo ?? 1,
      currentDoseMg: snap.currentDoseMg,
      lastDoseChangeAt: snap.lastDoseChangeAt as Date | undefined,
      nextReviewDate: snap.nextReviewDate as Date | undefined,
      titrationStatus: snap.titrationStatus,
      titrationNotes: snap.titrationNotes,
      esquemaDosesCustomizado: snap.esquemaDosesCustomizado,
      semanasCanceladas: snap.semanasCanceladas,
      datasAplicacaoIndividuais: snap.datasAplicacaoIndividuais,
      doseAtual: snap.doseAtual,
      conclusaoTratamento: snap.conclusaoTratamento,
      injetaveisAplicacoes: paciente.planoTerapeutico?.injetaveisAplicacoes,
    },
  };
}
