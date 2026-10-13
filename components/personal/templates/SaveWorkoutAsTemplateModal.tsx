'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import {
  validatePersonalWorkoutTemplate,
  workoutDraftToTemplateExercises,
} from '@/lib/personal/planosTreino';
import type { SelectedExerciseDraft } from '@/lib/personal/workoutDraft';
import { WORKOUT_LIBRARY_MODAL_Z } from '@/components/personal/templates/ImportWorkoutTemplateModal';

export function SaveWorkoutAsTemplateModal({
  open,
  uid,
  suggestedName,
  exercises,
  onClose,
}: {
  open: boolean;
  uid: string;
  suggestedName: string;
  exercises: SelectedExerciseDraft[];
  onClose: () => void;
}) {
  const [nome, setNome] = useState(suggestedName);
  const [descricao, setDescricao] = useState('');
  const [preserveLoads, setPreserveLoads] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setNome(suggestedName.trim() || '');
    setDescricao('');
    setPreserveLoads(false);
    setSaving(false);
    setErro(null);
    setSaved(false);
  }, [open, suggestedName]);

  const salvar = async () => {
    if (!uid) {
      setErro('Faça login para salvar na biblioteca.');
      return;
    }
    const exercicios = workoutDraftToTemplateExercises(exercises, { preserveLoads });
    const check = validatePersonalWorkoutTemplate({ nome, exercicios });
    if (!check.ok) {
      setErro(check.message);
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      await PersonalPlanosTreinoService.salvar(uid, {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        exercicios,
      });
      setSaved(true);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o modelo.');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4"
      style={{ zIndex: WORKOUT_LIBRARY_MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-workout-template-title"
    >
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full lg:max-w-md max-h-[min(88dvh,640px)] flex flex-col overflow-hidden rounded-t-2xl lg:rounded-xl border border-white/10 bg-[#0A1F44] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.55)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id="save-workout-template-title" className="text-sm font-semibold text-[#E8EDED]">
              {saved ? 'Modelo salvo' : 'Salvar treino na Biblioteca'}
            </h3>
            {!saved ? (
              <p className="text-[11px] text-[#E8EDED]/55 mt-0.5">
                Transforme este treino em um modelo reutilizável.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#E8EDED]/70 hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-3">
          {saved ? (
            <p className="text-sm text-[#E8EDED]">Modelo salvo na Biblioteca.</p>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#E8EDED]/70">Nome do modelo</span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Peito + Tríceps — Hipertrofia"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 outline-none focus:ring-2 focus:ring-[#4CCB7A]/35"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#E8EDED]/70">Descrição</span>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Opcional..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 resize-none"
                />
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <input
                  type="checkbox"
                  checked={preserveLoads}
                  onChange={(e) => setPreserveLoads(e.target.checked)}
                  className="mt-0.5 accent-[#4CCB7A]"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#E8EDED]">Salvar as cargas atuais</span>
                  <span className="block text-[11px] text-[#E8EDED]/55 mt-1">
                    Se desmarcado, repetições e descansos serão mantidos, mas as cargas serão deixadas em
                    branco para você individualizar em cada aluno.
                  </span>
                </span>
              </label>
              {erro ? <p className="text-xs text-red-300">{erro}</p> : null}
            </>
          )}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-white/10 flex gap-2">
          {saved ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d]"
            >
              Continuar no treino
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] text-xs font-semibold hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={saving || !nome.trim() || exercises.length < 1}
                className="flex-1 h-10 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d] disabled:opacity-45"
              >
                {saving ? 'Salvando modelo...' : 'Salvar modelo'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SaveWorkoutAsTemplateModal;
