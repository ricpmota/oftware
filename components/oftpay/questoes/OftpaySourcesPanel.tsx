'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  createSource,
  deleteSource,
  listSources,
  updateSource,
  OftpaySourcesPermissionError,
  OftpaySourcesValidationError,
} from '@/services/oftpaySourcesService';
import { listKnowledgeMaps } from '@/services/oftpayKnowledgeMapService';
import {
  createEmptyOftreviewSourceDraft,
  getSourceCapituloDisplay,
  OFTREVIEW_SOURCE_TRECHO_MAX_CHARS,
  OFTREVIEW_SOURCE_TRECHO_MIN_CHARS,
  previewTrecho,
  validateOftreviewSource,
  type OftreviewSource,
  type OftreviewSourceDoc,
} from '@/types/oftpaySources';
import type { OftreviewKnowledgeMapDoc } from '@/types/oftpayKnowledgeMap';
import { OFTREVIEW_APOSTILAS_GCS_URI, type QuestaoDificuldade } from '@/types/oftpayQuestoes';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface OftpaySourcesPanelProps {
  userEmail: string;
  isAdmin: boolean;
  onQuestaoGenerated?: () => void;
}

export default function OftpaySourcesPanel({
  userEmail,
  isAdmin,
  onQuestaoGenerated,
}: OftpaySourcesPanelProps) {
  const [sources, setSources] = useState<OftreviewSourceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OftreviewSource | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [generateTarget, setGenerateTarget] = useState<OftreviewSourceDoc | null>(null);
  const [genDificuldade, setGenDificuldade] = useState<QuestaoDificuldade>('medio');
  const [genNumAlts, setGenNumAlts] = useState<4 | 5>(4);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [knowledgeMaps, setKnowledgeMaps] = useState<OftreviewKnowledgeMapDoc[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [selectedCapituloIndex, setSelectedCapituloIndex] = useState<number | ''>('');
  const [selectedSubtema, setSelectedSubtema] = useState('');

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSources();
      setSources(list);
    } catch (e) {
      console.error('[trechos] loadSources:', e);
      setSources([]);
      setError('Não foi possível carregar os trechos oficiais. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const loadKnowledgeMaps = useCallback(async () => {
    setMapsLoading(true);
    try {
      const list = await listKnowledgeMaps();
      setKnowledgeMaps(list);
    } catch (e) {
      console.error('[trechos] loadKnowledgeMaps:', e);
      setKnowledgeMaps([]);
    } finally {
      setMapsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadKnowledgeMaps();
    }
  }, [isAdmin, loadKnowledgeMaps]);

  const selectedMap = useMemo(
    () => knowledgeMaps.find((m) => m.id === selectedMapId) ?? null,
    [knowledgeMaps, selectedMapId]
  );

  const capitulosDisponiveis = selectedMap?.capitulos ?? [];
  const subtemasDisponiveis =
    selectedCapituloIndex !== '' && capitulosDisponiveis[selectedCapituloIndex]
      ? capitulosDisponiveis[selectedCapituloIndex].subtemas.filter(Boolean)
      : [];

  const useMapPicker = knowledgeMaps.length > 0;

  const resetMapSelection = () => {
    setSelectedMapId('');
    setSelectedCapituloIndex('');
    setSelectedSubtema('');
  };

  const syncFormFromMap = (
    mapId: string,
    capIndex: number,
    subtema: string
  ) => {
    const map = knowledgeMaps.find((m) => m.id === mapId);
    const cap = map?.capitulos[capIndex];
    if (!map || !cap) return;
    const capTitulo = cap.titulo.trim();
    setForm((prev) =>
      prev
        ? {
            ...prev,
            knowledgeMapId: mapId,
            apostilaTitulo: map.apostilaTitulo,
            capituloTitulo: capTitulo,
            tema: capTitulo,
            subtema: subtema.trim(),
          }
        : prev
    );
  };

  const initMapSelectionFromForm = (source: OftreviewSource) => {
    if (source.knowledgeMapId && knowledgeMaps.some((m) => m.id === source.knowledgeMapId)) {
      const map = knowledgeMaps.find((m) => m.id === source.knowledgeMapId)!;
      const capIdx = map.capitulos.findIndex(
        (c) => c.titulo.trim() === (source.capituloTitulo ?? source.tema).trim()
      );
      setSelectedMapId(source.knowledgeMapId);
      setSelectedCapituloIndex(capIdx >= 0 ? capIdx : '');
      setSelectedSubtema(source.subtema?.trim() ?? '');
    } else {
      resetMapSelection();
    }
  };

  const openNew = () => {
    setForm(createEmptyOftreviewSourceDraft(userEmail));
    setEditingId(null);
    setShowForm(true);
    setFormErrors([]);
    resetMapSelection();
  };

  const openEdit = (source: OftreviewSourceDoc) => {
    const { id, createdAt, updatedAt, ...rest } = source;
    setForm({ ...rest });
    setEditingId(id);
    setShowForm(true);
    setFormErrors([]);
    initMapSelectionFromForm(rest);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(null);
    setEditingId(null);
    setFormErrors([]);
    resetMapSelection();
  };

  const handleMapSelect = (mapId: string) => {
    setSelectedMapId(mapId);
    setSelectedCapituloIndex('');
    setSelectedSubtema('');
    if (!mapId) {
      setForm((prev) =>
        prev
          ? {
              ...prev,
              knowledgeMapId: undefined,
              capituloTitulo: undefined,
            }
          : prev
      );
      return;
    }
    const map = knowledgeMaps.find((m) => m.id === mapId);
    if (!map || !form) return;
    setForm({
      ...form,
      knowledgeMapId: mapId,
      apostilaTitulo: map.apostilaTitulo,
      capituloTitulo: undefined,
      tema: '',
      subtema: '',
    });
  };

  const handleCapituloSelect = (capIndex: number | '') => {
    setSelectedCapituloIndex(capIndex);
    setSelectedSubtema('');
    if (capIndex === '' || !selectedMapId) return;
    syncFormFromMap(selectedMapId, capIndex, '');
  };

  const handleSubtemaSelect = (subtema: string) => {
    setSelectedSubtema(subtema);
    if (selectedCapituloIndex === '' || !selectedMapId) return;
    syncFormFromMap(selectedMapId, selectedCapituloIndex, subtema);
  };

  useEffect(() => {
    if (!showForm || !form?.knowledgeMapId || knowledgeMaps.length === 0 || selectedMapId) return;
    initMapSelectionFromForm(form);
  }, [showForm, form?.knowledgeMapId, knowledgeMaps, selectedMapId]);

  const trechoLen = form ? [...form.trecho.trim()].length : 0;

  const handleSave = async () => {
    if (!form || !isAdmin || !userEmail) return;
    const toSave: OftreviewSource = {
      ...form,
      tema: (form.capituloTitulo?.trim() || form.tema).trim(),
    };
    const validation = validateOftreviewSource(toSave);
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateSource(editingId, toSave, userEmail);
      } else {
        const { id: _id, createdAt, updatedAt, ...payload } = toSave;
        await createSource(payload, userEmail);
      }
      await loadSources();
      closeForm();
    } catch (e) {
      if (e instanceof OftpaySourcesValidationError) {
        setFormErrors(e.errors);
      } else if (e instanceof OftpaySourcesPermissionError) {
        setError('Acesso negado.');
      } else {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !userEmail || !window.confirm('Excluir este trecho oficial?')) return;
    try {
      await deleteSource(id, userEmail);
      await loadSources();
      if (editingId === id) closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  const openGenerateModal = (source: OftreviewSourceDoc) => {
    setGenerateTarget(source);
    setGenDificuldade('medio');
    setGenNumAlts(4);
    setError(null);
    setSuccessMessage(null);
  };

  const closeGenerateModal = () => {
    if (generatingId) return;
    setGenerateTarget(null);
  };

  const handleGenerateQuestao = async () => {
    if (!generateTarget || !isAdmin) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setError('Faça login para gerar questões.');
      return;
    }

    setGeneratingId(generateTarget.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/oftpay/questoes/generate-from-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId: generateTarget.id,
          dificuldade: genDificuldade,
          numeroAlternativas: genNumAlts,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data.error === 'TRECHO_INSUFICIENTE'
            ? 'O trecho não é suficiente para gerar uma questão de boa qualidade.'
            : typeof data.error === 'string'
              ? data.error
              : 'Falha ao gerar questão.';
        setError(msg);
        return;
      }

      setSuccessMessage('Questão criada como rascunho.');
      setGenerateTarget(null);
      onQuestaoGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão ao gerar questão.');
    } finally {
      setGeneratingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        Os trechos oficiais são gerenciados apenas pelo administrador.
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="trechos-oficiais-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="trechos-oficiais-heading" className="text-lg font-medium text-gray-900">
              Trechos Oficiais
            </h2>
            <p className="text-sm text-gray-600">
              Biblioteca manual de trechos das apostilas em{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">{OFTREVIEW_APOSTILAS_GCS_URI}</code>
              . Base futura: questão → sourceId → trecho → página → PDF.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo trecho
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {showForm && form && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-900">
            {editingId ? 'Editar trecho' : 'Novo trecho oficial'}
          </h3>

          {useMapPicker && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
              <p className="text-xs text-blue-900">
                Vincule ao Mapa das Apostilas para preencher apostila, capítulo e subtema
                automaticamente.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Apostila (mapa)
                  </label>
                  <select
                    value={selectedMapId}
                    onChange={(e) => handleMapSelect(e.target.value)}
                    disabled={mapsLoading}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">— Manual / sem mapa —</option>
                    {knowledgeMaps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.apostilaTitulo}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedMapId && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Capítulo
                      </label>
                      <select
                        value={selectedCapituloIndex === '' ? '' : String(selectedCapituloIndex)}
                        onChange={(e) =>
                          handleCapituloSelect(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Selecione…</option>
                        {capitulosDisponiveis.map((cap, idx) => (
                          <option key={idx} value={String(idx)}>
                            {cap.titulo || `Capítulo ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Subtema
                      </label>
                      <select
                        value={selectedSubtema}
                        onChange={(e) => handleSubtemaSelect(e.target.value)}
                        disabled={selectedCapituloIndex === ''}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white disabled:opacity-50"
                      >
                        <option value="">— Opcional —</option>
                        {subtemasDisponiveis.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!useMapPicker && !mapsLoading && (
            <p className="text-xs text-gray-500 rounded-lg border border-dashed border-gray-200 px-3 py-2">
              Nenhum mapa pedagógico cadastrado. Use os campos manuais abaixo ou organize
              apostilas na aba Mapa das Apostilas.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apostila *</label>
              {selectedMapId ? (
                <p className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                  {form.apostilaTitulo || '—'}
                </p>
              ) : (
                <input
                  value={form.apostilaTitulo}
                  onChange={(e) => setForm({ ...form, apostilaTitulo: e.target.value })}
                  placeholder="Título do PDF oficial"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Página</label>
              <input
                type="number"
                min={1}
                value={form.pagina ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pagina: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {!selectedMapId && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tema *</label>
                  <input
                    value={form.tema}
                    onChange={(e) => setForm({ ...form, tema: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtema</label>
                  <input
                    value={form.subtema ?? ''}
                    onChange={(e) => setForm({ ...form, subtema: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            {selectedMapId && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Capítulo (mapa)
                  </label>
                  <p className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {form.capituloTitulo || '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtema</label>
                  <p className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {form.subtema || '—'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-medium text-gray-600">Trecho *</label>
              <span
                className={`text-xs ${
                  trechoLen < OFTREVIEW_SOURCE_TRECHO_MIN_CHARS ||
                  trechoLen > OFTREVIEW_SOURCE_TRECHO_MAX_CHARS
                    ? 'text-amber-700'
                    : 'text-gray-400'
                }`}
              >
                {trechoLen} / {OFTREVIEW_SOURCE_TRECHO_MIN_CHARS}–{OFTREVIEW_SOURCE_TRECHO_MAX_CHARS}
              </span>
            </div>
            <textarea
              value={form.trecho}
              onChange={(e) => setForm({ ...form, trecho: e.target.value })}
              rows={8}
              placeholder="Cole o trecho literal da apostila oficial (mín. 50 caracteres)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.observacoes ?? ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {formErrors.length > 0 && (
            <ul className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 space-y-1">
              {formErrors.map((msg) => (
                <li key={msg}>• {msg}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={closeForm}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Trechos cadastrados</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : sources.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
            Nenhum trecho cadastrado. Adicione manualmente trechos das apostilas oficiais.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">Apostila</th>
                  <th className="px-4 py-2 font-medium">Capítulo</th>
                  <th className="px-4 py-2 font-medium">Subtema</th>
                  <th className="px-4 py-2 font-medium">Página</th>
                  <th className="px-4 py-2 font-medium min-w-[200px]">Prévia do trecho</th>
                  <th className="px-4 py-2 font-medium min-w-[140px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{src.apostilaTitulo}</td>
                    <td className="px-4 py-3 text-gray-800">{getSourceCapituloDisplay(src)}</td>
                    <td className="px-4 py-3 text-gray-600">{src.subtema || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{src.pagina ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 italic">{previewTrecho(src.trecho)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openGenerateModal(src)}
                          disabled={generatingId === src.id}
                          className="inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900 disabled:opacity-50"
                        >
                          {generatingId === src.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          Gerar questão
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(src)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(src.id)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {generateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeGenerateModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-gray-900">Gerar questão</h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {generateTarget.apostilaTitulo} · {getSourceCapituloDisplay(generateTarget)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGenerateModal}
                disabled={!!generatingId}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              A IA usará <strong>apenas</strong> este trecho oficial. A questão será salva como{' '}
              <strong>rascunho</strong>.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dificuldade</label>
              <select
                value={genDificuldade}
                onChange={(e) => setGenDificuldade(e.target.value as QuestaoDificuldade)}
                disabled={!!generatingId}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alternativas</label>
              <div className="flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="numAlts"
                    checked={genNumAlts === 4}
                    onChange={() => setGenNumAlts(4)}
                    disabled={!!generatingId}
                  />
                  4 (A–D)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="numAlts"
                    checked={genNumAlts === 5}
                    onChange={() => setGenNumAlts(5)}
                    disabled={!!generatingId}
                  />
                  5 (A–E)
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={!!generatingId}
                onClick={handleGenerateQuestao}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {generatingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar 1 questão
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={!!generatingId}
                onClick={closeGenerateModal}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
