'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Circle, Loader2, MinusCircle } from 'lucide-react';
import type { CompartilhamentoAceiteRole } from '@/lib/compartilhamento/buildCompartilhamentoAceiteWhatsappMessages';
import {
  checkMedicoWhatsappConectado,
  enviarAvisoSolicitacaoCompartilhamento,
} from '@/lib/compartilhamento/notifySolicitacaoWhatsappClient';

type StepStatus = 'pending' | 'running' | 'done' | 'warning' | 'error';

type Step = { status: StepStatus; label: string };

type EnvioState = {
  profissionalNome: string;
  criar: Step;
  conexao: Step;
  aviso: Step;
  finished: boolean;
  success: boolean;
};

const ICONS: Record<StepStatus, ReactNode> = {
  pending: <Circle className="h-5 w-5 text-gray-300" />,
  running: <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />,
  done: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  warning: <MinusCircle className="h-5 w-5 text-amber-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-600" />,
};

function CompartilhamentoEnvioModal({
  state,
  onClose,
}: {
  state: EnvioState;
  onClose: () => void;
}) {
  const steps = [state.criar, state.conexao, state.aviso];
  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          {state.finished
            ? state.success
              ? 'Solicitação enviada'
              : 'Não foi possível concluir'
            : 'Enviando solicitação…'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">Compartilhamento com {state.profissionalNome}</p>

        <ul className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{ICONS[step.status]}</span>
              <span
                className={`text-sm ${
                  step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          disabled={!state.finished}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {state.finished ? 'Fechar' : 'Aguarde…'}
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * Cria a solicitação de compartilhamento e avisa o profissional pelo WhatsApp,
 * mostrando cada etapa num modal até a confirmação.
 */
export function useCompartilhamentoEnvio() {
  const [state, setState] = useState<EnvioState | null>(null);

  const run = useCallback(
    async (input: {
      role: CompartilhamentoAceiteRole;
      profissionalNome: string;
      create: () => Promise<string>;
    }): Promise<boolean> => {
      const nome = input.profissionalNome || (input.role === 'nutricionista' ? 'o nutricionista' : 'o personal');
      const update = (patch: Partial<EnvioState>) =>
        setState((prev) => (prev ? { ...prev, ...patch } : prev));

      setState({
        profissionalNome: nome,
        criar: { status: 'running', label: 'Criando a solicitação de compartilhamento…' },
        conexao: { status: 'pending', label: 'Verificar conexão do seu WhatsApp' },
        aviso: { status: 'pending', label: `Avisar ${nome} pelo WhatsApp` },
        finished: false,
        success: false,
      });

      let solicitacaoId: string;
      try {
        solicitacaoId = await input.create();
      } catch (error) {
        update({
          criar: {
            status: 'error',
            label: error instanceof Error ? error.message : 'Erro ao criar a solicitação.',
          },
          finished: true,
        });
        return false;
      }

      update({
        criar: { status: 'done', label: 'Solicitação de compartilhamento criada.' },
        conexao: { status: 'running', label: 'Verificando a conexão do seu WhatsApp…' },
      });

      const conectado = await checkMedicoWhatsappConectado();
      update({
        conexao: conectado
          ? { status: 'done', label: 'Seu WhatsApp está conectado.' }
          : {
              status: 'warning',
              label: 'Seu WhatsApp está desconectado. O aviso vai pelo Canal Chat.',
            },
        aviso: { status: 'running', label: `Enviando o aviso para ${nome}…` },
      });

      const result = await enviarAvisoSolicitacaoCompartilhamento(solicitacaoId, input.role);
      const aviso: Step =
        result.status === 'sent'
          ? {
              status: 'done',
              label:
                result.via === 'canal_chat'
                  ? `Aviso enviado para ${nome} pelo Canal Chat.`
                  : `Aviso enviado para ${nome} pelo seu WhatsApp.`,
            }
          : {
              status: 'warning',
              label: `Não foi possível avisar ${nome}${result.error ? `: ${result.error}` : '.'} A solicitação já aparece para ${nome} na aba Pacientes.`,
            };
      const conexaoReal: Partial<EnvioState> =
        result.via === 'medico'
          ? { conexao: { status: 'done', label: 'Seu WhatsApp está conectado.' } }
          : result.via === 'canal_chat' && conectado
            ? {
                conexao: {
                  status: 'warning',
                  label: 'Seu WhatsApp não conseguiu enviar. O aviso foi pelo Canal Chat.',
                },
              }
            : {};
      update({ ...conexaoReal, aviso, finished: true, success: true });
      return true;
    },
    []
  );

  const modal = state ? <CompartilhamentoEnvioModal state={state} onClose={() => setState(null)} /> : null;

  return { run, modal, busy: Boolean(state && !state.finished) };
}
