'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FolderPlus,
  Loader2,
  Pencil,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import type { Prescricao, PrescricaoItem } from '@/types/prescricao';
import type { PrescricaoCatalogoAba, PrescricaoPasta } from '@/types/prescricaoPasta';
import {
  PRESCRICAO_RECIBO_PASTA_NOME,
  tituloExibicaoPrescricao,
} from '@/lib/prescricao/prescricaoCatalogoDefaults';
import { downloadPrescricaoCatalogoPdf } from '@/lib/prescricao/prescricaoCatalogoPdf';
import {
  conteudoParaFormulario,
  isReciboMedicoPrescricao,
} from '@/lib/prescricao/prescricaoConteudoUnificado';

type FormState = {
  pastaId: string;
  nome: string;
  descricao: string;
  itens: PrescricaoItem[];
  observacoes: string;
  tipoDocumento: 'prescricao' | 'recibo_medico';
  valorConsulta: string;
  dataRecibo: string;
  reciboDocumentoProfissional: 'omitir' | 'cpf' | 'cnpj';
};

const FORM_VAZIO: FormState = {
  pastaId: '',
  nome: '',
  descricao: '',
  itens: [],
  observacoes: '',
  tipoDocumento: 'prescricao',
  valorConsulta: '',
  dataRecibo: '',
  reciboDocumentoProfissional: 'omitir',
};

function formFromItem(p: Prescricao): FormState {
  const isRecibo = isReciboMedicoPrescricao(p);
  return {
    pastaId: p.pastaId || '',
    nome: tituloExibicaoPrescricao(p.nome),
    descricao: conteudoParaFormulario(p),
    itens: isRecibo ? p.itens || [] : [],
    observacoes: p.observacoes || '',
    tipoDocumento: isRecibo ? 'recibo_medico' : 'prescricao',
    valorConsulta: p.valorConsulta != null ? String(p.valorConsulta) : '',
    dataRecibo: p.dataRecibo || '',
    reciboDocumentoProfissional:
      p.reciboDocumentoProfissional === 'cpf' || p.reciboDocumentoProfissional === 'cnpj'
        ? p.reciboDocumentoProfissional
        : 'omitir',
  };
}

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

const inputCls =
  'w-full bg-[#0A1F44] border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60';

