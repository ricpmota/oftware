import {
  calcularDoseTitulacaoMg,
  DOSE_INICIAL_PADRAO_MG,
} from '@/lib/tirzepatida/doseTitulacao';

/**
 * Calendário de doses (mesma lógica da Pasta 7 e do cron de e-mail de aplicação).
 */
export function criarCalendarioDoses(
  planoTerapeutico: any,
  evolucaoSeguimento: any[]
): Array<{
  data: Date;
  semana: number;
  dose: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura';
}> {
  if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
    return [];
  }

  const diasSemana: { [key: string]: number } = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };

  const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];

  const startDateValue = planoTerapeutico.startDate;
  const primeiraDose = startDateValue.toDate ? startDateValue.toDate() : new Date(startDateValue);
  primeiraDose.setHours(0, 0, 0, 0);
  while (primeiraDose.getDay() !== diaDesejado) {
    primeiraDose.setDate(primeiraDose.getDate() + 1);
  }

  const doseInicial = planoTerapeutico.currentDoseMg || DOSE_INICIAL_PADRAO_MG;
  const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;

  const calendario: Array<{
    data: Date;
    semana: number;
    dose: number;
    status: 'tomada' | 'perdida' | 'hoje' | 'futura';
  }> = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const evolucao = (evolucaoSeguimento || []).map((e: any) => ({
    ...e,
    dataRegistro: e.dataRegistro?.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro),
  }));

  const calcularDoseComAtrasos = (semanaIndex: number) => {
    let semanasDesdeUltimoCiclo = semanaIndex;

    for (let s = 0; s < semanaIndex; s++) {
      const dataPrevista = new Date(primeiraDose);
      dataPrevista.setDate(primeiraDose.getDate() + s * 7);

      const registro = evolucao.find((e: any) => {
        if (!e.dataRegistro) return false;
        const dataRegistro =
          e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro);
        if (isNaN(dataRegistro.getTime())) return false;
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
        return diffDias <= 1;
      });

      if (registro && registro.dataRegistro) {
        const dataRegistro =
          registro.dataRegistro instanceof Date
            ? new Date(registro.dataRegistro)
            : new Date(registro.dataRegistro);
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDias >= 4) {
          semanasDesdeUltimoCiclo = semanaIndex - s - 1;
          break;
        }
      }
    }

    return calcularDoseTitulacaoMg(doseInicial, semanasDesdeUltimoCiclo);
  };

  const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];

  for (let semana = 0; semana < numeroSemanas; semana++) {
    const semanaNum = semana + 1;

    if (semanasCanceladas.includes(semanaNum)) {
      continue;
    }

    const dataDose = new Date(primeiraDose);
    dataDose.setDate(primeiraDose.getDate() + semana * 7);

    const dosePlanejada = calcularDoseComAtrasos(semana);

    const registroEvolucao = evolucao.find((e: any) => {
      if (!e.dataRegistro) return false;
      const dataRegistro =
        e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro);
      if (isNaN(dataRegistro.getTime())) return false;
      dataRegistro.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1;
    });

    let doseReal = dosePlanejada;
    if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semana + 1]) {
      doseReal = planoTerapeutico.esquemaDosesCustomizado[semana + 1];
    } else if (registroEvolucao?.doseAplicada) {
      doseReal = registroEvolucao.doseAplicada.quantidade || dosePlanejada;
    }

    let status: 'tomada' | 'perdida' | 'hoje' | 'futura';
    if (dataDose.getTime() === hoje.getTime()) {
      status = 'hoje';
    } else if (dataDose < hoje) {
      if (registroEvolucao && registroEvolucao.adherence && registroEvolucao.adherence !== 'MISSED') {
        status = 'tomada';
      } else {
        status = 'perdida';
      }
    } else {
      status = 'futura';
    }

    calendario.push({
      data: dataDose,
      semana: semana + 1,
      dose: doseReal,
      status,
    });
  }

  return calendario;
}
