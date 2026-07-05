import type { PacienteCompleto, PlanoTerapeutico, SeguimentoSemanal } from '@/types/obesidade';
import {
  dataGradeSemanal,
  dataPrevistaConclusaoComoEsquema,
  injectionDayKeyFromLocalDate,
  normalizarDatasAplicacaoIndividuaisParaFirestore,
  primeiraDoseDoPlano,
  semanaIndexConclusao,
  ymdLocal,
} from '@/utils/datasAplicacaoSemanaPlano';
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
  semanaIndex: number,
  primeiraDose: Date
): number {
  const doseInicial = plano.currentDoseMg || 2.5;
  let semanasDesdeUltimoCiclo = semanaIndex;

  for (let s = 0; s < semanaIndex; s++) {
    const semanaNum = s + 1;
    const dataPrevista = dataGradeSemanal(primeiraDose, semanaNum);
    const registro = registroEvolucaoPorSemana(evolucao, semanaNum);
    if (!registro || !contaComoDoseAplicada(registro)) continue;

    const dataReal = dataRealAplicacaoSeguimento(registro);
    if (!dataReal) continue;

    const diffDias =
      (startOfDay(dataReal).getTime() - startOfDay(dataPrevista).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias >= 4) {
      semanasDesdeUltimoCiclo = semanaIndex - s - 1;
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

  for (let s = 0; s < numeroSemanas; s++) {
    const semanaNum = s + 1;
    const dataDose = dataGradeSemanal(primeiraDose, semanaNum);
    const registro = registroEvolucaoPorSemana(evolucao, semanaNum);
    const temDoseAplicada = contaComoDoseAplicada(registro);

    const doseAutomatica = calcularDoseAutomaticaEsquema(plano, evolucao, s, primeiraDose);
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
  const doseAutomatica =
    primeira != null
      ? calcularDoseAutomaticaEsquema(plano, evolucao, semanaNum - 1, primeira)
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
