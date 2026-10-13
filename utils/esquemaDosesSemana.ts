import type { PacienteCompleto, PlanoTerapeutico, SeguimentoSemanal } from '@/types/obesidade';
import {
  atualizarNumeroSemanasDoPlano,
  dataGradeSemanal,
  dataPrevistaConclusaoComoEsquema,
  injectionDayKeyFromLocalDate,
  normalizarDatasAplicacaoIndividuaisParaFirestore,
  primeiraDoseDoPlano,
  semanaFimAplicacoesDoPlano,
  semanaIndexConclusao,
  semanaInicioCicloDoPlano,
  ultimaSemanaNaoCancelada,
  ymdLocal,
} from '@/utils/datasAplicacaoSemanaPlano';
import { limiteMinimoNumeroSemanasTratamento } from '@/utils/numeroSemanasTratamento';
import {
  calcularDoseTitulacaoMg,
  DOSE_INICIAL_PADRAO_MG,
} from '@/lib/tirzepatida/doseTitulacao';
import {
  contaComoDoseAplicada,
  dataRealAplicacaoSeguimento,
  doseMgAplicada,
  localPlanejadoParaSemana,
  registroEvolucaoPorSemana,
  semanaIndexFromRegistro,
} from '@/utils/evolucaoAplicacaoHelpers';

/** Campos do formulário mobile “Definir/Editar Plano Terapêutico”. */
export type PlanoMobileFormSlice = {
  startDate: string;
  injectionDayOfWeek?: string;
  numeroSemanasTratamento: string;
  currentDoseMg: string;
};

/** Une paciente + formulário mobile para o esquema usar as mesmas regras do desktop. */
export function mergePacienteComPlanoMobileForm(
  paciente: PacienteCompleto,
  mobile: PlanoMobileFormSlice
): PacienteCompleto | null {
  const raw = mobile.startDate?.trim();
  if (!raw) return null;
  const [y, m, d] = raw.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

  const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const nSem = parseInt(mobile.numeroSemanasTratamento, 10);
  const doseNum = parseFloat(mobile.currentDoseMg);
  const planoBase = paciente.planoTerapeutico;
  const metas = planoBase?.metas ?? {};

  return {
    ...paciente,
    planoTerapeutico: {
      ...planoBase,
      metas,
      startDate,
      dataInicioTratamento: startDate,
      injectionDayOfWeek:
        (mobile.injectionDayOfWeek as PlanoTerapeutico['injectionDayOfWeek']) ||
        (injectionDayKeyFromLocalDate(startDate) as PlanoTerapeutico['injectionDayOfWeek']),
      numeroSemanasTratamento: Number.isFinite(nSem) && nSem >= 1 ? nSem : 18,
      currentDoseMg: (Number.isFinite(doseNum) ? doseNum : DOSE_INICIAL_PADRAO_MG) as PlanoTerapeutico['currentDoseMg'],
      esquemaDosesCustomizado: planoBase?.esquemaDosesCustomizado,
      semanasCanceladas: planoBase?.semanasCanceladas,
      datasAplicacaoIndividuais: planoBase?.datasAplicacaoIndividuais,
    },
  };
}

