import type { PacienteCompleto, SeguimentoSemanal, Alerta } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Lembrete } from '@/types/lembrete';
import type { PacienteMensagem } from '@/services/pacienteMensagemService';
import type {
  Paciente360Alert,
  Paciente360AlertSeverity,
  Paciente360ProximaAcao,
  Paciente360RiskLevel,
  Paciente360StatusComposto,
  Paciente360Summary,
  Paciente360UltimaInteracao,
} from '@/types/paciente360';
import { resolverProximoRegistroSeguimento } from '@/lib/metaadmin/proximoRegistroSeguimento';
import { contaComoDoseAplicada, semanaIndexFromRegistro, toDateLocalEvolucao } from '@/utils/evolucaoAplicacaoHelpers';
import { pacienteTemTratamentoIniciado } from '@/lib/paciente360/pacienteTemTratamentoIniciado';
import { formatYmd, startOfDay, toDateValue, ymdFromUnknown } from '@/lib/paciente360/paciente360DateUtils';

type AdherenceBucket = 'on_time' | 'late' | 'missed' | 'skip';

function round1(n: number): number {
  return Number(n.toFixed(1));
}

function normalizeAdherence(reg: SeguimentoSemanal): AdherenceBucket {
  if (reg.adherence === 'MISSED' || reg.adesao === 'esquecida') return 'missed';
  if (reg.adherence === 'LATE_<96H' || reg.adesao === 'atrasada') return 'late';
  if (reg.adherence === 'ON_TIME' || reg.adesao === 'pontual') return 'on_time';
  if (contaComoDoseAplicada(reg)) return 'on_time';
  return 'skip';
}

function hasMarcoZero(paciente: PacienteCompleto): boolean {
  if (paciente.marcoZero?.pesoInicial) return true;
  const sem1 = paciente.evolucaoSeguimento?.find((e) => semanaIndexFromRegistro(e) === 1);
  return Boolean(sem1?.marcoZero?.pesoInicial);
}

function calcularResultado(paciente: PacienteCompleto) {
  const medidas = paciente.dadosClinicos?.medidasIniciais;
  const evolucao = paciente.evolucaoSeguimento ?? [];
  const primeiroRegistro = evolucao.find((e) => semanaIndexFromRegistro(e) === 1);

  const pesoInicial =
    paciente.marcoZero?.pesoInicial ??
    primeiroRegistro?.peso ??
    medidas?.peso ??
    paciente.indicadores?.evolucaoPonderal?.pesoInicial;

  const cinturaInicial =
    paciente.marcoZero?.circunferenciaInicial ??
    primeiroRegistro?.circunferenciaAbdominal ??
    medidas?.circunferenciaAbdominal;

  let pesoAtual = paciente.indicadores?.evolucaoPonderal?.pesoAtual;
  if (pesoAtual == null && evolucao.length > 0) {
    const ordenada = [...evolucao].sort((a, b) => {
      const ta = toDateLocalEvolucao(a.dataRegistro)?.getTime() ?? 0;
      const tb = toDateLocalEvolucao(b.dataRegistro)?.getTime() ?? 0;
      return tb - ta;
    });
    pesoAtual = ordenada.find((s) => s.peso != null && s.peso > 0)?.peso;
  }

  let cinturaAtual: number | undefined;
  if (evolucao.length > 0) {
    const ordenada = [...evolucao].sort((a, b) => {
      const ta = toDateLocalEvolucao(a.dataRegistro)?.getTime() ?? 0;
      const tb = toDateLocalEvolucao(b.dataRegistro)?.getTime() ?? 0;
      return tb - ta;
    });
    cinturaAtual = ordenada.find((s) => s.circunferenciaAbdominal != null && s.circunferenciaAbdominal > 0)
      ?.circunferenciaAbdominal;
  }

  const deltaPesoKg =
    pesoInicial != null && pesoAtual != null ? round1(pesoAtual - pesoInicial) : undefined;
  const deltaCinturaCm =
    cinturaInicial != null && cinturaAtual != null
      ? round1(cinturaAtual - cinturaInicial)
      : undefined;

  return {
    pesoInicial,
    pesoAtual,
    deltaPesoKg,
    cinturaInicial,
    cinturaAtual,
    deltaCinturaCm,
  };
}

