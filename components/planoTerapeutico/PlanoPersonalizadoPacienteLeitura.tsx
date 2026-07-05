'use client';



import { formatarMetaKg, formatarPrazoMeses } from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';

import { formatarMoedaBRL, formatarPesoKg } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';

import { LABEL_ANALISE_EXAMES } from '@/lib/treatment-negotiation/constants';

import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';

import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';



type Props = {

  plano: PlanoTratamentoUnificado;

  parametros: ParametrosPlanoPersonalizadoEditavel;

  pesoAlvo: number | null;

};



function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {

  return (

    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5">

      <p className="text-[10px] uppercase tracking-wide text-slate-500">{rotulo}</p>

      <p className="font-semibold text-slate-900 mt-0.5">{valor}</p>

    </div>

  );

}



export default function PlanoPersonalizadoPacienteLeitura({

  plano,

  parametros,

  pesoAlvo,

}: Props) {

  const est = plano.estimativa;



  return (

    <div className="space-y-4">

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">

        <p className="text-sm font-semibold text-amber-950">{parametros.nomePlano}</p>

        {parametros.descricaoCurta ? (

          <p className="text-xs text-amber-900/80 mt-1">{parametros.descricaoCurta}</p>

        ) : null}

        <p className="text-xs text-amber-900/80 mt-2 leading-relaxed">

          Proposta preparada pelo seu médico com base na sua meta e no acompanhamento combinado.

        </p>

      </div>



      {parametros.observacoesMedico ? (

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">

          <p className="text-[10px] uppercase tracking-wide text-slate-500">Observações do médico</p>

          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{parametros.observacoesMedico}</p>

        </div>

      ) : null}



      <div className="grid grid-cols-2 gap-3 text-sm">

        <LinhaResumo

          rotulo="Prazo"

          valor={`${formatarPrazoMeses(est.duracaoMeses, { usarClampSlider: false })} · ${est.duracaoSemanas} semanas`}

        />

        <LinhaResumo rotulo="Meta" valor={formatarMetaKg(parametros.metaKg)} />

        <LinhaResumo rotulo="Dose inicial" valor={`${parametros.doseMensalMg} mg`} />

        <LinhaResumo rotulo="Dose total" valor={`${est.quantidadeMedicacaoMg} mg`} />

        {pesoAlvo != null && (

          <LinhaResumo rotulo="Peso alvo" valor={formatarPesoKg(pesoAlvo)} />

        )}

        <LinhaResumo rotulo="Consultas" valor={`${parametros.consultas}`} />

        <LinhaResumo rotulo="Bioimpedâncias" valor={`${parametros.bioimpedancias}`} />

        <LinhaResumo rotulo={LABEL_ANALISE_EXAMES} valor={`${parametros.exames}`} />

        <LinhaResumo rotulo="Aplicações" valor={`${parametros.aplicacoesTotal}`} />

      </div>



      {parametros.examesDescricao ? (

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">

          <p className="text-[10px] uppercase tracking-wide text-slate-500">{LABEL_ANALISE_EXAMES}</p>

          <p className="text-sm text-slate-700 mt-1">{parametros.examesDescricao}</p>

        </div>

      ) : null}



      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">

        <p className="text-[10px] uppercase tracking-wide text-slate-500">Investimento proposto</p>

        <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">

          {formatarMoedaBRL(plano.valorTotal)}

        </p>

      </div>

    </div>

  );

}


