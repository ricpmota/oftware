import {
  calcularMetricasConclusao,
  parseConclusaoFormMedidas,
} from '@/lib/conclusao/conclusaoFormUtils';
import { ehRegistroConclusaoSeguimento } from '@/lib/metaadmin/proximoRegistroSeguimento';
import { PacienteService } from '@/services/pacienteService';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

export type SalvarConclusaoMedicoInput = {
  paciente: PacienteCompleto;
  semana: number;
  dataRegistro: Date;
  form: Record<string, string>;
  registroExistente?: SeguimentoSemanal | null;
  /** Ajusta o plano para refletir apenas semanas já aplicadas (fluxo “marcar como concluído”). */
  anteciparPlano?: boolean;
};

export type SalvarConclusaoMedicoResultado = {
  paciente: PacienteCompleto;
  pesoPerdidoAcumulado: number | null;
  circunferenciaAbdominalReduzidaCm: number | null;
  depoimento?: string | null;
  percepcaoResultadoFinal?: string | null;
  principalConquista?: string | null;
};

export async function salvarConclusaoMedicoNoPaciente(
  input: SalvarConclusaoMedicoInput
): Promise<SalvarConclusaoMedicoResultado> {
  const { paciente, semana, dataRegistro, form, registroExistente, anteciparPlano } = input;

  const medidas = parseConclusaoFormMedidas(form);
  const dataConclusao = new Date(dataRegistro);
  dataConclusao.setHours(12, 0, 0, 0);

  const evolucao = [...(paciente.evolucaoSeguimento || [])];
  const idxExistente = registroExistente?.id
    ? evolucao.findIndex((e) => e.id === registroExistente.id)
    : evolucao.findIndex((e) => ehRegistroConclusaoSeguimento(e));

  const seguimentoConclusao: SeguimentoSemanal = {
    id: registroExistente?.id ?? `seguimento-conclusao-${Date.now()}`,
    weekIndex: semana,
    numeroSemana: semana,
    dataRegistro: dataConclusao,
    peso: medidas.pesoFinal,
    ...(medidas.circunferenciaAbdominal != null
      ? { circunferenciaAbdominal: medidas.circunferenciaAbdominal }
      : {}),
    comentarioMedico: 'Semana de Conclusão',
    doseAplicada: {
      quantidade: 0,
      data: dataConclusao,
      horario: dataConclusao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
    adherence: 'ON_TIME',
  };

  if (idxExistente >= 0) {
    evolucao[idxExistente] = { ...evolucao[idxExistente], ...seguimentoConclusao };
  } else {
    evolucao.push(seguimentoConclusao);
    evolucao.sort(
      (a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  }

  const ctAnterior = paciente.planoTerapeutico?.conclusaoTratamento as Record<string, unknown> | undefined;
  const conclusaoTratamento: Record<string, unknown> = {
    dataConclusao,
    pesoFinalKg: medidas.pesoFinal,
    updatedAt: new Date(),
    ...(medidas.circunferenciaAbdominal != null
      ? { circunferenciaAbdominalFinalCm: medidas.circunferenciaAbdominal }
      : ctAnterior?.circunferenciaAbdominalFinalCm != null
        ? { circunferenciaAbdominalFinalCm: ctAnterior.circunferenciaAbdominalFinalCm }
        : {}),
    ...(medidas.depoimento
      ? { depoimento: medidas.depoimento }
      : ctAnterior?.depoimento
        ? { depoimento: ctAnterior.depoimento }
        : {}),
    ...(medidas.percepcaoResultadoFinal
      ? { percepcaoResultadoFinal: medidas.percepcaoResultadoFinal }
      : ctAnterior?.percepcaoResultadoFinal
        ? { percepcaoResultadoFinal: ctAnterior.percepcaoResultadoFinal }
        : {}),
    ...(medidas.principalConquista
      ? { principalConquista: medidas.principalConquista }
      : ctAnterior?.principalConquista
        ? { principalConquista: ctAnterior.principalConquista }
        : {}),
  };

  let planoTerapeutico = {
    ...paciente.planoTerapeutico,
    conclusaoTratamento,
  };

  if (anteciparPlano) {
    const aplicacoesRealizadas = evolucao.filter(
      (e) =>
        !ehRegistroConclusaoSeguimento(e) &&
        e.adherence !== 'MISSED' &&
        e.adesao !== 'esquecida' &&
        e.doseAplicada?.quantidade != null &&
        Number(e.doseAplicada.quantidade) > 0
    );
    const numeroSemanasRealizadas = aplicacoesRealizadas.length;
    const esquemaCustomizado = planoTerapeutico?.esquemaDosesCustomizado;
    const esquemaAjustado =
      esquemaCustomizado && numeroSemanasRealizadas > 0
        ? Object.fromEntries(
            Object.entries(esquemaCustomizado).filter(
              ([semanaKey]) => parseInt(semanaKey, 10) <= numeroSemanasRealizadas
            )
          )
        : undefined;
    const esquemaFinal =
      esquemaAjustado && Object.keys(esquemaAjustado).length > 0 ? esquemaAjustado : undefined;

    planoTerapeutico = {
      ...planoTerapeutico,
      numeroSemanasTratamento:
        numeroSemanasRealizadas > 0
          ? numeroSemanasRealizadas
          : (planoTerapeutico?.numeroSemanasTratamento ?? 18),
      ...(esquemaFinal ? { esquemaDosesCustomizado: esquemaFinal } : {}),
    };
  }

  const pacienteAtualizado: PacienteCompleto = {
    ...paciente,
    statusTratamento: 'concluido',
    evolucaoSeguimento: evolucao,
    planoTerapeutico,
  };

  if (!pacienteAtualizado.id) {
    throw new Error('Paciente sem ID.');
  }

  await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
  const recarregado = await PacienteService.getPacienteById(pacienteAtualizado.id);
  const pacienteFinal = recarregado || pacienteAtualizado;

  const metricas = calcularMetricasConclusao(
    pacienteFinal,
    medidas.pesoFinal,
    medidas.circunferenciaAbdominal
  );

  return {
    paciente: pacienteFinal,
    ...metricas,
    depoimento: medidas.depoimento ?? null,
    percepcaoResultadoFinal: medidas.percepcaoResultadoFinal ?? null,
    principalConquista: medidas.principalConquista ?? null,
  };
}
