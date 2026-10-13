import type { PacienteCompleto } from '@/types/obesidade';

/** Assinatura do que o questionário de aplicação altera (evolução + datas das semanas). */
export function assinaturaAplicacaoPaciente(p: PacienteCompleto | null | undefined): string {
  if (!p) return '';
  const ev = p.evolucaoSeguimento || [];
  const evPart = ev
    .map((e) => {
      const w = e.weekIndex ?? e.numeroSemana ?? 0;
      const q = e.doseAplicada?.quantidade ?? '';
      const peso = e.peso ?? '';
      const adh = e.adherence ?? e.adesao ?? '';
      return `${w}:${q}:${peso}:${adh}`;
    })
    .join('|');
  const datas = p.planoTerapeutico?.datasAplicacaoIndividuais || {};
  const datasPart = Object.keys(datas)
    .sort()
    .map((k) => `${k}=${datas[k] ?? ''}`)
    .join(',');
  const mi = p.dadosClinicos?.medidasIniciais;
  return `${evPart}#${datasPart}#${mi?.peso ?? ''}:${mi?.circunferenciaAbdominal ?? ''}`;
}

/**
 * Espelha no paciente aberto no modal os dados que o questionário de aplicação grava,
 * sem descartar edições locais do médico (doses, semanas, metas, etc.).
 */
export function mesclarDadosAplicacaoDoServidor(
  local: PacienteCompleto,
  fresh: PacienteCompleto
): PacienteCompleto {
  const medidasFresh = fresh.dadosClinicos?.medidasIniciais;
  const planoLocal = local.planoTerapeutico;
  const planoFresh = fresh.planoTerapeutico;

  return {
    ...local,
    evolucaoSeguimento: fresh.evolucaoSeguimento ?? local.evolucaoSeguimento,
    marcoZero: fresh.marcoZero ?? local.marcoZero,
    dadosClinicos: {
      ...local.dadosClinicos,
      ...(medidasFresh ? { medidasIniciais: medidasFresh } : {}),
    },
    planoTerapeutico: planoLocal
      ? {
          ...planoLocal,
          datasAplicacaoIndividuais:
            planoFresh?.datasAplicacaoIndividuais ?? planoLocal.datasAplicacaoIndividuais,
        }
      : planoFresh,
  };
}

export function aplicarDadosAplicacaoSeMudou(
  local: PacienteCompleto | null,
  fresh: PacienteCompleto | null | undefined
): PacienteCompleto | null {
  if (!local?.id || !fresh || fresh.id !== local.id) return local;
  if (assinaturaAplicacaoPaciente(local) === assinaturaAplicacaoPaciente(fresh)) return local;
  return mesclarDadosAplicacaoDoServidor(local, fresh);
}
