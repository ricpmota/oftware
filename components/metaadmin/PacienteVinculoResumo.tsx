'use client';

import { useEffect, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import {
  loadCardapioResumo,
  loadTreinoResumo,
  type CardapioResumo,
  type TreinoResumo,
} from '@/lib/metaadmin/profissionalPacienteResumo';
import type { PacienteCompleto } from '@/types/obesidade';

function StatusChip({
  label,
  ok,
  tone,
}: {
  label: string;
  ok: boolean;
  tone: 'nutri' | 'personal';
}) {
  const okClass =
    tone === 'nutri'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : 'bg-amber-50 text-amber-800 ring-amber-200';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${
        ok ? okClass : 'bg-slate-50 text-slate-400 ring-slate-200'
      }`}
    >
      {ok ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : <Minus className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

export function PacienteVinculoResumoChips({
  kind,
  cardapio,
  treino,
  loading,
}: {
  kind: 'nutricionista' | 'personal';
  cardapio?: CardapioResumo;
  treino?: TreinoResumo;
  loading?: boolean;
}) {
  if (loading && !cardapio && !treino) {
    return <span className="text-[10px] text-slate-400">Carregando…</span>;
  }

  if (kind === 'nutricionista') {
    const realizada = Boolean(cardapio?.anamneseRealizada);
    return (
      <>
        <span
          className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Anamnese
        </span>
        {(cardapio?.refeicoes ?? []).map((refeicao, index) => (
          <StatusChip
            key={`${refeicao.key}-${index}`}
            label={refeicao.label}
            ok={refeicao.preenchida}
            tone="nutri"
          />
        ))}
      </>
    );
  }

  const realizada = Boolean(treino?.anamneseRealizada);
  return (
    <>
      <span
        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}
      >
        Anamnese
      </span>
      {(treino?.dias ?? []).map((dia) => (
        <StatusChip
          key={dia.weekday}
          label={dia.label}
          ok={dia.temTreino}
          tone="personal"
        />
      ))}
    </>
  );
}

export default function PacienteVinculoResumoInline({
  kind,
  paciente,
  cardapio: cardapioProp,
  treino: treinoProp,
  loading: loadingProp,
}: {
  kind: 'nutricionista' | 'personal';
  paciente: PacienteCompleto;
  cardapio?: CardapioResumo;
  treino?: TreinoResumo;
  loading?: boolean;
}) {
  const preloaded = cardapioProp !== undefined || treinoProp !== undefined || loadingProp !== undefined;
  const [cardapioLocal, setCardapio] = useState<CardapioResumo | undefined>();
  const [treinoLocal, setTreino] = useState<TreinoResumo | undefined>();
  const [loadingLocal, setLoading] = useState(!preloaded);

  useEffect(() => {
    if (preloaded) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      if (kind === 'nutricionista') {
        const data = await loadCardapioResumo(paciente.id);
        if (!cancelled) {
          setCardapio(data);
          setLoading(false);
        }
        return;
      }
      const data = await loadTreinoResumo(paciente);
      if (!cancelled) {
        setTreino(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, paciente.id, preloaded]);

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      <PacienteVinculoResumoChips
        kind={kind}
        cardapio={preloaded ? cardapioProp : cardapioLocal}
        treino={preloaded ? treinoProp : treinoLocal}
        loading={preloaded ? Boolean(loadingProp) : loadingLocal}
      />
    </div>
  );
}
