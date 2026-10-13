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
import { ehPrimeiraSemanaDoProtocolo } from '@/lib/aplicacao/resolverWeekIndexAplicacaoPublica';
import { pacienteComMedidasIniciaisAtualizadasPelaSemana1 } from '@/lib/aplicacao/pacienteComMedidasIniciaisAtualizadasPelaSemana1';
import { PacienteService } from '@/services/pacienteService';
import type { MarcoZero, PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { pacienteComDoseMgSemanaAtualizada } from '@/utils/esquemaDosesSemana';

export type ModoEdicaoAplicacaoMedico = 'marco_zero' | 'check_in';

function weekIndexOf(e: SeguimentoSemanal): number {
  return e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana ?? 0;
}

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
    applicationId: `medico-edit-${weekIndex}-${Date.now()}`,
  };
}

function buildMarcoZeroFromForm(
  form: Record<string, string>,
  peso: number,
  circunferenciaAbdominal: number | undefined,
  prev: MarcoZero | undefined
): MarcoZero {
  const motivacao = (form.motivacaoPrincipal || '').trim();
  const satisfacao = (form.satisfacaoAtual || '').trim();
  const objetivo = (form.objetivoPaciente || '').trim();
  const confianca = (form.confiancaNoObjetivo || '').trim();

  if (!motivacao || !satisfacao || !objetivo || !confianca) {
    throw new Error('Preencha todas as perguntas do Marco Zero.');
  }

  const marco: MarcoZero = {
    pesoInicial: peso,
    motivacaoPrincipal: motivacao,
    satisfacaoAtual: satisfacao,
    objetivoPaciente: objetivo,
    confiancaNoObjetivo: confianca,
    possuiFotosIniciais: prev?.possuiFotosIniciais ?? false,
    createdAt: prev?.createdAt ? new Date(prev.createdAt as Date) : new Date(),
  };

  if (circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal)) {
    marco.circunferenciaInicial = circunferenciaAbdominal;
  }

  return marco;
}

export function resolverModoEdicaoAplicacao(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal
): ModoEdicaoAplicacaoMedico {
  const semana = weekIndexOf(registro);
  if (ehPrimeiraSemanaDoProtocolo(paciente, semana)) {
    const marco = registro.marcoZero ?? (semana === 1 ? paciente.marcoZero : undefined);
    if (marco || !registro.checkInSemanal) return 'marco_zero';
  }
  return 'check_in';
}

export type SalvarEdicaoAplicacaoMedicoInput = {
  paciente: PacienteCompleto;
  registro: SeguimentoSemanal;
  doseMg: number;
  form: Record<string, string>;
  comentarioMedico?: string;
};

export type SalvarEdicaoAplicacaoMedicoResultado = {
  paciente: PacienteCompleto;
  modo: ModoEdicaoAplicacaoMedico;
  variacaoPeso: number | null;
  variacaoCircunferencia: number | null;
  scoreCheckInSemanal: CheckInSemanalScoreResultado | null;
};

export async function salvarEdicaoAplicacaoMedico(
  input: SalvarEdicaoAplicacaoMedicoInput
): Promise<SalvarEdicaoAplicacaoMedicoResultado> {
  const { paciente, registro, doseMg, form, comentarioMedico } = input;
  const semana = weekIndexOf(registro);
  if (semana < 1) throw new Error('Registro sem semana válida.');

  const peso = parseDecimalFormValue(form.peso);
  if (peso == null || peso <= 0) {
    throw new Error('Informe um peso válido.');
  }

  const circunferenciaAbdominal = parseDecimalFormValue(form.circunferenciaAbdominal);
  const modo = resolverModoEdicaoAplicacao(paciente, registro);
  const dataRegistro =
    registro.dataRegistro instanceof Date
      ? registro.dataRegistro
      : typeof (registro.dataRegistro as { toDate?: () => Date })?.toDate === 'function'
        ? (registro.dataRegistro as { toDate: () => Date }).toDate()
        : new Date(registro.dataRegistro as string | number);

  const horario =
    registro.doseAplicada?.horario ||
    dataRegistro.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const evolucao = [...(paciente.evolucaoSeguimento || [])];
  const idx = evolucao.findIndex(
    (e) => e.id === registro.id || weekIndexOf(e) === semana
  );
  if (idx < 0) throw new Error('Registro de aplicação não encontrado.');

  const base = { ...evolucao[idx] };
  let registroAtualizado: SeguimentoSemanal = {
    ...base,
    weekIndex: semana,
    numeroSemana: semana,
    dataRegistro,
    peso,
    circunferenciaAbdominal:
      circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal)
        ? circunferenciaAbdominal
        : undefined,
    doseAplicada: {
      quantidade: doseMg,
      data: dataRegistro,
      horario,
    },
    comentarioMedico:
      comentarioMedico !== undefined
        ? comentarioMedico.trim() || undefined
        : base.comentarioMedico,
  };

  let variacaoPeso: number | null = null;
  let variacaoCircunferencia: number | null = null;
  let scoreCheckInSemanal: CheckInSemanalScoreResultado | null = null;

  if (modo === 'marco_zero') {
    const prevMarco = base.marcoZero ?? paciente.marcoZero;
    const marcoZero = buildMarcoZeroFromForm(form, peso, circunferenciaAbdominal, prevMarco);
    registroAtualizado = {
      ...registroAtualizado,
      marcoZero,
      localAplicacao: undefined,
    };
    delete (registroAtualizado as { checkInSemanal?: unknown }).checkInSemanal;
    delete (registroAtualizado as { checkInSemanalScore?: unknown }).checkInSemanalScore;
    variacaoPeso = 0;
    variacaoCircunferencia =
      circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal) ? 0 : null;
  } else {
    const localAplicacao = localAplicacaoFromForm(form);
    if (!localAplicacao) {
      throw new Error('Informe o local da aplicação.');
    }
    const checkInSemanal = buildCheckInSemanalFromForm(form);
    if (!checkInSemanal) {
      throw new Error('Preencha as respostas do check-in semanal.');
    }
    if (base.checkInSemanal?.preenchidoEm) {
      checkInSemanal.preenchidoEm = base.checkInSemanal.preenchidoEm as Date;
    }

    registroAtualizado = {
      ...registroAtualizado,
      localAplicacao,
      checkInSemanal: checkInSemanal as SeguimentoSemanal['checkInSemanal'],
    };

    const variacoes = calcularVariacoesSemanaCliente(
      paciente,
      evolucao.map((e, i) => (i === idx ? registroAtualizado : e)),
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

    if (scoreCheckInSemanal) {
      registroAtualizado = {
        ...registroAtualizado,
        checkInSemanalScore: scoreParaRegistro(scoreCheckInSemanal, semana),
      };
    }
  }

  evolucao[idx] = registroAtualizado;

  let pacienteAtualizado: PacienteCompleto = {
    ...paciente,
    evolucaoSeguimento: evolucao,
  };

  if (modo === 'marco_zero' && registroAtualizado.marcoZero) {
    pacienteAtualizado = {
      ...pacienteAtualizado,
      marcoZero: registroAtualizado.marcoZero,
    };
  }

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
    modo,
    variacaoPeso,
    variacaoCircunferencia,
    scoreCheckInSemanal,
  };
}