function calcularAdesao(paciente: PacienteCompleto) {
  const evolucao = paciente.evolucaoSeguimento ?? [];
  let aplicacoesRealizadas = 0;
  let aplicacoesAtrasadas = 0;
  let aplicacoesPerdidas = 0;

  for (const reg of evolucao) {
    const bucket = normalizeAdherence(reg);
    if (bucket === 'on_time') aplicacoesRealizadas += 1;
    else if (bucket === 'late') aplicacoesAtrasadas += 1;
    else if (bucket === 'missed') aplicacoesPerdidas += 1;
  }

  const totalComAdesao = aplicacoesRealizadas + aplicacoesAtrasadas + aplicacoesPerdidas;
  const percentualAdesao =
    totalComAdesao > 0
      ? Math.round((aplicacoesRealizadas / totalComAdesao) * 100)
      : undefined;

  return {
    aplicacoesRealizadas,
    aplicacoesAtrasadas,
    aplicacoesPerdidas,
    percentualAdesao,
  };
}

function calcularSemanaAtual(paciente: PacienteCompleto): number {
  const evolucao = paciente.evolucaoSeguimento ?? [];
  let max = 0;
  for (const reg of evolucao) {
    if (!contaComoDoseAplicada(reg)) continue;
    const w = semanaIndexFromRegistro(reg);
    if (w > max) max = w;
  }
  return max;
}

function calcularPlano(paciente: PacienteCompleto, now: Date) {
  const pt = paciente.planoTerapeutico;
  const tratamentoIniciado = pacienteTemTratamentoIniciado(paciente);
  const semanasTotal = pt?.numeroSemanasTratamento ?? 18;
  const semanaAtual = calcularSemanaAtual(paciente);

  let proximaAplicacao: NonNullable<Paciente360Summary['plano']>['proximaAplicacao'];

  const prox = resolverProximoRegistroSeguimento(paciente);
  if (prox?.tipo === 'dose') {
    const hoje = startOfDay(now);
    const dataProx = startOfDay(prox.data);
    proximaAplicacao = {
      data: formatYmd(dataProx),
      semana: prox.semana,
      atrasada: dataProx.getTime() < hoje.getTime(),
    };
  }

  return {
    tratamentoIniciado,
    semanaAtual: semanaAtual > 0 ? semanaAtual : undefined,
    semanasTotal,
    doseAtualMg: pt?.currentDoseMg,
    titrationStatus: pt?.titrationStatus,
    proximaAplicacao,
  };
}

function mapAlertSeverity(severity: Alerta['severity']): Paciente360AlertSeverity {
  if (severity === 'CRITICAL') return 'danger';
  if (severity === 'MODERATE') return 'warning';
  return 'info';
}

function extrairAlertasPersistidos(paciente: PacienteCompleto): Paciente360Alert[] {
  return (paciente.alertas ?? [])
    .filter((a) => a.status === 'ACTIVE')
    .map((a) => ({
      tipo: a.type,
      severidade: mapAlertSeverity(a.severity),
      mensagem: a.description,
      fonte: 'persistido' as const,
    }));
}

function calcularFinanceiro(pagamento?: PagamentoPaciente | null) {
  if (!pagamento) return undefined;

  let proximoVencimento: string | undefined;
  const parcelas = pagamento.parcelas ?? [];
  const pendentes = parcelas
    .filter((p) => p.status === 'pendente' || p.status === 'atrasada')
    .map((p) => ({ ymd: ymdFromUnknown(p.dataVencimento), ts: toDateValue(p.dataVencimento)?.getTime() ?? Infinity }))
    .filter((p) => p.ymd)
    .sort((a, b) => a.ts - b.ts);

  if (pendentes.length > 0) {
    proximoVencimento = pendentes[0].ymd;
  } else if (pagamento.dataVencimento) {
    proximoVencimento = ymdFromUnknown(pagamento.dataVencimento);
  }

  return {
    statusPagamento: pagamento.statusPagamento,
    valorPendente: pagamento.valorPendente > 0 ? pagamento.valorPendente : undefined,
    proximoVencimento,
  };
}

