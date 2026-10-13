'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { inputClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import { AnamneseCheckGroup, AnamneseCheckItem } from '@/components/meta/anamneseChecklistUi';
import {
  COMORBIDADES_GRUPOS,
  COMORBIDADES_NENHUMA,
} from '@/lib/meta/metaChatInicial/constants';
import {
  alternarComorbidade,
  comorbidadesLegadoMarcadas,
  pacienteComComorbidades,
} from '@/lib/meta/metaChatInicial/comorbidades';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  tone?: 'light' | 'dark';
};

export default function ComorbidadesChecklist({ paciente, setPaciente, tone = 'light' }: Props) {
  const atual = (paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
  const legado = comorbidadesLegadoMarcadas(atual);
  const dark = tone === 'dark';

  const aplicar = (key: string) => {
    setPaciente((p) =>
      pacienteComComorbidades(
        p,
        alternarComorbidade((p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>, key)
      )
    );
  };

  const item = (key: string, label: string) => (
    <AnamneseCheckItem
      key={key}
      label={label}
      checked={Boolean(atual[key])}
      onChange={() => aplicar(key)}
      tone={tone}
    />
  );

  return (
    <div className="space-y-3">
      {COMORBIDADES_GRUPOS.map((grupo) => (
        <AnamneseCheckGroup key={grupo.id} title={grupo.titulo} tone={tone}>
          {grupo.opcoes.map((opcao) => item(opcao.key, opcao.label))}
        </AnamneseCheckGroup>
      ))}

      <AnamneseCheckGroup tone={tone}>
        {item(COMORBIDADES_NENHUMA.key, COMORBIDADES_NENHUMA.label)}
      </AnamneseCheckGroup>

      {legado.length > 0 && (
        <section className={`rounded-2xl px-2.5 py-2.5 ${dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'}`}>
          <h3 className={`mb-1.5 px-2 text-[13px] font-semibold tracking-tight ${dark ? 'text-[#E8EDED]/70' : 'text-slate-500'}`}>
            Respostas anteriores
          </h3>
          <div className="mt-1">{legado.map((opcao) => item(opcao.key, opcao.label))}</div>
          {Boolean(atual.outra) && (
            <input
              type="text"
              className={
                dark
                  ? 'mt-2 w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40'
                  : `mt-2 ${inputClassName}`
              }
              value={String(atual.outraDescricao || '')}
              onChange={(e) => {
                const texto = e.target.value;
                setPaciente((p) => {
                  const cur = (p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
                  return pacienteComComorbidades(p, { ...cur, outraDescricao: texto });
                });
              }}
              placeholder="Qual?"
            />
          )}
        </section>
      )}
    </div>
  );
}
