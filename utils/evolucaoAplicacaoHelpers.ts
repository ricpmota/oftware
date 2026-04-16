import type { PacienteCompleto } from '@/types/obesidade';
import type { SeguimentoSemanal } from '@/types/obesidade';

const isAdesaoPerdida = (r: { adherence?: string; adesao?: string } | null) =>
  !!(r?.adherence === 'MISSED' || r?.adesao === 'esquecida');

export function obterRegistroSeguimentoDaAplicacao(
  paciente: PacienteCompleto,
  aplicacaoData: Date
): SeguimentoSemanal | null {
  const evolucao = paciente.evolucaoSeguimento || [];
  const dataPrevista = new Date(aplicacaoData);
  dataPrevista.setHours(0, 0, 0, 0);
  const registro = evolucao.find((e) => {
    if (!e.dataRegistro) return false;
    const dataReg =
      e.dataRegistro instanceof Date
        ? new Date(e.dataRegistro)
        : new Date((e.dataRegistro as { toDate?: () => Date })?.toDate?.() || e.dataRegistro);
    if (isNaN(dataReg.getTime())) return false;
    dataReg.setHours(0, 0, 0, 0);
    const diffDias = Math.abs((dataReg.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias <= 3;
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
  const idx = evolucao.findIndex((e) => {
    if (!e.dataRegistro) return false;
    const dataReg =
      e.dataRegistro instanceof Date
        ? new Date(e.dataRegistro)
        : new Date((e.dataRegistro as { toDate?: () => Date })?.toDate?.() || e.dataRegistro);
    const dataPrev = new Date(aplicacaoData);
    dataReg.setHours(0, 0, 0, 0);
    dataPrev.setHours(0, 0, 0, 0);
    return Math.abs(dataReg.getTime() - dataPrev.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  });
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
    .sort((a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
  const idx = evolucao.findIndex((e) => {
    if (!e.dataRegistro) return false;
    const dataReg =
      e.dataRegistro instanceof Date
        ? new Date(e.dataRegistro)
        : new Date((e.dataRegistro as { toDate?: () => Date })?.toDate?.() || e.dataRegistro);
    const dataPrev = new Date(aplicacaoData);
    dataReg.setHours(0, 0, 0, 0);
    dataPrev.setHours(0, 0, 0, 0);
    return Math.abs(dataReg.getTime() - dataPrev.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  });
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
