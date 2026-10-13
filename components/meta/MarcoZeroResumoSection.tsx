'use client';

import type { MarcoZero } from '@/types/obesidade';
import { MetaAplicacaoDetalheLinha } from '@/components/meta/MetaAplicacaoDetalheLinha';

type Props = {
  marcoZero: MarcoZero;
};

export function MarcoZeroResumoSection({ marcoZero }: Props) {
  return (
    <div className="space-y-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 pb-1">
        Marco Zero do Tratamento
      </p>
      <MetaAplicacaoDetalheLinha label="Peso inicial" value={`${marcoZero.pesoInicial.toFixed(1)} kg`} />
      {marcoZero.circunferenciaInicial != null && (
        <MetaAplicacaoDetalheLinha
          label="Cintura inicial"
          value={`${marcoZero.circunferenciaInicial.toFixed(1)} cm`}
        />
      )}
      <MetaAplicacaoDetalheLinha label="Seu objetivo" value={marcoZero.objetivoPaciente} />
      <MetaAplicacaoDetalheLinha label="Motivação" value={marcoZero.motivacaoPrincipal} />
      <MetaAplicacaoDetalheLinha
        label="Fotos iniciais"
        value={marcoZero.possuiFotosIniciais ? 'Registradas' : 'Ainda não registradas'}
      />
    </div>
  );
}
