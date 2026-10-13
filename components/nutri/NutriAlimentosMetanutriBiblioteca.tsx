'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Star, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  ROTULO_SEGMENTO_ALIMENTO,
  SEGMENTOS_ALIMENTO,
  type SegmentoAlimento,
} from '@/lib/metaadmingeral/alimentosGlobais/segmentos';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';
import type { MetaNutriFoodDetailResult } from '@/lib/metanutri/alimentosGlobais/detailTypes';
import { NutriAlimentosGlobaisFavoritosService } from '@/services/nutriAlimentosGlobaisFavoritosService';

function formatMacroOrDash(v: number | null | undefined) {
  if (v == null) return '—';
  return String(v).replace('.', ',');
}

function hasAnyValue(entries: Array<number | null | undefined>) {
  return entries.some((v) => v != null);
}

async function authFetch(url: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Não autenticado.');
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

type Props = {
  uid: string;
};

export default function NutriAlimentosMetanutriBiblioteca({ uid }: Props) {
  const [busca, setBusca] = useState('');
  const [segmento, setSegmento] = useState<SegmentoAlimento | 'todos'>('todos');
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [itens, setItens] = useState<MetaNutriFoodSearchResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MetaNutriFoodDetailResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const carregarFavoritos = useCallback(async () => {
    if (!uid) return;
    try {
      const ids = await NutriAlimentosGlobaisFavoritosService.listarIds(uid);
      setFavoritosIds(new Set(ids));
    } catch (e) {
      console.error(e);
    }
  }, [uid]);

  useEffect(() => {
    void carregarFavoritos();
  }, [carregarFavoritos]);

  const buscar = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      const append = Boolean(opts?.append);
      const q = busca.trim();
      if (append) setLoadingMore(true);
      else setLoading(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (q.length >= 2) params.set('q', q);
        if (segmento !== 'todos') params.set('segmento', segmento);
        params.set('limit', '30');
        if (opts?.cursor) params.set('cursor', opts.cursor);

        const res = await authFetch(`/api/metanutri/alimentos-globais?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha na busca.');
        const lista: MetaNutriFoodSearchResult[] = Array.isArray(data.alimentos)
          ? data.alimentos
          : [];
        setItens((prev) => (append ? [...prev, ...lista] : lista));
        setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      } catch (e) {
        if (!append) setItens([]);
        setErro(e instanceof Error ? e.message : 'Erro ao buscar.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [busca, segmento]
  );

  useEffect(() => {
    if (soFavoritos) return;
    const t = setTimeout(() => {
      void buscar();
    }, 300);
    return () => clearTimeout(t);
  }, [buscar, soFavoritos]);

  const carregarFavoritosRemotos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const ids = Array.from(favoritosIds).slice(0, 40);
      if (ids.length === 0) {
        setItens([]);
        setNextCursor(null);
        return;
      }
      const results: MetaNutriFoodSearchResult[] = [];
      for (const id of ids) {
        const res = await authFetch(`/api/metanutri/alimentos-globais/${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.alimento) {
          const d = data.alimento as MetaNutriFoodDetailResult;
          if (segmento !== 'todos' && d.segmento !== segmento) continue;
          results.push({
            id: d.id,
            nome: d.nome,
            segmento: d.segmento,
            marca: d.marca,
            energiaKcal: d.energiaKcal,
            proteinasG: d.proteinasG,
            carboidratosG: d.carboidratosG,
            gordurasTotaisG: d.gordurasTotaisG,
            fibrasG: d.fibrasG,
            baseQuantidade: d.baseQuantidade,
            baseUnidade: d.baseUnidade,
            porcoes: d.porcoes || [],
          });
        }
      }
      setItens(results);
      setNextCursor(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar favoritos.');
    } finally {
      setLoading(false);
    }
  }, [favoritosIds, segmento]);

  useEffect(() => {
    if (!soFavoritos) return;
    void carregarFavoritosRemotos();
  }, [soFavoritos, carregarFavoritosRemotos]);

  const visiveis = itens;

  const toggleFavorito = async (id: string) => {
    if (!uid) return;
    const was = favoritosIds.has(id);
    setFavoritosIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await NutriAlimentosGlobaisFavoritosService.toggle(uid, id, was);
    } catch (e) {
      console.error(e);
      setFavoritosIds((prev) => {
        const next = new Set(prev);
        if (was) next.add(id);
        else next.delete(id);
        return next;
      });
      setErro('Não foi possível atualizar o favorito.');
    }
  };

  const abrirDetalhe = async (id: string) => {
    setLoadingDetail(true);
    setErro(null);
    try {
      const res = await authFetch(`/api/metanutri/alimentos-globais/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar detalhes.');
      setDetail(data.alimento as MetaNutriFoodDetailResult);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no detalhe.');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex-1 min-w-[200px] block space-y-1">
          <span className="text-xs font-semibold text-gray-600">Buscar alimento</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: banana, frango, aveia"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm"
              disabled={soFavoritos}
            />
          </div>
        </label>
        <label className="block space-y-1 sm:w-56">
          <span className="text-xs font-semibold text-gray-600">Segmento</span>
          <select
            value={segmento}
            onChange={(e) =>
              setSegmento(
                e.target.value === 'todos' ? 'todos' : (e.target.value as SegmentoAlimento)
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos</option>
            {SEGMENTOS_ALIMENTO.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SEGMENTO_ALIMENTO[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSoFavoritos(false)}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
              !soFavoritos ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSoFavoritos(true)}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold inline-flex items-center gap-1 ${
              soFavoritos ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Favoritos
          </button>
        </div>
      </div>

      {erro ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-gray-500 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : visiveis.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">
            {soFavoritos
              ? 'Nenhum favorito ainda. Favorite alimentos na busca METANUTRI.'
              : busca.trim().length === 1
                ? 'Digite ao menos 2 letras para buscar.'
                : 'Nenhum alimento encontrado.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visiveis.map((item) => {
              const fav = favoritosIds.has(item.id);
              return (
                <li key={item.id} className="flex items-start gap-2 px-3 py-3 hover:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => void toggleFavorito(item.id)}
                    className="mt-0.5 p-1.5 rounded-md hover:bg-amber-50"
                    title={fav ? 'Remover favorito' : 'Favoritar'}
                  >
                    <Star
                      className={`h-4 w-4 ${fav ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`}
                    />
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-left min-w-0"
                    onClick={() => void abrirDetalhe(item.id)}
                  >
                    <p className="font-semibold text-gray-900 text-sm">{item.nome}</p>
                    <p className="text-[11px] text-gray-500">
                      {ROTULO_SEGMENTO_ALIMENTO[item.segmento] || item.segmento}
                    </p>
                    <p className="mt-1 text-xs text-gray-700 tabular-nums">
                      {formatMacroOrDash(item.energiaKcal)} kcal · P{' '}
                      {formatMacroOrDash(item.proteinasG)} g · C{' '}
                      {formatMacroOrDash(item.carboidratosG)} g · G{' '}
                      {formatMacroOrDash(item.gordurasTotaisG)} g · F{' '}
                      {formatMacroOrDash(item.fibrasG)} g
                    </p>
                    <p className="text-[10px] text-gray-400">
                      por {item.baseQuantidade} {item.baseUnidade}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!soFavoritos && nextCursor ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void buscar({ append: true, cursor: nextCursor })}
          className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais'}
        </button>
      ) : null}

      {(detail || loadingDetail) && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">
                {loadingDetail ? 'Carregando…' : detail?.nome}
              </h3>
              <button type="button" onClick={() => setDetail(null)} className="p-1.5 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            {loadingDetail || !detail ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="p-4 space-y-4 text-sm">
                <div className="space-y-1 text-gray-700">
                  <p className="text-xs text-gray-500">
                    {ROTULO_SEGMENTO_ALIMENTO[detail.segmento]}
                  </p>
                  {detail.descricao ? <p>{detail.descricao}</p> : null}
                  {detail.nomeCientifico ? (
                    <p>
                      <span className="text-gray-500">Nome científico:</span>{' '}
                      <em>{detail.nomeCientifico}</em>
                    </p>
                  ) : null}
                  {detail.marca ? (
                    <p>
                      <span className="text-gray-500">Marca:</span> {detail.marca}
                    </p>
                  ) : null}
                  {detail.estado || detail.processamento || detail.preparo ? (
                    <p className="text-xs text-gray-600">
                      {[detail.estado, detail.processamento, detail.preparo]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>

                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Composição (por {detail.baseQuantidade} {detail.baseUnidade})
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>Energia: {formatMacroOrDash(detail.energiaKcal)} kcal</p>
                    <p>Proteínas: {formatMacroOrDash(detail.proteinasG)} g</p>
                    <p>Carboidratos: {formatMacroOrDash(detail.carboidratosG)} g</p>
                    <p>Gorduras: {formatMacroOrDash(detail.gordurasTotaisG)} g</p>
                    <p>Fibras: {formatMacroOrDash(detail.fibrasG)} g</p>
                  </div>
                </section>

                {hasAnyValue([
                  detail.acucaresTotaisG,
                  detail.glicoseG,
                  detail.frutoseG,
                  detail.lactoseG,
                  detail.sacaroseG,
                  detail.amidoTotalG,
                ]) ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Açúcares e amidos
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>Açúcares totais: {formatMacroOrDash(detail.acucaresTotaisG)} g</p>
                      <p>Glicose: {formatMacroOrDash(detail.glicoseG)} g</p>
                      <p>Frutose: {formatMacroOrDash(detail.frutoseG)} g</p>
                      <p>Lactose: {formatMacroOrDash(detail.lactoseG)} g</p>
                      <p>Sacarose: {formatMacroOrDash(detail.sacaroseG)} g</p>
                      <p>Amido total: {formatMacroOrDash(detail.amidoTotalG)} g</p>
                    </div>
                  </section>
                ) : null}

                {hasAnyValue([
                  detail.gordurasSaturadasG,
                  detail.gordurasMonoinsaturadasG,
                  detail.gordurasPoliinsaturadasG,
                  detail.gordurasTransG,
                ]) ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Gorduras detalhadas
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>Saturadas: {formatMacroOrDash(detail.gordurasSaturadasG)} g</p>
                      <p>Mono: {formatMacroOrDash(detail.gordurasMonoinsaturadasG)} g</p>
                      <p>Poli: {formatMacroOrDash(detail.gordurasPoliinsaturadasG)} g</p>
                      <p>Trans: {formatMacroOrDash(detail.gordurasTransG)} g</p>
                    </div>
                  </section>
                ) : null}

                {hasAnyValue([
                  detail.calcioMg,
                  detail.ferroMg,
                  detail.magnesioMg,
                  detail.fosforoMg,
                  detail.potassioMg,
                  detail.sodioMg,
                  detail.zincoMg,
                ]) ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Minerais
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>Cálcio: {formatMacroOrDash(detail.calcioMg)} mg</p>
                      <p>Ferro: {formatMacroOrDash(detail.ferroMg)} mg</p>
                      <p>Magnésio: {formatMacroOrDash(detail.magnesioMg)} mg</p>
                      <p>Fósforo: {formatMacroOrDash(detail.fosforoMg)} mg</p>
                      <p>Potássio: {formatMacroOrDash(detail.potassioMg)} mg</p>
                      <p>Sódio: {formatMacroOrDash(detail.sodioMg)} mg</p>
                      <p>Zinco: {formatMacroOrDash(detail.zincoMg)} mg</p>
                    </div>
                  </section>
                ) : null}

                {hasAnyValue([
                  detail.vitaminaAMcg,
                  detail.vitaminaCMg,
                  detail.vitaminaDMcg,
                  detail.vitaminaEMg,
                  detail.vitaminaB1Mg,
                  detail.vitaminaB2Mg,
                  detail.vitaminaB3Mg,
                  detail.vitaminaB6Mg,
                  detail.vitaminaB12Mcg,
                  detail.folatoMcg,
                ]) ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Vitaminas
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>A: {formatMacroOrDash(detail.vitaminaAMcg)} mcg</p>
                      <p>C: {formatMacroOrDash(detail.vitaminaCMg)} mg</p>
                      <p>D: {formatMacroOrDash(detail.vitaminaDMcg)} mcg</p>
                      <p>E: {formatMacroOrDash(detail.vitaminaEMg)} mg</p>
                      <p>B1: {formatMacroOrDash(detail.vitaminaB1Mg)} mg</p>
                      <p>B2: {formatMacroOrDash(detail.vitaminaB2Mg)} mg</p>
                      <p>B3: {formatMacroOrDash(detail.vitaminaB3Mg)} mg</p>
                      <p>B6: {formatMacroOrDash(detail.vitaminaB6Mg)} mg</p>
                      <p>B12: {formatMacroOrDash(detail.vitaminaB12Mcg)} mcg</p>
                      <p>Folato: {formatMacroOrDash(detail.folatoMcg)} mcg</p>
                    </div>
                  </section>
                ) : null}

                {detail.nutrientesExtras?.length ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Nutrientes extras
                    </h4>
                    <ul className="text-xs space-y-1">
                      {detail.nutrientesExtras.map((n, i) => (
                        <li key={`${n.nome}-${i}`}>
                          {n.nome}: {formatMacroOrDash(n.valor)} {n.unidade}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detail.porcoes?.length ? (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Porções
                    </h4>
                    <ul className="text-xs space-y-1">
                      {detail.porcoes.map((p) => (
                        <li key={p.id}>
                          {p.nome}: {p.quantidadeG} g
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detail.totalFontes > 0 ? (
                  <section className="text-xs text-gray-600 border-t border-gray-100 pt-3">
                    {detail.totalFontes === 1 ? (
                      <p>
                        Fonte:{' '}
                        {detail.fontesPublicas[0]?.nome ||
                          detail.fontesPublicas[0]?.documento ||
                          '—'}
                      </p>
                    ) : (
                      <div>
                        <p className="font-semibold">Fontes: {detail.totalFontes}</p>
                        <ul className="mt-1 list-disc pl-4">
                          {detail.fontesPublicas.map((f, i) => (
                            <li key={i}>{f.nome || f.documento || 'Fonte'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                ) : null}

                <button
                  type="button"
                  onClick={() => void toggleFavorito(detail.id)}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-sm font-semibold text-amber-800"
                >
                  {favoritosIds.has(detail.id) ? 'Remover dos favoritos' : 'Favoritar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
