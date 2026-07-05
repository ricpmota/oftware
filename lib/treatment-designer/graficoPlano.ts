import {

  PERDA_SEMANAL_MAX_KG,

  PERDA_SEMANAL_MIN_KG,

} from '@/lib/planoTerapeutico/escadinhaDose';

import {

  faseIdNaSemana,

  montarFasesVisuaisPlano,

} from '@/lib/planoTerapeutico/curvaPesoPlano';

import { pesoNaSemanaPorPerdaSemanal } from '@/lib/planoTerapeutico/faixaPerdaPeso';

import { limitarPerdaKgAoTeto } from '@/lib/planoTerapeutico/limitePerdaPonderal';

import {

  perdaSemanalEsperadaPorRitmo,

  type RitmoEvolucaoClinica,

} from '@/lib/treatment-designer/marcosClinicosEsperados';

import type {

  FaseTratamentoSegmento,

  MarcoClinicoDef,

  MarcoClinicoGrafico,

  MarcadorTimelineTratamento,

  PontoGraficoTratamento,

  PlanoTratamentoUnificado,

} from '@/lib/treatment-designer/types';



function arredondar1(n: number): number {

  return Math.round(n * 10) / 10;

}



const CORES_FASE: Record<FaseTratamentoSegmento['id'], string> = {

  adaptacao: 'rgba(148, 163, 184, 0.1)',

  perda_peso: 'rgba(16, 185, 129, 0.09)',

  consolidacao: 'rgba(59, 130, 246, 0.08)',

  pos_meta: 'rgba(99, 102, 241, 0.07)',

};



export function coresFaseGrafico(): typeof CORES_FASE {

  return CORES_FASE;

}



export function montarDadosGraficoTratamento(

  plano: PlanoTratamentoUnificado,

  pesoAlvoKg: number | null

): PontoGraficoTratamento[] {

  const semanas = plano.estimativa.duracaoSemanas;

  const pesoInicio =

    plano.curvaPeso.find((p) => p.semana === 0)?.pesoKg ??

    plano.curvaPeso[0]?.pesoKg ??

    80;



  const pesoAlvo =

    pesoAlvoKg ??

    plano.curvaPeso[plano.curvaPeso.length - 1]?.pesoKg ??

    pesoInicio;

  const semanaMeta = Math.min(

    Math.max(1, plano.semanaMetaAtingida),

    Math.max(1, semanas)

  );

  const fases =

    plano.fases.length > 0

      ? plano.fases

      : montarFasesVisuaisPlano(semanas, semanaMeta);



  const marcadoresPorSemana = new Map<number, MarcadorTimelineTratamento[]>();

  for (const m of plano.marcadores) {

    const lista = marcadoresPorSemana.get(m.semana) ?? [];

    lista.push(m);

    marcadoresPorSemana.set(m.semana, lista);

  }



  const pontos: PontoGraficoTratamento[] = [];



  for (let s = 0; s <= semanas; s++) {

    const curva =

      plano.curvaPeso.find((p) => p.semana === s) ??

      plano.curvaPeso[plano.curvaPeso.length - 1];



    let pesoPerdaMinKg: number | null = null;

    let pesoPerdaMaxKg: number | null = null;



    if (s === 0) {

      pesoPerdaMinKg = pesoInicio;

      pesoPerdaMaxKg = pesoInicio;

    } else if (s <= semanaMeta) {

      const minBruto = pesoNaSemanaPorPerdaSemanal(pesoInicio, s, PERDA_SEMANAL_MAX_KG);

      const maxBruto = pesoNaSemanaPorPerdaSemanal(pesoInicio, s, PERDA_SEMANAL_MIN_KG);

      const perdaMin = limitarPerdaKgAoTeto(pesoInicio, pesoInicio - minBruto);

      const perdaMax = limitarPerdaKgAoTeto(pesoInicio, pesoInicio - maxBruto);

      pesoPerdaMinKg = arredondar1(Math.max(pesoAlvo, pesoInicio - perdaMax));

      pesoPerdaMaxKg = arredondar1(Math.max(pesoAlvo, pesoInicio - perdaMin));

    } else {

      pesoPerdaMinKg = arredondar1(pesoAlvo);

      pesoPerdaMaxKg = arredondar1(pesoAlvo);

    }



    const faseId = faseIdNaSemana(fases, s);



    pontos.push({

      semana: s,

      semanaLabel: s === 0 ? 'Início' : `S${s}`,

      pesoPrevisto: curva?.pesoKg ?? null,

      pesoPerdaMaxKg,

      pesoPerdaMinKg,

      pesoAlvo: pesoAlvoKg,

      doseSemanalMg:

        s === 0

          ? 0

          : plano.dosesSemanais[Math.min(s - 1, plano.dosesSemanais.length - 1)] ?? 0,

      marcadores: marcadoresPorSemana.get(s) ?? [],

      semanaMetaAtingida: plano.semanaMetaAtingida,

      faseId,

      extensao: {

        faseId,

        oi: undefined,

        marcosNaSemana: plano.marcosClinicos

          .filter((mc) => mc.semana === s)

          .map((mc) => mc.id),

      },

    });

  }

  return pontos;

}



function labelSemanaGrafico(semana: number): string {

  return semana === 0 ? 'Início' : `S${semana}`;

}



function rotuloCurtoMarcoGrafico(marco: MarcoClinicoDef): string {

  if (marco.id === 'meta_atingida') return 'Meta';

  if (marco.perdaPercentual != null) {

    const pct = marco.perdaPercentual;

    return Number.isInteger(pct)

      ? `${pct}%`

      : `${pct.toFixed(1).replace('.', ',')}%`;

  }

  return marco.rotulo;

}



/** Posiciona marcos clínicos na curva do ritmo selecionado. */

export function montarMarcosClinicosGrafico(

  marcos: MarcoClinicoDef[],

  pesoInicialKg: number,

  ritmo: RitmoEvolucaoClinica

): MarcoClinicoGrafico[] {

  if (pesoInicialKg <= 0 || marcos.length === 0) return [];



  const perdaSemanal = perdaSemanalEsperadaPorRitmo(ritmo);

  return marcos

    .filter((m) => m.semana > 0)

    .map((marco) => ({

      id: marco.id,

      rotulo: marco.rotulo,

      rotuloCurto: rotuloCurtoMarcoGrafico(marco),

      semana: marco.semana,

      semanaLabel: labelSemanaGrafico(marco.semana),

      pesoKg: pesoNaSemanaPorPerdaSemanal(pesoInicialKg, marco.semana, perdaSemanal),

      perdaPercentual: marco.perdaPercentual,

    }));

}


