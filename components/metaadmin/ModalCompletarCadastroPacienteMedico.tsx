'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PacienteCompleto } from '@/types/obesidade';
import MetaPacienteWizard from '@/components/meta/MetaPacienteWizard';
import { PacienteService } from '@/services/pacienteService';
import { pickNonEmptyMedicoResponsavelId } from '@/lib/metaadmin/medicoResponsavelIdOnUpdate';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import {
  isMetaChatInicialCompleto,
  META_CHAT_INTRO_SESSION_KEY,
} from '@/lib/meta/metaChatInicial';

type Props = {
  open: boolean;
  paciente: PacienteCompleto | null;
  onClose: () => void;
  /** Chamado após fechar (ex.: recarregar lista de pacientes). */
  onFinished?: () => void;
};

/**
 * Modal para o médico completar etapas pendentes do cadastro inicial do paciente
 * (mesmo fluxo do wizard /meta), após aceitar com cadastro incompleto.
 */
export default function ModalCompletarCadastroPacienteMedico({
  open,
  paciente: pacienteInicial,
  onClose,
  onFinished,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(pacienteInicial);
  const [saving, setSaving] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !pacienteInicial) return;
    try {
      sessionStorage.setItem(META_CHAT_INTRO_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setPaciente(pacienteInicial);
    setWizardKey((k) => k + 1);
  }, [open, pacienteInicial]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    onFinished?.();
  }, [onClose, onFinished]);

  const handleSave = useCallback(
    async (_closeAfter?: boolean, pacienteAtualizado?: PacienteCompleto) => {
      const payload = pacienteAtualizado || paciente;
      if (!payload) return;
      const medicoResponsavelId = pickNonEmptyMedicoResponsavelId(
        payload.medicoResponsavelId,
        paciente?.medicoResponsavelId
      );
      await PacienteService.createOrUpdatePaciente({ ...payload, medicoResponsavelId });
      setPaciente({ ...payload, medicoResponsavelId });
    },
    [paciente]
  );

  const handleChatInicialCompleto = useCallback(async () => {
    const email = (paciente?.email || paciente?.dadosIdentificacao?.email || '').trim();
    if (!email) return;
    try {
      await SolicitacaoMedicoService.marcarChatInicialCompletoPorPaciente(
        email,
        paciente?.medicoResponsavelId || undefined
      );
    } catch (err) {
      console.error('Erro ao marcar chat inicial completo (médico):', err);
    }
  }, [paciente]);

  if (!open || !mounted || !paciente || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(92dvh,820px)] sm:max-w-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="completar-cadastro-medico-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 bg-emerald-50 px-4 py-3">
          <h2
            id="completar-cadastro-medico-title"
            className="text-sm font-semibold text-emerald-900"
          >
            Completar cadastro do paciente
          </h2>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            Preencha as etapas pendentes. As respostas serão salvas no cadastro do paciente.
            {isMetaChatInicialCompleto(paciente)
              ? ' Cadastro já completo — você pode fechar.'
              : null}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <MetaPacienteWizard
            key={wizardKey}
            paciente={paciente}
            setPaciente={(update) => {
              setPaciente((prev) => {
                if (!prev) return prev;
                return typeof update === 'function' ? update(prev) : update;
              });
            }}
            embedded
            chatTitle={paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente'}
            chatSubtitle="Cadastro inicial"
            onClose={handleClose}
            onSave={handleSave}
            saving={saving}
            setSaving={setSaving}
            onChatInicialCompleto={handleChatInicialCompleto}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
