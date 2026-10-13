import { calcularDoseTitulacaoMg, DOSE_INICIAL_PADRAO_MG } from '@/lib/tirzepatida/doseTitulacao';
import { resolveMetaAbdominalCmLoss, resolveMetaPesoKgLoss } from '@/lib/paciente/metaProgresso';
import type { PacienteCompleto } from '@/types/obesidade';
import type { MetaAdminDepoimentoSlide } from '@/utils/conclusaoTratamentoHistorico';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import { montarPacienteDoProtocoloArquivado } from '@/utils/tirzepatidaNovoProtocolo';
import { protocoloPorIndice, type ProtocoloTirzepatidaResumo } from '@/utils/tirzepatidaProtocoloDisplay';

/** Mesmo formato do modal "Resultado do tratamento" na home (estatísticas) e no metaadmin. */
export type DepoimentoResultadoModalData = {
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
  estrelas: number;
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
  comprimentoAbdominalInicialCm: number | null;
  comprimentoAbdominalAtualCm: number | null;
  perdaAbdominalCm: number | null;
  perdaPercentualAbdominal: number | null;
  /** `peso` pode ser null nas semanas só com dose (igual à API de depoimentos). */
  evolucao: {
    weekIndex: number;
    peso: number | null;
    doseMg: number;
    foiAplicado?: boolean;
    isConclusao?: boolean;
    /** Usado só no rótulo acima da barra. A linha do gráfico continua no peso. */
    circunferenciaCm?: number | null;
  }[];
  /** Ciclo exibido no gráfico (1 = protocolo inicial). Semanas do eixo são relativas a este ciclo. */
  protocoloIndice?: number;
  metaPesoKgLoss?: number | null;
  metaAbdominalCmLoss?: number | null;
};

type PontoEvolucaoGrafico = DepoimentoResultadoModalData['evolucao'][number];

/**
 * A conclusão entra como último ponto do eixo. Se a última coluna já é essa
 * medição (dose zero e o mesmo peso), só marca; senão acrescenta o ponto.
 */
function anexarPontoConclusao(
  evolucao: PontoEvolucaoGrafico[],
  conclusaoPeso: number | null,
  conclusaoCirc?: number | null
): PontoEvolucaoGrafico[] {
  if (conclusaoPeso == null || !(conclusaoPeso > 0) || evolucao.length === 0) return evolucao;
  const circ = conclusaoCirc != null && conclusaoCirc > 0 ? conclusaoCirc : null;
  const ultimo = evolucao[evolucao.length - 1];
  const ultimoJaEhConclusao =
    ultimo.doseMg === 0 && ultimo.peso != null && Math.abs(ultimo.peso - conclusaoPeso) < 0.05;
  if (ultimoJaEhConclusao) {
    const marcado = evolucao.slice();
    marcado[marcado.length - 1] = {
      ...ultimo,
      foiAplicado: false,
      isConclusao: true,
      circunferenciaCm: circ ?? ultimo.circunferenciaCm ?? null,
    };
    return marcado;
  }
  return [
    ...evolucao,
    {
      weekIndex: ultimo.weekIndex + 1,
      peso: conclusaoPeso,
      doseMg: 0,
      foiAplicado: false,
      isConclusao: true,
      circunferenciaCm: circ,
    },
  ];
}

