import type { PacienteCompleto, PlanoTerapeutico, SeguimentoSemanal } from '@/types/obesidade';

function jsonSafe(v: unknown): unknown {
  if (v == null) return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
  if (typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const next = jsonSafe(val);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return v;
}

function slimSeguimento(e: SeguimentoSemanal): Record<string, unknown> {
  const weekIndex = e.weekIndex ?? e.numeroSemana ?? 0;
  const doseQ = e.doseAplicada?.quantidade;
  return {
    weekIndex,
    numeroSemana: e.numeroSemana ?? weekIndex,
    peso: e.peso,
    circunferenciaAbdominal: e.circunferenciaAbdominal,
    doseAplicada:
      doseQ != null && Number(doseQ) > 0 ? { quantidade: Number(doseQ) } : undefined,
    adherence: e.adherence,
    adesao: e.adesao,
  };
}

function slimHistorico(plano: PlanoTerapeutico | undefined) {
  const hist = plano?.historicoProtocolosTirzepatida;
  if (!Array.isArray(hist)) return undefined;
  return hist.map((h) => ({
    id: h.id,
    indice: h.indice,
    semanaInicioCiclo: h.semanaInicioCiclo,
    numeroSemanasTratamento: h.numeroSemanasTratamento,
    metas: h.metas,
    conclusaoTratamento: h.conclusaoTratamento,
    startDate: h.startDate,
    dataInicioTratamento: h.dataInicioTratamento,
    injectionDayOfWeek: h.injectionDayOfWeek,
    currentDoseMg: h.currentDoseMg,
    esquemaDosesCustomizado: h.esquemaDosesCustomizado,
    semanasCanceladas: h.semanasCanceladas,
  }));
}

/**
 * Recorte público do paciente para o modal "Resultado do tratamento" em /aplicacao.
 * Sem e-mail, telefone, exames ou demais dados clínicos.
 */
export function buildPacienteResultadoPublico(
  paciente: PacienteCompleto | null | undefined
): PacienteCompleto | null {
  if (!paciente?.id) return null;
  const plano = paciente.planoTerapeutico;
  const slim = {
    id: paciente.id,
    userId: '',
    email: '',
    nome: (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente').trim(),
    medicoResponsavelId: null,
    dadosIdentificacao: {
      nomeCompleto: paciente.dadosIdentificacao?.nomeCompleto || paciente.nome,
      dataNascimento: paciente.dadosIdentificacao?.dataNascimento,
      sexoBiologico: paciente.dadosIdentificacao?.sexoBiologico,
      endereco: {
        cidade: paciente.dadosIdentificacao?.endereco?.cidade,
        estado: paciente.dadosIdentificacao?.endereco?.estado,
      },
    },
    dadosClinicos: {
      medidasIniciais: {
        peso: paciente.dadosClinicos?.medidasIniciais?.peso,
        circunferenciaAbdominal: paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal,
      },
    },
    estiloVida: {},
    examesLaboratoriais: [],
    planoTerapeutico: plano
      ? {
          numeroSemanasTratamento: plano.numeroSemanasTratamento,
          semanaInicioCiclo: plano.semanaInicioCiclo,
          currentDoseMg: plano.currentDoseMg,
          esquemaDosesCustomizado: plano.esquemaDosesCustomizado,
          semanasCanceladas: plano.semanasCanceladas,
          startDate: plano.startDate,
          dataInicioTratamento: plano.dataInicioTratamento,
          injectionDayOfWeek: plano.injectionDayOfWeek,
          metas: plano.metas,
          conclusaoTratamento: plano.conclusaoTratamento,
          historicoProtocolosTirzepatida: slimHistorico(plano),
          doseAtual: plano.doseAtual,
        }
      : {},
    evolucaoSeguimento: (paciente.evolucaoSeguimento || []).map(slimSeguimento),
    alertas: [],
    comunicacao: {},
    indicadores: {},
    dataCadastro: paciente.dataCadastro || new Date(),
    status: 'ativo',
    statusTratamento: paciente.statusTratamento || 'em_tratamento',
  };
  return jsonSafe(slim) as PacienteCompleto;
}