function pagamentoEstaAtrasado(pagamento?: PagamentoPaciente | null, now = new Date()): boolean {
  if (!pagamento) return false;
  const hoje = startOfDay(now).getTime();
  if (pagamento.parcelas?.some((p) => p.status === 'atrasada')) return true;
  return (pagamento.parcelas ?? []).some((p) => {
    if (p.status !== 'pendente') return false;
    const venc = toDateValue(p.dataVencimento);
    return venc != null && startOfDay(venc).getTime() < hoje;
  });
}

function calcularLembretes(lembretes: Lembrete[] | undefined, now: Date) {
  const hojeYmd = formatYmd(startOfDay(now));
  let pendentes = 0;
  let atrasados = 0;

  for (const l of lembretes ?? []) {
    if (l.concluido) continue;
    pendentes += 1;
    if (l.data < hojeYmd) atrasados += 1;
  }

  return { pendentes, atrasados };
}

function calcularStatusComposto(
  paciente: PacienteCompleto,
  plano: ReturnType<typeof calcularPlano>,
  adesao: ReturnType<typeof calcularAdesao>
): Paciente360StatusComposto {
  const st = paciente.statusTratamento;

  if (st === 'concluido') return 'concluido';
  if (st === 'abandono') return 'abandono';
  if (plano.titrationStatus === 'PAUSADO') return 'pausado';

  const doseAtrasada =
    plano.proximaAplicacao?.atrasada === true || adesao.aplicacoesPerdidas > 0;
  if (doseAtrasada && plano.tratamentoIniciado) return 'dose_atrasada';

  if (plano.tratamentoIniciado && !hasMarcoZero(paciente) && st !== 'concluido') {
    return 'aguardando_marco_zero';
  }

  if (plano.tratamentoIniciado || st === 'em_tratamento') return 'em_tratamento';
  if (!plano.tratamentoIniciado && (st === 'pendente' || !st)) return 'pendente';

  return 'indeterminado';
}

function planoAtivoSemEvolucao(paciente: PacienteCompleto): boolean {
  return (
    pacienteTemTratamentoIniciado(paciente) &&
    (paciente.evolucaoSeguimento ?? []).every((e) => e.peso == null || e.peso <= 0)
  );
}

function pesoRecenteAusente(paciente: PacienteCompleto, now: Date): boolean {
  const evolucao = paciente.evolucaoSeguimento ?? [];
  const limite = startOfDay(now);
  limite.setDate(limite.getDate() - 21);

  let ultimoPeso: Date | null = null;
  for (const reg of evolucao) {
    if (reg.peso == null || reg.peso <= 0) continue;
    const dt = toDateLocalEvolucao(reg.dataRegistro);
    if (dt && (!ultimoPeso || dt > ultimoPeso)) ultimoPeso = dt;
  }

  if (!ultimoPeso) return planoAtivoSemEvolucao(paciente);
  return ultimoPeso.getTime() < limite.getTime();
}

function calcularRisco(
  alertas: Paciente360Alert[],
  adesao: ReturnType<typeof calcularAdesao>,
  pagamento: PagamentoPaciente | null | undefined,
  lembretes: ReturnType<typeof calcularLembretes>,
  paciente: PacienteCompleto,
  now: Date
): { nivel: Paciente360RiskLevel; motivos: string[] } {
  const motivos: string[] = [];
  const alertasSeveros = alertas.filter((a) => a.severidade === 'danger');
  const pagamentoAtrasado = pagamentoEstaAtrasado(pagamento, now);

  if (alertasSeveros.length > 0) motivos.push('Alerta clínico severo ativo');
  if (pagamentoAtrasado) motivos.push('Pagamento atrasado');
  if (adesao.aplicacoesPerdidas > 0) motivos.push('Aplicações perdidas');

  if (motivos.length > 0) {
    return { nivel: 'alto', motivos };
  }

  if (adesao.aplicacoesAtrasadas > 0) motivos.push('Aplicação atrasada');
  if (lembretes.atrasados > 0) motivos.push('Lembrete atrasado');
  if (pesoRecenteAusente(paciente, now)) motivos.push('Sem registro de peso recente');
  if (alertas.some((a) => a.severidade === 'warning')) motivos.push('Alerta clínico moderado');

  if (motivos.length > 0) {
    return { nivel: 'medio', motivos };
  }

  const temDadosMinimos =
    Boolean(paciente.id) &&
    (pacienteTemTratamentoIniciado(paciente) ||
      paciente.statusTratamento != null ||
      (paciente.evolucaoSeguimento?.length ?? 0) > 0);

  if (!temDadosMinimos) {
    return { nivel: 'indeterminado', motivos: ['Dados insuficientes'] };
  }

  return { nivel: 'baixo', motivos: [] };
}

