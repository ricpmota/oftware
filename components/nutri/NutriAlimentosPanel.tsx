'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  CATEGORIAS_ALIMENTO,
  GRUPOS_ALIMENTO_ORDEM,
  ROTULO_GRUPO_ALIMENTO,
  type AlimentoNutricionista,
  type GrupoAlimentoRefeicao,
} from '@/lib/nutri/alimentosNutricionista';
import {
  nomeBaseAlimento,
  normalizarItemComPorcao,
  type CategoriaItemPlano,
} from '@/lib/nutri/planosNutricionista';
import { NutriAlimentosService } from '@/services/nutriAlimentosService';
import NutriAlimentosMetanutriBiblioteca from '@/components/nutri/NutriAlimentosMetanutriBiblioteca';

type DraftAlimento = {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  proteina_g: number;
  calorias_kcal: number;
  peso_g: number;
  quantidade: number;
  unidade: string;
  descricao: string;
  favorito: boolean;
  grupos: GrupoAlimentoRefeicao[];
  origemCatalogo: boolean;
  isNew: boolean;
};

function toDraft(a: AlimentoNutricionista): DraftAlimento {
  const norm = normalizarItemComPorcao({
    id: a.id,
    nome: a.nome,
    categoria: a.categoria,
    proteina_g: a.proteina_g,
    calorias_kcal: a.calorias_kcal,
    descricao: a.descricao,
    peso_g: a.peso_g,
    quantidade: a.quantidade,
    unidade: a.unidade,
    proteinaBase_g: a.proteinaBase_g,
    caloriasBase_kcal: a.caloriasBase_kcal,
    pesoBase_g: a.pesoBase_g,
  });
  return {
    id: a.id,
    nome: nomeBaseAlimento(norm.nome),
    categoria: a.categoria,
    proteina_g: norm.proteina_g,
    calorias_kcal: norm.calorias_kcal,
    peso_g: norm.peso_g ?? 100,
    quantidade: norm.quantidade ?? 1,
    unidade: norm.unidade || '',
    descricao: a.descricao || '',
    favorito: a.favorito,
    grupos: [...a.grupos],
    origemCatalogo: a.origemCatalogo,
    isNew: false,
  };
}

function draftVazio(): DraftAlimento {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nome: '',
    categoria: 'proteina',
    proteina_g: 0,
    calorias_kcal: 0,
    peso_g: 100,
    quantidade: 1,
    unidade: '',
    descricao: '',
    favorito: true,
    grupos: [...GRUPOS_ALIMENTO_ORDEM],
    origemCatalogo: false,
    isNew: true,
  };
}