function toDateDepoimentoMeta(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function calcularIdadeDepoimentoMeta(dataNasc: unknown): number | null {
  const dataNascimento = toDateDepoimentoMeta(dataNasc);
  if (!dataNascimento) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNasc = dataNascimento.getMonth();
  const diaNasc = dataNascimento.getDate();
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
  return idade > 0 ? idade : null;
}

function parseDoseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type PlanoComConclusao = {
  numeroSemanasTratamento?: number;
  doseInicialMg?: number;
  currentDoseMg?: number;
  esquemaDosesCustomizado?: { [semana: number]: number } | Record<string, number>;
  semanasCanceladas?: number[];
  startDate?: unknown;
  dataInicioTratamento?: unknown;
  injectionDayOfWeek?: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
  conclusaoTratamento?: { pesoFinalKg?: number; circunferenciaAbdominalFinalCm?: number };
};

function obterPrimeiraDosePlano(plano?: PlanoComConclusao): Date | null {
  if (!plano) return null;
  const dataBruta = plano.startDate ?? plano.dataInicioTratamento;
  const base = toDateDepoimentoMeta(dataBruta);
  if (!base) return null;
  const data = new Date(base);
  const dia = (plano.injectionDayOfWeek || '').toString().toLowerCase();
  const mapaDias: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  if (dia in mapaDias) {
    const alvo = mapaDias[dia];
    const atual = data.getDay();
    const diff = (alvo - atual + 7) % 7;
    data.setDate(data.getDate() + diff);
  }
  return data;
}

function calcularDosePlanejadaSemana({
  semana,
  plano,
  evolucaoRaw,
  primeiraDose,
}: {
  semana: number;
  plano?: PlanoComConclusao;
  evolucaoRaw: Record<string, unknown>[];
  primeiraDose: Date | null;
}): number {
  const doseInicial = Number(plano?.currentDoseMg ?? plano?.doseInicialMg ?? DOSE_INICIAL_PADRAO_MG) || DOSE_INICIAL_PADRAO_MG;
  const customRaw = (plano?.esquemaDosesCustomizado as Record<string, unknown> | undefined)?.[String(semana)];
  const customDose = parseDoseNumber(customRaw);
  if (customDose != null && customDose > 0) return customDose;

  if (!primeiraDose) return doseInicial;
  const semanaIndex = Math.max(0, semana - 1);
  let semanasDesdeUltimoCiclo = semanaIndex;

  for (let s = 0; s < semanaIndex; s++) {
    const dataPrevista = new Date(primeiraDose);
    dataPrevista.setHours(0, 0, 0, 0);
    dataPrevista.setDate(dataPrevista.getDate() + s * 7);

    const registro = evolucaoRaw.find((e) => {
      const dataRegistro = toDateDepoimentoMeta((e as { dataRegistro?: unknown }).dataRegistro);
      if (!dataRegistro) return false;
      dataRegistro.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1;
    });

    const dataRegistro = registro
      ? toDateDepoimentoMeta((registro as { dataRegistro?: unknown }).dataRegistro)
      : null;
    if (!dataRegistro) continue;
    dataRegistro.setHours(0, 0, 0, 0);
    const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias >= 4) {
      semanasDesdeUltimoCiclo = semanaIndex - s - 1;
      break;
    }
  }

  return calcularDoseTitulacaoMg(doseInicial, semanasDesdeUltimoCiclo);
}

/**
 * Mg de cada semana relativa do protocolo exibido.
 * Mesma fonte do Esquema de Doses no plano terapêutico (customizado ou titulação do plano).
 * Semanas canceladas ficam em 0. Retorna null se o plano ainda não tem data de início.
 */
function dosesMgPlanoExibido(
  paciente: PacienteCompleto,
  proto: ProtocoloTirzepatidaResumo
): number[] | null {
  const historico = paciente.planoTerapeutico?.historicoProtocolosTirzepatida || [];
  let fonte: PacienteCompleto = paciente;
  if (!proto.ativo) {
    const snap = historico.find((h) => Number(h.indice) === proto.indice);
    if (!snap) return null;
    fonte = montarPacienteDoProtocoloArquivado(paciente, snap);
  }
  const built = buildSemanasEsquemaDoses(fonte);
  if (!built) return null;
  return built.semanas
    .filter((item) => !item.isConclusao)
    .map((item) => (item.isCancelada ? 0 : item.doseAtual || 0));
}

