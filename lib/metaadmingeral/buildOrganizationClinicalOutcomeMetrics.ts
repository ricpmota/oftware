import { calcularDeltaAcumuladoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import type { PacienteCompleto } from '@/types/obesidade';

/** ~7.700 kcal por kg de massa corporal (aproximação clínica para exibição agregada). */
export const KCAL_POR_KG_PERDIDO = 7700;

export type ClinicalOutcomePacienteInput = Pick<
  PacienteCompleto,
  'evolucaoSeguimento' | 'dadosClinicos' | 'planoTerapeutico'
>;

export type OrganizationClinicalOutcomeMetrics = {
  kgPerdidoTotal: number;
  circunferenciaAbdominalReduzidaTotalCm: number;
  totalAplicacoesQuantidade: number;
  totalAplicacoesMg: number;
  totalCaloriasPerdidas: number;
};

function toDateEvolucao(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function reducaoAbdominalPacienteCm(paciente: ClinicalOutcomePacienteInput): number {
  const evolucao = paciente.evolucaoSeguimento || [];
  const primeiroRegistro = evolucao.find((e) => (e.weekIndex ?? e.numeroSemana) === 1);
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const circInicial =
    primeiroRegistro?.circunferenciaAbdominal ?? medidasIniciais?.circunferenciaAbdominal ?? null;

  const conclusao = paciente.planoTerapeutico?.conclusaoTratamento;
  let circFinal =
    conclusao?.circunferenciaAbdominalFinalCm != null
      ? Number(conclusao.circunferenciaAbdominalFinalCm)
      : null;

  if (circFinal == null || Number.isNaN(circFinal)) {
    const comCirc = evolucao
      .filter((r) => typeof r.circunferenciaAbdominal === 'number' && r.circunferenciaAbdominal > 0)
      .sort((a, b) => {
        const sa = a.weekIndex ?? a.numeroSemana ?? 0;
        const sb = b.weekIndex ?? b.numeroSemana ?? 0;
        if (sa !== sb) return sa - sb;
        const da = toDateEvolucao(a.dataRegistro) || new Date(0);
        const db = toDateEvolucao(b.dataRegistro) || new Date(0);
        return da.getTime() - db.getTime();
      });
    circFinal = comCirc.length > 0 ? comCirc[comCirc.length - 1]?.circunferenciaAbdominal ?? null : null;
  }

  const delta = calcularDeltaAcumuladoMedida(circInicial, circFinal);
  if (delta == null || delta >= 0) return 0;
  return Math.round(-delta * 10) / 10;
}

/** Agrega resultados clínicos (aplicações, peso, abdominal, kcal) a partir de pacientes já carregados. */
export function buildOrganizationClinicalOutcomeMetrics(
  pacientes: ClinicalOutcomePacienteInput[],
): OrganizationClinicalOutcomeMetrics {
  let kgPerdidoTotal = 0;
  let circunferenciaAbdominalReduzidaTotalCm = 0;
  let totalAplicacoesMg = 0;
  let totalAplicacoesQuantidade = 0;

  for (const paciente of pacientes) {
    const evolucao = paciente.evolucaoSeguimento || [];

    for (const reg of evolucao) {
      const doseAplicada = reg.doseAplicada;
      const adherence = String(reg.adherence ?? reg.adesao ?? '').toUpperCase();
      const contaAplicacao = Boolean(doseAplicada) && adherence !== 'MISSED';
      const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';

      if (contaAplicacao) {
        totalAplicacoesQuantidade += 1;
      }
      if (adesaoOk) {
        const qtd = reg.doseAplicada?.quantidade;
        if (typeof qtd === 'number' && qtd > 0) {
          totalAplicacoesMg += qtd;
        }
      }
    }

    const comPeso = evolucao
      .filter((r) => typeof r.peso === 'number' && r.peso > 0)
      .sort((a, b) => {
        const sa = a.weekIndex ?? a.numeroSemana ?? 0;
        const sb = b.weekIndex ?? b.numeroSemana ?? 0;
        if (sa !== sb) return sa - sb;
        const da = toDateEvolucao(a.dataRegistro) || new Date(0);
        const db = toDateEvolucao(b.dataRegistro) || new Date(0);
        return da.getTime() - db.getTime();
      });

    const pesoInicial =
      comPeso[0]?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso ?? null;
    const pesoFinal =
      (comPeso.length > 0 ? comPeso[comPeso.length - 1]?.peso : null) ??
      paciente.planoTerapeutico?.conclusaoTratamento?.pesoFinalKg ??
      null;

    if (pesoInicial != null && pesoFinal != null && pesoInicial > pesoFinal) {
      kgPerdidoTotal += pesoInicial - pesoFinal;
    }

    circunferenciaAbdominalReduzidaTotalCm += reducaoAbdominalPacienteCm(paciente);
  }

  const totalCaloriasPerdidas = Math.round(kgPerdidoTotal * KCAL_POR_KG_PERDIDO);

  return {
    kgPerdidoTotal: Math.round(kgPerdidoTotal * 10) / 10,
    circunferenciaAbdominalReduzidaTotalCm:
      Math.round(circunferenciaAbdominalReduzidaTotalCm * 10) / 10,
    totalAplicacoesQuantidade,
    totalAplicacoesMg: Math.round(totalAplicacoesMg * 10) / 10,
    totalCaloriasPerdidas,
  };
}