export default function NutriAlimentosPanel() {
  const uid = auth.currentUser?.uid || '';
  const [aba, setAba] = useState<'metanutri' | 'meus'>('metanutri');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alimentos, setAlimentos] = useState<AlimentoNutricionista[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroFavoritos, setFiltroFavoritos] = useState(false);
  const [filtroGrupo, setFiltroGrupo] = useState<GrupoAlimentoRefeicao | 'todos'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaItemPlano | 'todas'>('todas');
  const [draft, setDraft] = useState<DraftAlimento | null>(null);
  const [meusCarregados, setMeusCarregados] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid) {
      setAlimentos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      // garantirSeed só na base particular — NUNCA em alimentos_globais
      const lista = await NutriAlimentosService.garantirSeed(uid);
      setAlimentos(lista);
      setMeusCarregados(true);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível carregar os alimentos.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (aba === 'meus' && uid && !meusCarregados) {
      void carregar();
    }
  }, [aba, uid, meusCarregados, carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alimentos.filter((a) => {
      if (filtroFavoritos && !a.favorito) return false;
      if (filtroGrupo !== 'todos' && !a.grupos.includes(filtroGrupo)) return false;
      if (filtroCategoria !== 'todas' && a.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        a.categoria.toLowerCase().includes(q) ||
        (a.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [alimentos, busca, filtroFavoritos, filtroGrupo, filtroCategoria]);

  const toggleFavoritoRapido = async (alimento: AlimentoNutricionista) => {
    if (!uid) return;
    const next = { ...alimento, favorito: !alimento.favorito };
    setAlimentos((prev) => prev.map((a) => (a.id === alimento.id ? next : a)));
    try {
      await NutriAlimentosService.salvar(uid, next);
    } catch (e) {
      console.error(e);
      setAlimentos((prev) => prev.map((a) => (a.id === alimento.id ? alimento : a)));
      setErro('Não foi possível atualizar o favorito.');
    }
  };

  const excluir = async (alimento: AlimentoNutricionista) => {
    if (!uid) return;
    if (!window.confirm(`Excluir "${alimento.nome}" da sua base de alimentos?`)) return;
    try {
      await NutriAlimentosService.excluir(uid, alimento.id);
      setAlimentos((prev) => prev.filter((a) => a.id !== alimento.id));
    } catch (e) {
      console.error(e);
      setErro('Não foi possível excluir o alimento.');
    }
  };

  const salvarDraft = async () => {
    if (!uid || !draft) return;
    const nome = draft.nome.trim();
    if (!nome) {
      setErro('Informe o nome do alimento.');
      return;
    }
    if (draft.grupos.length === 0) {
      setErro('Selecione pelo menos um grupo de refeição.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const norm = normalizarItemComPorcao({
        id: draft.id,
        nome,
        categoria: draft.categoria,
        proteina_g: Math.max(0, draft.proteina_g),
        calorias_kcal: Math.max(0, draft.calorias_kcal),
        descricao: draft.descricao.trim() || undefined,
        peso_g: Math.max(1, draft.peso_g),
        quantidade: Math.max(0.01, draft.quantidade),
        unidade: draft.unidade,
        proteinaBase_g: Math.max(0, draft.proteina_g),
        caloriasBase_kcal: Math.max(0, draft.calorias_kcal),
        pesoBase_g: Math.max(1, draft.peso_g),
      });
      const existente = alimentos.find((a) => a.id === draft.id);
      const salvo: AlimentoNutricionista = {
        id: draft.id,
        nome: nomeBaseAlimento(norm.nome),
        categoria: draft.categoria,
        proteina_g: norm.proteina_g,
        calorias_kcal: norm.calorias_kcal,
        descricao: draft.descricao.trim() || undefined,
        peso_g: norm.peso_g,
        quantidade: norm.quantidade,
        unidade: norm.unidade,
        proteinaBase_g: norm.proteinaBase_g,
        caloriasBase_kcal: norm.caloriasBase_kcal,
        pesoBase_g: norm.pesoBase_g,
        favorito: draft.favorito,
        grupos: draft.grupos,
        origemCatalogo: draft.origemCatalogo,
        criadoEm: existente?.criadoEm || new Date(),
        atualizadoEm: new Date(),
      };
      await NutriAlimentosService.salvar(uid, salvo, { isNew: draft.isNew });
      setAlimentos((prev) => {
        const sem = prev.filter((a) => a.id !== salvo.id);
        return [...sem, salvo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      });
      setDraft(null);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar o alimento.');
    } finally {
      setSalvando(false);
    }
  };

  if (!uid) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        Faça login para gerenciar seus alimentos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2F8FA3]/30 bg-gradient-to-br from-[#2F8FA3]/10 via-white to-[#4CCB7A]/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Apple className="h-5 w-5 text-[#2F8FA3]" />
              <h2 className="text-lg font-semibold text-[#0A1F44]">Biblioteca de Alimentos</h2>
            </div>
            <p className="text-xs text-[#0A1F44]/70 max-w-2xl leading-relaxed">
              <strong>METANUTRI</strong> é a base global compartilhada (somente leitura).{' '}
              <strong>Meus Alimentos</strong> é o seu patrimônio particular — criar, editar e
              favoritar. Favoritar na METANUTRI cria só um vínculo, sem copiar o alimento.
            </p>
          </div>
          {aba === 'meus' ? (
            <button
              type="button"
              onClick={() => setDraft(draftVazio())}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Novo alimento
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAba('metanutri')}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
            aba === 'metanutri' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          METANUTRI
        </button>
        <button
          type="button"
          onClick={() => setAba('meus')}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
            aba === 'meus' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Meus Alimentos
        </button>
      </div>

      {aba === 'metanutri' ? (
        <NutriAlimentosMetanutriBiblioteca uid={uid} />
      ) : (
        <>
      {erro ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alimento..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltroFavoritos((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
              filtroFavoritos
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${filtroFavoritos ? 'fill-amber-500 text-amber-500' : ''}`} />
            Favoritos
          </button>
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value as GrupoAlimentoRefeicao | 'todos')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700"
          >
            <option value="todos">Todos os grupos</option>
            {GRUPOS_ALIMENTO_ORDEM.map((g) => (
              <option key={g} value={g}>
                {ROTULO_GRUPO_ALIMENTO[g]}
              </option>
            ))}
          </select>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as CategoriaItemPlano | 'todas')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700"
          >
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS_ALIMENTO.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando alimentos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Nenhum alimento encontrado com esses filtros.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto max-h-[min(70vh,720px)]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10"></th>
                    <th className="px-3 py-2.5">Alimento</th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5">Peso</th>
                    <th className="px-3 py-2.5">Prot.</th>
                    <th className="px-3 py-2.5">Kcal</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Grupos</th>
                    <th className="px-3 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrados.map((alimento) => (
                    <tr key={alimento.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          onClick={() => void toggleFavoritoRapido(alimento)}
                          className="rounded-md p-1 text-amber-500 hover:bg-amber-50"
                          title={alimento.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
                          aria-label={
                            alimento.favorito
                              ? `Remover ${alimento.nome} dos favoritos`
                              : `Favoritar ${alimento.nome}`
                          }
                        >
                          <Star
                            className={`h-4 w-4 ${alimento.favorito ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <p className="font-medium text-gray-900">{alimento.nome}</p>
                        {alimento.origemCatalogo ? (
                          <p className="text-[10px] text-gray-400">Catálogo base</p>
                        ) : (
                          <p className="text-[10px] text-green-600">Criado por você</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-gray-600 capitalize">
                        {CATEGORIAS_ALIMENTO.find((c) => c.id === alimento.categoria)?.label ||
                          alimento.categoria}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs tabular-nums text-gray-700">
                        {alimento.peso_g ? `${alimento.peso_g}g` : '—'}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs tabular-nums text-gray-700">
                        {alimento.proteina_g}g
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs tabular-nums text-gray-700">
                        {alimento.calorias_kcal}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {alimento.grupos.map((g) => (
                            <span
                              key={g}
                              className="rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                            >
                              {ROTULO_GRUPO_ALIMENTO[g]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDraft(toDraft(alimento))}
                            className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-800 hover:bg-green-100"
                            title="Editar"
                            aria-label={`Editar ${alimento.nome}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void excluir(alimento)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            title="Excluir"
                            aria-label={`Excluir ${alimento.nome}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
              {filtrados.length} de {alimentos.length} alimentos ·{' '}
              {alimentos.filter((a) => a.favorito).length} favoritos
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {draft ? (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {draft.isNew ? 'Novo alimento' : 'Editar alimento'}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">Nome</span>
                <input
                  type="text"
                  value={draft.nome}
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ex.: Peito de frango grelhado"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-700">Categoria</span>
                  <select
                    value={draft.categoria}
                    onChange={(e) =>
                      setDraft({ ...draft, categoria: e.target.value as CategoriaItemPlano })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {CATEGORIAS_ALIMENTO.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-700">Peso (g)</span>
                  <input
                    type="number"
                    min={1}
                    value={draft.peso_g}
                    onChange={(e) => setDraft({ ...draft, peso_g: Number(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-700">Proteína (g)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={draft.proteina_g}
                    onChange={(e) =>
                      setDraft({ ...draft, proteina_g: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gray-700">Calorias (kcal)</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.calorias_kcal}
                    onChange={(e) =>
                      setDraft({ ...draft, calorias_kcal: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.favorito}
                  onChange={(e) => setDraft({ ...draft, favorito: e.target.checked })}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-400"
                />
                <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                <span className="text-sm font-semibold text-amber-900">Favorito</span>
              </label>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-700">Grupos (onde aparece)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {GRUPOS_ALIMENTO_ORDEM.map((g) => {
                    const checked = draft.grupos.includes(g);
                    return (
                      <label
                        key={g}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                          checked
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setDraft({
                              ...draft,
                              grupos: checked
                                ? draft.grupos.filter((x) => x !== g)
                                : [...draft.grupos, g],
                            });
                          }}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                        />
                        {ROTULO_GRUPO_ALIMENTO[g]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">Observação interna (opcional)</span>
                <textarea
                  value={draft.descricao}
                  onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarDraft()}
                disabled={salvando}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
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
