import type { PacienteCompleto } from '@/types/obesidade';
import type { SegmentoFaixaAplicacao } from '@/utils/tirzepatidaProtocoloDisplay';
import { buildPatientWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import {
  calcMetaProgressPct,
  countAplicacoesProgress,
  resolveMetaAbdominalCmLoss,
  resolveMetaPesoKgLoss,
} from '@/lib/paciente/metaProgresso';
import { resolvePesoMetaKgReal } from '@/utils/metaHomeWeightPeriod';
import { resolveMetaReducaoCinturaAtiva } from '@/utils/metasTratamentoSwitches';

export type PatientDetailsMobileMetrics = {
  patientName: string;
  statusLabel: string;
  statusClassName: string;
  perdaPesoTotal: number | null;
  perdaCompAbdominalTotal: number | null;
  perdaImcTotal: number | null;
  metaProgressPesoPct: number | null;
  metaProgressAbdominalPct: number | null;
  metaPesoValorLabel: string | null;
  metaAbdominalValorLabel: string | null;
  /** Peso-alvo absoluto (kg), mesma base da meta em /meta. */
  pesoMetaKg: number | null;
  /** Circunferência abdominal alvo (cm). */
  compAbdominalMetaCm: number | null;
  /** IMC correspondente ao peso-alvo. */
  imcMeta: number | null;
  aplicacoesFeitas: number;
  aplicacoesTotal: number;
  segmentosAplicacoes: SegmentoFaixaAplicacao[];
  pesoAtual: number | null;
  compAbdominalAtual: number | null;
  alturaMetros: number | null;
  imcAtual: number | null;
  imcMarkerPercent: number;
  grauObesidadeLabel: string | null;
  grauObesidadeClassName: string;
  telefone: string;
  telefoneWhatsApp: string;
  linkWhatsApp: string;
  cidade: string;
  sexoLabel: string | null;
  dataNascimentoLabel: string;
  idadeLabel: string | null;
  cadastroLabel: string;
};

function calcularPosicaoMarcador(imc: number | null | undefined): number {
  if (!imc || imc === 0) return 0;
  if (imc < 18.5) return (imc / 18.5) * 25;
  if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
  if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
  return 75 + Math.min(((imc - 30) / 20) * 25, 25);
}

function calcularGrauObesidade(imc: number | null | undefined): string | null {
  if (!imc || imc === 0) return null;
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

function getCorGrauObesidade(grau: string | null): string {
  if (!grau) return 'text-gray-500';
  if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
  if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
  if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
  if (grau === 'Sobrepeso') return 'text-amber-600';
  if (grau === 'Peso normal') return 'text-green-600';
  return 'text-blue-600';
}

/** Circunferência abdominal alvo (cm) quando a meta de cintura está ativa. */
export function resolveCompAbdominalMetaCm(
  paciente: PacienteCompleto | null | undefined,
  baselineCm: number | null | undefined
): number | null {
  const base = baselineCm != null && baselineCm > 0 ? baselineCm : null;
  if (base == null) return null;
  if (!resolveMetaReducaoCinturaAtiva(paciente?.planoTerapeutico?.metas, true)) return null;
  const loss = resolveMetaAbdominalCmLoss(paciente);
  if (loss == null || !(loss > 0)) return null;
  const alvo = Math.round((base - loss) * 10) / 10;
  if (!Number.isFinite(alvo) || !(alvo > 0)) return null;
  return alvo;
}

/** Peso-alvo, cintura-alvo e IMC da meta — mesma regra da barra em /meta. */
export function resolvePatientMetaAlvos(
  paciente: PacienteCompleto | null | undefined,
  baselineWeightKg: number | null | undefined,
  baselineCompAbdominalCm: number | null | undefined,
  alturaMetros: number | null | undefined
): { pesoMetaKg: number | null; compAbdominalMetaCm: number | null; imcMeta: number | null } {
  const pesoMetaKg = resolvePesoMetaKgReal(
    paciente,
    baselineWeightKg != null && baselineWeightKg > 0 ? baselineWeightKg : null
  );
  const compAbdominalMetaCm = resolveCompAbdominalMetaCm(paciente, baselineCompAbdominalCm);
  const altura =
    alturaMetros != null && alturaMetros > 0 ? alturaMetros : null;
  const imcMeta =
    pesoMetaKg != null && pesoMetaKg > 0 && altura != null
      ? pesoMetaKg / (altura * altura)
      : null;
  return {
    pesoMetaKg,
    compAbdominalMetaCm,
    imcMeta: imcMeta != null && Number.isFinite(imcMeta) && imcMeta > 0 ? imcMeta : null,
  };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      const d = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Métricas/labels do PatientDetailsMobileModal a partir de um PacienteCompleto.
 * Usado na lista Pacientes e no modal avulso de paciente compartilhado por mensagem.
 */
export function buildPatientDetailsMobileMetrics(
  paciente: PacienteCompleto,
  overrides?: { pesoAtual?: number | null; imcAtual?: number | null }
): PatientDetailsMobileMetrics {
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const evolucao = paciente.evolucaoSeguimento || [];

  const primeiroRegistro = evolucao.find((e) => e.weekIndex === 1);
  const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
  const baselineCompAbdominal =
    (primeiroRegistro?.circunferenciaAbdominal != null && primeiroRegistro.circunferenciaAbdominal > 0
      ? primeiroRegistro.circunferenciaAbdominal
      : null) ??
    (medidasIniciais?.circunferenciaAbdominal != null && medidasIniciais.circunferenciaAbdominal > 0
      ? medidasIniciais.circunferenciaAbdominal
      : 0);

  let ultimoPeso: number | null = null;
  let ultimoCompAbdominal: number | null = null;
  if (evolucao.length > 0) {
    const evolucaoOrdenada = [...evolucao].sort((a, b) => {
      const dataA = toDate(a.dataRegistro)?.getTime() ?? 0;
      const dataB = toDate(b.dataRegistro)?.getTime() ?? 0;
      return dataB - dataA;
    });
    ultimoPeso = evolucaoOrdenada.find((s) => s.peso && s.peso > 0)?.peso || null;
    ultimoCompAbdominal =
      evolucaoOrdenada.find((s) => s.circunferenciaAbdominal != null && s.circunferenciaAbdominal > 0)
        ?.circunferenciaAbdominal ?? null;
  }

  const perdaPesoTotal =
    ultimoPeso && baselineWeight > 0 ? ultimoPeso - baselineWeight : null;
  const perdaCompAbdominalTotal =
    ultimoCompAbdominal != null && baselineCompAbdominal > 0
      ? ultimoCompAbdominal - baselineCompAbdominal
      : null;

  const alturaCm = medidasIniciais?.altura;
  const alturaMetros =
    alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;

  const pesoAtual =
    overrides?.pesoAtual !== undefined
      ? overrides.pesoAtual
      : ultimoPeso || medidasIniciais?.peso || null;

  let imcAtual: number | null =
    overrides?.imcAtual !== undefined ? overrides.imcAtual : null;
  if (imcAtual == null) {
    if (alturaMetros && pesoAtual && pesoAtual > 0) {
      imcAtual = pesoAtual / (alturaMetros * alturaMetros);
    } else if (medidasIniciais?.imc) {
      imcAtual = medidasIniciais.imc;
    }
  }

  let baselineImc: number | null = null;
  if (medidasIniciais?.imc && medidasIniciais.imc > 0) {
    baselineImc = medidasIniciais.imc;
  } else if (alturaMetros && baselineWeight > 0) {
    baselineImc = baselineWeight / (alturaMetros * alturaMetros);
  }
  const perdaImcTotal =
    imcAtual != null && imcAtual > 0 && baselineImc != null && baselineImc > 0
      ? imcAtual - baselineImc
      : null;

  const perdaPesoExibida =
    pesoAtual != null && pesoAtual > 0 && baselineWeight > 0
      ? pesoAtual - baselineWeight
      : perdaPesoTotal;

  const metaPesoKgLoss = resolveMetaPesoKgLoss(paciente, baselineWeight);
  const metaAbdominalCmLoss = resolveMetaAbdominalCmLoss(paciente);
  const {
    posicao: aplicacoesFeitas,
    total: aplicacoesTotal,
    segmentos: segmentosAplicacoes,
  } = countAplicacoesProgress(paciente);

  const statusTratamento = paciente.statusTratamento || 'pendente';
  const statusLabel =
    statusTratamento === 'em_tratamento'
      ? 'Em Tratamento'
      : statusTratamento === 'concluido'
        ? 'Concluído'
        : statusTratamento === 'abandono'
          ? 'Abandono'
          : 'Pendente';
  const statusClassName =
    statusTratamento === 'em_tratamento'
      ? 'bg-green-100 text-green-800'
      : statusTratamento === 'concluido'
        ? 'bg-blue-100 text-blue-800'
        : statusTratamento === 'abandono'
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800';

  const cadastroDate = toDate(paciente.dataCadastro);
  const cadastroLabel = cadastroDate ? cadastroDate.toLocaleDateString('pt-BR') : '-';

  let sexoLabel: string | null = null;
  if (paciente.dadosIdentificacao?.sexoBiologico) {
    sexoLabel =
      paciente.dadosIdentificacao.sexoBiologico === 'M'
        ? 'Masculino'
        : paciente.dadosIdentificacao.sexoBiologico === 'F'
          ? 'Feminino'
          : 'Outro';
  }

  let dataNascimentoLabel = '-';
  let idadeLabel: string | null = null;
  const dataNasc = toDate(paciente.dadosIdentificacao?.dataNascimento);
  if (dataNasc) {
    dataNascimentoLabel = dataNasc.toLocaleDateString('pt-BR');
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();
    const mesNasc = dataNasc.getMonth();
    const diaNasc = dataNasc.getDate();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
    idadeLabel = `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  }

  const telefone = paciente.dadosIdentificacao?.telefone || '';
  const telefoneWhatsApp = telefone.replace(/\D/g, '');
  const linkWhatsApp = buildPatientWhatsappUrl(paciente) ?? '#';

  const grauObesidadeLabel = calcularGrauObesidade(imcAtual);

  const metaPesoValorLabel =
    metaPesoKgLoss != null && metaPesoKgLoss > 0
      ? `${metaPesoKgLoss.toFixed(1).replace(/\.0$/, '')} kg`
      : null;
  const metaAbdominalValorLabel =
    metaAbdominalCmLoss != null && metaAbdominalCmLoss > 0
      ? `${metaAbdominalCmLoss.toFixed(1).replace(/\.0$/, '')} cm`
      : null;

  const metaAlvos = resolvePatientMetaAlvos(
    paciente,
    baselineWeight,
    baselineCompAbdominal,
    alturaMetros
  );

  return {
    patientName: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
    statusLabel,
    statusClassName,
    perdaPesoTotal: perdaPesoExibida,
    perdaCompAbdominalTotal,
    perdaImcTotal,
    metaProgressPesoPct: calcMetaProgressPct(perdaPesoExibida, metaPesoKgLoss),
    metaProgressAbdominalPct: calcMetaProgressPct(perdaCompAbdominalTotal, metaAbdominalCmLoss),
    metaPesoValorLabel,
    metaAbdominalValorLabel,
    pesoMetaKg: metaAlvos.pesoMetaKg,
    compAbdominalMetaCm: metaAlvos.compAbdominalMetaCm,
    imcMeta: metaAlvos.imcMeta,
    aplicacoesFeitas,
    aplicacoesTotal,
    segmentosAplicacoes,
    pesoAtual,
    compAbdominalAtual: ultimoCompAbdominal,
    alturaMetros,
    imcAtual,
    imcMarkerPercent: calcularPosicaoMarcador(imcAtual),
    grauObesidadeLabel,
    grauObesidadeClassName: getCorGrauObesidade(grauObesidadeLabel),
    telefone,
    telefoneWhatsApp,
    linkWhatsApp,
    cidade: paciente.dadosIdentificacao?.endereco?.cidade || '-',
    sexoLabel,
    dataNascimentoLabel,
    idadeLabel,
    cadastroLabel,
  };
}