export default function ProtocolosPrescricaoAdmin() {
  const [catalogoAba, setCatalogoAba] = useState<PrescricaoCatalogoAba>('prescricao');
  const [pastas, setPastas] = useState<PrescricaoPasta[]>([]);
  const [itens, setItens] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [isNew, setIsNew] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showModalNovoItem, setShowModalNovoItem] = useState(false);
  const [showModalNovaPasta, setShowModalNovaPasta] = useState(false);
  const [showModalEditPasta, setShowModalEditPasta] = useState(false);
  const [pastaEmEdicao, setPastaEmEdicao] = useState<PrescricaoPasta | null>(null);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [printingCatalog, setPrintingCatalog] = useState<PrescricaoCatalogoAba | null>(null);

  const selected = useMemo(
    () => (selectedId ? itens.find((p) => p.id === selectedId) ?? null : null),
    [itens, selectedId]
  );

  const itensPorPasta = useMemo(() => {
    const map = new Map<string, Prescricao[]>();
    for (const p of pastas) map.set(p.id, []);
    for (const item of itens) {
      if (!item.pastaId) continue;
      map.set(item.pastaId, [...(map.get(item.pastaId) || []), item]);
    }
    return map;
  }, [pastas, itens]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await authFetch(`/api/metaadmingeral/prescricoes-catalogo?catalogo=${catalogoAba}`);
      const j = (await res.json()) as { pastas?: PrescricaoPasta[]; itens?: Prescricao[]; error?: string };
      if (!res.ok) throw new Error(j.error || 'Falha ao carregar.');
      const pastasList = (j.pastas || []).map((p) => ({
        ...p,
        criadoEm: new Date(p.criadoEm),
        atualizadoEm: new Date(p.atualizadoEm),
      }));
      const itensList = (j.itens || []).map((p) => ({
        ...p,
        criadoEm: new Date(p.criadoEm),
        atualizadoEm: new Date(p.atualizadoEm),
      }));
      setPastas(pastasList);
      setItens(itensList);
      setExpanded((prev) => {
        const n = new Set(prev);
        for (const p of pastasList) n.add(p.id);
        return n;
      });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao carregar.' });
    } finally {
      setLoading(false);
    }
  }, [catalogoAba]);

  useEffect(() => {
    setSelectedId(null);
    setIsNew(false);
    setForm(FORM_VAZIO);
    void load();
  }, [load]);

  const selectItem = (p: Prescricao) => {
    setSelectedId(p.id);
    setIsNew(false);
    setForm(formFromItem(p));
  };

  const startNew = (pasta: PrescricaoPasta) => {
    const isRecibo = pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME;
    const label = catalogoAba === 'protocolo' ? 'Novo protocolo' : 'Nova prescrição';
    setSelectedId(null);
    setIsNew(true);
    setForm({
      ...FORM_VAZIO,
      pastaId: pasta.id,
      tipoDocumento: isRecibo ? 'recibo_medico' : 'prescricao',
      nome: label,
      descricao: '',
      itens: [],
    });
    setExpanded((prev) => new Set([...prev, pasta.id]));
    setShowModalNovoItem(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        tipo: 'item',
        ...(selected && !isNew ? { id: selected.id } : {}),
        pastaId: form.pastaId,
        nome: form.nome,
        descricao: form.descricao,
        observacoes: form.observacoes,
        itens: form.tipoDocumento === 'recibo_medico' ? form.itens : [],
        tipoDocumento: form.tipoDocumento,
        ...(form.tipoDocumento === 'recibo_medico'
          ? {
              valorConsulta: form.valorConsulta ? Number(form.valorConsulta.replace(',', '.')) : undefined,
              dataRecibo: form.dataRecibo || undefined,
              reciboDocumentoProfissional: form.reciboDocumentoProfissional,
            }
          : {}),
      };
      const res = await authFetch('/api/metaadmingeral/prescricoes-catalogo', {
        method: selected && !isNew ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const j = (await res.json()) as { error?: string; item?: Prescricao };
      if (!res.ok) throw new Error(j.error || 'Falha ao salvar.');
      setMessage({
        type: 'ok',
        text: 'Salvo. Médicos verão na subaba Protocolo do /metaadmin.',
      });
      await load();
      if (j.item) {
        setSelectedId(j.item.id);
        setIsNew(false);
        setForm(
          formFromItem({
            ...j.item,
            criadoEm: new Date(j.item.criadoEm),
            atualizadoEm: new Date(j.item.atualizadoEm),
          })
        );
      }
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || isNew) return;
    const label = catalogoAba === 'protocolo' ? 'protocolo' : 'prescrição';
    if (!confirm(`Excluir ${label} "${selected.nome}"? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/prescricoes-catalogo?id=${encodeURIComponent(selected.id)}`,
        { method: 'DELETE' }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Falha ao excluir.');
      setMessage({ type: 'ok', text: `${label.charAt(0).toUpperCase()}${label.slice(1)} excluída.` });
      setSelectedId(null);
      setIsNew(false);
      setForm(FORM_VAZIO);
      await load();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao excluir.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditPasta = async () => {
    if (!pastaEmEdicao) return;
    const nome = novaPastaNome.trim();
    if (!nome) {
      setMessage({ type: 'err', text: 'Informe o nome da pasta.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/prescricoes-catalogo', {
        method: 'PUT',
        body: JSON.stringify({ tipo: 'pasta', id: pastaEmEdicao.id, nome }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Falha ao renomear pasta.');
      setShowModalEditPasta(false);
      setPastaEmEdicao(null);
      setNovaPastaNome('');
      setMessage({ type: 'ok', text: 'Pasta renomeada.' });
      await load();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao renomear pasta.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePasta = async (pasta: PrescricaoPasta) => {
    const pastaItens = itensPorPasta.get(pasta.id) || [];
    const itemLabel = catalogoAba === 'protocolo' ? 'protocolos' : 'prescrições';
    const subLabel = catalogoAba === 'protocolo' ? 'subpastas/protocolos' : 'itens';
    const msg =
      pastaItens.length > 0
        ? `Deseja realmente excluir a pasta "${pasta.nome}" e todas as ${subLabel} dela (${pastaItens.length} ${itemLabel})? Esta ação não pode ser desfeita.`
        : `Deseja realmente excluir a pasta "${pasta.nome}"? Esta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch(
        `/api/metaadmingeral/prescricoes-catalogo?tipo=pasta&id=${encodeURIComponent(pasta.id)}`,
        { method: 'DELETE' }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Falha ao excluir pasta.');
      if (selected?.pastaId === pasta.id) {
        setSelectedId(null);
        setIsNew(false);
        setForm(FORM_VAZIO);
      }
      setMessage({ type: 'ok', text: `Pasta "${pasta.nome}" excluída.` });
      await load();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao excluir pasta.' });
    } finally {
      setSaving(false);
    }
  };

  const openEditPastaModal = (pasta: PrescricaoPasta) => {
    setPastaEmEdicao(pasta);
    setNovaPastaNome(pasta.nome);
    setShowModalEditPasta(true);
  };

  const handleCreatePasta = async () => {
    const nome = novaPastaNome.trim();
    if (!nome) {
      setMessage({ type: 'err', text: 'Informe o nome da pasta.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/prescricoes-catalogo', {
        method: 'POST',
        body: JSON.stringify({ tipo: 'pasta', catalogoAba, nome }),
      });
      const j = (await res.json()) as { error?: string; pasta?: PrescricaoPasta };
      if (!res.ok) throw new Error(j.error || 'Falha ao criar pasta.');
      setShowModalNovaPasta(false);
      setNovaPastaNome('');
      setMessage({ type: 'ok', text: 'Pasta criada.' });
      await load();
      if (j.pasta) setExpanded((prev) => new Set([...prev, j.pasta!.id]));
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao criar pasta.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleGrupo = (k: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const handleDownloadCatalogPdf = async (aba: PrescricaoCatalogoAba) => {
    setPrintingCatalog(aba);
    setMessage(null);
    try {
      const res = await authFetch(`/api/metaadmingeral/prescricoes-catalogo?catalogo=${aba}`);
      const j = (await res.json()) as { pastas?: PrescricaoPasta[]; itens?: Prescricao[]; error?: string };
      if (!res.ok) throw new Error(j.error || 'Falha ao gerar PDF.');

      const pastasList = (j.pastas || []).map((p) => ({
        ...p,
        criadoEm: new Date(p.criadoEm),
        atualizadoEm: new Date(p.atualizadoEm),
      }));
      const itensList = (j.itens || []).map((p) => ({
        ...p,
        criadoEm: new Date(p.criadoEm),
        atualizadoEm: new Date(p.atualizadoEm),
      }));

      downloadPrescricaoCatalogoPdf(aba, pastasList, itensList);
      setMessage({
        type: 'ok',
        text: aba === 'protocolo' ? 'PDF de protocolos baixado.' : 'PDF de prescrições baixado.',
      });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao gerar PDF.' });
    } finally {
      setPrintingCatalog(null);
    }
  };

  const renderListBtn = (p: Prescricao, isRecibo: boolean) => {
    const isSel = selectedId === p.id;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => selectItem(p)}
        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
          isSel
            ? isRecibo
              ? 'border-teal-400 bg-teal-500/20 text-teal-100'
              : 'border-[#4CCB7A] bg-[#4CCB7A]/20 text-[#E8EDED]'
            : 'border-white/10 bg-white/5 text-[#E8EDED]/80 hover:bg-white/10'
        }`}
      >
        <span className="font-medium block truncate">{tituloExibicaoPrescricao(p.nome)}</span>
        <span className="text-xs opacity-70">
          {isRecibo ? 'Recibo' : catalogoAba === 'protocolo' ? 'Protocolo' : 'Prescrição'}
        </span>
      </button>
    );
  };

  const novoItemLabel = catalogoAba === 'protocolo' ? 'Novo Protocolo' : 'Nova Prescrição';
  const tituloAba = catalogoAba === 'protocolo' ? 'Protocolo' : 'Prescrições';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-[#4CCB7A]" />
          <div>
            <h2 className="text-2xl font-bold text-[#E8EDED]">Prescrições (SISTEMA)</h2>
            <p className="text-sm text-[#E8EDED]/60">
              Catálogo global editável aqui. Aparece na subaba Protocolo do /metaadmin para todos os médicos.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadCatalogPdf('prescricao')}
            disabled={printingCatalog !== null}
            className="px-3 py-2 text-sm rounded-md border border-white/20 text-[#E8EDED] hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
          >
            {printingCatalog === 'prescricao' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            Baixar PDF Prescrições
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadCatalogPdf('protocolo')}
            disabled={printingCatalog !== null}
            className="px-3 py-2 text-sm rounded-md border border-white/20 text-[#E8EDED] hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
          >
            {printingCatalog === 'protocolo' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            Baixar PDF Protocolos
          </button>
          <button
            type="button"
            onClick={() => setShowModalNovoItem(true)}
            disabled={pastas.length === 0}
            className="px-3 py-2 text-sm rounded-md bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#3db868] flex items-center gap-2 font-medium disabled:opacity-50"
          >
            <Plus size={16} /> {novoItemLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setNovaPastaNome('');
              setShowModalNovaPasta(true);
            }}
            className="px-3 py-2 text-sm rounded-md border border-[#4CCB7A]/50 text-[#4CCB7A] hover:bg-[#4CCB7A]/10 flex items-center gap-2 font-medium"
          >
            <FolderPlus size={16} /> Nova Pasta
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-md border border-white/20 text-[#E8EDED] hover:bg-white/10 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex border-b border-white/10">
        {(['prescricao', 'protocolo'] as PrescricaoCatalogoAba[]).map((aba) => (
          <button
            key={aba}
            type="button"
            onClick={() => setCatalogoAba(aba)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              catalogoAba === aba
                ? 'border-[#4CCB7A] text-[#4CCB7A]'
                : 'border-transparent text-[#E8EDED]/50 hover:text-[#E8EDED]/80'
            }`}
          >
            {aba === 'prescricao' ? 'Prescrições' : 'Protocolo'}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] border border-[#4CCB7A]/30'
              : 'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#4CCB7A]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            <p className="text-xs font-semibold text-[#E8EDED]/50 uppercase tracking-wide mb-3">
              {tituloAba} — pastas SISTEMA
            </p>
            {pastas.length === 0 ? (
              <p className="text-sm text-[#E8EDED]/50 text-center py-8">
                Nenhuma pasta. Clique em Nova Pasta para criar.
              </p>
            ) : (
              <div className="space-y-2">
                {pastas.map((pasta) => {
                  const pastaItens = itensPorPasta.get(pasta.id) || [];
                  const isRecibo = pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME;
                  return (
                    <div key={pasta.id}>
                      <div className="flex items-center gap-1 w-full group/pasta">
                        <button
                          type="button"
                          onClick={() => toggleGrupo(pasta.id)}
                          className={`flex items-center gap-2 flex-1 min-w-0 text-left py-2 text-xs font-semibold ${
                            isRecibo ? 'text-teal-300' : 'text-[#E8EDED]/70'
                          }`}
                        >
                          {expanded.has(pasta.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span className="truncate">
                            {pasta.nome} ({pastaItens.length})
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Editar pasta"
                          disabled={saving}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPastaModal(pasta);
                          }}
                          className="p-1.5 rounded-md text-[#E8EDED]/40 hover:text-[#4CCB7A] hover:bg-white/10 disabled:opacity-40 shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Excluir pasta"
                          disabled={saving}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeletePasta(pasta);
                          }}
                          className="p-1.5 rounded-md text-[#E8EDED]/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {expanded.has(pasta.id) && (
                        <div className="space-y-1.5 pl-1">
                          {pastaItens.length === 0 ? (
                            <p className="text-xs text-[#E8EDED]/40 px-2 py-1">Vazia</p>
                          ) : (
                            pastaItens.map((item) => renderListBtn(item, isRecibo))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
            {!selected && !isNew ? (
              <div className="text-center py-16 text-[#E8EDED]/50">
                <Pill className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>
                  Selecione um item ou clique em {novoItemLabel}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Pasta *</label>
                  <select
                    className={inputCls}
                    value={form.pastaId}
                    onChange={(e) => {
                      const pastaId = e.target.value;
                      const pasta = pastas.find((p) => p.id === pastaId);
                      const isRecibo = pasta?.nome === PRESCRICAO_RECIBO_PASTA_NOME;
                      setForm((f) => ({
                        ...f,
                        pastaId,
                        tipoDocumento: isRecibo ? 'recibo_medico' : 'prescricao',
                      }));
                    }}
                  >
                    <option value="">Selecione...</option>
                    {pastas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Nome *</label>
                  <input
                    className={inputCls}
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                {form.tipoDocumento === 'recibo_medico' ? (
                  <div>
                    <label className="block text-xs text-[#E8EDED]/60 mb-1">Descrição da consulta *</label>
                    <textarea
                      className={`${inputCls} min-h-[80px]`}
                      rows={3}
                      value={form.descricao}
                      onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-[#E8EDED]/60 mb-1">
                      {catalogoAba === 'protocolo' ? 'Conteúdo do protocolo *' : 'Conteúdo da prescrição *'}
                    </label>
                    <textarea
                      className={`${inputCls} min-h-[200px]`}
                      rows={12}
                      value={form.descricao}
                      onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                      placeholder="Escreva o texto completo aqui..."
                    />
                  </div>
                )}
                {form.tipoDocumento === 'recibo_medico' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#E8EDED]/60 mb-1">Valor (R$)</label>
                      <input
                        className={inputCls}
                        value={form.valorConsulta}
                        onChange={(e) => setForm((f) => ({ ...f, valorConsulta: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#E8EDED]/60 mb-1">Data do recibo</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={form.dataRecibo}
                        onChange={(e) => setForm((f) => ({ ...f, dataRecibo: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Observações</label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-md bg-[#4CCB7A] text-[#0A1F44] font-medium hover:bg-[#3db868] flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar
                  </button>
                  {selected && !isNew && (
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-md bg-red-600/80 text-white hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModalNovoItem && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-[#E8EDED]">{novoItemLabel}</h3>
              <p className="text-sm text-[#E8EDED]/60 mt-1">Selecione a pasta onde o item será salvo.</p>
            </div>
            <div className="px-3 py-3 max-h-[min(70vh,420px)] overflow-y-auto space-y-1">
              {pastas.map((pasta) => (
                <button
                  key={pasta.id}
                  type="button"
                  onClick={() => startNew(pasta)}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between group ${
                    pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME
                      ? 'border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME ? 'text-teal-100' : 'text-[#E8EDED]'
                    }`}
                  >
                    {pasta.nome}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#E8EDED]/40 group-hover:text-[#E8EDED]" />
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModalNovoItem(false)}
                className="px-4 py-2 text-sm text-[#E8EDED]/80 hover:text-[#E8EDED]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalEditPasta && pastaEmEdicao && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A1F44] shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-[#E8EDED]">Editar Pasta</h3>
              <p className="text-sm text-[#E8EDED]/60 mt-1">Aba {tituloAba}</p>
            </div>
            <div className="px-5 py-4">
              <input
                className={inputCls}
                placeholder="Nome da pasta"
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleEditPasta()}
              />
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalEditPasta(false);
                  setPastaEmEdicao(null);
                  setNovaPastaNome('');
                }}
                className="px-4 py-2 text-sm text-[#E8EDED]/80 hover:text-[#E8EDED]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleEditPasta()}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-md bg-[#4CCB7A] text-[#0A1F44] font-medium hover:bg-[#3db868] disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalNovaPasta && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A1F44] shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-[#E8EDED]">Nova Pasta</h3>
              <p className="text-sm text-[#E8EDED]/60 mt-1">Aba {tituloAba}</p>
            </div>
            <div className="px-5 py-4">
              <input
                className={inputCls}
                placeholder="Nome da pasta"
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleCreatePasta()}
              />
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModalNovaPasta(false)}
                className="px-4 py-2 text-sm text-[#E8EDED]/80 hover:text-[#E8EDED]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreatePasta()}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-md bg-[#4CCB7A] text-[#0A1F44] font-medium hover:bg-[#3db868] disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
