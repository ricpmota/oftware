'use client';

import { useMemo, useState } from 'react';
import { Bell, Edit, Plus, Trash2, X } from 'lucide-react';
import ModalNovoLembrete, { type ModalNovoLembreteInitialValues } from '@/components/metaadmin/ModalNovoLembrete';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import { LEMBRETE_TAG_CONFIG } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';
import type { LembretesMutation } from '@/lib/metaadmin/lembretesMutation';

type Props = {
  pacienteNome: string;
  pacienteId: string;
  lembretes: Lembrete[];
  pacientes: PacienteCompleto[];
  medicoId: string;
  isDark?: boolean;
  draftForNew?: ModalNovoLembreteInitialValues;
  onFechar: () => void;
  onMutate?: (mutation: LembretesMutation) => void;
};

function formatLembreteData(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function sortLembretes(items: Lembrete[]): Lembrete[] {
  return [...items].sort((a, b) => {
    const aDone = a.concluido ? 1 : 0;
    const bDone = b.concluido ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (!a.concluido && !b.concluido) return a.data.localeCompare(b.data);
    return b.data.localeCompare(a.data);
  });
}

export default function ModalLembretesPaciente({
  pacienteNome,
  pacienteId,
  lembretes,
  pacientes,
  medicoId,
  isDark,
  draftForNew,
  onFechar,
  onMutate,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<ModalNovoLembreteInitialValues | undefined>();

  const sorted = useMemo(() => sortLembretes(lembretes), [lembretes]);
  const pendentes = lembretes.filter((l) => !l.concluido).length;

  const d = isDark;
  const bgOverlay = 'bg-black/50';
  const bgModal = d ? 'bg-[#0A1F44] border-white/15' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const textPrimary = d ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white';
  const textSecondary = d ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400';
  const btnPrimary = d
    ? 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#4CCB7A]/90'
    : 'bg-green-600 text-white hover:bg-green-700';

  const abrirNovo = () => {
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setEditandoId(null);
    setFormInitial({
      ...draftForNew,
      pacienteId,
      pacienteNome,
      data: ymd,
    });
    setFormOpen(true);
  };

  const abrirEditar = (lembrete: Lembrete) => {
    setEditandoId(lembrete.id);
    setFormInitial({
      data: lembrete.data,
      pacienteId: lembrete.pacienteId,
      pacienteNome: lembrete.pacienteNome,
      texto: lembrete.texto,
      tag: lembrete.tag,
    });
    setFormOpen(true);
  };

  const fecharForm = () => {
    setFormOpen(false);
    setEditandoId(null);
    setFormInitial(undefined);
  };

  return (
    <>
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 z-[99998] ${bgOverlay}`}
        onClick={onFechar}
      >
        <div
          className={`w-full max-w-lg rounded-xl border shadow-2xl ${bgModal} max-h-[90vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`flex items-center justify-between px-5 py-4 border-b ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${d ? 'bg-[#2F8FA3] text-[#E8EDED]' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                <Bell className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className={`text-lg font-semibold truncate ${textPrimary}`}>Lembretes</h3>
                <p className={`text-xs truncate ${textSecondary}`}>{pacienteNome}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${d ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
            {sorted.length === 0 ? (
              <p className={`text-sm text-center py-8 ${textSecondary}`}>
                Nenhum lembrete registrado para este paciente.
              </p>
            ) : (
              sorted.map((lembrete) => {
                const tagCfg = LEMBRETE_TAG_CONFIG[lembrete.tag];
                return (
                  <div
                    key={lembrete.id}
                    className={
                      d
                        ? `rounded-xl p-3 border-2 border-[#2F8FA3] border-l-4 bg-[#0A1F44] ${lembrete.concluido ? 'border-l-[#4CCB7A] opacity-75' : 'border-l-orange-400'}`
                        : `rounded-xl p-3 border-l-4 ${lembrete.concluido ? 'border-green-500 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10 opacity-75' : 'border-orange-400 dark:border-orange-500 bg-orange-50/80 dark:bg-orange-900/15'}`
                    }
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${d ? 'text-[#E8EDED]/60' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatLembreteData(lembrete.data)}
                        </p>
                        <p className={`text-sm mt-1 ${lembrete.concluido ? (d ? 'text-[#E8EDED]/50 line-through' : 'text-gray-400 line-through') : (d ? 'text-[#E8EDED]/80' : 'text-gray-700 dark:text-gray-300')}`}>
                          {lembrete.texto}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${d ? tagCfg.bgDark + ' ' + tagCfg.textDark : tagCfg.bgLight + ' ' + tagCfg.textLight}`}>
                          {lembrete.tag}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirEditar(lembrete)}
                          className={`p-1 rounded transition-colors ${d ? 'text-[#E8EDED]/40 hover:text-[#4CCB7A] hover:bg-white/10' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                          title="Editar lembrete"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Deletar este lembrete?')) return;
                            try {
                              await LembreteService.deletarLembrete(lembrete.id);
                              onMutate?.({ op: 'remove', id: lembrete.id });
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${d ? 'text-[#E8EDED]/40 hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                          title="Deletar lembrete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between pt-2 border-t ${d ? 'border-white/10' : 'border-gray-200/60 dark:border-gray-700'}`}>
                      <span className={`text-xs font-medium ${lembrete.concluido ? (d ? 'text-[#4CCB7A]' : 'text-green-600 dark:text-green-400') : (d ? 'text-[#E8EDED]/50' : 'text-gray-500 dark:text-gray-400')}`}>
                        {lembrete.concluido ? 'Realizado' : 'Pendente'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!lembrete.concluido}
                        onClick={async () => {
                          try {
                            const novo = !lembrete.concluido;
                            await LembreteService.toggleConcluido(lembrete.id, novo);
                            onMutate?.({ op: 'update', id: lembrete.id, patch: { concluido: novo } });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          lembrete.concluido
                            ? d ? 'bg-[#4CCB7A] focus:ring-[#4CCB7A]' : 'bg-green-500 focus:ring-green-500'
                            : d ? 'bg-slate-500 focus:ring-[#4CCB7A]' : 'bg-gray-500 dark:bg-gray-400 focus:ring-green-500'
                        }`}
                        title={lembrete.concluido ? 'Marcar como pendente' : 'Marcar como realizado'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            lembrete.concluido ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={`flex items-center justify-between gap-3 px-5 py-4 border-t ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
            {pendentes > 0 ? (
              <span className={`text-xs ${textSecondary}`}>
                {pendentes} pendente{pendentes !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className={`text-xs ${textSecondary}`}>Todos concluídos</span>
            )}
            <button
              type="button"
              onClick={abrirNovo}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${btnPrimary}`}
            >
              <Plus className="w-4 h-4" />
              Novo lembrete
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <ModalNovoLembrete
          key={editandoId ?? 'novo'}
          pacientes={pacientes}
          isDark={isDark}
          elevatedZIndex
          lembreteId={editandoId ?? undefined}
          initialValues={formInitial}
          onFechar={fecharForm}
          onSalvar={async (dados) => {
            if (editandoId) {
              await LembreteService.atualizarLembrete(editandoId, {
                pacienteId: dados.pacienteId,
                pacienteNome: dados.pacienteNome,
                data: dados.data,
                texto: dados.texto,
                tag: dados.tag,
              });
              onMutate?.({
                op: 'update',
                id: editandoId,
                patch: {
                  pacienteId: dados.pacienteId,
                  pacienteNome: dados.pacienteNome,
                  data: dados.data,
                  texto: dados.texto,
                  tag: dados.tag,
                },
              });
            } else {
              const novoId = await LembreteService.criarLembrete({
                medicoId,
                pacienteId: dados.pacienteId,
                pacienteNome: dados.pacienteNome,
                data: dados.data,
                texto: dados.texto,
                tag: dados.tag,
                concluido: false,
              });
              onMutate?.({
                op: 'add',
                lembrete: {
                  id: novoId,
                  medicoId,
                  pacienteId: dados.pacienteId,
                  pacienteNome: dados.pacienteNome,
                  data: dados.data,
                  texto: dados.texto,
                  tag: dados.tag,
                  concluido: false,
                  criadoEm: new Date(),
                },
              });
            }
            fecharForm();
          }}
        />
      )}
    </>
  );
}
