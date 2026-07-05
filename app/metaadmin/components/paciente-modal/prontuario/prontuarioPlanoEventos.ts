import type { PacienteCompleto, CheckInSemanal, CheckInSemanalScore, MarcoZero } from '@/types/obesidade';
import { buildSemanasEsquemaDoses, type SemanaEsquemaItem } from '@/utils/esquemaDosesSemana';
import { semanaIndexFromRegistro, toDateLocalEvolucao } from '@/utils/evolucaoAplicacaoHelpers';
import { ehRegistroConclusaoSeguimento } from '@/lib/metaadmin/proximoRegistroSeguimento';
import { LOCAL_APLICACAO_DISPLAY, temCheckInSemanalPreenchido } from '@/lib/aplicacao/checkInSemanalResumo';
import { resolveCheckInSemanalScore, calcularVariacoesParaSeguimento } from '@/lib/aplicacao/resolveCheckInSemanalScore';
import { formatarVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import type { CheckInSemanalScoreTimeline, CheckInSemanalTimeline, EventoTimelineMock } from './prontuarioTypes';
const STATUS_APLICACAO_RELEVANTE = new Set([
  'Realizada',
  'Atrasada',
  'Programada para hoje',
  'Conclusão',
  'Cancelada',
]);

function pacienteTemTratamentoIniciado(paciente: PacienteCompleto): boolean {
  const pt = paciente.planoTerapeutico;
  if (!pt) return false;
  if (pt.startDate) return true;
  const status = pt.titrationStatus;
  if (status && status !== 'INICIADO') return true;
  if (pt.historicoDoses && pt.historicoDoses.length > 0) return true;
  if (pt.esquemaDosesCustomizado && Object.keys(pt.esquemaDosesCustomizado).length > 0) return true;
  if ('dataInicioTratamento' in paciente && Boolean((paciente as { dataInicioTratamento?: unknown }).dataInicioTratamento)) {
    return true;
  }
  return false;
}

export function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function parseDataTimeline(dataStr: string, horaStr?: string): number {
  const partes = dataStr.split('/');
  if (partes.length !== 3) return 0;
  const [dd, mm, yyyy] = partes.map(Number);
  if (!dd || !mm || !yyyy) return 0;
  if (horaStr) {
    const [hh, min] = horaStr.split(':').map(Number);
    return new Date(yyyy, mm - 1, dd, hh || 0, min || 0).getTime();
  }
  return new Date(yyyy, mm - 1, dd, 0, 0, 0).getTime();
}

function statusAplicacaoSemana(item: SemanaEsquemaItem): string {
  if (item.isConclusao) return 'Conclusão';
  if (item.temDoseAplicada) return 'Realizada';
  if (item.isCancelada) return 'Cancelada';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataItem = new Date(item.dataExibicao);
  dataItem.setHours(0, 0, 0, 0);
  if (dataItem.getTime() === hoje.getTime()) return 'Programada para hoje';
  if (dataItem < hoje) return 'Atrasada';
  return 'Programada';
}

function checkInParaTimeline(checkIn?: CheckInSemanal): CheckInSemanalTimeline | undefined {
  if (!checkIn || !temCheckInSemanalPreenchido(checkIn)) return undefined;
  return {
    fomeSemana: checkIn.fomeSemana,
    periodoMaisFome: checkIn.periodoMaisFome,
    saciedadeAoComer: checkIn.saciedadeAoComer,
    consumoAgua: checkIn.consumoAgua,
    consumoProteinas: checkIn.consumoProteinas,
    satisfacaoEvolucao: checkIn.satisfacaoEvolucao,
    comentarioSemana: checkIn.comentarioSemana,
  };
}

function localAplicacaoLabel(local?: string): string | undefined {
  if (!local) return undefined;
  return LOCAL_APLICACAO_DISPLAY[local] ?? local;
}

function scoreParaTimeline(
  score?: CheckInSemanalScore,
  semana?: number
): CheckInSemanalScoreTimeline | undefined {
  if (!score || score.score == null) return undefined;
  return {
    score: score.score,
    categoria: score.categoria,
    medalha: score.medalha,
    titulo: score.titulo,
    mensagemPaciente: score.mensagemPaciente,
    fatoresPositivos: score.fatoresPositivos,
    pontosDeAtencao: score.pontosDeAtencao,
    semana: score.semana ?? semana,
  };
}

function tituloComScoreCheckIn(tituloBase: string, score?: CheckInSemanalScoreTimeline): string {
  if (!score) return tituloBase;
  return `Check-in semanal: ${score.titulo} — ${score.score}/100`;
}

function montarDadosAplicacao(opts: {
  semana?: number;
  dose?: string;
  peso?: number;
  cintura?: number;
  localAplicacao?: string;
  checkIn?: CheckInSemanal;
  checkInScore?: CheckInSemanalScore;
  marcoZero?: NonNullable<EventoTimelineMock['dados']>['marcoZero'];
  variacaoPeso?: number | null;
  variacaoCircunferencia?: number | null;
  status: string;
}): EventoTimelineMock['dados'] {
  const checkInSemanal = checkInParaTimeline(opts.checkIn);
  const checkInSemanalScore = scoreParaTimeline(opts.checkInScore, opts.semana);
  const variacaoPesoFmt = formatarVariacaoMedida(opts.variacaoPeso, 'kg');
  const variacaoCircFmt = formatarVariacaoMedida(opts.variacaoCircunferencia, 'cm');
  return {
    medicamento: 'Tirzepatida',
    ...(opts.semana != null ? { semana: opts.semana } : {}),
    ...(opts.dose ? { dose: opts.dose } : {}),
    ...(opts.peso != null ? { peso: `${opts.peso} kg` } : {}),
    ...(opts.cintura != null ? { cintura: `${opts.cintura} cm` } : {}),
    ...(opts.localAplicacao ? { localAplicacao: localAplicacaoLabel(opts.localAplicacao) } : {}),
    ...(variacaoPesoFmt ? { variacaoPeso: variacaoPesoFmt } : {}),
    ...(variacaoCircFmt ? { variacaoCircunferencia: variacaoCircFmt } : {}),
    ...(checkInSemanal ? { checkInSemanal } : {}),
    ...(checkInSemanalScore ? { checkInSemanalScore } : {}),
    ...(opts.marcoZero ? { marcoZero: opts.marcoZero } : {}),
    status: opts.status,
  };
}

function tituloAplicacaoSemana(status: string): string {
  switch (status) {
    case 'Realizada':
      return 'Aplicação realizada';
    case 'Atrasada':
      return 'Aplicação atrasada';
    case 'Conclusão':
      return 'Conclusão do ciclo';
    case 'Programada para hoje':
      return 'Aplicação prevista para hoje';
    case 'Cancelada':
      return 'Aplicação cancelada';
    default:
      return 'Aplicação programada';
  }
}

function marcoZeroParaTimeline(marco: MarcoZero): NonNullable<EventoTimelineMock['dados']>['marcoZero'] {
  return {
    pesoInicial: marco.pesoInicial,
    circunferenciaInicial: marco.circunferenciaInicial,
    motivacaoPrincipal: marco.motivacaoPrincipal,
    satisfacaoAtual: marco.satisfacaoAtual,
    objetivoPaciente: marco.objetivoPaciente,
    confiancaNoObjetivo: marco.confiancaNoObjetivo,
    possuiFotosIniciais: marco.possuiFotosIniciais,
  };
}

function obterMarcoZeroPaciente(paciente: PacienteCompleto): MarcoZero | undefined {
  if (paciente.marcoZero) return paciente.marcoZero;
  const seg1 = paciente.evolucaoSeguimento?.find((s) => semanaIndexFromRegistro(s) === 1);
  return seg1?.marcoZero;
}

/** Evento principal do início da jornada (semana 1 / Marco Zero). */
export function extrairEventoMarcoZero(paciente: PacienteCompleto): EventoTimelineMock | null {
  const marco = obterMarcoZeroPaciente(paciente);
  if (!marco) return null;

  const seg1 = paciente.evolucaoSeguimento?.find((s) => semanaIndexFromRegistro(s) === 1);
  const dtRaw = marco.createdAt ?? seg1?.dataRegistro ?? paciente.dataCadastro;
  const dt =
    toDateLocalEvolucao(dtRaw) ??
    (paciente.dataCadastro instanceof Date && !isNaN(paciente.dataCadastro.getTime())
      ? paciente.dataCadastro
      : new Date());

  const descParts = [
    `Peso inicial: ${marco.pesoInicial} kg`,
    marco.circunferenciaInicial != null ? `Cintura: ${marco.circunferenciaInicial} cm` : null,
    `Objetivo: ${marco.objetivoPaciente}`,
    `Motivação: ${marco.motivacaoPrincipal}`,
    `Fotos iniciais: ${marco.possuiFotosIniciais ? 'Sim' : 'Não'}`,
  ].filter(Boolean);

  return {
    id: 'marco-zero-tratamento',
    tipo: 'marco_zero',
    titulo: 'Marco Zero do Tratamento',
    descricao: descParts.join(' · '),
    data: formatDateDDMMYYYY(dt),
    origem: 'paciente',
    destaque: 'Início oficial da jornada',
    dados: {
      marcoZero: marcoZeroParaTimeline(marco),
      semana: 1,
      status: 'Marco Zero',
    },
  };
}

/** Aplicações, peso/cintura do plano terapêutico (compartilhado metaadmin + metanutri). */
export function extrairEventosAplicacoesDoPlano(paciente: PacienteCompleto): EventoTimelineMock[] {
  const eventos: EventoTimelineMock[] = [];

  const marcoZeroPaciente = obterMarcoZeroPaciente(paciente);
  const marcoZeroEvento = marcoZeroPaciente ? extrairEventoMarcoZero(paciente) : null;

  const mi = paciente.dadosClinicos?.medidasIniciais;
  if (!marcoZeroEvento && mi && (mi.peso || mi.circunferenciaAbdominal)) {
    const dataCad =
      paciente.dataCadastro instanceof Date && !isNaN(paciente.dataCadastro.getTime())
        ? paciente.dataCadastro
        : new Date();
    const descParts: string[] = [];
    if (mi.peso) descParts.push(`Peso: ${mi.peso} kg`);
    if (mi.circunferenciaAbdominal) descParts.push(`Cintura: ${mi.circunferenciaAbdominal} cm`);
    if (mi.imc) descParts.push(`IMC: ${mi.imc.toFixed(1)}`);

    eventos.push({
      id: 'medidas-iniciais',
      tipo: 'aplicacao',
      titulo: 'Medidas iniciais',
      descricao: descParts.join(' · '),
      data: formatDateDDMMYYYY(dataCad),
      origem: 'sistema',
      destaque: 'Início do acompanhamento',
      dados: {
        ...(mi.peso ? { peso: `${mi.peso} kg` } : {}),
        ...(mi.circunferenciaAbdominal ? { cintura: `${mi.circunferenciaAbdominal} cm` } : {}),
        status: 'Medida inicial',
      },
    });
  }

  const seguimentoPorSemana = new Map<
    number,
    {
      peso?: number;
      cintura?: number;
      checkIn?: CheckInSemanal;
      checkInScore?: CheckInSemanalScore;
      localAplicacao?: string;
      variacaoPeso?: number | null;
      variacaoCircunferencia?: number | null;
    }
  >();
  const semanasComAplicacao = new Set<number>();

  for (const seg of paciente.evolucaoSeguimento ?? []) {
    const semana = semanaIndexFromRegistro(seg);
    if (semana < 1) continue;
    if (seg.peso != null || seg.circunferenciaAbdominal != null || seg.checkInSemanal || seg.localAplicacao || seg.marcoZero) {
      const ehMarcoZero = semana === 1 && !!seg.marcoZero;
      const scoreResolvido = ehMarcoZero ? null : resolveCheckInSemanalScore(paciente, seg);
      const checkInScore: CheckInSemanalScore | undefined = seg.checkInSemanalScore
        ? seg.checkInSemanalScore
        : scoreResolvido
          ? {
              score: scoreResolvido.score,
              categoria: scoreResolvido.categoria,
              medalha: scoreResolvido.medalha,
              titulo: scoreResolvido.titulo,
              mensagemPaciente: scoreResolvido.mensagemPaciente,
              fatoresPositivos: scoreResolvido.fatoresPositivos,
              pontosDeAtencao: scoreResolvido.pontosDeAtencao,
              pontos: scoreResolvido.pontos,
              semana,
            }
          : undefined;

      const { variacaoPeso, variacaoCircunferencia } = ehMarcoZero
        ? { variacaoPeso: null, variacaoCircunferencia: null }
        : calcularVariacoesParaSeguimento(paciente, seg);

      seguimentoPorSemana.set(semana, {
        peso: seg.peso,
        cintura: seg.circunferenciaAbdominal,
        checkIn: ehMarcoZero ? undefined : seg.checkInSemanal,
        checkInScore,
        localAplicacao: seg.localAplicacao,
        variacaoPeso,
        variacaoCircunferencia,
      });
    }
  }

  if (pacienteTemTratamentoIniciado(paciente)) {
    const resultado = buildSemanasEsquemaDoses(paciente);
    if (resultado) {
      const { semanas } = resultado;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (const item of semanas) {
        if (item.isConclusao) continue;
        const status = statusAplicacaoSemana(item);
        if (!STATUS_APLICACAO_RELEVANTE.has(status)) continue;

        semanasComAplicacao.add(item.semana);
        const dataStr = formatDateDDMMYYYY(item.dataExibicao);
        const dataItem = new Date(item.dataExibicao);
        dataItem.setHours(0, 0, 0, 0);
        const ehHoje = dataItem.getTime() === hoje.getTime();
        const seg = seguimentoPorSemana.get(item.semana);

        const descParts: string[] = [];
        if (!item.isConclusao) descParts.push(`Semana ${item.semana} · ${item.doseAtual} mg`);
        else descParts.push('Conclusão do ciclo terapêutico');

        const scoreTimeline = scoreParaTimeline(seg?.checkInScore, item.semana);
        const ehMarcoZeroSemana = item.semana === 1 && !!marcoZeroPaciente;
        const tituloEvento =
          ehMarcoZeroSemana
            ? 'Marco Zero do Tratamento'
            : seg?.checkIn && scoreTimeline
              ? tituloComScoreCheckIn(tituloAplicacaoSemana(status), scoreTimeline)
              : tituloAplicacaoSemana(status);

        eventos.push({
          id: `plano-aplicacao-${item.semana}-${dataStr}`,
          tipo: 'aplicacao',
          titulo: tituloEvento,
          descricao: descParts.join(' · '),
          data: dataStr,
          origem: 'sistema',
          ...(ehMarcoZeroSemana ? { destaque: 'Início oficial da jornada' } : ehHoje ? { destaque: 'Aplicação prevista para hoje' } : {}),
          dados: montarDadosAplicacao({
            semana: item.isConclusao ? undefined : item.semana,
            dose: item.isConclusao ? undefined : `${item.doseAtual} mg`,
            peso: seg?.peso,
            cintura: seg?.cintura,
            localAplicacao: seg?.localAplicacao,
            checkIn: seg?.checkIn,
            checkInScore: seg?.checkInScore,
            marcoZero: ehMarcoZeroSemana && marcoZeroPaciente ? marcoZeroParaTimeline(marcoZeroPaciente) : undefined,
            variacaoPeso: seg?.variacaoPeso,
            variacaoCircunferencia: seg?.variacaoCircunferencia,
            status: ehMarcoZeroSemana ? 'Marco Zero' : status,
          }),
        });
      }
    }
  }

  for (const seg of paciente.evolucaoSeguimento ?? []) {
    const semana = semanaIndexFromRegistro(seg);
    if (semana < 1) continue;
    if (ehRegistroConclusaoSeguimento(seg)) continue;
    if (semanasComAplicacao.has(semana)) continue;
    if (semana === 1 && seg.marcoZero) continue;
    if (seg.peso == null && seg.circunferenciaAbdominal == null && !seg.checkInSemanal) continue;
    const dt =
      seg.dataRegistro instanceof Date && !isNaN(seg.dataRegistro.getTime()) ? seg.dataRegistro : null;
    if (!dt) continue;

    const descParts: string[] = [`Semana ${semana}`];
    const { variacaoPeso, variacaoCircunferencia } = calcularVariacoesParaSeguimento(paciente, seg);
    const scoreResolvido = resolveCheckInSemanalScore(paciente, seg);
    const checkInScore: CheckInSemanalScore | undefined = seg.checkInSemanalScore
      ? seg.checkInSemanalScore
      : scoreResolvido
        ? {
            score: scoreResolvido.score,
            categoria: scoreResolvido.categoria,
            medalha: scoreResolvido.medalha,
            titulo: scoreResolvido.titulo,
            mensagemPaciente: scoreResolvido.mensagemPaciente,
            fatoresPositivos: scoreResolvido.fatoresPositivos,
            pontosDeAtencao: scoreResolvido.pontosDeAtencao,
            pontos: scoreResolvido.pontos,
            semana,
          }
        : undefined;
    const scoreTimeline = scoreParaTimeline(checkInScore, semana);
    const tituloEvento = scoreTimeline
      ? tituloComScoreCheckIn(`Check-in semanal — Semana ${semana}`, scoreTimeline)
      : `Check-in semanal — Semana ${semana}`;

    eventos.push({
      id: `seguimento-${semana}`,
      tipo: 'aplicacao',
      titulo: tituloEvento,
      descricao: descParts.join(' · '),
      data: formatDateDDMMYYYY(dt),
      origem: 'paciente',
      dados: montarDadosAplicacao({
        semana,
        peso: seg.peso,
        cintura: seg.circunferenciaAbdominal,
        localAplicacao: seg.localAplicacao,
        checkIn: seg.checkInSemanal,
        checkInScore,
        variacaoPeso,
        variacaoCircunferencia,
        status: 'Seguimento semanal',
      }),
    });
  }

  if (marcoZeroEvento && !semanasComAplicacao.has(1)) {
    eventos.unshift(marcoZeroEvento);
  }

  return eventos;
}

function chaveDedup(evento: EventoTimelineMock): string {
  return `${evento.tipo}-${evento.data}-${evento.dados?.medicamento ?? ''}-${evento.dados?.dose ?? ''}`;
}

export function combinarEventosSemDuplicar(
  base: EventoTimelineMock[],
  derivados: EventoTimelineMock[]
): EventoTimelineMock[] {
  const chavesBase = new Set(base.map(chaveDedup));
  const novos = derivados.filter((d) => !chavesBase.has(chaveDedup(d)));
  const combinados = [...base, ...novos];
  combinados.sort((a, b) => parseDataTimeline(b.data, b.hora) - parseDataTimeline(a.data, a.hora));
  return combinados;
}
