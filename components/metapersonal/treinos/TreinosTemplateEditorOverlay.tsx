'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PersonalWorkoutTemplateEditor } from '@/components/personal/templates/PersonalWorkoutTemplateEditor';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import type {
  PersonalWorkoutTemplate,
  PersonalWorkoutTemplateExercise,
} from '@/lib/personal/planosTreino';

type Props = {
  open: boolean;
  uid: string;
  initial?: PersonalWorkoutTemplate | null;
  defaultCor?: string;
  sidebarCollapsed?: boolean;
  onClose: () => void;
  onSaved: (template: PersonalWorkoutTemplate) => void;
};

export function TreinosTemplateEditorOverlay({
  open,
  uid,
  initial = null,
  defaultCor,
  sidebarCollapsed = false,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!open || !portalReady) return null;

  const editing = Boolean(initial?.id);

  return createPortal(
    <div
      className={`fixed inset-y-0 right-0 z-[90] hidden flex-col bg-zinc-100 md:flex md:left-16 md:border-l md:border-zinc-200 md:transition-[left] md:duration-300 ${
        sidebarCollapsed ? 'xl:left-16' : 'xl:left-64'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Editar treino' : 'Novo treino'}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
        <PersonalWorkoutTemplateEditor
          key={initial?.id || 'new'}
          initial={initial}
          defaultCor={defaultCor}
          saving={saving}
          appearance="light"
          fillViewport
          onCancel={onClose}
          onSave={async (input: {
            id?: string;
            nome: string;
            descricao?: string;
            cor?: string;
            exercicios: PersonalWorkoutTemplateExercise[];
          }) => {
            setSaving(true);
            try {
              const saved = await PersonalPlanosTreinoService.salvar(uid, input);
              onSaved(saved);
            } catch (error) {
              alert(error instanceof Error ? error.message : 'Não foi possível salvar o treino.');
            } finally {
              setSaving(false);
            }
          }}
        />
      </div>
    </div>,
    document.body
  );
}
