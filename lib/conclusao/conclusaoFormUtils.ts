import { calcularDeltaAcumuladoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import { parseDecimalFormValue } from '@/lib/aplicacao/checkInSemanalFormUtils';
import { ehRegistroConclusaoSeguimento } from '@/lib/metaadmin/proximoRegistroSeguimento';
import { CONCLUSAO_QUESTIONS } from '@/lib/conclusao/conclusaoQuestions';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

export function conclusaoFormFromPaciente(
  paciente: PacienteCompleto,
  registro?: SeguimentoSemanal | null
): Record<string, string> {
  const ct = paciente.planoTerapeutico?.conclusaoTratamento as Record<string, unknown> | undefined;
  const reg =
    registro ?? (paciente.evolucaoSeguimento || []).find((e) => ehRegistroConclusaoSeguimento(e));

  const form = Object.fromEntries(CONCLUSAO_QUESTIONS.map((q) => [q.key, '']));

  const peso =
    ct?.pesoFinalKg != null
      ? Number(ct.pesoFinalKg)
      : reg?.peso != null
        ? reg.peso
        : null;
  if (peso != null && !Number.isNaN(peso) && peso > 0) {
    form.pesoFinal = peso.toFixed(1).replace('.', ',');
  }

  const circ =
    ct?.circunferenciaAbdominalFinalCm != null
      ? Number(ct.circunferenciaAbdominalFinalCm)
      : reg?.circunferenciaAbdominal != null
        ? reg.circunferenciaAbdominal
        : null;
  if (circ != null && !Number.isNaN(circ) && circ > 0) {
    form.circunferenciaAbdominal = String(circ).replace('.', ',');
  }

  if (ct?.percepcaoResultadoFinal) {
    form.percepcaoResultadoFinal = String(ct.percepcaoResultadoFinal);
  }
  if (ct?.principalConquista) {
    form.principalConquista = String(ct.principalConquista);
  }
  if (ct?.depoimento) {
    form.depoimento = String(ct.depoimento);
  }

  return form;
}

export function calcularMetricasConclusao(
  paciente: PacienteCompleto,
  pesoFinal: number,
  circunferenciaFinal?: number
): {
  pesoPerdidoAcumulado: number | null;
  circunferenciaAbdominalReduzidaCm: number | null;
} {
  const evolucao = paciente.evolucaoSeguimento || [];
  const primeiroRegistro = evolucao.find((e) => (e.weekIndex ?? e.numeroSemana) === 1);
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const pesoInicial = primeiroRegistro?.peso ?? medidasIniciais?.peso ?? null;
  const circInicial =
    primeiroRegistro?.circunferenciaAbdominal ?? medidasIniciais?.circunferenciaAbdominal ?? null;

  return {
    pesoPerdidoAcumulado: calcularDeltaAcumuladoMedida(pesoInicial, pesoFinal),
    circunferenciaAbdominalReduzidaCm:
      circunferenciaFinal != null
        ? calcularDeltaAcumuladoMedida(circInicial, circunferenciaFinal)
        : null,
  };
}

export function parseConclusaoFormMedidas(form: Record<string, string>): {
  pesoFinal: number;
  circunferenciaAbdominal?: number;
  depoimento?: string;
  percepcaoResultadoFinal?: string;
  principalConquista?: string;
} {
  const pesoFinal = parseDecimalFormValue(form.pesoFinal);
  if (pesoFinal == null || pesoFinal <= 0) {
    throw new Error('Informe um peso final válido.');
  }

  const circ = parseDecimalFormValue(form.circunferenciaAbdominal);
  const depoimento = (form.depoimento || '').trim().slice(0, 3000) || undefined;
  const percepcaoResultadoFinal = (form.percepcaoResultadoFinal || '').trim().slice(0, 200) || undefined;
  const principalConquista = (form.principalConquista || '').trim().slice(0, 200) || undefined;

  return {
    pesoFinal,
    circunferenciaAbdominal: circ != null && circ > 0 ? circ : undefined,
    depoimento,
    percepcaoResultadoFinal,
    principalConquista,
  };
}
