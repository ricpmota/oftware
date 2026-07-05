'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { MessageSquare, Send, UserRound } from 'lucide-react';
import {
  atualizarNegociacaoPacienteSessao,
  negociacaoPersistidaFromSalva,
  type NegociacaoTerapeuticaPersistida,
} from '@/lib/treatment-negotiation/negociacaoSessao';
import type { VistaPropostaNegociacao } from '@/lib/treatment-negotiation/types';
import type { PlanoTerapeuticoPublicoPayload } from '@/types/planoTerapeuticoInterativo';

type Props = {
  orcamentoId: string;
  token: string;
  negociacao: NegociacaoTerapeuticaPersistida;
  onAtualizar: (negociacao: NegociacaoTerapeuticaPersistida) => void;
  children: ReactNode;
};

function SwitchProposta({
  vista,
  onChange,
}: {
  vista: VistaPropostaNegociacao;
  onChange: (v: VistaPropostaNegociacao) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1"
      role="tablist"
      aria-label="Visualização da proposta"
    >
      <button
        type="button"
        role="tab"
        aria-selected={vista === 'medico'}
        onClick={() => onChange('medico')}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
          vista === 'medico'
            ? 'bg-white text-amber-900 shadow-sm border border-amber-200'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <UserRound className="w-3.5 h-3.5" />
        Proposta Médico
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={vista === 'paciente'}
        onClick={() => onChange('paciente')}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
          vista === 'paciente'
            ? 'bg-white text-teal-900 shadow-sm border border-teal-200'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Proposta Paciente
      </button>
    </div>
  );
}

async function patchNegociacaoPaciente(args: {
  orcamentoId: string;
  token: string;
  patch: { mensagemPaciente?: string; vistaProposta?: VistaPropostaNegociacao };
}): Promise<NegociacaoTerapeuticaPersistida | null> {
  const res = await fetch(
    `/api/plano-terapeutico/${encodeURIComponent(args.orcamentoId)}/negociacao?t=${encodeURIComponent(args.token)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args.patch),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok || !json.plano?.negociacaoTerapeutica) return null;
  const plano = json.plano as PlanoTerapeuticoPublicoPayload;
  const persistida = negociacaoPersistidaFromSalva(
    args.orcamentoId,
    plano.negociacaoTerapeutica!
  );
  if (!persistida) return null;
  atualizarNegociacaoPacienteSessao(args.orcamentoId, args.patch);
  return persistida;
}

export default function PropostaNegociacaoPacientePanel({
  orcamentoId,
  token,
  negociacao,
  onAtualizar,
  children,
}: Props) {
  const [mensagem, setMensagem] = useState(negociacao.mensagemPaciente ?? '');
  const [enviando, setEnviando] = useState(false);
  const vista = negociacao.vistaProposta ?? 'medico';

  const mensagemEnviada = useMemo(
    () => Boolean(negociacao.mensagemPaciente?.trim()),
    [negociacao.mensagemPaciente]
  );

  const handleVista = async (novaVista: VistaPropostaNegociacao) => {
    const atualizado = await patchNegociacaoPaciente({
      orcamentoId,
      token,
      patch: { vistaProposta: novaVista },
    });
    if (atualizado) onAtualizar(atualizado);
  };

  const handleEnviarMensagem = async () => {
    const texto = mensagem.trim();
    if (!texto) return;
    setEnviando(true);
    try {
      const atualizado = await patchNegociacaoPaciente({
        orcamentoId,
        token,
        patch: { mensagemPaciente: texto, vistaProposta: 'paciente' },
      });
      if (atualizado) onAtualizar(atualizado);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Proposta do plano personalizado</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Revise o que seu médico preparou ou envie sugestões de ajuste.
          </p>
        </div>
        <SwitchProposta vista={vista} onChange={(v) => void handleVista(v)} />
      </div>

      {vista === 'medico' ? (
        children
      ) : (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
          <p className="text-sm font-semibold text-teal-950">Sua proposta ao médico</p>
          <p className="text-xs text-teal-900/80 leading-relaxed">
            Descreva o que você gostaria de ajustar no plano — prazo, consultas, investimento ou
            outro ponto. Seu médico receberá sua mensagem na próxima consulta.
          </p>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={4}
            placeholder="Ex.: Gostaria de um prazo um pouco maior e menos consultas presenciais…"
            className="w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm resize-none"
          />
          <button
            type="button"
            onClick={() => void handleEnviarMensagem()}
            disabled={enviando || !mensagem.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {mensagemEnviada ? 'Atualizar mensagem' : 'Enviar ao médico'}
          </button>
          {mensagemEnviada && (
            <p className="text-xs text-teal-800">
              Mensagem enviada. Você pode editar e reenviar se quiser complementar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