function calcularTagsAutomaticas(
  statusComposto: Paciente360StatusComposto,
  plano: ReturnType<typeof calcularPlano>,
  resultado: ReturnType<typeof calcularResultado>,
  adesao: ReturnType<typeof calcularAdesao>,
  financeiro: ReturnType<typeof calcularFinanceiro>,
  alertas: Paciente360Alert[]
): string[] {
  const tags: string[] = [];

  if (statusComposto === 'em_tratamento' || statusComposto === 'dose_atrasada') {
    tags.push('Em tratamento');
  }
  if (statusComposto === 'pendente' || statusComposto === 'aguardando_marco_zero') {
    tags.push('Pendente');
  }
  if (plano.semanaAtual != null && plano.semanaAtual > 0) {
    tags.push(`Semana ${plano.semanaAtual}`);
  }
  if (plano.doseAtualMg != null) {
    tags.push(`Dose ${plano.doseAtualMg} mg`);
  }
  if (financeiro?.statusPagamento === 'pago') {
    tags.push('Pagamento em dia');
  } else if (
    financeiro?.statusPagamento &&
    financeiro.statusPagamento !== 'pago' &&
    (financeiro.valorPendente ?? 0) > 0
  ) {
    tags.push('Pagamento pendente');
  }
  if (resultado.deltaPesoKg != null && resultado.deltaPesoKg < 0) {
    tags.push(`Perdeu ${Math.abs(resultado.deltaPesoKg)} kg`);
  }
  if (alertas.length > 0) {
    tags.push('Alerta ativo');
  }
  if (adesao.percentualAdesao != null && adesao.percentualAdesao < 70) {
    tags.push('Baixa adesão');
  }

  return tags;
}

function calcularProximaAcao(
  statusComposto: Paciente360StatusComposto,
  financeiro: ReturnType<typeof calcularFinanceiro>,
  adesao: ReturnType<typeof calcularAdesao>,
  plano: ReturnType<typeof calcularPlano>,
  alertas: Paciente360Alert[],
  pagamento?: PagamentoPaciente | null,
  now = new Date()
): Paciente360ProximaAcao {
  const pagamentoAtrasado = pagamentoEstaAtrasado(pagamento, now);
  const pagamentoPendente =
    financeiro?.valorPendente != null &&
    financeiro.valorPendente > 0 &&
    financeiro.statusPagamento !== 'pago';

  if (pagamentoAtrasado || pagamentoPendente) {
    return {
      tipo: 'cobrar_pagamento',
      label: pagamentoAtrasado ? 'Cobrar pagamento atrasado' : 'Cobrar pagamento',
      prioridade: pagamentoAtrasado ? 90 : 70,
    };
  }

  if (
    adesao.aplicacoesPerdidas > 0 ||
    adesao.aplicacoesAtrasadas > 0 ||
    plano.proximaAplicacao?.atrasada
  ) {
    return {
      tipo: 'avaliar_aplicacao',
      label: 'Avaliar aplicação',
      prioridade: 80,
    };
  }

  if (alertas.some((a) => a.severidade === 'danger')) {
    return {
      tipo: 'revisar_exames',
      label: 'Revisar alerta clínico',
      prioridade: 85,
    };
  }

  if (statusComposto === 'pendente' || statusComposto === 'aguardando_marco_zero') {
    return {
      tipo: 'acompanhar',
      label: 'Iniciar acompanhamento',
      prioridade: 60,
    };
  }

  return {
    tipo: 'acompanhar',
    label: 'Acompanhar evolução',
    prioridade: 10,
  };
}

type InteracaoCandidata = {
  tipo: Paciente360UltimaInteracao['tipo'];
  data: Date;
  label: string;
};

