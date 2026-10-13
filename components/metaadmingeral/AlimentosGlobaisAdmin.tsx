'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  ROTULO_SEGMENTO_ALIMENTO,
  ROTULO_STATUS_ALIMENTO_GLOBAL,
  SEGMENTOS_ALIMENTO,
  STATUS_ALIMENTO_GLOBAL,
  type SegmentoAlimento,
  type StatusAlimentoGlobal,
} from '@/lib/metaadmingeral/alimentosGlobais';
import AlimentosGlobaisImportPanel from '@/components/metaadmingeral/AlimentosGlobaisImportPanel';

type AlimentoGlobalRow = {
  id: string;
  nome: string;
  nomeNormalizado: string;
  descricao?: string | null;
  nomeCientifico?: string | null;
  marca?: string | null;
  segmento: SegmentoAlimento;
  baseQuantidade: number;
  baseUnidade: 'g';
  energiaKcal?: number | null;
  proteinasG?: number | null;
  carboidratosG?: number | null;
  gordurasTotaisG?: number | null;
  fibrasG?: number | null;
  fonte?: {
    nome?: string | null;
    codigoOriginal?: string | null;
    documento?: string | null;
  } | null;
  observacoes?: string | null;
  status: StatusAlimentoGlobal;
  origemCadastro?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

type DraftForm = {
  id?: string;
  nome: string;
  descricao: string;
  nomeCientifico: string;
  marca: string;
  segmento: SegmentoAlimento | '';
  energiaKcal: string;
  proteinasG: string;
  carboidratosG: string;
  gordurasTotaisG: string;
  fibrasG: string;
  fonteNome: string;
  codigoOriginal: string;
  observacoes: string;
  status: StatusAlimentoGlobal;
};

const inputCls =
  'w-full rounded-lg border border-white/20 bg-[#0A1F44] px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35 focus:border-[#4CCB7A]/50 focus:outline-none';

const selectCls = inputCls;

async function authFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Não autenticado.');
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function emptyDraft(): DraftForm {
  return {
    nome: '',
    descricao: '',
    nomeCientifico: '',
    marca: '',
    segmento: '',
    energiaKcal: '',
    proteinasG: '',
    carboidratosG: '',
    gordurasTotaisG: '',
    fibrasG: '',
    fonteNome: '',
    codigoOriginal: '',
    observacoes: '',
    status: 'draft',
  };
}

function draftFromRow(row: AlimentoGlobalRow): DraftForm {
  return {
    id: row.id,
    nome: row.nome || '',
    descricao: row.descricao || '',
    nomeCientifico: row.nomeCientifico || '',
    marca: row.marca || '',
    segmento: row.segmento,
    energiaKcal: row.energiaKcal == null ? '' : String(row.energiaKcal),
    proteinasG: row.proteinasG == null ? '' : String(row.proteinasG),
    carboidratosG: row.carboidratosG == null ? '' : String(row.carboidratosG),
    gordurasTotaisG: row.gordurasTotaisG == null ? '' : String(row.gordurasTotaisG),
    fibrasG: row.fibrasG == null ? '' : String(row.fibrasG),
    fonteNome: row.fonte?.nome || '',
    codigoOriginal: row.fonte?.codigoOriginal || '',
    observacoes: row.observacoes || '',
    status: row.status,
  };
}

function formatMacro(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function statusBadgeClass(status: StatusAlimentoGlobal): string {
  switch (status) {
    case 'published':
      return 'border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-[#4CCB7A]';
    case 'review':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
    case 'inactive':
      return 'border-white/15 bg-white/5 text-[#E8EDED]/50';
    default:
      return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }
}

export default function AlimentosGlobaisAdmin() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alimentos, setAlimentos] = useState<AlimentoGlobalRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState<SegmentoAlimento | 'todos'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusAlimentoGlobal | 'todos'>('todos');
  const [draft, setDraft] = useState<DraftForm | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set('q', busca.trim());
      if (filtroSegmento !== 'todos') params.set('segmento', filtroSegmento);
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      const qs = params.toString();
      const res = await authFetch(`/api/metaadmingeral/alimentos-globais${qs ? `?${qs}` : ''}`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        alimentos?: AlimentoGlobalRow[];
      };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar alimentos.');
      setAlimentos(Array.isArray(data.alimentos) ? data.alimentos : []);
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
      setAlimentos([]);
    } finally {
      setLoading(false);
    }
  }, [busca, filtroSegmento, filtroStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      void carregar();
    }, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  const totalLabel = useMemo(() => {
    const n = alimentos.length;
    return `${n} alimento${n === 1 ? '' : 's'}`;
  }, [alimentos.length]);

  const salvar = async () => {
    if (!draft) return;
    const nome = draft.nome.trim();
    if (!nome) {
      setErro('Informe o nome do alimento.');
      return;
    }
    if (!draft.segmento) {
      setErro('Selecione o segmento.');
      return;
    }
    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const payload = {
        nome,
        descricao: draft.descricao.trim() || null,
        nomeCientifico: draft.nomeCientifico.trim() || null,
        marca: draft.marca.trim() || null,
        segmento: draft.segmento,
        baseQuantidade: 100,
        baseUnidade: 'g' as const,
        energiaKcal: draft.energiaKcal.trim() === '' ? null : Number(draft.energiaKcal.replace(',', '.')),
        proteinasG: draft.proteinasG.trim() === '' ? null : Number(draft.proteinasG.replace(',', '.')),
        carboidratosG:
          draft.carboidratosG.trim() === '' ? null : Number(draft.carboidratosG.replace(',', '.')),
        gordurasTotaisG:
          draft.gordurasTotaisG.trim() === ''
            ? null
            : Number(draft.gordurasTotaisG.replace(',', '.')),
        fibrasG: draft.fibrasG.trim() === '' ? null : Number(draft.fibrasG.replace(',', '.')),
        fonte: {
          nome: draft.fonteNome.trim() || null,
          codigoOriginal: draft.codigoOriginal.trim() || null,
        },
        observacoes: draft.observacoes.trim() || null,
        status: draft.status,
        origemCadastro: 'manual' as const,
      };

      const isEdit = Boolean(draft.id);
      const res = await authFetch('/api/metaadmingeral/alimentos-globais', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(isEdit ? { id: draft.id, ...payload } : payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setDraft(null);
      setOkMsg(isEdit ? 'Alimento atualizado.' : 'Alimento criado.');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (row: AlimentoGlobalRow, status: StatusAlimentoGlobal) => {
    setErro(null);
    setOkMsg(null);
    try {
      const res = await authFetch('/api/metaadmingeral/alimentos-globais', {
        method: 'PATCH',
        body: JSON.stringify({ id: row.id, status }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao alterar status.');
      setOkMsg(`Status → ${ROTULO_STATUS_ALIMENTO_GLOBAL[status]}`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Apple className="h-5 w-5 text-[#4CCB7A]" />
            <h2 className="text-2xl font-bold text-[#E8EDED]">Alimentos</h2>
          </div>
          <p className="mt-1 text-sm text-[#E8EDED]/60 max-w-2xl leading-relaxed">
            Base global METANUTRI do Patrimônio Oftware. Valores nutricionais são por{' '}
            <strong className="text-[#E8EDED]/80 font-semibold">100 g</strong>. Campos vazios
            permanecem sem informação (null) — zero só quando a fonte informou zero. Ainda não
            conectada ao MetaNutri.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setOkMsg(null);
            setDraft(emptyDraft());
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-[#4CCB7A] px-3.5 py-2.5 text-sm font-semibold text-[#0A1F44] hover:bg-[#3db86a]"
        >
          <Plus className="h-4 w-4" />
          Novo alimento
        </button>
      </div>

      {erro ? (
        <p className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {erro}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-3 py-2 text-sm text-[#4CCB7A]">
          {okMsg}
        </p>
      ) : null}

      <AlimentosGlobaisImportPanel />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E8EDED]/40" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alimento..."
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            value={filtroSegmento}
            onChange={(e) => setFiltroSegmento(e.target.value as SegmentoAlimento | 'todos')}
            className={`${selectCls} w-auto min-w-[180px]`}
          >
            <option value="todos">Todos os segmentos</option>
            {SEGMENTOS_ALIMENTO.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SEGMENTO_ALIMENTO[s]}
              </option>
            ))}
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusAlimentoGlobal | 'todos')}
            className={`${selectCls} w-auto min-w-[140px]`}
          >
            <option value="todos">Todos os status</option>
            {STATUS_ALIMENTO_GLOBAL.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_ALIMENTO_GLOBAL[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#E8EDED]/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando alimentos...
          </div>
        ) : alimentos.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#E8EDED]/50">
            Nenhum alimento encontrado. Cadastre o primeiro item com “Novo alimento”.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto max-h-[min(70vh,720px)]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#0A1F44] text-[11px] font-semibold uppercase tracking-wide text-[#E8EDED]/50 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Nome</th>
                    <th className="px-3 py-2.5">Segmento</th>
                    <th className="px-3 py-2.5 text-right" title="por 100 g">
                      kcal
                    </th>
                    <th className="px-3 py-2.5 text-right" title="por 100 g">
                      Prot.
                    </th>
                    <th className="px-3 py-2.5 text-right" title="por 100 g">
                      Carb.
                    </th>
                    <th className="px-3 py-2.5 text-right" title="por 100 g">
                      Gord.
                    </th>
                    <th className="px-3 py-2.5 text-right" title="por 100 g">
                      Fibra
                    </th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Fonte</th>
                    <th className="px-3 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {alimentos.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-2.5 align-middle">
                        <p className="font-medium text-[#E8EDED]">{row.nome}</p>
                        <p className="text-[10px] text-[#E8EDED]/40">por 100 g</p>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-[#E8EDED]/70">
                        {ROTULO_SEGMENTO_ALIMENTO[row.segmento] || row.segmento}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-[#E8EDED]/80">
                        {formatMacro(row.energiaKcal)}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-[#E8EDED]/80">
                        {formatMacro(row.proteinasG)}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-[#E8EDED]/80">
                        {formatMacro(row.carboidratosG)}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-[#E8EDED]/80">
                        {formatMacro(row.gordurasTotaisG)}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums text-[#E8EDED]/80">
                        {formatMacro(row.fibrasG)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {ROTULO_STATUS_ALIMENTO_GLOBAL[row.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-[#E8EDED]/60 max-w-[140px] truncate">
                        {row.fonte?.nome || row.fonte?.codigoOriginal || '—'}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setErro(null);
                              setOkMsg(null);
                              setDraft(draftFromRow(row));
                            }}
                            className="rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 p-2 text-[#4CCB7A] hover:bg-[#4CCB7A]/20"
                            title="Editar"
                            aria-label={`Editar ${row.nome}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {row.status !== 'published' ? (
                            <button
                              type="button"
                              onClick={() => void alterarStatus(row, 'published')}
                              className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-[#E8EDED]/80 hover:bg-white/10"
                            >
                              Publicar
                            </button>
                          ) : null}
                          {row.status !== 'inactive' ? (
                            <button
                              type="button"
                              onClick={() => void alterarStatus(row, 'inactive')}
                              className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-[#E8EDED]/50 hover:bg-white/10"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void alterarStatus(row, 'draft')}
                              className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-[#E8EDED]/70 hover:bg-white/10"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-white/10 bg-black/20 px-3 py-2 text-[11px] text-[#E8EDED]/45">
              {totalLabel} · macros por 100 g · — = informação ausente (null)
            </div>
          </div>
        )}
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F2744] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E8EDED]">
                {draft.id ? 'Editar alimento' : 'Novo alimento'}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-lg p-1.5 text-[#E8EDED]/60 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="text-[11px] text-[#E8EDED]/45">
                Obrigatórios: Nome e Segmento. Base fixa: 100 g. Deixe campos vazios para null.
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Nome *</span>
                <input
                  type="text"
                  value={draft.nome}
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                  className={inputCls}
                  placeholder="Ex.: Banana, prata, madura"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Segmento *</span>
                <select
                  value={draft.segmento}
                  onChange={(e) =>
                    setDraft({ ...draft, segmento: e.target.value as SegmentoAlimento | '' })
                  }
                  className={selectCls}
                >
                  <option value="">Selecione...</option>
                  {SEGMENTOS_ALIMENTO.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_SEGMENTO_ALIMENTO[s]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Nome científico</span>
                  <input
                    type="text"
                    value={draft.nomeCientifico}
                    onChange={(e) => setDraft({ ...draft, nomeCientifico: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Marca</span>
                  <input
                    type="text"
                    value={draft.marca}
                    onChange={(e) => setDraft({ ...draft, marca: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Descrição</span>
                <textarea
                  value={draft.descricao}
                  onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                  rows={2}
                  className={inputCls}
                />
              </label>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#E8EDED]/40 pt-1">
                Nutrientes por 100 g
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['energiaKcal', 'Energia (kcal)'],
                    ['proteinasG', 'Proteína (g)'],
                    ['carboidratosG', 'Carboidrato (g)'],
                    ['gordurasTotaisG', 'Gordura (g)'],
                    ['fibrasG', 'Fibra (g)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1">
                    <span className="text-xs font-semibold text-[#E8EDED]/80">{label}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      className={inputCls}
                      placeholder="vazio = null"
                    />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Fonte</span>
                  <input
                    type="text"
                    value={draft.fonteNome}
                    onChange={(e) => setDraft({ ...draft, fonteNome: e.target.value })}
                    className={inputCls}
                    placeholder="Ex.: Tabela TBCA"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#E8EDED]/80">Código original</span>
                  <input
                    type="text"
                    value={draft.codigoOriginal}
                    onChange={(e) => setDraft({ ...draft, codigoOriginal: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Status</span>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as StatusAlimentoGlobal })
                  }
                  className={selectCls}
                >
                  {STATUS_ALIMENTO_GLOBAL.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_STATUS_ALIMENTO_GLOBAL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#E8EDED]/80">Observações</span>
                <textarea
                  value={draft.observacoes}
                  onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
                  rows={2}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 text-sm font-semibold text-[#E8EDED]/80 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#4CCB7A] px-3 py-2.5 text-sm font-semibold text-[#0A1F44] hover:bg-[#3db86a] disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