/** Alinhado a `app/api/depoimentos-medico/route.ts` para o gráfico e métricas do modal da home. */
export function buildDepoimentoResultadoFromPaciente(
  paciente: PacienteCompleto,
  estrelas: number,
  textoDepoimento: string,
  opts?: { protocoloIndice?: number }
): DepoimentoResultadoModalData {
  const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim() || 'Paciente';
  const cidade = paciente.dadosIdentificacao?.endereco?.cidade?.trim();
  const estado = paciente.dadosIdentificacao?.endereco?.estado?.trim();
  const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : cidade || estado || null;
  const idade = calcularIdadeDepoimentoMeta(paciente.dadosIdentificacao?.dataNascimento);

  const evolucaoRaw = Array.isArray(paciente.evolucaoSeguimento) ? paciente.evolucaoSeguimento : [];
  const evolucaoOrdenadaBase = evolucaoRaw
    .map((p: Record<string, unknown>) => {
      const pesoVal = typeof p.peso === 'number' && (p.peso as number) > 0 ? (p.peso as number) : null;
      const q = (p.doseAplicada as { quantidade?: unknown } | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(q.replace(',', '.')) : 0;
      const adherence = typeof p.adherence === 'string' ? p.adherence : typeof p.adesao === 'string' ? p.adesao : '';
      const missed = String(adherence).toUpperCase() === 'MISSED' || String(adherence).toLowerCase() === 'esquecida';
      const foiAplicado = !missed && Number.isFinite(doseNum) && doseNum > 0;
      return {
        weekIndex: (p.weekIndex as number) ?? (p.numeroSemana as number) ?? 0,
        peso: pesoVal,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
        foiAplicado,
        circunferenciaAbdominal:
          typeof p.circunferenciaAbdominal === 'number' && (p.circunferenciaAbdominal as number) > 0
            ? (p.circunferenciaAbdominal as number)
            : null,
      };
    })
    .filter((p) => p.weekIndex > 0)
    .sort((a, b) => a.weekIndex - b.weekIndex);

  const proto = protocoloPorIndice(paciente, opts?.protocoloIndice);
  const inicioCiclo = proto.semanaInicioCiclo;
  const numeroSemanas = proto.numeroSemanasTratamento;
  const planoCiclo: PlanoComConclusao = {
    numeroSemanasTratamento: numeroSemanas,
    currentDoseMg: proto.currentDoseMg,
    esquemaDosesCustomizado: proto.esquemaDosesCustomizado,
    semanasCanceladas: proto.semanasCanceladas,
    startDate: proto.startDate,
    dataInicioTratamento: proto.dataInicioTratamento,
    injectionDayOfWeek: proto.injectionDayOfWeek,
    conclusaoTratamento: proto.conclusaoTratamento as PlanoComConclusao['conclusaoTratamento'],
  };
  const primeiraDosePlano = obterPrimeiraDosePlano(planoCiclo);
  const dosesPlano = dosesMgPlanoExibido(paciente, proto);
  const semanasCanceladas = new Set(
    Array.isArray(proto.semanasCanceladas)
      ? proto.semanasCanceladas.map((w) => Number(w)).filter((w) => Number.isFinite(w) && w > 0)
      : []
  );
  const evolucaoOrdenada =
    numeroSemanas > 0
      ? Array.from({ length: numeroSemanas }, (_, idx) => {
          const semanaGlobal = inicioCiclo + idx;
          const semanaRelativa = idx + 1;
          const atual = evolucaoOrdenadaBase.find((p) => p.weekIndex === semanaGlobal);
          const esquema = proto.esquemaDosesCustomizado as Record<string | number, unknown> | undefined;
          const customRaw = esquema?.[semanaGlobal] ?? esquema?.[String(semanaGlobal)];
          const customDose = parseDoseNumber(customRaw);
          const doseDoPlano = dosesPlano?.[idx];
          const dosePlanejada =
            doseDoPlano != null
              ? doseDoPlano
              : semanasCanceladas.has(semanaGlobal)
                ? 0
                : customDose != null && customDose > 0
                  ? customDose
                  : calcularDosePlanejadaSemana({
                      semana: semanaRelativa,
                      plano: { ...planoCiclo, esquemaDosesCustomizado: undefined },
                      evolucaoRaw,
                      primeiraDose: primeiraDosePlano,
                    });
          if (atual) {
            return {
              ...atual,
              weekIndex: semanaRelativa,
              doseMg: dosePlanejada,
            };
          }
          return {
            weekIndex: semanaRelativa,
            peso: null,
            doseMg: dosePlanejada,
            foiAplicado: false,
            circunferenciaAbdominal: null,
          };
        })
      : evolucaoOrdenadaBase.map((p) => ({
          ...p,
          weekIndex: p.weekIndex - inicioCiclo + 1,
        }));

  const medidas = paciente.dadosClinicos?.medidasIniciais;
  const registroSemana1Ciclo = evolucaoOrdenadaBase.find((p) => p.weekIndex === inicioCiclo);
  const primeiroPesoNoCiclo =
    registroSemana1Ciclo?.peso ??
    evolucaoOrdenada.find((p) => p.peso != null && p.peso > 0)?.peso ??
    null;
  const ultimoPesoValido = [...evolucaoOrdenada].reverse().find((p) => p.peso != null && p.peso > 0)?.peso ?? null;
  const conclusaoPeso =
    typeof proto.conclusaoTratamento?.pesoFinalKg === 'number'
      ? (proto.conclusaoTratamento.pesoFinalKg as number)
      : null;

  let pesoInicialKg: number | null = primeiroPesoNoCiclo;
  if (pesoInicialKg == null && inicioCiclo === 1 && typeof medidas?.peso === 'number') {
    pesoInicialKg = medidas.peso;
  }
  let pesoAtualKg: number | null = ultimoPesoValido ?? conclusaoPeso;
  if (pesoAtualKg == null && inicioCiclo === 1) pesoAtualKg = pesoInicialKg;

  const primeiraCircNoCiclo =
    registroSemana1Ciclo?.circunferenciaAbdominal ??
    evolucaoOrdenada.find((p) => p.circunferenciaAbdominal != null)?.circunferenciaAbdominal ??
    null;
  let comprimentoAbdominalInicialCm: number | null = primeiraCircNoCiclo;
  if (
    comprimentoAbdominalInicialCm == null &&
    inicioCiclo === 1 &&
    typeof medidas?.circunferenciaAbdominal === 'number'
  ) {
    comprimentoAbdominalInicialCm = medidas.circunferenciaAbdominal;
  }
  const ultimaCirc =
    [...evolucaoOrdenada].reverse().find((p) => p.circunferenciaAbdominal != null)?.circunferenciaAbdominal ??
    null;
  const conclusaoCirc = proto.conclusaoTratamento?.circunferenciaAbdominalFinalCm;
  const comprimentoAbdominalAtualCm =
    ultimaCirc ?? (typeof conclusaoCirc === 'number' && conclusaoCirc > 0 ? conclusaoCirc : null);

  let perdaTotalKg: number | null = null;
  let perdaPercentual: number | null = null;
  if (pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }
  const perdaAbdominalCm =
    comprimentoAbdominalInicialCm != null && comprimentoAbdominalAtualCm != null
      ? comprimentoAbdominalInicialCm - comprimentoAbdominalAtualCm
      : null;
  const perdaPercentualAbdominal =
    perdaAbdominalCm != null && comprimentoAbdominalInicialCm != null && comprimentoAbdominalInicialCm > 0
      ? (perdaAbdominalCm / comprimentoAbdominalInicialCm) * 100
      : null;

  const pacienteMetas = {
    ...paciente,
    planoTerapeutico: { ...(paciente.planoTerapeutico || {}), metas: proto.metas || { } },
  } as PacienteCompleto;
  const metaPesoKgLoss =
    pesoInicialKg != null && pesoInicialKg > 0
      ? resolveMetaPesoKgLoss(pacienteMetas, pesoInicialKg)
      : null;
  const metaAbdominalCmLoss = resolveMetaAbdominalCmLoss(pacienteMetas);

  const evolucao = anexarPontoConclusao(
    evolucaoOrdenada.map((p) => ({
      weekIndex: p.weekIndex,
      peso: p.peso,
      doseMg: p.doseMg,
      foiAplicado: p.foiAplicado,
      circunferenciaCm: p.circunferenciaAbdominal,
    })),
    conclusaoPeso,
    typeof conclusaoCirc === 'number' ? conclusaoCirc : null
  );

  return {
    pacienteId: paciente.id,
    nome,
    cidadeEstado,
    idade,
    depoimento: textoDepoimento.trim(),
    estrelas: Math.min(5, Math.max(0, Math.round(estrelas))),
    pesoInicialKg,
    pesoAtualKg,
    perdaTotalKg,
    perdaPercentual,
    comprimentoAbdominalInicialCm,
    comprimentoAbdominalAtualCm,
    perdaAbdominalCm,
    perdaPercentualAbdominal,
    evolucao,
    protocoloIndice: proto.indice,
    metaPesoKgLoss,
    metaAbdominalCmLoss,
  };
}

/** Modal “Resultado” a partir de um slide (atual = evolução do paciente; histórico = snapshot arquivado). */
export function buildDepoimentoResultadoFromDepoimentoSlide(
  paciente: PacienteCompleto,
  slide: MetaAdminDepoimentoSlide,
  estrelasClassificacaoAtual: number
): DepoimentoResultadoModalData {
  if (slide.origem === 'atual') {
    return buildDepoimentoResultadoFromPaciente(paciente, estrelasClassificacaoAtual, slide.texto);
  }
  const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim() || 'Paciente';
  const cidade = paciente.dadosIdentificacao?.endereco?.cidade?.trim();
  const estado = paciente.dadosIdentificacao?.endereco?.estado?.trim();
  const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : cidade || estado || null;
  const idade = calcularIdadeDepoimentoMeta(paciente.dadosIdentificacao?.dataNascimento);

  const evolucao = anexarPontoConclusao(
    slide.evolucaoSnapshot.map((p) => ({
      weekIndex: p.weekIndex,
      peso: p.peso > 0 ? p.peso : null,
      doseMg: p.doseMg,
      foiAplicado: p.doseMg > 0,
    })),
    typeof slide.pesoFinalKg === 'number' ? slide.pesoFinalKg : null
  );

  let pesoInicialKg = slide.pesoInicialKg;
  let pesoAtualKg = slide.pesoAtualKg;
  const comPeso = evolucao.filter((e) => e.peso != null && e.peso > 0);
  if (comPeso.length > 0) {
    pesoInicialKg = pesoInicialKg ?? comPeso[0].peso;
    pesoAtualKg = pesoAtualKg ?? comPeso[comPeso.length - 1].peso;
  }
  if (pesoAtualKg == null && slide.pesoFinalKg != null) {
    pesoAtualKg = slide.pesoFinalKg;
  }
  if (pesoInicialKg == null) {
    const medidas = paciente.dadosClinicos?.medidasIniciais;
    pesoInicialKg = typeof medidas?.peso === 'number' ? medidas.peso : null;
  }

  let perdaTotalKg: number | null = slide.perdaTotalKg;
  let perdaPercentual: number | null = slide.perdaPercentual;
  if (perdaTotalKg == null && pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }

  const estrelasHist = slide.estrelas ?? 0;
  const comprimentoAbdominalInicialCm =
    typeof paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal === 'number'
      ? paciente.dadosClinicos.medidasIniciais.circunferenciaAbdominal
      : null;

  return {
    pacienteId: paciente.id,
    nome,
    cidadeEstado,
    idade,
    depoimento: slide.texto.trim(),
    estrelas: Math.min(5, Math.max(0, Math.round(estrelasHist))),
    pesoInicialKg,
    pesoAtualKg,
    perdaTotalKg,
    perdaPercentual,
    comprimentoAbdominalInicialCm,
    comprimentoAbdominalAtualCm: null,
    perdaAbdominalCm: null,
    perdaPercentualAbdominal: null,
    evolucao,
  };
}
