'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { coveredPatientsFromCard } from '@/lib/metapersonal/bulkWorkoutNotes';
import {
  previewBulkWorkoutLifecycle,
} from '@/services/bulkWorkoutLifecycleService';
import {
  someLifecyclePatientsAreAvulsa,
  type LifecycleAction,
  type LifecycleTemporalScope,
  type BulkLifecyclePreview,
} from '@/lib/metapersonal/bulkWorkoutLifecycle';
import type { PlannerBoardCard } from '@/lib/metapersonal/treinosPlannerGroup';
import { todayLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';

type Mode = 'status' | 'delete';

function pluralSessoes(count: number) {
  return count === 1 ? '1 sessão' : `${count} sessões`;
}

function pluralPacientes(count: number) {
  return count === 1 ? '1 paciente' : `${count} pacientes`;
}

function lifecycleCtaLabel(action: LifecycleAction, sessionCount: number) {
  const sessions = pluralSessoes(sessionCount);
  if (action === 'delete') return `Apagar definitivamente ${sessions}`;
  if (action === 'activate') return `Ativar ${sessions}`;
  return `Desativar ${sessions}`;
}

type Props = {
  open: boolean;
  mode: Mode;
  card: PlannerBoardCard | null;
  lockedPatientId?: string;
  defaultAction?: LifecycleAction;
  saving: boolean;
  onClose: () => void;
  onConfirm: (input: {
    action: LifecycleAction;
    temporalScope: LifecycleTemporalScope;
    patientIds: string[];
  }) => void;
};

export function TreinosLifecycleModal({
  open,
  mode,
  card,
  lockedPatientId,
  defaultAction = 'deactivate',
  saving,
  onClose,
  onConfirm,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [action, setAction] = useState<LifecycleAction>(defaultAction);
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [temporalScope, setTemporalScope] = useState<LifecycleTemporalScope>('this');
  const [preview, setPreview] = useState<BulkLifecyclePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const covered = useMemo(() => (card ? coveredPatientsFromCard(card) : []), [card]);
  const locked = covered.find((item) => item.pacienteId === lockedPatientId);
  const patientIds = locked
    ? [locked.pacienteId]
    : scope === 'all'
      ? covered.map((item) => item.pacienteId)
      : selectedIds;
  const selectedPatients = covered.filter((item) => patientIds.includes(item.pacienteId));

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !card) return;
    setAction(mode === 'delete' ? 'deactivate' : defaultAction);
    setScope('all');
    setSelectedIds(coveredPatientsFromCard(card).map((item) => item.pacienteId));
    setTemporalScope('this');
    setPreview(null);
  }, [open, card, mode, defaultAction]);

  const patientKey = patientIds.join(',');

  useEffect(() => {
    if (!open || !card) return;
    const handle = window.setTimeout(async () => {
      setPreviewing(true);
      try {
        const next = await previewBulkWorkoutLifecycle({
          source: card.source,
          action,
          temporalScope,
          availablePatients: covered,
          patientIds,
          lockedPatientId: locked?.pacienteId,
          today: todayLocalYYYYMMDD(),
        });
        setPreview(next);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 220);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patientKey captura o escopo
  }, [open, card, action, temporalScope, covered, patientKey, locked]);

  if (!open || !portalReady || !card) return null;

  const avulsa = someLifecyclePatientsAreAvulsa(selectedPatients);
  const sessionCount = preview?.sessionCount || 0;
  const patientCount = preview?.patientCount ?? selectedPatients.length;
  const canSave = !saving && (preview?.errors.length || 0) === 0 && sessionCount > 0;
  const title = mode === 'delete' ? 'Desativar ou apagar treino' : 'Alterar status do treino';

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{card.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-900">
              {mode === 'delete' ? 'O que deseja fazer?' : 'Ação'}
            </legend>
            <div className="mt-2 space-y-2">
              {mode === 'delete' ? (
                <>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      action === 'deactivate'
                        ? 'border-emerald-200 bg-emerald-50 text-gray-900'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-action"
                      className="mt-0.5"
                      checked={action === 'deactivate'}
                      onChange={() => setAction('deactivate')}
                      disabled={saving}
                    />
                    <span>
                      <span className="font-semibold">Desativar treino</span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                        Reversível
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        O treino deixa de aparecer na rotina ativa, mas pode ser reativado.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      action === 'delete'
                        ? 'border-red-300 bg-red-50 text-gray-900'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-action"
                      className="mt-0.5"
                      checked={action === 'delete'}
                      onChange={() => setAction('delete')}
                      disabled={saving}
                    />
                    <span>
                      <span className="font-semibold text-red-700">Apagar definitivamente</span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-red-600">
                        Não pode ser desfeito
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Remove as sessões futuras selecionadas e seus dados associados.
                      </span>
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      action === 'activate'
                        ? 'border-emerald-200 bg-emerald-50 text-gray-900'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-action"
                      className="mt-0.5"
                      checked={action === 'activate'}
                      onChange={() => setAction('activate')}
                      disabled={saving}
                    />
                    <span>
                      <span className="font-semibold">Ativar treino</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        Volta a aparecer na rotina ativa.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      action === 'deactivate'
                        ? 'border-amber-200 bg-amber-50 text-gray-900'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-action"
                      className="mt-0.5"
                      checked={action === 'deactivate'}
                      onChange={() => setAction('deactivate')}
                      disabled={saving}
                    />
                    <span>
                      <span className="font-semibold">Desativar treino</span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-amber-700">
                        Reversível
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        O treino deixa de aparecer na rotina ativa, mas pode ser reativado.
                      </span>
                    </span>
                  </label>
                </>
              )}
            </div>
          </fieldset>

          {locked ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-700">
              Apenas <span className="font-semibold">{locked.name}</span>
            </p>
          ) : (
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900">Aplicar para</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="life-scope"
                    checked={scope === 'all'}
                    onChange={() => {
                      setScope('all');
                      setSelectedIds(covered.map((item) => item.pacienteId));
                    }}
                    disabled={saving}
                  />
                  Todos os {covered.length}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="life-scope"
                    checked={scope === 'some'}
                    onChange={() => setScope('some')}
                    disabled={saving}
                  />
                  Selecionar pacientes
                </label>
              </div>
              {scope === 'some' ? (
                <ul className="mt-3 space-y-1.5">
                  {covered.map((item) => {
                    const checked = selectedIds.includes(item.pacienteId);
                    return (
                      <li key={item.pacienteId}>
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== item.pacienteId)
                                  : [...prev, item.pacienteId]
                              )
                            }
                          />
                          {item.name}
                          <span className="text-[11px] text-gray-400">
                            {item.active === false ? 'inativo' : 'ativo'}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </fieldset>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-gray-900">Escopo</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="life-temporal"
                  className="mt-0.5"
                  checked={temporalScope === 'this'}
                  onChange={() => setTemporalScope('this')}
                  disabled={saving}
                />
                <span>
                  Somente esta ocorrência
                  <span className="block text-xs text-gray-500">Apenas a sessão desta data.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="life-temporal"
                  className="mt-0.5"
                  checked={temporalScope === 'this-and-future'}
                  onChange={() => setTemporalScope('this-and-future')}
                  disabled={saving}
                />
                <span>
                  Esta e próximas
                  <span className="block text-xs text-gray-500">Desta data em diante, na mesma série.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="life-temporal"
                  className="mt-0.5"
                  checked={temporalScope === 'series-future'}
                  onChange={() => setTemporalScope('series-future')}
                  disabled={saving}
                />
                <span>
                  Toda a série futura
                  <span className="block text-xs text-gray-500">
                    Todas as ocorrências futuras/agendadas do grupo. Passado e concluído não mudam.
                  </span>
                </span>
              </label>
            </div>
            {avulsa ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Treino sem série recorrente: o escopo vale só nesta ocorrência.
              </p>
            ) : null}
          </fieldset>

          <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-gray-600">
            <p>
              <span className="font-semibold text-gray-800">Pacientes: </span>
              {patientCount}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Sessões: </span>
              {previewing ? '…' : sessionCount || '—'}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Escopo: </span>
              {preview?.temporalLabel}
            </p>
          </div>

          {action === 'delete' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-900">
              <p className="font-semibold">
                Você está prestes a apagar definitivamente {pluralSessoes(sessionCount)} de{' '}
                {pluralPacientes(patientCount)}.
              </p>
              <p className="mt-1.5 text-red-800">
                Os exercícios e registros de execução associados a essas sessões também serão
                removidos.
              </p>
            </div>
          ) : null}

          {preview?.errors.length ? (
            <ul className="space-y-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {preview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onConfirm({ action, temporalScope, patientIds })}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${
              action === 'delete'
                ? 'bg-red-600 hover:bg-red-700'
                : action === 'deactivate'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {previewing ? '…' : lifecycleCtaLabel(action, sessionCount)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
