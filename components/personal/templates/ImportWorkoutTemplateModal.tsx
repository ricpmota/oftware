'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import type { ImportWorkoutMode, PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import { PersonalWorkoutTemplateSelectCard } from '@/components/personal/templates/PersonalWorkoutTemplateSelectCard';

/** Acima do FAB/sheet (220), abaixo da execução (230). */
export const WORKOUT_LIBRARY_MODAL_Z = 225;

export function ImportWorkoutTemplateModal({
  open,
  uid,
  currentExerciseCount,
  onClose,
  onImport,
  onGoToLibrary,
}: {
  open: boolean;
  uid: string;
  currentExerciseCount: number;
  onClose: () => void;
  onImport: (template: PersonalWorkoutTemplate, mode: ImportWorkoutMode) => boolean;
  onGoToLibrary?: () => void;
}) {
  const [planos, setPlanos] = useState<PersonalWorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState<PersonalWorkoutTemplate | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPendente(null);
      setBusca('');
      setErro(null);
      return;
    }
    if (!uid) {
      setErro('Faça login para acessar a biblioteca.');
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const lista = await PersonalPlanosTreinoService.listar(uid);
        if (!cancelled) setPlanos(lista);
      } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        if (!cancelled) setErro('Não foi possível carregar sua biblioteca.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, uid]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return planos;
    return planos.filter((plano) => plano.nome.toLowerCase().includes(q));
  }, [planos, busca]);

  const aplicar = (template: PersonalWorkoutTemplate, mode: ImportWorkoutMode) => {
    const ok = onImport(template, mode);
    if (!ok) {
      setErro('Não foi possível importar este modelo.');
      return;
    }
    setPendente(null);
    onClose();
  };

  const tentarUsar = (template: PersonalWorkoutTemplate) => {
    setErro(null);
    if (currentExerciseCount > 0) {
      setPendente(template);
      return;
    }
    aplicar(template, 'replace');
  };

  if (!open || !portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4"
      style={{ zIndex: WORKOUT_LIBRARY_MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-workout-template-title"
    >
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full lg:max-w-lg max-h-[min(88dvh,720px)] flex flex-col overflow-hidden rounded-t-2xl lg:rounded-xl border border-white/10 bg-[#0A1F44] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.55)] pb-[env(safe-area-inset-bottom,0px)]">
        {pendente ? (
          <>
            <div className="shrink-0 px-4 py-3 border-b border-white/10">
              <h3 id="import-workout-template-title" className="text-sm font-semibold text-[#E8EDED]">
                Este treino já possui {currentExerciseCount} exercício
                {currentExerciseCount === 1 ? '' : 's'}.
              </h3>
              <p className="text-[11px] text-[#E8EDED]/60 mt-1">
                Como deseja importar o modelo “{pendente.nome}”?
              </p>
            </div>
            <div className="p-4 space-y-2">
              {erro ? <p className="text-xs text-red-300">{erro}</p> : null}
              <button
                type="button"
                onClick={() => aplicar(pendente, 'replace')}
                className="w-full h-10 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d]"
              >
                Substituir treino atual
              </button>
              <button
                type="button"
                onClick={() => aplicar(pendente, 'append')}
                className="w-full h-10 rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] text-xs font-semibold hover:bg-white/15"
              >
                Adicionar ao treino atual
              </button>
              <button
                type="button"
                onClick={() => setPendente(null)}
                className="w-full h-10 rounded-lg text-[#E8EDED]/70 text-xs font-semibold hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 id="import-workout-template-title" className="text-sm font-semibold text-[#E8EDED]">
                  Puxar da Biblioteca
                </h3>
                <p className="text-[11px] text-[#E8EDED]/55 mt-0.5">
                  Escolha um treino salvo para usar como base.
                </p>
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
            <div className="shrink-0 px-4 py-2 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4CCB7A]" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar treino..."
                  className="w-full h-9 pl-8 pr-2 text-xs rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 outline-none focus:ring-2 focus:ring-[#4CCB7A]/35"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 space-y-2">
              {loading ? (
                <p className="py-10 text-center text-sm text-[#E8EDED]/60">Carregando biblioteca...</p>
              ) : erro ? (
                <p className="py-10 text-center text-sm text-red-300">{erro}</p>
              ) : filtrados.length === 0 ? (
                <div className="py-8 px-2 text-center space-y-3">
                  <p className="text-sm text-[#E8EDED]/70">
                    {planos.length === 0
                      ? 'Sua biblioteca ainda está vazia. Crie um modelo na aba Biblioteca para reutilizar seus treinos.'
                      : 'Nenhum plano com esse nome.'}
                  </p>
                  {planos.length === 0 && onGoToLibrary ? (
                    <button
                      type="button"
                      onClick={onGoToLibrary}
                      className="h-9 px-3 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d]"
                    >
                      Ir para Biblioteca
                    </button>
                  ) : null}
                </div>
              ) : (
                filtrados.map((plano) => (
                  <PersonalWorkoutTemplateSelectCard
                    key={plano.id || plano.nome}
                    template={plano}
                    onUse={() => tentarUsar(plano)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ImportWorkoutTemplateModal;
