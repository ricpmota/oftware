import type { PacienteCompleto } from '@/types/obesidade';

export type RespostaSimNao = 'sim' | 'nao';

export const TRIAGEM_SIM_NAO = [
  { value: 'sim' as const, label: 'Sim' },
  { value: 'nao' as const, label: 'Não' },
];

type TriagemHumor = NonNullable<PacienteCompleto['dadosClinicos']['triagemHumor']>;

export function lerTriagemHumor(
  dc: PacienteCompleto['dadosClinicos'] | undefined
): TriagemHumor {
  return dc?.triagemHumor ?? {};
}

export function respostaDepressao(dc: PacienteCompleto['dadosClinicos'] | undefined): RespostaSimNao | undefined {
  const v = lerTriagemHumor(dc).depressaoOuAnedonia30Dias;
  return v === 'sim' || v === 'nao' ? v : undefined;
}

export function respostaIdeacao(dc: PacienteCompleto['dadosClinicos'] | undefined): RespostaSimNao | undefined {
  const v = lerTriagemHumor(dc).ideacaoSuicida12Meses;
  return v === 'sim' || v === 'nao' ? v : undefined;
}

export function rotuloSimNao(v: RespostaSimNao | undefined): string {
  if (v === 'sim') return 'Sim';
  if (v === 'nao') return 'Não';
  return '';
}

export function comRespostaTriagemHumor(
  p: PacienteCompleto,
  campo: keyof TriagemHumor,
  valor: RespostaSimNao
): PacienteCompleto {
  return {
    ...p,
    dadosClinicos: {
      ...p.dadosClinicos,
      triagemHumor: {
        ...lerTriagemHumor(p.dadosClinicos),
        [campo]: valor,
      },
    },
  };
}
