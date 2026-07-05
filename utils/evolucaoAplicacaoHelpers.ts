import type { PacienteCompleto } from '@/types/obesidade';
import type { SeguimentoSemanal } from '@/types/obesidade';

export function toDateLocalEvolucao(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v);
  const td = (v as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function semanaIndexFromRegistro(e: SeguimentoSemanal): number {
  return e.weekIndex ?? e.numeroSemana ?? 0;
}

export function registroEvolucaoPorSemana(
  evolucao: SeguimentoSemanal[] | undefined,
  semanaNum: number
): SeguimentoSemanal | null {
  if (!evolucao?.length || semanaNum < 1) return null;
  return evolucao.find((e) => semanaIndexFromRegistro(e) === semanaNum) ?? null;
}

const isAdesaoPerdida = (r: { adherence?: string; adesao?: string } | null | undefined) =>
  !!(r?.adherence === 'MISSED' || r?.adesao === 'esquecida');

/** Dose efetivamente aplicada (mesmo critério do metaadmingeral). */
export function contaComoDoseAplicada(registro: SeguimentoSemanal | null | undefined): boolean {
  if (!registro || isAdesaoPerdida(registro)) return false;
  const q = registro.doseAplicada?.quantidade;
  return q != null && !isNaN(Number(q)) && Number(q) > 0;
}

/** Data real da aplicação: doseAplicada.data, senão dataRegistro. */
export function dataRealAplicacaoSeguimento(registro: SeguimentoSemanal | null | undefined): Date | null {
  if (!registro) return null;
  const fromDose = toDateLocalEvolucao(registro.doseAplicada?.data);
  if (fromDose) return startOfDay(fromDose);
  const fromReg = toDateLocalEvolucao(registro.dataRegistro);
  return fromReg ? startOfDay(fromReg) : null;
}

export function doseMgAplicada(registro: SeguimentoSemanal | null | undefined): number | undefined {
  if (!contaComoDoseAplicada(registro)) return undefined;
  const q = registro!.doseAplicada!.quantidade;
  return typeof q === 'number' && !isNaN(q) ? q : undefined;
}

export function obterRegistroSeguimentoDaAplicacao(
  paciente: PacienteCompleto,
  aplicacaoData: Date,
  semana?: number
): SeguimentoSemanal | null {
  const evolucao = paciente.evolucaoSeguimento || [];
  if (semana != null && semana >= 1) {
    const byWeek = registroEvolucaoPorSemana(evolucao, semana);
    if (byWeek) return byWeek;
  }
  const alvo = startOfDay(aplicacaoData);
  const registro = evolucao.find((e) => {
    const dataReal = dataRealAplicacaoSeguimento(e);
    if (!dataReal) return false;
    return dataReal.getTime() === alvo.getTime();
  });
  return registro ?? null;
}

export function aplicacaoFoiFeitaNoPaciente(paciente: PacienteCompleto, aplicacaoData: Date): boolean {
  const registro = obterRegistroSeguimentoDaAplicacao(paciente, aplicacaoData);
  if (isAdesaoPerdida(registro)) return false;
  return !!(registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0);
}

export function obterVariacaoPesoAplicacao(paciente: PacienteCompleto, aplicacaoData: Date): number | null {
  const registro = obterRegistroSeguimentoDaAplicacao(paciente, aplicacaoData);
  if (!registro?.peso) return null;
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort((a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
  const idx = evolucao.findIndex((e) => e === registro);
  const anterior = idx > 0 ? evolucao[idx - 1] : null;
  const pesoAnterior = anterior?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso;
  if (pesoAnterior == null || typeof pesoAnterior !== 'number') return null;
  return registro.peso - pesoAnterior;
}

export function obterVariacaoCompAplicacao(paciente: PacienteCompleto, aplicacaoData: Date): number | null {
  const registro = obterRegistroSeguimentoDaAplicacao(paciente, aplicacaoData);
  if (registro?.circunferenciaAbdominal == null || typeof registro.circunferenciaAbdominal !== 'number')
    return null;
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort((a, b) => semanaIndexFromRegistro(a) - semanaIndexFromRegistro(b));
  const idx = evolucao.findIndex((e) => e === registro);
  const anterior = idx > 0 ? evolucao[idx - 1] : null;
  const compAnterior =
    anterior?.circunferenciaAbdominal ?? paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  if (compAnterior == null || typeof compAnterior !== 'number') return null;
  return registro.circunferenciaAbdominal - compAnterior;
}

/** Entre os dois últimos registros com peso (ou último vs medidas iniciais). */
export function obterUltimaVariacaoPesoPaciente(paciente: PacienteCompleto): number | null {
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort((a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
  const comPeso = evolucao.filter((r) => r.peso != null && typeof r.peso === 'number');
  if (comPeso.length === 0) return null;
  const ultimo = comPeso[comPeso.length - 1];
  const anterior =
    comPeso.length > 1 ? comPeso[comPeso.length - 2]?.peso : paciente.dadosClinicos?.medidasIniciais?.peso;
  if (anterior == null || typeof anterior !== 'number') return null;
  return ultimo.peso - anterior;
}

export function obterUltimaVariacaoCompPaciente(paciente: PacienteCompleto): number | null {
  const evolucao = (paciente.evolucaoSeguimento || [])
    .slice()
    .sort((a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
  const comComp = evolucao.filter(
    (r) => r.circunferenciaAbdominal != null && typeof r.circunferenciaAbdominal === 'number'
  );
  if (comComp.length === 0) return null;
  const ultimo = comComp[comComp.length - 1];
  const anterior =
    comComp.length > 1
      ? comComp[comComp.length - 2]?.circunferenciaAbdominal
      : paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  if (anterior == null || typeof anterior !== 'number') return null;
  return ultimo.circunferenciaAbdominal! - anterior;
}

const LOCAIS_PLANEJADOS = ['abdome', 'coxa', 'braco'] as const;

export function localPlanejadoParaSemana(semana: number): (typeof LOCAIS_PLANEJADOS)[number] {
  const s = Math.max(1, semana);
  return LOCAIS_PLANEJADOS[(s - 1) % 3];
}

export function labelLocalAplicacao(loc: string): string {
  if (loc === 'abdome') return 'Abdome';
  if (loc === 'coxa') return 'Coxa';
  if (loc === 'braco') return 'Braço';
  return loc;
}

export function formatarDataAplicacaoISO(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
