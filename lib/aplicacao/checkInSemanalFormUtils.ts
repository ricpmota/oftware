import type { CheckInSemanalRespostas } from '@/lib/aplicacao/checkInSemanalQuestions';
import { LOCAL_APLICACAO_LABEL_TO_VALUE } from '@/lib/aplicacao/checkInSemanalQuestions';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

export const LOCAL_APLICACAO_VALUE_TO_LABEL: Record<string, string> = {
  abdome: 'Abdômen',
  braco: 'Braço',
  coxa: 'Perna',
};

export function buildCheckInSemanalFromForm(
  form: Record<string, string>
): CheckInSemanalRespostas & { preenchidoEm?: Date } | undefined {
  const checkIn: Record<string, string | Date> = { preenchidoEm: new Date() };
  const fields: Array<keyof CheckInSemanalRespostas> = [
    'fomeSemana',
    'periodoMaisFome',
    'saciedadeAoComer',
    'consumoAgua',
    'consumoProteinas',
    'satisfacaoEvolucao',
    'comentarioSemana',
  ];

  for (const key of fields) {
    const val = form[key];
    if (typeof val === 'string' && val.trim()) {
      checkIn[key] = val.trim();
    }
  }

  return Object.keys(checkIn).length > 1 ? (checkIn as CheckInSemanalRespostas & { preenchidoEm: Date }) : undefined;
}

export function parseDecimalFormValue(raw: string | undefined): number | undefined {
  const trimmed = (raw || '').trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}

function weekIndexOf(e: SeguimentoSemanal): number {
  return e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana ?? 0;
}

/**
 * Medidas de referência para o painel de evolução e pré-preenchimento:
 * último peso/cintura registrados em semanas **anteriores** à `semanaAtual`
 * (não usa a semana atual nem semanas futuras).
 */
export function obterMedidasReferenciaPaciente(
  paciente: PacienteCompleto,
  semanaAtual: number
): { peso: number | null; circunferenciaAbdominal: number | null } {
  const evolucao = paciente.evolucaoSeguimento || [];
  const porSemana = new Map<number, SeguimentoSemanal>();
  for (const e of evolucao) {
    const w = weekIndexOf(e);
    if (w > 0) porSemana.set(w, e);
  }

  let peso: number | null = null;
  let circunferenciaAbdominal: number | null = null;

  for (let w = semanaAtual - 1; w >= 1; w--) {
    const reg = porSemana.get(w);
    if (!reg) continue;
    if (peso == null && reg.peso != null && reg.peso > 0) peso = reg.peso;
    if (
      circunferenciaAbdominal == null &&
      reg.circunferenciaAbdominal != null &&
      reg.circunferenciaAbdominal > 0
    ) {
      circunferenciaAbdominal = reg.circunferenciaAbdominal;
    }
  }

  const pesoInicial = paciente.dadosClinicos?.medidasIniciais?.peso;
  const circInicial = paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;

  if (peso == null && pesoInicial != null && pesoInicial > 0) peso = pesoInicial;
  if (circunferenciaAbdominal == null && circInicial != null && circInicial > 0) {
    circunferenciaAbdominal = circInicial;
  }

  if (semanaAtual === 1) {
    const marcoPaciente = (paciente as {
      marcoZero?: { pesoInicial?: number; circunferenciaInicial?: number };
    }).marcoZero;
    const regSem1 = porSemana.get(1);
    const marco =
      marcoPaciente ??
      (regSem1 as { marcoZero?: { pesoInicial?: number; circunferenciaInicial?: number } } | undefined)
        ?.marcoZero;
    if (marco?.pesoInicial != null && marco.pesoInicial > 0) peso = marco.pesoInicial;
    if (marco?.circunferenciaInicial != null && marco.circunferenciaInicial > 0) {
      circunferenciaAbdominal = marco.circunferenciaInicial;
    }
  }

  return { peso, circunferenciaAbdominal };
}

export function checkInFormFromRegistro(
  registro: SeguimentoSemanal | null | undefined
): Record<string, string> {
  if (!registro) return {};
  const ci = registro.checkInSemanal;
  const localLabel = registro.localAplicacao
    ? LOCAL_APLICACAO_VALUE_TO_LABEL[registro.localAplicacao] || ''
    : '';

  return {
    peso:
      registro.peso != null && registro.peso > 0
        ? registro.peso.toFixed(1).replace('.', ',')
        : '',
    circunferenciaAbdominal:
      registro.circunferenciaAbdominal != null && registro.circunferenciaAbdominal > 0
        ? registro.circunferenciaAbdominal.toFixed(2).replace('.', ',')
        : '',
    localAplicacao: localLabel,
    fomeSemana: ci?.fomeSemana || '',
    periodoMaisFome: ci?.periodoMaisFome || '',
    saciedadeAoComer: ci?.saciedadeAoComer || '',
    consumoAgua: ci?.consumoAgua || '',
    consumoProteinas: ci?.consumoProteinas || '',
    satisfacaoEvolucao: ci?.satisfacaoEvolucao || '',
    comentarioSemana: ci?.comentarioSemana || '',
  };
}

export function localAplicacaoFromForm(form: Record<string, string>): 'abdome' | 'coxa' | 'braco' | undefined {
  return LOCAL_APLICACAO_LABEL_TO_VALUE[form.localAplicacao || ''];
}

export function calcularVariacoesSemanaCliente(
  paciente: PacienteCompleto,
  evolucao: SeguimentoSemanal[],
  weekIndex: number,
  peso: number,
  circunferenciaAbdominal?: number
): { variacaoPeso: number | null; variacaoCircunferencia: number | null } {
  const circunfAtualNum =
    circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal)
      ? circunferenciaAbdominal
      : null;

  if (weekIndex === 1) {
    return {
      variacaoPeso: 0,
      variacaoCircunferencia: circunfAtualNum != null ? 0 : null,
    };
  }

  const { peso: pesoAnterior, circunferenciaAbdominal: circunfAnterior } =
    obterMedidasReferenciaPaciente(paciente, weekIndex);

  let variacaoPeso: number | null = null;
  let variacaoCircunferencia: number | null = null;

  if (pesoAnterior != null && typeof pesoAnterior === 'number') {
    variacaoPeso = Math.round((peso - pesoAnterior) * 10) / 10;
  }
  if (
    circunfAtualNum != null &&
    circunfAnterior != null &&
    typeof circunfAnterior === 'number'
  ) {
    variacaoCircunferencia = Math.round((circunfAtualNum - circunfAnterior) * 10) / 10;
  }

  return { variacaoPeso, variacaoCircunferencia };
}