function calcularUltimaInteracao(
  paciente: PacienteCompleto,
  mensagens?: PacienteMensagem[],
  progressPhotos?: unknown[]
): Paciente360UltimaInteracao | undefined {
  const candidatos: InteracaoCandidata[] = [];

  if (paciente.dataLeituraRecomendacoes) {
    const d = toDateValue(paciente.dataLeituraRecomendacoes);
    if (d) candidatos.push({ tipo: 'recomendacoes', data: d, label: 'Leitura de recomendações' });
  }

  for (const reg of paciente.evolucaoSeguimento ?? []) {
    const dataBase = toDateLocalEvolucao(reg.doseAplicada?.data) ?? toDateLocalEvolucao(reg.dataRegistro);
    if (!dataBase) continue;

    if (contaComoDoseAplicada(reg)) {
      candidatos.push({ tipo: 'aplicacao', data: dataBase, label: 'Aplicação registrada' });
    }
    if (reg.peso != null && reg.peso > 0) {
      candidatos.push({ tipo: 'peso', data: dataBase, label: 'Registro de peso' });
    }
    if (reg.checkInSemanal?.preenchidoEm) {
      const d = toDateValue(reg.checkInSemanal.preenchidoEm);
      if (d) candidatos.push({ tipo: 'checkin', data: d, label: 'Check-in semanal' });
    }
  }

  const bioRegs = (paciente as Record<string, unknown>).bioimpedanciaRegistros as
    | { dataRegistro?: unknown }[]
    | undefined;
  for (const reg of bioRegs ?? []) {
    const d = toDateValue(reg.dataRegistro);
    if (d) candidatos.push({ tipo: 'bioimpedancia', data: d, label: 'Bioimpedância' });
  }

  for (const msg of mensagens ?? []) {
    if (msg.deletada) continue;
    const d = toDateValue(msg.criadoEm);
    if (d) candidatos.push({ tipo: 'mensagem', data: d, label: 'Mensagem' });
  }

  for (const photo of progressPhotos ?? []) {
    const p = photo as { createdAt?: unknown };
    const d = toDateValue(p.createdAt);
    if (d) candidatos.push({ tipo: 'foto', data: d, label: 'Foto de evolução' });
  }

  if (candidatos.length === 0) return undefined;

  candidatos.sort((a, b) => b.data.getTime() - a.data.getTime());
  const melhor = candidatos[0];
  return {
    tipo: melhor.tipo,
    data: melhor.data,
    label: melhor.label,
  };
}

export function buildPaciente360Summary(params: {
  paciente: PacienteCompleto;
  pagamento?: PagamentoPaciente | null;
  lembretes?: Lembrete[];
  mensagens?: PacienteMensagem[];
  progressPhotos?: unknown[];
  prescricoes?: unknown[];
  now?: Date;
}): Paciente360Summary {
  const { paciente, pagamento, lembretes, mensagens, progressPhotos, now = new Date() } = params;

  const plano = calcularPlano(paciente, now);
  const resultado = calcularResultado(paciente);
  const adesao = calcularAdesao(paciente);
  const financeiro = calcularFinanceiro(pagamento);
  const alertas = extrairAlertasPersistidos(paciente);
  const lembretesResumo = calcularLembretes(lembretes, now);
  const statusComposto = calcularStatusComposto(paciente, plano, adesao);
  const risco = calcularRisco(alertas, adesao, pagamento, lembretesResumo, paciente, now);
  const tagsAutomaticas = calcularTagsAutomaticas(
    statusComposto,
    plano,
    resultado,
    adesao,
    financeiro,
    alertas
  );
  const proximaAcao = calcularProximaAcao(
    statusComposto,
    financeiro,
    adesao,
    plano,
    alertas,
    pagamento,
    now
  );
  const ultimaInteracao = calcularUltimaInteracao(paciente, mensagens, progressPhotos);

  return {
    pacienteId: paciente.id,
    nome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || '',
    statusTratamento: paciente.statusTratamento,
    statusComposto,
    plano,
    resultado,
    adesao,
    financeiro,
    alertas,
    risco,
    ultimaInteracao,
    proximaAcao,
    lembretes: lembretesResumo.pendentes > 0 || lembretesResumo.atrasados > 0 ? lembretesResumo : undefined,
    tagsAutomaticas,
    updatedAt: now,
  };
}
