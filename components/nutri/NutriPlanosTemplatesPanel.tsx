'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  Coffee,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Save,
  Sun,
  Sunset,
  Trash2,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  REFEICOES_PLANO_ORDEM,
  ROTULO_REFEICAO_PLANO,
  clonarItensComNovosIds,
  criarItemComPorcao,
  criarRefeicaoPlanoVazia,
  criarRefeicoesPlanoVazias,
  formatarNomeItemPorcao,
  formatarResumoMacrosItem,
  formatarResumoMacrosRefeicao,
  nomeBaseAlimento,
  normalizarItemComPorcao,
  recalcularMacrosRefeicaoPlano,
  type CategoriaItemPlano,
  type ItemPlanoRefeicao,
  type NutriPlanoCardapioTemplate,
  type RefeicaoPlanoKey,
  type RefeicaoPlanoTemplate,
} from '@/lib/nutri/planosNutricionista';
import {
  alimentoParaItemPlano,
  filtrarFavoritosDoGrupo,
  type AlimentoNutricionista,
} from '@/lib/nutri/alimentosNutricionista';
import { NutriPlanosTemplateService } from '@/services/nutriPlanosTemplateService';
import { NutriAlimentosService } from '@/services/nutriAlimentosService';
import EditarPorcaoItemModal, {
  type PorcaoItemEditavel,
} from '@/components/nutri/EditarPorcaoItemModal';
import { ROTULO_SEGMENTO_ALIMENTO } from '@/lib/metaadmingeral/alimentosGlobais/segmentos';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';
import {
  calcularNutrientePorPorcao,
  roundNutriente,
} from '@/lib/metanutri/alimentosGlobais/calcularNutrientePorPorcao';
import {
  categoriaDaAbaBuilder,
  mapMetaNutriFoodToItemPlano,
} from '@/lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano';

type BuilderTab = 'proteina' | 'carboidrato' | 'gordura' | 'reguladores';
type AddFoodMode = 'metanutri' | 'taco' | 'manual';

type TacoSearchItem = {
  id?: string | number;
  nome: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
};

function formatMacroOrDash(v: number | null | undefined) {
  if (v == null) return '—';
  return String(v);
}

const TAB_CATEGORIES: Record<BuilderTab, CategoriaItemPlano[]> = {
  proteina: ['proteina'],
  carboidrato: ['carboidrato'],
  gordura: ['gordura_boa'],
  reguladores: ['legumes_salada', 'extra'],
};

const REFEICAO_ICONS: Record<RefeicaoPlanoKey, typeof Coffee> = {
  cafe: Coffee,
  lanche1: Sun,
  almoco: Sunset,
  lanche2: Sun,
  jantar: Moon,
};

function mergeItensDisponiveis(
  refeicao: RefeicaoPlanoTemplate,
  catalogoGrupo: ItemPlanoRefeicao[]
): ItemPlanoRefeicao[] {
  const salvos = new Map(refeicao.itens.map((i) => [i.id, normalizarItemComPorcao(i)]));
  const baseIds = new Set(catalogoGrupo.map((i) => i.id));
  const fromBase = catalogoGrupo.map((i) => salvos.get(i.id) || i);
  const extras = refeicao.itens
    .filter((i) => !baseIds.has(i.id))
    .map((i) => salvos.get(i.id) || normalizarItemComPorcao(i));
  return [...fromBase, ...extras];
}

const ROTULO_CURTO_REFEICAO: Record<RefeicaoPlanoKey, string> = {
  cafe: 'Café',
  lanche1: 'Lanche 1',
  almoco: 'Almoço',
  lanche2: 'Lanche 2',
  jantar: 'Jantar',
};

