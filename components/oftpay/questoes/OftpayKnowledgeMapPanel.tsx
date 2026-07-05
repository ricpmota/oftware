'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createKnowledgeMap,
  deleteKnowledgeMap,
  listKnowledgeMaps,
  updateKnowledgeMap,
  OftpayKnowledgeMapPermissionError,
  OftpayKnowledgeMapValidationError,
} from '@/services/oftpayKnowledgeMapService';
import {
  createEmptyKnowledgeMapDraft,
  validateKnowledgeMap,
  type OftreviewKnowledgeMap,
  type OftreviewKnowledgeMapCapitulo,
  type OftreviewKnowledgeMapDoc,
} from '@/types/oftpayKnowledgeMap';
import { OFTREVIEW_APOSTILAS_GCS_URI } from '@/types/oftpayQuestoes';
import {
  AlertCircle,
  BookMarked,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

interface OftpayKnowledgeMapPanelProps {
  userEmail: string;
  isAdmin: boolean;
}

interface ApostilaPdfOption {
  id: string;
  name: string;
  subject: string;
}

export default function OftpayKnowledgeMapPanel({ userEmail, isAdmin }: OftpayKnowledgeMapPanelProps) {
  const [maps, setMaps] = useState<OftreviewKnowledgeMapDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [apostilasPdf, setApostilasPdf] = useState<ApostilaPdfOption[]>([]);
  const [loadingApostilasPdf, setLoadingApostilasPdf] = useState(false);
  const [apostilasPdfError, setApostilasPdfError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OftreviewKnowledgeMap | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listKnowledgeMaps();
      setMaps(list);
    } catch (e) {
      console.error(e);
      setMaps([]);
      setError('Não foi possível carregar o mapa das apostilas. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApostilasPdf = useCallback(async () => {
    setLoadingApostilasPdf(true);
    setApostilasPdfError(null);
    try {
      const res = await fetch('/api/oftpay/list-apostilas?courseId=oftreview');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao listar PDFs');
      }
      const list = Array.isArray(data.apostilas)
        ? (data.apostilas as { id?: string; name?: string; subject?: string }[])
        : [];
      setApostilasPdf(
        list.map((a) => ({
          id: String(a.id ?? a.name ?? ''),
          name: String(a.name ?? ''),
          subject: String(a.subject ?? 'Apostilas'),
        }))
      );
    } catch (e) {
      console.error(e);
      setApostilasPdf([]);
      setApostilasPdfError(
        'Não foi possível carregar a lista de PDFs do bucket. Você ainda pode digitar o título manualmente.'
      );
    } finally {
      setLoadingApostilasPdf(false);
    }
  }, []);

  useEffect(() => {
    loadMaps();
    loadApostilasPdf();
  }, [loadMaps, loadApostilasPdf]);

  const openNew = () => {
    setForm(createEmptyKnowledgeMapDraft(userEmail));
    setEditingId(null);
    setShowForm(true);
    setFormErrors([]);
  };

  const openEdit = (map: OftreviewKnowledgeMapDoc) => {
    const { id, createdAt, updatedAt, ...rest } = map;
    setForm({
      ...rest,
      capitulos: rest.capitulos.length
        ? rest.capitulos.map((c) => ({
            titulo: c.titulo,
            subtemas: c.subtemas.length ? c.subtemas : [''],
          }))
        : [{ titulo: '', subtemas: [''] }],
    });
    setEditingId(id);
    setShowForm(true);
    setFormErrors([]);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(null);
    setEditingId(null);
    setFormErrors([]);
  };

  const updateCapitulo = (index: number, patch: Partial<OftreviewKnowledgeMapCapitulo>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const capitulos = [...prev.capitulos];
      capitulos[index] = { ...capitulos[index], ...patch };
      return { ...prev, capitulos };
    });
  };

  const addCapitulo = () => {
    setForm((prev) =>
      prev ? { ...prev, capitulos: [...prev.capitulos, { titulo: '', subtemas: [''] }] } : prev
    );
  };

  const removeCapitulo = (index: number) => {
    setForm((prev) => {
      if (!prev || prev.capitulos.length <= 1) return prev;
      return { ...prev, capitulos: prev.capitulos.filter((_, i) => i !== index) };
    });
  };

  const updateSubtema = (capIndex: number, subIndex: number, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const capitulos = [...prev.capitulos];
      const subtemas = [...capitulos[capIndex].subtemas];
      subtemas[subIndex] = value;
      capitulos[capIndex] = { ...capitulos[capIndex], subtemas };
      return { ...prev, capitulos };
    });
  };

  const addSubtema = (capIndex: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const capitulos = [...prev.capitulos];
      capitulos[capIndex] = {
        ...capitulos[capIndex],
        subtemas: [...capitulos[capIndex].subtemas, ''],
      };
      return { ...prev, capitulos };
    });
  };

  const removeSubtema = (capIndex: number, subIndex: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const capitulos = [...prev.capitulos];
      const subtemas = capitulos[capIndex].subtemas.filter((_, i) => i !== subIndex);
      capitulos[capIndex] = {
        ...capitulos[capIndex],
        subtemas: subtemas.length ? subtemas : [''],
      };
      return { ...prev, capitulos };
    });
  };

  const handleSave = async () => {
    if (!form || !isAdmin || !userEmail) return;
    const validation = validateKnowledgeMap(form);
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateKnowledgeMap(editingId, form, userEmail);
      } else {
        const { id: _id, createdAt, updatedAt, ...payload } = form;
        await createKnowledgeMap(payload, userEmail);
      }
      await loadMaps();
      closeForm();
    } catch (e) {
      if (e instanceof OftpayKnowledgeMapValidationError) {
        setFormErrors(e.errors);
      } else if (e instanceof OftpayKnowledgeMapPermissionError) {
        setError('Acesso negado.');
      } else {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !userEmail || !window.confirm('Excluir este mapa da apostila?')) return;
    try {
      await deleteKnowledgeMap(id, userEmail);
      await loadMaps();
      if (editingId === id) closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        O mapa das apostilas é gerenciado apenas pelo administrador.
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="mapa-apostilas-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BookMarked className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="mapa-apostilas-heading" className="text-lg font-medium text-gray-900">
              Mapa das Apostilas
            </h2>
            <p className="text-sm text-gray-600">
              Catálogo pedagógico dos capítulos e subtemas das apostilas oficiais já existentes no
              bucket (
              <code className="text-xs bg-gray-100 px-1 rounded">{OFTREVIEW_APOSTILAS_GCS_URI}</code>
              ). Use esta área apenas para organizar o conteúdo das apostilas, não para cadastrar
              PDFs.
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
            Selecionar/organizar apostila
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {apostilasPdfError && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {apostilasPdfError}
        </div>
      )}

      {showForm && form && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-900">
            {editingId ? 'Editar organização' : 'Organizar apostila'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Apostila oficial *
              </label>
              {loadingApostilasPdf ? (
                <p className="text-xs text-gray-500 py-2">Carregando PDFs do bucket…</p>
              ) : apostilasPdf.length > 0 ? (
                <select
                  value={form.apostilaTitulo}
                  onChange={(e) => setForm({ ...form, apostilaTitulo: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Selecione a apostila…</option>
                  {apostilasPdf.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                      {a.subject && a.subject !== 'Apostilas' ? ` (${a.subject})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.apostilaTitulo}
                  onChange={(e) => setForm({ ...form, apostilaTitulo: e.target.value })}
                  placeholder="Nome do PDF no bucket (sem extensão)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                PDFs já existem em OFTREVIEW 2023/APOSTILAS/. Aqui você só organiza capítulos e
                subtemas.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
              <input
                value={form.categoria ?? ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex.: Catarata, Glaucoma..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">Capítulos</p>
              <button
                type="button"
                onClick={addCapitulo}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar capítulo
              </button>
            </div>

            {form.capitulos.map((cap, capIndex) => (
              <div
                key={capIndex}
                className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Capítulo {capIndex + 1} — título *
                    </label>
                    <input
                      value={cap.titulo}
                      onChange={(e) => updateCapitulo(capIndex, { titulo: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  {form.capitulos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCapitulo(capIndex)}
                      className="mt-5 p-2 rounded text-red-600 hover:bg-red-50"
                      title="Remover capítulo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-600">Subtemas</p>
                    <button
                      type="button"
                      onClick={() => addSubtema(capIndex)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-3 h-3" />
                      Subtema
                    </button>
                  </div>
                  {cap.subtemas.map((sub, subIndex) => (
                    <div key={subIndex} className="flex items-center gap-2">
                      <input
                        value={sub}
                        onChange={(e) => updateSubtema(capIndex, subIndex, e.target.value)}
                        placeholder="Nome do subtema"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtema(capIndex, subIndex)}
                        className="p-1.5 rounded text-gray-500 hover:bg-gray-200"
                        title="Remover subtema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {formErrors.length > 0 && (
            <ul className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 space-y-1">
              {formErrors.map((msg) => (
                <li key={msg}>• {msg}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
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
        <h3 className="text-sm font-medium text-gray-700">Apostilas organizadas</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : maps.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
            Nenhuma apostila organizada ainda. Selecione um PDF do bucket e defina capítulos e
            subtemas.
          </p>
        ) : (
          <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {maps.map((map) => {
              const isExpanded = expandedId === map.id;
              return (
                <li key={map.id}>
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : map.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {map.apostilaTitulo}
                        </p>
                        {map.categoria && (
                          <p className="text-xs text-gray-500">{map.categoria}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {map.capitulos.length} cap.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(map)}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(map.id)}
                      className="p-1.5 rounded text-red-600 hover:bg-red-50 flex-shrink-0"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100 bg-gray-50/50">
                      {map.capitulos.map((cap, i) => (
                        <div key={i} className="pl-6">
                          <p className="text-sm font-medium text-gray-800">{cap.titulo}</p>
                          {cap.subtemas.length > 0 ? (
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {cap.subtemas.map((sub) => (
                                <li
                                  key={sub}
                                  className="text-xs rounded-full bg-blue-50 text-blue-800 px-2 py-0.5"
                                >
                                  {sub}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Sem subtemas</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
