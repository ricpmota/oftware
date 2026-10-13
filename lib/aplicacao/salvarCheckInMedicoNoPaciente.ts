import {
  buildCheckInSemanalFromForm,
  calcularVariacoesSemanaCliente,
  localAplicacaoFromForm,
  parseDecimalFormValue,
} from '@/lib/aplicacao/checkInSemanalFormUtils';
import {
  calcularScoreCheckInSemanal,
  type CheckInSemanalScoreResultado,
} from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import { pacienteComMedidasIniciaisAtualizadasPelaSemana1 } from '@/lib/aplicacao/pacienteComMedidasIniciaisAtualizadasPelaSemana1';
import { PacienteService } from '@/services/pacienteService';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { pacienteComDoseMgSemanaAtualizada } from '@/utils/esquemaDosesSemana';

function scoreParaRegistro(
  resultado: CheckInSemanalScoreResultado,
  weekIndex: number
): SeguimentoSemanal['checkInSemanalScore'] {
  return {
    score: resultado.score,
    categoria: resultado.categoria,
    medalha: resultado.medalha,
    titulo: resultado.titulo,
    mensagemPaciente: resultado.mensagemPaciente,
    fatoresPositivos: resultado.fatoresPositivos,
    pontosDeAtencao: resultado.pontosDeAtencao,
    pontos: resultado.pontos,
    createdAt: new Date(),
    semana: weekIndex,
    applicationId: `medico-${weekIndex}-${Date.now()}`,
  };
}

export type SalvarCheckInMedicoInput = {
  paciente: PacienteCompleto;
  semana: number;
  dataRegistro: Date;
  doseMg: number;
  form: Record<string, string>;
  registroExistente?: SeguimentoSemanal | null;
};

export type SalvarCheckInMedicoResultado = {
  paciente: PacienteCompleto;
  variacaoPeso: number | null;
  variacaoCircunferencia: number | null;
  scoreCheckInSemanal: CheckInSemanalScoreResultado | null;
};

export async function salvarCheckInMedicoNoPaciente(
  input: SalvarCheckInMedicoInput
): Promise<SalvarCheckInMedicoResultado> {
  const { paciente, semana, dataRegistro, doseMg, form, registroExistente } = input;

  const peso = parseDecimalFormValue(form.peso);
  if (peso == null || peso <= 0) {
    throw new Error('Informe um peso válido.');
  }

  const circunferenciaAbdominal = parseDecimalFormValue(form.circunferenciaAbdominal);
  const localAplicacao = localAplicacaoFromForm(form);
  const checkInSemanal = buildCheckInSemanalFromForm(form);

  const evolucao = [...(paciente.evolucaoSeguimento || [])];
  const idx = evolucao.findIndex((e) => (e.weekIndex ?? e.numeroSemana) === semana);

  const horario = dataRegistro.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const baseRegistro: SeguimentoSemanal =
    idx >= 0
      ? { ...evolucao[idx] }
      : registroExistente
        ? { ...registroExistente }
        : {
            id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            weekIndex: semana,
            numeroSemana: semana,
            dataRegistro,
          };

  const registroAtualizado: SeguimentoSemanal = {
    ...baseRegistro,
    weekIndex: semana,
    numeroSemana: semana,
    dataRegistro,
    peso,
    circunferenciaAbdominal:
      circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal)
        ? circunferenciaAbdominal
        : undefined,
    localAplicacao,
    doseAplicada: {
      quantidade: doseMg,
      data: dataRegistro,
      horario: baseRegistro.doseAplicada?.horario || horario,
    },
    adherence: 'ON_TIME',
    adesao: 'pontual',
  };

  const ehMarcoZero = semana === 1 && !!registroAtualizado.marcoZero;
  if (!ehMarcoZero && checkInSemanal) {
    registroAtualizado.checkInSemanal = checkInSemanal;
  }

  if (idx >= 0) {
    evolucao[idx] = registroAtualizado;
  } else {
    evolucao.push(registroAtualizado);
    evolucao.sort(
      (a, b) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0)
    );
  }

  let variacaoPeso: number | null = null;
  let variacaoCircunferencia: number | null = null;
  let scoreCheckInSemanal: CheckInSemanalScoreResultado | null = null;

  if (!ehMarcoZero) {
    const variacoes = calcularVariacoesSemanaCliente(
      paciente,
      evolucao,
      semana,
      peso,
      circunferenciaAbdominal
    );
    variacaoPeso = variacoes.variacaoPeso;
    variacaoCircunferencia = variacoes.variacaoCircunferencia;

    scoreCheckInSemanal = calcularScoreCheckInSemanal({
      variacaoPeso,
      variacaoCircunferencia,
      temCircunferenciaAtual:
        circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal),
      checkInSemanal: registroAtualizado.checkInSemanal,
    });

    const registroIdx = evolucao.findIndex((e) => (e.weekIndex ?? e.numeroSemana) === semana);
    if (registroIdx >= 0 && scoreCheckInSemanal) {
      evolucao[registroIdx] = {
        ...evolucao[registroIdx],
        checkInSemanalScore: scoreParaRegistro(scoreCheckInSemanal, semana),
      };
    }
  }

  let pacienteAtualizado: PacienteCompleto = {
    ...paciente,
    evolucaoSeguimento: evolucao,
  };

  pacienteAtualizado = pacienteComMedidasIniciaisAtualizadasPelaSemana1(
    pacienteAtualizado,
    semana,
    peso,
    circunferenciaAbdominal
  );

  if (semana > 0 && doseMg > 0) {
    pacienteAtualizado = pacienteComDoseMgSemanaAtualizada(pacienteAtualizado, semana, doseMg);
  }

  if (!pacienteAtualizado.id) {
    throw new Error('Paciente sem ID.');
  }

  await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
  const recarregado = await PacienteService.getPacienteById(pacienteAtualizado.id);

  return {
    paciente: recarregado || pacienteAtualizado,
    variacaoPeso,
    variacaoCircunferencia,
    scoreCheckInSemanal,
  };
}