export type SemanaEsquemaItem = {
  semana: number;
  data: Date;
  dataExibicao: Date;
  doseAutomatica: number;
  doseAtual: number;
  doseAplicadaMg?: number;
  doseCustomizada?: number;
  isPassada: boolean;
  isFutura: boolean;
  isCancelada: boolean;
  temDoseAplicada: boolean;
  isConclusao: boolean;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Titulação automática com base nas datas reais aplicadas (weekIndex), sem janela ±N dias. */
export function calcularDoseAutomaticaEsquema(
  plano: PlanoTerapeutico,
  evolucao: SeguimentoSemanal[],
  semanaIndexLocal0: number,
  primeiraDose: Date
): number {
  const inicio = semanaInicioCicloDoPlano(plano);
  const doseInicial = plano.currentDoseMg || 2.5;
  let semanasDesdeUltimoCiclo = semanaIndexLocal0;

  for (let s = 0; s < semanaIndexLocal0; s++) {
    const semanaNum = inicio + s;
    const dataPrevista = dataGradeSemanal(primeiraDose, semanaNum, inicio);
    const registro = registroEvolucaoPorSemana(evolucao, semanaNum);
    if (!registro || !contaComoDoseAplicada(registro)) continue;

    const dataReal = dataRealAplicacaoSeguimento(registro);
    if (!dataReal) continue;

    const diffDias =
      (startOfDay(dataReal).getTime() - startOfDay(dataPrevista).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias >= 4) {
      semanasDesdeUltimoCiclo = semanaIndexLocal0 - s - 1;
      break;
    }
  }

  return calcularDoseTitulacaoMg(doseInicial, semanasDesdeUltimoCiclo);
}

export function buildSemanasEsquemaDoses(paciente: PacienteCompleto): {
  semanas: SemanaEsquemaItem[];
  totalMiligramas: number;
  primeiraDose: Date;
} | null {
  const plano = paciente.planoTerapeutico;
  if (!plano) return null;

  const primeiraDose = primeiraDoseDoPlano(plano);
  if (!primeiraDose) return null;

  const nSemVal = Number(plano.numeroSemanasTratamento);
  const numeroSemanas =
    Number.isFinite(nSemVal) && nSemVal >= 1 ? Math.min(200, Math.floor(nSemVal)) : 0;
  if (numeroSemanas === 0) return null;

  const hoje = startOfDay(new Date());
  const evolucao = paciente.evolucaoSeguimento || [];
  const datasAplicacaoIndividuais = plano.datasAplicacaoIndividuais || {};
  const semanasCanceladas = plano.semanasCanceladas || [];
  const semanas: SemanaEsquemaItem[] = [];
  const inicio = semanaInicioCicloDoPlano(plano);
  const fim = semanaFimAplicacoesDoPlano(plano);

  for (let semanaNum = inicio; semanaNum <= fim; semanaNum++) {
    const semanaLocal0 = semanaNum - inicio;
    const dataDose = dataGradeSemanal(primeiraDose, semanaNum, inicio);
    const registro = registroEvolucaoPorSemana(evolucao, semanaNum);
    const temDoseAplicada = contaComoDoseAplicada(registro);

    const doseAutomatica = calcularDoseAutomaticaEsquema(plano, evolucao, semanaLocal0, primeiraDose);
    const doseCustomizada = plano.esquemaDosesCustomizado?.[semanaNum];
    const doseAplicadaMg = temDoseAplicada ? doseMgAplicada(registro) : undefined;
    /** Fonte única para exibição: esquema (customizado ou titulação automática), nunca dose gravada só na evolução. */
    const doseAtual = doseCustomizada != null ? doseCustomizada : doseAutomatica;

    let dataExibicao = dataDose;
    const dataReal = temDoseAplicada ? dataRealAplicacaoSeguimento(registro) : null;
    if (dataReal) {
      dataExibicao = startOfDay(dataReal);
    } else if (datasAplicacaoIndividuais[semanaNum]) {
      try {
        const [y, m, d] = String(datasAplicacaoIndividuais[semanaNum]).split('-').map(Number);
        const parsed = new Date(y, m - 1, d);
        if (!isNaN(parsed.getTime())) dataExibicao = startOfDay(parsed);
      } catch {
        /* grade */
      }
    }

    semanas.push({
      semana: semanaNum,
      data: dataDose,
      dataExibicao,
      doseAutomatica,
      doseAtual,
      doseAplicadaMg,
      doseCustomizada: doseCustomizada ?? undefined,
      isPassada: startOfDay(dataExibicao) < hoje,
      isFutura: startOfDay(dataExibicao) >= hoje,
      isCancelada: semanasCanceladas.includes(semanaNum),
      temDoseAplicada,
      isConclusao: false,
    });
  }

  const dataConclusao = dataPrevistaConclusaoComoEsquema(plano, evolucao);
  const semConclNum = semanaIndexConclusao(plano);
  const registroConclusao = registroEvolucaoPorSemana(evolucao, semConclNum);
  let dataExibicaoConclusao = dataConclusao;
  const dataRealConcl = dataRealAplicacaoSeguimento(registroConclusao);
  if (dataRealConcl) dataExibicaoConclusao = startOfDay(dataRealConcl);

  semanas.push({
    semana: semConclNum,
    data: dataConclusao,
    dataExibicao: dataExibicaoConclusao,
    doseAutomatica: 0,
    doseAtual: 0,
    isPassada: startOfDay(dataExibicaoConclusao) < hoje,
    isFutura: startOfDay(dataExibicaoConclusao) >= hoje,
    isCancelada: false,
    temDoseAplicada: !!registroConclusao?.dataRegistro,
    isConclusao: true,
  });

  const totalMiligramas = semanas
    .filter((item) => !item.isCancelada && !item.isConclusao)
    .reduce((total, item) => total + (item.doseAtual || 0), 0);

  return { semanas, totalMiligramas, primeiraDose };
}

/**
 * Altera o número de semanas do plano e sincroniza datas, conclusão e doses
 * customizadas das semanas que saíram do tratamento.
 */
export function pacienteComNumeroSemanasAtualizado(
  paciente: PacienteCompleto,
  numeroSemanas: number
): PacienteCompleto {
  const min = limiteMinimoNumeroSemanasTratamento(paciente);
  const n = Math.min(200, Math.max(min, Math.floor(numeroSemanas)));
  const plano = paciente.planoTerapeutico;
  if (!plano) {
    return {
      ...paciente,
      planoTerapeutico: { metas: {}, numeroSemanasTratamento: n },
    };
  }

  const built = buildSemanasEsquemaDoses(paciente);
  const esquema = { ...(plano.esquemaDosesCustomizado || {}) };
  if (built) {
    for (const item of built.semanas) {
      if (item.isConclusao || item.isCancelada) continue;
      if (item.temDoseAplicada && item.doseAtual > 0) {
        esquema[item.semana] = item.doseAtual;
      }
    }
  }
  for (const k of Object.keys(esquema)) {
    const num = Number(k);
    if (!Number.isFinite(num)) continue;
    const inicioEsquema = semanaInicioCicloDoPlano(plano);
    const fimEsquema = inicioEsquema + n - 1;
    if (num < inicioEsquema || num > fimEsquema) delete esquema[num];
  }

  const planoAtualizado = atualizarNumeroSemanasDoPlano(plano, n, paciente.evolucaoSeguimento);

  return {
    ...paciente,
    planoTerapeutico: {
      ...plano,
      ...planoAtualizado,
      esquemaDosesCustomizado: Object.keys(esquema).length > 0 ? esquema : undefined,
    },
  };
}

/** Atualiza `datasAplicacaoIndividuais` com YYYY-MM-DD reais das doses aplicadas. */
export function sincronizarDatasAplicacaoIndividuaisComEvolucao(
  plano: PlanoTerapeutico,
  evolucao: SeguimentoSemanal[]
): Record<string, string> | undefined {
  return normalizarDatasAplicacaoIndividuaisParaFirestore(plano, evolucao);
}

/** Dose canônica (mg) da semana conforme o Esquema de Doses por Semana. */
export function obterDoseMgSemanaPaciente(
  paciente: PacienteCompleto,
  semanaNum: number
): number {
  const built = buildSemanasEsquemaDoses(paciente);
  if (!built || semanaNum < 1) return 0;
  const item = built.semanas.find((s) => s.semana === semanaNum && !s.isConclusao);
  return item?.doseAtual ?? 0;
}

function isAdesaoPerdidaRegistro(r: SeguimentoSemanal | null | undefined): boolean {
  return !!(r?.adherence === 'MISSED' || r?.adesao === 'esquecida');
}

/**
 * Atualiza `esquemaDosesCustomizado` e espelha a mesma mg no registro de evolução da semana (se existir).
 * Usar ao salvar/editar seguimento ou ao alterar dose no esquema.
 */
export function pacienteComDoseMgSemanaAtualizada(
  paciente: PacienteCompleto,
  semanaNum: number,
  doseMg: number
): PacienteCompleto {
  const plano = paciente.planoTerapeutico;
  if (!plano || semanaNum < 1) return paciente;

  const primeira = primeiraDoseDoPlano(plano);
  const evolucao = paciente.evolucaoSeguimento || [];
  const inicio = semanaInicioCicloDoPlano(plano);
  const doseAutomatica =
    primeira != null
      ? calcularDoseAutomaticaEsquema(plano, evolucao, Math.max(0, semanaNum - inicio), primeira)
      : doseMg;

  const esquema = { ...(plano.esquemaDosesCustomizado || {}) };
  if (doseMg === doseAutomatica) delete esquema[semanaNum];
  else esquema[semanaNum] = doseMg;

  const evolucaoAtualizada = evolucao.map((e) => {
    if (semanaIndexFromRegistro(e) !== semanaNum || isAdesaoPerdidaRegistro(e)) return e;
    const da = e.doseAplicada;
    if (!da && doseMg <= 0) return e;
    const dataBase = da?.data ?? e.dataRegistro ?? new Date();
    return {
      ...e,
      doseAplicada: {
        quantidade: doseMg,
        data: dataBase,
        horario:
          da?.horario ||
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    };
  });

  return {
    ...paciente,
    planoTerapeutico: {
      ...plano,
      esquemaDosesCustomizado:
        Object.keys(esquema).length > 0 ? esquema : undefined,
    },
    evolucaoSeguimento: evolucaoAtualizada,
  };
}

export type AplicacaoPlanejadaEsquema = {
  data: Date;
  semana: number;
  dose: number;
  localAplicacao: 'abdome' | 'coxa' | 'braco';
};

/** Aplicações planejadas no período — doses e datas alinhadas ao Esquema de Doses por Semana. */
export function listarAplicacoesPlanejadasNoPeriodo(
  paciente: PacienteCompleto,
  mesInicio: Date,
  mesFim: Date
): AplicacaoPlanejadaEsquema[] {
  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) return [];

  const evolucao = paciente.evolucaoSeguimento || [];
  const locais = ['abdome', 'coxa', 'braco'] as const;
  const inicio = startOfDay(mesInicio);
  const fim = startOfDay(mesFim);
  fim.setHours(23, 59, 59, 999);
  const aplicacoes: AplicacaoPlanejadaEsquema[] = [];

  for (const item of built.semanas) {
    if (item.isConclusao || item.isCancelada) continue;
    const dataDose = startOfDay(item.dataExibicao);
    if (dataDose < inicio || dataDose > fim) continue;

    const dataSemanaAnterior = new Date(dataDose);
    dataSemanaAnterior.setDate(dataDose.getDate() - 7);
    const aplicacaoSemanaAnterior = evolucao.find((e) => {
      const dr = dataRealAplicacaoSeguimento(e);
      if (!dr) return false;
      const diffDias =
        Math.abs((dr.getTime() - dataSemanaAnterior.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1;
    });

    let ultimoLocal = aplicacaoSemanaAnterior?.localAplicacao;
    if (!ultimoLocal) {
      const ultima = evolucao
        .filter((e) => {
          const dr = dataRealAplicacaoSeguimento(e);
          return dr && dr < dataDose;
        })
        .sort((a, b) => {
          const da = dataRealAplicacaoSeguimento(a)!.getTime();
          const db = dataRealAplicacaoSeguimento(b)!.getTime();
          return db - da;
        })[0];
      ultimoLocal = ultima?.localAplicacao;
    }

    let localIndex = 0;
    if (ultimoLocal) {
      const idx = locais.indexOf(ultimoLocal as (typeof locais)[number]);
      if (idx >= 0) localIndex = (idx + 1) % locais.length;
    } else {
      localIndex = (item.semana - 1) % 3;
    }

    aplicacoes.push({
      data: dataDose,
      semana: item.semana,
      dose: item.doseAtual,
      localAplicacao: locais[localIndex] ?? localPlanejadoParaSemana(item.semana),
    });
  }

  return aplicacoes;
}

export type AplicacaoEsquemaComConclusao = {
  data: Date;
  semana: number;
  dose: number;
  localAplicacao: string;
};

/** Semanas do ciclo (incluindo conclusão) — mesma fonte da aba Aplicações. */
export function listarAplicacoesEsquemaComConclusao(
  paciente: PacienteCompleto
): AplicacaoEsquemaComConclusao[] {
  const pt = paciente.planoTerapeutico;
  const primeira = pt ? primeiraDoseDoPlano(pt) : null;
  if (!pt || !primeira) return [];

  const nSem = Number(pt.numeroSemanasTratamento) || 18;
  const inicioRange = new Date(primeira.getFullYear() - 1, primeira.getMonth(), primeira.getDate());
  const fimRange = new Date(primeira);
  fimRange.setDate(fimRange.getDate() + nSem * 7 + 400);

  const lista: AplicacaoEsquemaComConclusao[] = listarAplicacoesPlanejadasNoPeriodo(
    paciente,
    inicioRange,
    fimRange
  ).map((a) => ({ ...a, localAplicacao: a.localAplicacao }));

  const semanaConclusaoIdx = semanaIndexConclusao(pt);
  if (!lista.some((a) => a.semana === semanaConclusaoIdx)) {
    const ultSem = ultimaSemanaNaoCancelada(pt);
    const rawDose = pt.esquemaDosesCustomizado?.[ultSem];
    const doseNum =
      typeof rawDose === 'number' && !Number.isNaN(rawDose)
        ? rawDose
        : Number(pt.currentDoseMg) || 0;
    lista.push({
      data: dataPrevistaConclusaoComoEsquema(pt, paciente.evolucaoSeguimento || []),
      semana: semanaConclusaoIdx,
      dose: doseNum,
      localAplicacao: '—',
    });
  }

  lista.sort((a, b) => b.data.getTime() - a.data.getTime());
  return lista;
}

/** Mesmo critério do calendário MetaAdmin: compara ano/mês/dia civil da data da aplicação. */
export function aplicacaoDataNoDiaCalendario(dataAplicacao: Date, dateKey: string): boolean {
  return ymdLocal(dataAplicacao) === dateKey;
}

/**
 * Aplicações de um dia — mesma fonte do calendário (`listarAplicacoesPlanejadasNoPeriodo` / Esquema de Doses).
 * `dateKey`: YYYY-MM-DD (no cron, use a data de Brasília do dia).
 */
export function listarAplicacoesPlanejadasNoDia(
  paciente: PacienteCompleto,
  dateKey: string,
): AplicacaoPlanejadaEsquema[] {
  const match = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return [];

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const mesInicio = new Date(y, m - 1, d, 0, 0, 0, 0);
  const mesFim = new Date(y, m - 1, d, 23, 59, 59, 999);

  return listarAplicacoesPlanejadasNoPeriodo(paciente, mesInicio, mesFim).filter((aplicacao) =>
    aplicacaoDataNoDiaCalendario(aplicacao.data, dateKey),
  );
}