function ResumoItensPorRefeicao({
  plano,
  compact = false,
}: {
  plano: NutriPlanoCardapioTemplate;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {REFEICOES_PLANO_ORDEM.map((key) => {
        const n = plano.refeicoes[key]?.itensSelecionados?.length || 0;
        const Icon = REFEICAO_ICONS[key];
        const vazio = n === 0;
        return (
          <span
            key={key}
            title={`${ROTULO_REFEICAO_PLANO[key]}: ${n} ${n === 1 ? 'item' : 'itens'}`}
            className={`inline-flex items-center gap-1 rounded-md border tabular-nums ${
              compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
            } ${
              vazio
                ? 'border-gray-100 bg-gray-50 text-gray-400'
                : 'border-emerald-100 bg-emerald-50 text-emerald-800'
            }`}
          >
            <Icon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
            {!compact ? (
              <span className="font-medium text-gray-600">{ROTULO_CURTO_REFEICAO[key]}</span>
            ) : null}
            <span className={`font-semibold ${vazio ? 'text-gray-400' : 'text-emerald-900'}`}>
              {n}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function NutriPlanosTemplatesPanel() {
  const uid = auth.currentUser?.uid || '';
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [planos, setPlanos] = useState<NutriPlanoCardapioTemplate[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeDraft, setNomeDraft] = useState('');
  const [refeicoesDraft, setRefeicoesDraft] = useState(criarRefeicoesPlanoVazias());
  const [criadoEmDraft, setCriadoEmDraft] = useState<Date | undefined>();
  const [refeicaoAtiva, setRefeicaoAtiva] = useState<RefeicaoPlanoKey>('cafe');
  const [abaBuilder, setAbaBuilder] = useState<BuilderTab>('proteina');
  const [erro, setErro] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<AddFoodMode>('metanutri');
  const [tacoQuery, setTacoQuery] = useState('');
  const [tacoResultados, setTacoResultados] = useState<TacoSearchItem[]>([]);
  const [loadingTaco, setLoadingTaco] = useState(false);
  const [tacoSelecionado, setTacoSelecionado] = useState<TacoSearchItem | null>(null);
  const [metaQuery, setMetaQuery] = useState('');
  const [metaResultados, setMetaResultados] = useState<MetaNutriFoodSearchResult[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaErro, setMetaErro] = useState<string | null>(null);
  const [metaSelecionado, setMetaSelecionado] = useState<MetaNutriFoodSearchResult | null>(null);
  const [metaPorcaoId, setMetaPorcaoId] = useState<string>('');
  const [pesoNovo, setPesoNovo] = useState(100);
  const [unidadeNova, setUnidadeNova] = useState('');
  const [manualNome, setManualNome] = useState('');
  const [manualPeso, setManualPeso] = useState(100);
  const [manualProt, setManualProt] = useState(0);
  const [manualKcal, setManualKcal] = useState(0);
  const [porcaoEditando, setPorcaoEditando] = useState<PorcaoItemEditavel | null>(null);
  const [alimentosNutri, setAlimentosNutri] = useState<AlimentoNutricionista[]>([]);

  const carregar = useCallback(async () => {
    if (!uid) {
      setPlanos([]);
      setAlimentosNutri([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const [lista, alimentos] = await Promise.all([
        NutriPlanosTemplateService.listar(uid),
        NutriAlimentosService.garantirSeed(uid),
      ]);
      setPlanos(lista);
      setAlimentosNutri(alimentos);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível carregar os planos salvos.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!showAddModal || addMode !== 'taco') return;
    const q = tacoQuery.trim();
    if (q.length < 2) {
      setTacoResultados([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingTaco(true);
      try {
        const res = await fetch(`/api/taco-buscar?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (!cancelled) setTacoResultados(Array.isArray(json?.alimentos) ? json.alimentos : []);
      } catch {
        if (!cancelled) setTacoResultados([]);
      } finally {
        if (!cancelled) setLoadingTaco(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showAddModal, addMode, tacoQuery]);

  useEffect(() => {
    if (!showAddModal || addMode !== 'metanutri') return;
    const q = metaQuery.trim();
    if (q.length < 2) {
      setMetaResultados([]);
      setMetaErro(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingMeta(true);
      setMetaErro(null);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Não autenticado.');
        const res = await fetch(
          `/api/metanutri/alimentos-globais?q=${encodeURIComponent(q)}&limit=30`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Falha na busca MetaNutri.');
        if (!cancelled) {
          setMetaResultados(Array.isArray(json?.alimentos) ? json.alimentos : []);
        }
      } catch (e) {
        if (!cancelled) {
          setMetaResultados([]);
          setMetaErro(e instanceof Error ? e.message : 'Erro na busca.');
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showAddModal, addMode, metaQuery]);

  const refeicaoAtual = refeicoesDraft[refeicaoAtiva];
  const catalogoGrupoAtivo = useMemo(() => {
    return filtrarFavoritosDoGrupo(alimentosNutri, refeicaoAtiva).map(alimentoParaItemPlano);
  }, [alimentosNutri, refeicaoAtiva]);
  const catalogoGrupoIds = useMemo(
    () => new Set(catalogoGrupoAtivo.map((i) => i.id)),
    [catalogoGrupoAtivo]
  );
  const itensDisponiveis = useMemo(
    () => mergeItensDisponiveis(refeicaoAtual, catalogoGrupoAtivo),
    [refeicaoAtual, catalogoGrupoAtivo]
  );
  const selecionadosSet = useMemo(
    () => new Set(refeicaoAtual.itensSelecionados),
    [refeicaoAtual.itensSelecionados]
  );

  const iniciarNovo = () => {
    setEditandoId('novo');
    setNomeDraft('');
    setRefeicoesDraft(criarRefeicoesPlanoVazias());
    setCriadoEmDraft(undefined);
    setRefeicaoAtiva('cafe');
    setAbaBuilder('proteina');
    setErro(null);
  };

  const abrirEdicao = (plano: NutriPlanoCardapioTemplate) => {
    setEditandoId(plano.id);
    setNomeDraft(plano.nome);
    setRefeicoesDraft({
      cafe: { ...plano.refeicoes.cafe, itens: [...plano.refeicoes.cafe.itens] },
      lanche1: { ...plano.refeicoes.lanche1, itens: [...plano.refeicoes.lanche1.itens] },
      almoco: { ...plano.refeicoes.almoco, itens: [...plano.refeicoes.almoco.itens] },
      lanche2: { ...plano.refeicoes.lanche2, itens: [...plano.refeicoes.lanche2.itens] },
      jantar: { ...plano.refeicoes.jantar, itens: [...plano.refeicoes.jantar.itens] },
    });
    setCriadoEmDraft(plano.criadoEm);
    setRefeicaoAtiva('cafe');
    setAbaBuilder('proteina');
    setErro(null);
  };

  const fecharEdicao = () => {
    setEditandoId(null);
    setErro(null);
  };

  const atualizarRefeicao = (key: RefeicaoPlanoKey, next: RefeicaoPlanoTemplate) => {
    setRefeicoesDraft((prev) => ({
      ...prev,
      [key]: recalcularMacrosRefeicaoPlano(next),
    }));
  };

  const toggleItem = (item: ItemPlanoRefeicao) => {
    const selecionados = new Set(refeicaoAtual.itensSelecionados);
    const itens = [...refeicaoAtual.itens];
    const jaNoPlano = itens.some((i) => i.id === item.id);
    const itemNorm = normalizarItemComPorcao(item);

    if (selecionados.has(item.id)) {
      selecionados.delete(item.id);
    } else {
      selecionados.add(item.id);
      if (!jaNoPlano) itens.push(itemNorm);
    }

    // Mantém itens custom + favoritos do grupo / selecionados
    const itensFiltrados = itens
      .map((i) => (i.id === item.id ? itemNorm : i))
      .filter((i) => selecionados.has(i.id) || !catalogoGrupoIds.has(i.id));

    atualizarRefeicao(refeicaoAtiva, {
      ...refeicaoAtual,
      itens: itensFiltrados,
      itensSelecionados: Array.from(selecionados),
    });
  };

  const atualizarPorcaoItem = (
    itemOrigem: ItemPlanoRefeicao,
    patch: Partial<Pick<ItemPlanoRefeicao, 'peso_g' | 'quantidade' | 'unidade'>>
  ) => {
    const itens = [...refeicaoAtual.itens];
    const idx = itens.findIndex((i) => i.id === itemOrigem.id);
    const base = normalizarItemComPorcao(idx >= 0 ? itens[idx] : itemOrigem);
    const next = normalizarItemComPorcao({ ...base, ...patch });
    if (idx >= 0) itens[idx] = next;
    else itens.push(next);

    const selecionados = new Set(refeicaoAtual.itensSelecionados);
    if (!selecionados.has(next.id)) {
      selecionados.add(next.id);
    }

    const itensFiltrados = itens.filter(
      (i) => selecionados.has(i.id) || !catalogoGrupoIds.has(i.id)
    );

    atualizarRefeicao(refeicaoAtiva, {
      ...refeicaoAtual,
      itens: itensFiltrados,
      itensSelecionados: Array.from(selecionados),
    });
  };

  const adicionarItemCustom = (item: ItemPlanoRefeicao) => {
    const itemNorm = normalizarItemComPorcao(item);
    const itens = [...refeicaoAtual.itens, itemNorm];
    const selecionados = [...refeicaoAtual.itensSelecionados, itemNorm.id];
    atualizarRefeicao(refeicaoAtiva, {
      ...refeicaoAtual,
      itens,
      itensSelecionados: selecionados,
    });
    setShowAddModal(false);
  };

  const confirmarAddMetaNutri = () => {
    if (!metaSelecionado) return;
    const peso = Math.max(1, pesoNovo);
    const item = mapMetaNutriFoodToItemPlano({
      food: metaSelecionado,
      categoria: categoriaDaAbaBuilder(abaBuilder),
      quantidadeG: peso,
      unidade: unidadeNova,
      refeicaoKey: refeicaoAtiva,
    });
    setErro(null);
    adicionarItemCustom(item);
  };

  const confirmarAddTaco = () => {
    if (!tacoSelecionado) return;
    const peso = Math.max(1, pesoNovo);
    const item = criarItemComPorcao({
      id: `taco_${refeicaoAtiva}_${Date.now()}`,
      nome: tacoSelecionado.nome,
      categoria: categoriaDaAbaBuilder(abaBuilder),
      proteinaBase_g: tacoSelecionado.proteinas,
      caloriasBase_kcal: tacoSelecionado.calorias,
      carboidratoBase_g: tacoSelecionado.carboidratos,
      gorduraBase_g: tacoSelecionado.gorduras,
      // fibra: API TACO atual não fornece
      pesoBase_g: 100,
      peso_g: Math.round(peso),
      quantidade: 1,
      unidade: '',
      descricao: `Base TACO • ${Math.round(peso)}g`,
      origemAlimento: 'taco',
    });
    adicionarItemCustom(item);
  };

  const confirmarAddManual = () => {
    const nome = manualNome.trim();
    if (!nome) {
      setErro('Informe o nome do alimento.');
      return;
    }
    const peso = Math.max(1, manualPeso);
    const prot = Math.max(0, manualProt);
    const kcal = Math.max(0, manualKcal);
    if (prot <= 0 && kcal <= 0) {
      setErro('Informe proteína e/ou calorias do alimento.');
      return;
    }
    const item = criarItemComPorcao({
      id: `manual_${refeicaoAtiva}_${Date.now()}`,
      nome,
      categoria: categoriaDaAbaBuilder(abaBuilder),
      proteinaBase_g: prot,
      caloriasBase_kcal: kcal,
      pesoBase_g: Math.round(peso),
      peso_g: Math.round(peso),
      quantidade: 1,
      unidade: '',
      descricao: `Alimento próprio • ${Math.round(peso)}g`,
      origemAlimento: 'manual',
    });
    setErro(null);
    adicionarItemCustom(item);
  };

  const salvar = async () => {
    if (!uid) {
      setErro('Faça login novamente para salvar.');
      return;
    }
    if (!nomeDraft.trim()) {
      setErro('Dê um nome ao plano (ex.: Endometriose).');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const refeicoesFinais = { ...refeicoesDraft };
      (Object.keys(refeicoesFinais) as RefeicaoPlanoKey[]).forEach((k) => {
        refeicoesFinais[k] = recalcularMacrosRefeicaoPlano(refeicoesFinais[k]);
      });
      await NutriPlanosTemplateService.salvar(uid, {
        id: editandoId && editandoId !== 'novo' ? editandoId : undefined,
        nome: nomeDraft,
        refeicoes: refeicoesFinais,
        criadoEm: criadoEmDraft,
      });
      await carregar();
      fecharEdicao();
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : 'Erro ao salvar o plano.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (plano: NutriPlanoCardapioTemplate) => {
    if (!uid) return;
    if (!confirm(`Excluir o plano "${plano.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await NutriPlanosTemplateService.excluir(uid, plano.id);
      if (editandoId === plano.id) fecharEdicao();
      await carregar();
    } catch (e) {
      console.error(e);
      setErro('Não foi possível excluir o plano.');
    }
  };

  if (!uid) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Faça login para gerenciar seus planos nutricionais.
      </div>
    );
  }

  if (editandoId) {
    const itensDaAba = itensDisponiveis.filter((i) =>
      TAB_CATEGORIES[abaBuilder].includes(i.categoria)
    );

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                {editandoId === 'novo' ? 'Novo plano' : 'Editar plano'}
              </p>
              <input
                type="text"
                value={nomeDraft}
                onChange={(e) => setNomeDraft(e.target.value)}
                placeholder="Ex.: Endometriose, Low carb, Hipertrofia..."
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold text-gray-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fecharEdicao}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar plano
              </button>
            </div>
          </div>
          {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {REFEICOES_PLANO_ORDEM.map((key) => {
            const Icon = REFEICAO_ICONS[key];
            const ativo = refeicaoAtiva === key;
            const ref = refeicoesDraft[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setRefeicaoAtiva(key);
                  setAbaBuilder('proteina');
                }}
                className={`rounded-xl border px-2 py-3 text-center transition-all ${
                  ativo
                    ? 'border-green-500 bg-green-50 text-green-900 ring-2 ring-green-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                <Icon className={`mx-auto mb-1 h-4 w-4 ${ativo ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="block text-[11px] sm:text-xs font-semibold leading-tight">
                  {ROTULO_REFEICAO_PLANO[key]}
                </span>
                <span className="mt-1 block text-[10px] text-gray-500 tabular-nums">
                  {formatarResumoMacrosRefeicao(ref)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="grid grid-cols-4 border-b border-gray-200">
            {(
              [
                { id: 'proteina' as const, label: 'Proteína' },
                { id: 'carboidrato' as const, label: 'Carboidrato' },
                { id: 'gordura' as const, label: 'Gordura' },
                { id: 'reguladores' as const, label: 'Reguladores' },
              ] as const
            ).map((aba) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaBuilder(aba.id)}
                className={`px-2 py-3 text-xs sm:text-sm font-semibold border-r border-gray-200 last:border-r-0 ${
                  abaBuilder === aba.id
                    ? 'bg-green-50 text-green-700 border-b-2 border-b-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {aba.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">
                {ROTULO_REFEICAO_PLANO[refeicaoAtiva]} · cardápio padrão
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddMode('metanutri');
                  setMetaQuery('');
                  setMetaResultados([]);
                  setMetaSelecionado(null);
                  setMetaPorcaoId('');
                  setMetaErro(null);
                  setUnidadeNova('');
                  setTacoQuery('');
                  setTacoSelecionado(null);
                  setPesoNovo(100);
                  setManualNome('');
                  setManualPeso(100);
                  setManualProt(0);
                  setManualKcal(0);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                Adicionar item
              </button>
            </div>

            {/* Mobile: lista compacta + editar porção no modal */}
            <div className="md:hidden rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {itensDaAba.map((item) => {
                const sel = selecionadosSet.has(item.id);
                const itemView = normalizarItemComPorcao(item);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 px-2.5 py-2.5 ${
                      sel ? 'bg-green-50' : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(itemView)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`block text-sm leading-snug ${
                          sel ? 'text-green-900 font-semibold' : 'text-gray-800'
                        }`}
                      >
                        {nomeBaseAlimento(itemView.nome)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-500 tabular-nums">
                        {itemView.peso_g ?? 100}g
                        {itemView.quantidade && itemView.quantidade !== 1
                          ? ` · ×${itemView.quantidade}`
                          : ''}
                        {itemView.unidade ? ` · ${itemView.unidade}` : ''}
                        {' · '}
                        {formatarResumoMacrosItem(itemView)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPorcaoEditando(itemView)}
                      className="shrink-0 rounded-lg border border-green-200 bg-green-50 p-2 text-green-800 hover:bg-green-100"
                      title="Editar porção"
                      aria-label={`Editar porção de ${nomeBaseAlimento(itemView.nome)}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {itensDaAba.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-gray-500">
                  {catalogoGrupoAtivo.length === 0
                    ? `Nenhum favorito no grupo ${ROTULO_REFEICAO_PLANO[refeicaoAtiva]}. Marque favoritos na página Alimentos.`
                    : 'Nenhum item nesta categoria. Adicione da TACO ou crie um alimento.'}
                </p>
              ) : null}
            </div>

            {/* Desktop: colunas editáveis */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold min-w-[160px]">Item</th>
                    <th className="px-1.5 py-2 text-center font-semibold w-[72px]">Peso</th>
                    <th className="px-1.5 py-2 text-center font-semibold w-[56px]">Qtd</th>
                    <th className="px-1.5 py-2 text-left font-semibold w-[88px]">Unidade</th>
                    <th className="px-1.5 py-2 text-right font-semibold min-w-[140px]">Macros</th>
                  </tr>
                </thead>
                <tbody>
                  {itensDaAba.map((item) => {
                    const sel = selecionadosSet.has(item.id);
                    const itemView = normalizarItemComPorcao(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItem(itemView)}
                        className={`border-t border-gray-100 cursor-pointer ${
                          sel ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td
                          className={`px-2 py-2 align-middle ${
                            sel ? 'text-green-900 font-semibold' : 'text-gray-800'
                          }`}
                        >
                          <span className="block leading-snug">{nomeBaseAlimento(itemView.nome)}</span>
                          {sel && (itemView.quantidade !== 1 || itemView.unidade) ? (
                            <span className="mt-0.5 block text-[10px] font-normal text-gray-500 truncate">
                              {formatarNomeItemPorcao(itemView)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={itemView.peso_g ?? 100}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                atualizarPorcaoItem(itemView, { peso_g: Math.max(1, v) });
                              }}
                              className="w-14 rounded border border-gray-300 px-1 py-1 text-center tabular-nums text-xs bg-white"
                              aria-label={`Peso em gramas de ${itemView.nome}`}
                            />
                            <span className="text-[10px] text-gray-500">g</span>
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0.01}
                            step={1}
                            value={itemView.quantidade ?? 1}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (!Number.isFinite(v)) return;
                              atualizarPorcaoItem(itemView, { quantidade: Math.max(0.01, v) });
                            }}
                            className="w-12 mx-auto block rounded border border-gray-300 px-1 py-1 text-center tabular-nums text-xs bg-white"
                            aria-label={`Quantidade de ${itemView.nome}`}
                          />
                        </td>
                        <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={itemView.unidade || ''}
                            placeholder="ex. Unidade"
                            maxLength={40}
                            onChange={(e) =>
                              atualizarPorcaoItem(itemView, { unidade: e.target.value })
                            }
                            className="w-full min-w-[72px] rounded border border-gray-300 px-1.5 py-1 text-xs bg-white"
                            aria-label={`Unidade de ${itemView.nome}`}
                          />
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums align-middle text-[11px] leading-snug max-w-[120px]">
                          {formatarResumoMacrosItem(itemView)}
                        </td>
                      </tr>
                    );
                  })}
                  {itensDaAba.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-gray-500">
                        {catalogoGrupoAtivo.length === 0
                          ? `Nenhum favorito no grupo ${ROTULO_REFEICAO_PLANO[refeicaoAtiva]}. Marque favoritos na página Alimentos.`
                          : 'Nenhum item nesta categoria. Adicione da TACO ou crie um alimento.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Selecionados:{' '}
                <strong>{refeicaoAtual.itensSelecionados.length}</strong>
              </span>
              <span className="tabular-nums">
                {formatarResumoMacrosRefeicao(refeicaoAtual)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2 shadow-sm">
          <label
            htmlFor={`obs-refeicao-${refeicaoAtiva}`}
            className="block text-sm font-semibold text-gray-900"
          >
            Observação do {ROTULO_REFEICAO_PLANO[refeicaoAtiva]}
          </label>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Campo único desta refeição — não muda entre Proteína, Carboidrato, Gordura ou
            Reguladores. Aparece para o paciente abaixo dos itens do{' '}
            {ROTULO_REFEICAO_PLANO[refeicaoAtiva].toLowerCase()}.
          </p>
          <textarea
            id={`obs-refeicao-${refeicaoAtiva}`}
            value={refeicaoAtual.observacao || ''}
            onChange={(e) =>
              atualizarRefeicao(refeicaoAtiva, {
                ...refeicaoAtual,
                observacao: e.target.value,
              })
            }
            rows={3}
            maxLength={500}
            placeholder="Ex.: Preferir preparo grelhado; se não tiver iogurte, pode trocar por coalhada."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <p className="text-[10px] text-gray-400 text-right tabular-nums">
            {(refeicaoAtual.observacao || '').length}/500
          </p>
        </div>

        {showAddModal ? (
          <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Adicionar alimento</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMode('metanutri')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      addMode === 'metanutri' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    METANUTRI
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('taco')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      addMode === 'taco' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    TACO
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('manual')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      addMode === 'manual' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    MANUAL
                  </button>
                </div>

                {addMode === 'metanutri' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Buscar alimento
                        </label>
                        <input
                          type="text"
                          value={metaQuery}
                          onChange={(e) => {
                            setMetaQuery(e.target.value);
                            setMetaSelecionado(null);
                          }}
                          placeholder="Ex.: banana, frango, aveia"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Quantidade (g)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pesoNovo}
                          onChange={(e) => {
                            setPesoNovo(Number(e.target.value) || 1);
                            setMetaPorcaoId('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    {metaSelecionado && (metaSelecionado.porcoes?.length || 0) > 0 ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Porção (opcional)
                        </label>
                        <select
                          value={metaPorcaoId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setMetaPorcaoId(id);
                            const p = metaSelecionado.porcoes.find((x) => x.id === id);
                            if (p) {
                              setPesoNovo(p.quantidadeG);
                              setUnidadeNova(p.nome);
                            } else {
                              setUnidadeNova('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Personalizado (g)</option>
                          {metaSelecionado.porcoes.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.quantidadeG} g)
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                      {loadingMeta ? (
                        <p className="p-3 text-sm text-gray-600 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                        </p>
                      ) : metaErro ? (
                        <p className="p-3 text-sm text-red-600">{metaErro}</p>
                      ) : metaQuery.trim().length < 2 ? (
                        <p className="p-3 text-sm text-gray-600">
                          Digite ao menos 2 letras para buscar no METANUTRI.
                        </p>
                      ) : metaResultados.length === 0 ? (
                        <div className="p-3 space-y-2 text-sm text-gray-600">
                          <p>Nenhum alimento encontrado no METANUTRI.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setAddMode('taco');
                              setTacoQuery(metaQuery);
                            }}
                            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Pesquisar na TACO
                          </button>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {metaResultados.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setMetaSelecionado(item);
                                  setMetaPorcaoId('');
                                  setUnidadeNova('');
                                  setPesoNovo(item.baseQuantidade || 100);
                                }}
                                className={`w-full text-left px-3 py-2.5 text-sm ${
                                  metaSelecionado?.id === item.id
                                    ? 'bg-green-50 text-green-800'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <p className="font-semibold text-gray-900">{item.nome}</p>
                                <p className="text-[11px] text-gray-500">
                                  {ROTULO_SEGMENTO_ALIMENTO[item.segmento] || item.segmento}
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-600 tabular-nums">
                                  {formatMacroOrDash(item.energiaKcal)} kcal · P{' '}
                                  {formatMacroOrDash(item.proteinasG)} g · C{' '}
                                  {formatMacroOrDash(item.carboidratosG)} g · G{' '}
                                  {formatMacroOrDash(item.gordurasTotaisG)} g
                                  <span className="text-gray-400">
                                    {' '}
                                    · por {item.baseQuantidade}
                                    {item.baseUnidade}
                                  </span>
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {metaSelecionado ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
                        <p>
                          <strong>{metaSelecionado.nome}</strong>
                        </p>
                        <p className="text-xs text-gray-600">
                          Na porção de {Math.max(1, pesoNovo)} g:{' '}
                          {formatMacroOrDash(
                            roundNutriente(
                              calcularNutrientePorPorcao(
                                metaSelecionado.energiaKcal,
                                Math.max(1, pesoNovo)
                              ),
                              0
                            )
                          )}{' '}
                          kcal · P{' '}
                          {formatMacroOrDash(
                            roundNutriente(
                              calcularNutrientePorPorcao(
                                metaSelecionado.proteinasG,
                                Math.max(1, pesoNovo)
                              )
                            )
                          )}{' '}
                          g · C{' '}
                          {formatMacroOrDash(
                            roundNutriente(
                              calcularNutrientePorPorcao(
                                metaSelecionado.carboidratosG,
                                Math.max(1, pesoNovo)
                              )
                            )
                          )}{' '}
                          g · G{' '}
                          {formatMacroOrDash(
                            roundNutriente(
                              calcularNutrientePorPorcao(
                                metaSelecionado.gordurasTotaisG,
                                Math.max(1, pesoNovo)
                              )
                            )
                          )}{' '}
                          g
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Categoria no plano: aba atual (
                          {abaBuilder === 'proteina'
                            ? 'Proteína'
                            : abaBuilder === 'carboidrato'
                              ? 'Carboidrato'
                              : abaBuilder === 'gordura'
                                ? 'Gordura'
                                : 'Reguladores'}
                          ) — segmento nutricional não altera a categoria.
                        </p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!metaSelecionado}
                      onClick={confirmarAddMetaNutri}
                      className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Adicionar
                    </button>
                  </>
                ) : addMode === 'taco' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Buscar alimento
                        </label>
                        <input
                          type="text"
                          value={tacoQuery}
                          onChange={(e) => setTacoQuery(e.target.value)}
                          placeholder="Ex.: arroz, frango, aveia"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Peso (g)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pesoNovo}
                          onChange={(e) => setPesoNovo(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                      {loadingTaco ? (
                        <p className="p-3 text-sm text-gray-600">Buscando...</p>
                      ) : tacoResultados.length === 0 ? (
                        <p className="p-3 text-sm text-gray-600">
                          Digite ao menos 2 letras para buscar na TACO.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {tacoResultados.map((item) => (
                            <li key={`${item.id ?? item.nome}-${item.nome}`}>
                              <button
                                type="button"
                                onClick={() => setTacoSelecionado(item)}
                                className={`w-full text-left px-3 py-2 text-sm ${
                                  tacoSelecionado?.nome === item.nome
                                    ? 'bg-green-50 text-green-800'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                {item.nome}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {tacoSelecionado ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        {(() => {
                          const f = Math.max(1, pesoNovo) / 100;
                          return (
                            <p>
                              <strong>{tacoSelecionado.nome}</strong> ·{' '}
                              {Math.round(tacoSelecionado.calorias * f)} kcal · P{' '}
                              {Math.round(tacoSelecionado.proteinas * f * 10) / 10}g · C{' '}
                              {Math.round(tacoSelecionado.carboidratos * f * 10) / 10}g · G{' '}
                              {Math.round(tacoSelecionado.gorduras * f * 10) / 10}g
                            </p>
                          );
                        })()}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!tacoSelecionado}
                      onClick={confirmarAddTaco}
                      className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Adicionar da TACO
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Nome do alimento
                        </label>
                        <input
                          type="text"
                          value={manualNome}
                          onChange={(e) => setManualNome(e.target.value)}
                          placeholder="Ex.: Panqueca proteica caseira"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Peso (g)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={manualPeso}
                          onChange={(e) => setManualPeso(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Proteínas (g)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={manualProt}
                          onChange={(e) => setManualProt(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Calorias (kcal)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={manualKcal}
                          onChange={(e) => setManualKcal(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      O alimento será adicionado na categoria da aba atual (
                      {abaBuilder === 'proteina'
                        ? 'Proteína'
                        : abaBuilder === 'carboidrato'
                          ? 'Carboidrato'
                          : abaBuilder === 'gordura'
                            ? 'Gordura'
                            : 'Reguladores'}
                      ).
                    </p>
                    <button
                      type="button"
                      onClick={confirmarAddManual}
                      className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white"
                    >
                      Criar e adicionar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <EditarPorcaoItemModal
          aberto={Boolean(porcaoEditando)}
          item={porcaoEditando}
          onFechar={() => setPorcaoEditando(null)}
          onConfirmar={(patch) => {
            if (!porcaoEditando) return;
            atualizarPorcaoItem(porcaoEditando as ItemPlanoRefeicao, patch);
            setPorcaoEditando(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2F8FA3]/30 bg-gradient-to-br from-[#2F8FA3]/10 via-white to-[#4CCB7A]/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-[#2F8FA3]" />
              <h3 className="text-base font-semibold text-[#0A1F44]">Planos nutricionais</h3>
            </div>
            <p className="text-xs text-[#0A1F44]/70 max-w-xl leading-relaxed">
              Salve cardápios padrão nomeados (ex.: Endometriose) com café, lanches, almoço e jantar.
              Depois, no Cardápio do paciente, puxe a refeição pronta ao editar uma opção.
            </p>
          </div>
          <button
            type="button"
            onClick={iniciarNovo}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Novo plano
          </button>
        </div>
      </div>

      {erro ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando planos...
        </div>
      ) : planos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <BookMarked className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Nenhum plano salvo ainda</p>
          <p className="mt-1 text-xs text-gray-500">
            Crie seu primeiro cardápio padrão para reutilizar nos pacientes.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards empilhados */}
          <div className="md:hidden space-y-2">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                      {plano.nome}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {plano.atualizadoEm.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(plano)}
                      className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-800 hover:bg-green-100"
                      title="Abrir e editar"
                      aria-label={`Editar plano ${plano.nome}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluir(plano)}
                      className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      title="Excluir plano"
                      aria-label={`Excluir plano ${plano.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5">
                  <ResumoItensPorRefeicao plano={plano} compact />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3 whitespace-nowrap">Atualizado</th>
                    <th className="px-4 py-3 min-w-[280px]">Refeições</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap w-[1%]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {planos.map((plano) => (
                    <tr key={plano.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-semibold text-gray-900">{plano.nome}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap text-xs text-gray-600">
                        {plano.atualizadoEm.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <ResumoItensPorRefeicao plano={plano} />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(plano)}
                            className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-800 hover:bg-green-100"
                            title="Abrir e editar"
                            aria-label={`Editar plano ${plano.nome}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void excluir(plano)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            title="Excluir plano"
                            aria-label={`Excluir plano ${plano.nome}`}
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
          </div>
        </>
      )}
    </div>
  );
}

/** Modal para importar uma refeição de um plano salvo no meal builder. */
export function ImportarRefeicaoDePlanoModal({
  aberto,
  refeicaoKey,
  temSelecaoAtual = false,
  onFechar,
  onImportar,
}: {
  aberto: boolean;
  refeicaoKey: RefeicaoPlanoKey;
  /** Se a opção em edição já tem itens selecionados, pede confirmação antes de substituir. */
  temSelecaoAtual?: boolean;
  onFechar: () => void;
  onImportar: (refeicao: RefeicaoPlanoTemplate) => void;
}) {
  const uid = auth.currentUser?.uid || '';
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<NutriPlanoCardapioTemplate[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState<{
    planoNome: string;
    refeicao: RefeicaoPlanoTemplate;
  } | null>(null);

  useEffect(() => {
    if (!aberto) {
      setPendente(null);
      return;
    }
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const lista = await NutriPlanosTemplateService.listar(uid);
        if (!cancelled) setPlanos(lista);
      } catch (e) {
        console.error(e);
        if (!cancelled) setErro('Não foi possível carregar os planos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aberto, uid]);

  const confirmarImportacao = (refeicao: RefeicaoPlanoTemplate) => {
    onImportar(refeicao);
    setPendente(null);
    onFechar();
  };

  const tentarImportar = (planoNome: string, ref: RefeicaoPlanoTemplate) => {
    const clonada = clonarItensComNovosIds(ref, `imp_${refeicaoKey}`);
    if (temSelecaoAtual) {
      setPendente({ planoNome, refeicao: clonada });
      return;
    }
    confirmarImportacao(clonada);
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {pendente ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
              <h3 className="text-base font-bold text-gray-900">Substituir itens atuais?</h3>
              <p className="text-xs text-gray-600 mt-1">
                A opção já tem itens selecionados. Deseja substituí-los pelos itens do plano{' '}
                <strong>{pendente.planoNome}</strong>?
              </p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Ao confirmar, os itens atuais desta refeição serão trocados pelos{' '}
                <strong>{pendente.refeicao.itensSelecionados.length || pendente.refeicao.itens.length}</strong>{' '}
                item(ns) salvos em {ROTULO_REFEICAO_PLANO[refeicaoKey]}.
              </p>
              {pendente.refeicao.titulo ? (
                <p className="text-xs text-gray-500 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  {pendente.refeicao.titulo}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendente(null)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => confirmarImportacao(pendente.refeicao)}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Sim, substituir
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Puxar de um Plano</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Importar {ROTULO_REFEICAO_PLANO[refeicaoKey]} de um cardápio salvo
                </p>
              </div>
              <button type="button" onClick={onFechar} className="text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando...
                </div>
              ) : erro ? (
                <p className="text-sm text-red-600">{erro}</p>
              ) : planos.length === 0 ? (
                <p className="text-sm text-gray-600 py-6 text-center">
                  Você ainda não tem planos salvos. Crie um na aba Planos.
                </p>
              ) : (
                planos.map((plano) => {
                  const ref = plano.refeicoes[refeicaoKey] || criarRefeicaoPlanoVazia();
                  const n = ref.itensSelecionados.length || ref.itens.length;
                  return (
                    <button
                      key={plano.id}
                      type="button"
                      disabled={n === 0}
                      onClick={() => tentarImportar(plano.nome, ref)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                        n === 0
                          ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-900">{plano.nome}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {n === 0
                          ? `Sem itens em ${ROTULO_REFEICAO_PLANO[refeicaoKey]}`
                          : `${n} item(ns) · ${formatarResumoMacrosRefeicao(ref)}`}
                      </p>
                      {ref.titulo ? (
                        <p className="mt-1 text-[11px] text-gray-500 truncate">{ref.titulo}</p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
