'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, Plus, Search } from 'lucide-react';
import { PersonalPlanosTreinoService } from '@/services/personalPlanosTreinoService';
import {
  clonePersonalWorkoutTemplate,
  type PersonalWorkoutTemplate,
  type PersonalWorkoutTemplateExercise,
} from '@/lib/personal/planosTreino';
import { PersonalWorkoutTemplateCard } from '@/components/personal/templates/PersonalWorkoutTemplateCard';
import { PersonalWorkoutTemplateEditor } from '@/components/personal/templates/PersonalWorkoutTemplateEditor';

export function PersonalWorkoutTemplatesPanel({
  uid,
  readOnly = false,
  onDirtyChange,
}: {
  uid: string;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [planos, setPlanos] = useState<PersonalWorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [editing, setEditing] = useState<PersonalWorkoutTemplate | null | 'new'>(null);

  const carregar = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const lista = await PersonalPlanosTreinoService.listar(uid);
      setPlanos(lista);
    } catch (error) {
      console.error('Erro ao listar planos de treino:', error);
      alert('Não foi possível carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return planos;
    return planos.filter((plano) => plano.nome.toLowerCase().includes(q));
  }, [planos, busca]);

  if (editing !== null) {
    return (
      <PersonalWorkoutTemplateEditor
        initial={editing === 'new' ? null : editing}
        saving={saving}
        readOnly={readOnly}
        onDirtyChange={onDirtyChange}
        onCancel={() => {
          setEditing(null);
          onDirtyChange?.(false);
        }}
        onSave={async (input: {
          id?: string;
          nome: string;
          descricao?: string;
          cor?: string;
          exercicios: PersonalWorkoutTemplateExercise[];
        }) => {
          if (readOnly) return;
          setSaving(true);
          try {
            await PersonalPlanosTreinoService.salvar(uid, input);
            await carregar();
            setEditing(null);
            onDirtyChange?.(false);
          } catch (error) {
            console.error('Erro ao salvar plano de treino:', error);
            alert(error instanceof Error ? error.message : 'Não foi possível salvar o plano.');
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
      <div className="rounded-xl border border-white/10 bg-[#0A1F44]/70 p-4 space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-[#4CCB7A]" />
              <h2 className="text-sm font-semibold text-[#E8EDED]">Biblioteca de Treinos</h2>
            </div>
            <p className="text-[11px] text-[#E8EDED]/55 mt-1">
              {readOnly
                ? 'Planos padrão do personal vinculado a este paciente. Somente visualização.'
                : 'Crie treinos padrão para reutilizar com seus alunos. Isso não altera treinos já salvos em pacientes.'}
            </p>
          </div>
          {readOnly ? null : (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="shrink-0 h-9 px-3 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d] inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo plano
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4CCB7A]" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar plano..."
            className="w-full h-9 pl-8 pr-2 text-xs rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 outline-none focus:ring-2 focus:ring-[#4CCB7A]/35"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain space-y-2 pr-0.5">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#4CCB7A]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-[#E8EDED]/60">
            {planos.length === 0
              ? readOnly
                ? 'A biblioteca deste personal ainda está vazia.'
                : 'Sua biblioteca ainda está vazia. Crie o primeiro plano padrão.'
              : 'Nenhum plano com esse nome.'}
          </div>
        ) : (
          filtrados.map((plano) => (
            <PersonalWorkoutTemplateCard
              key={plano.id}
              template={plano}
              readOnly={readOnly}
              onEdit={() => setEditing(plano)}
              onDuplicate={
                readOnly
                  ? undefined
                  : async () => {
                      try {
                        const cloned = clonePersonalWorkoutTemplate(plano);
                        await PersonalPlanosTreinoService.salvar(uid, cloned);
                        await carregar();
                      } catch (error) {
                        console.error('Erro ao duplicar plano:', error);
                        alert('Não foi possível duplicar o plano.');
                      }
                    }
              }
              onDelete={
                readOnly
                  ? undefined
                  : async () => {
                      if (!plano.id) return;
                      const ok = confirm(
                        'Excluir este plano da sua biblioteca?\n\nIsso não altera treinos já salvos em pacientes.'
                      );
                      if (!ok) return;
                      try {
                        await PersonalPlanosTreinoService.excluir(uid, plano.id);
                        await carregar();
                      } catch (error) {
                        console.error('Erro ao excluir plano:', error);
                        alert('Não foi possível excluir o plano.');
                      }
                    }
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

export default PersonalWorkoutTemplatesPanel;
