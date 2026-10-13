'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Syringe, Trash2 } from 'lucide-react';
import { PrescricaoService } from '@/services/prescricaoService';
import { montarListaProtocolosAba } from '@/lib/prescricao/prescricaoListas';
import { tituloExibicaoPrescricao } from '@/lib/prescricao/prescricaoCatalogoDefaults';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import {
  aplicarIntervaloSemanasProtocolo,
  aplicarPrescricaoAoProtocolo,
  alternarSemanaProtocolo,
  calcularTotalInjetaveis,
  criarProtocoloInjetavelVazio,
  observacaoSemanaInjetavel,
  semanasAplicacaoEfetivas,
  substanciaProtocoloInjetavel,
  sincronizarSemanasProtocolo,
  totalLinhaProtocoloInjetavel,
  valorSemanalProtocoloInjetavel,
} from '@/lib/treatment-negotiation/protocolosInjetaveis';
import type {
  ParametrosPlanoPersonalizadoEditavel,
  ProtocoloInjetavelNegociado,
} from '@/lib/treatment-negotiation/types';
import type { Prescricao } from '@/types/prescricao';

type Props = {
  parametros: ParametrosPlanoPersonalizadoEditavel;
  medicoId: string;
  onChange: (parametros: ParametrosPlanoPersonalizadoEditavel) => void;
};

export default function ProtocolosInjetaveisNegociacaoEditor({
  parametros,
  medicoId,
  onChange,
}: Props) {
  const [protocolos, setProtocolos] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(false);

  const lista = parametros.protocolosInjetaveis ?? [];
  const duracaoPlano = Math.max(1, parametros.semanasPrazo || 1);
  const total = useMemo(() => calcularTotalInjetaveis(parametros), [parametros]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!medicoId.trim()) return;
      setLoading(true);
      try {
        const [templates, prescricoesMedico] = await Promise.all([
          PrescricaoService.getPrescricoesTemplate(),
          PrescricaoService.getPrescricoesByMedico(medicoId),
        ]);
        if (cancelled) return;
        setProtocolos(montarListaProtocolosAba(templates, prescricoesMedico));
      } catch (err) {
        console.error('Erro ao carregar protocolos injetáveis:', err);
        if (!cancelled) setProtocolos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [medicoId]);

  const atualizarLista = (next: ProtocoloInjetavelNegociado[]) => {
    onChange({ ...parametros, protocolosInjetaveis: next });
  };

  const patch = (id: string, next: ProtocoloInjetavelNegociado) => {
    atualizarLista(lista.map((p) => (p.id === id ? next : p)));
  };

  return (
    <div className="rounded-xl border border-violet-200 overflow-hidden bg-white">
      <div className="px-4 py-3 bg-violet-50/80 border-b border-violet-100 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 shrink-0">
            <Syringe className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-950">Protocolos injetáveis</p>
            <p className="text-xs text-violet-800/80 mt-0.5">
              Escolha o protocolo, marque as semanas e ajuste a observação (nome da substância). O
              total entra no investimento.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-violet-600 font-semibold">Subtotal</p>
          <p className="text-sm font-semibold text-violet-950 tabular-nums">{formatarMoedaBRL(total)}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {lista.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-2">
            Nenhum protocolo injetável neste orçamento.
          </p>
        )}

        {lista.map((protocolo, index) => (
          <ProtocoloInjetavelCard
            key={protocolo.id}
            protocolo={protocolo}
            index={index}
            duracaoPlano={duracaoPlano}
            protocolosCatalogo={protocolos}
            loadingCatalogo={loading}
            onPatch={(next) => patch(protocolo.id, next)}
            onRemove={() => atualizarLista(lista.filter((p) => p.id !== protocolo.id))}
          />
        ))}

        <button
          type="button"
          onClick={() =>
            atualizarLista([...lista, criarProtocoloInjetavelVazio(duracaoPlano)])
          }
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-800 bg-white border border-violet-200 rounded-lg hover:bg-violet-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar protocolo
        </button>
      </div>
    </div>
  );
}

function ProtocoloInjetavelCard({
  protocolo,
  index,
  duracaoPlano,
  protocolosCatalogo,
  loadingCatalogo,
  onPatch,
  onRemove,
}: {
  protocolo: ProtocoloInjetavelNegociado;
  index: number;
  duracaoPlano: number;
  protocolosCatalogo: Prescricao[];
  loadingCatalogo: boolean;
  onPatch: (next: ProtocoloInjetavelNegociado) => void;
  onRemove: () => void;
}) {
  const semanasSel = semanasAplicacaoEfetivas(protocolo, duracaoPlano);
  const semanal = valorSemanalProtocoloInjetavel(protocolo);
  const linha = totalLinhaProtocoloInjetavel(protocolo);
  const usaItens = (protocolo.itens ?? []).some((i) => (i.valorUnitario || 0) > 0);
  const substancia = substanciaProtocoloInjetavel(protocolo);
  const [inicioIntervalo, setInicioIntervalo] = useState(semanasSel[0] ?? 1);
  const [qtdIntervalo, setQtdIntervalo] = useState(semanasSel.length || 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Protocolo {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
          aria-label={`Remover protocolo ${index + 1}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Protocolo do catálogo</span>
        <select
          value={protocolo.protocoloId}
          disabled={loadingCatalogo}
          onChange={(e) => {
            const id = e.target.value;
            const found = protocolosCatalogo.find((p) => p.id === id);
            if (!found) {
              onPatch(
                sincronizarSemanasProtocolo(
                  { ...protocolo, protocoloId: '', protocoloNome: '', itens: [] },
                  semanasSel,
                  { duracaoPlano }
                )
              );
              return;
            }
            onPatch(
              aplicarPrescricaoAoProtocolo(
                protocolo,
                found,
                tituloExibicaoPrescricao(found.nome),
                duracaoPlano
              )
            );
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">{loadingCatalogo ? 'Carregando protocolos…' : 'Selecione um protocolo'}</option>
          {protocolosCatalogo.map((p) => (
            <option key={p.id} value={p.id}>
              {tituloExibicaoPrescricao(p.nome)}
              {p.pastaNome ? ` · ${p.pastaNome}` : ''}
            </option>
          ))}
        </select>
      </label>

      {protocolo.itens.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Itens do protocolo
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {protocolo.itens.map((item, itemIdx) => (
              <div
                key={`${protocolo.id}-item-${itemIdx}`}
                className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.medicamento || 'Item'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[item.dosagem, item.frequencia].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <label className="block">
                  <span className="text-[10px] font-medium text-slate-500">R$/semana</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.valorUnitario || ''}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? 0 : Number(e.target.value);
                      const itens = protocolo.itens.map((it, i) =>
                        i === itemIdx
                          ? { ...it, valorUnitario: Number.isFinite(valor) ? Math.max(0, valor) : 0 }
                          : it
                      );
                      onPatch({ ...protocolo, itens, valorTotalManual: null });
                    }}
                    className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-violet-100 bg-white p-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
          Semanas do plano
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-[10px] font-medium text-slate-500">Da semana</span>
            <input
              type="number"
              min={1}
              max={duracaoPlano}
              value={inicioIntervalo}
              onChange={(e) => setInicioIntervalo(Math.max(1, Number(e.target.value) || 1))}
              className="mt-0.5 w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium text-slate-500">Por N semanas</span>
            <input
              type="number"
              min={1}
              max={duracaoPlano}
              value={qtdIntervalo}
              onChange={(e) => setQtdIntervalo(Math.max(1, Number(e.target.value) || 1))}
              className="mt-0.5 w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const next = aplicarIntervaloSemanasProtocolo(
                protocolo,
                inicioIntervalo,
                qtdIntervalo,
                duracaoPlano
              );
              onPatch({ ...next, valorTotalManual: null });
            }}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700"
          >
            Aplicar intervalo
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: duracaoPlano }, (_, i) => i + 1).map((semana) => {
            const ativo = semanasSel.includes(semana);
            return (
              <button
                key={semana}
                type="button"
                onClick={() =>
                  onPatch({
                    ...alternarSemanaProtocolo(protocolo, semana, duracaoPlano),
                    valorTotalManual: null,
                  })
                }
                className={`min-w-[2.25rem] h-8 rounded-md text-xs font-semibold tabular-nums border ${
                  ativo
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                S{semana}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          {semanasSel.length} semana{semanasSel.length === 1 ? '' : 's'} selecionada
          {semanasSel.length === 1 ? '' : 's'}
          {substancia ? ` · ${substancia}` : ''}
        </p>
      </div>

      {semanasSel.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Observação por semana (substância)
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {semanasSel.map((semana) => (
              <label key={semana} className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs font-semibold text-violet-700 w-10 shrink-0 tabular-nums">
                  S{semana}
                </span>
                <input
                  type="text"
                  value={observacaoSemanaInjetavel(protocolo, semana)}
                  onChange={(e) =>
                    onPatch({
                      ...protocolo,
                      observacoesPorSemana: {
                        ...(protocolo.observacoesPorSemana ?? {}),
                        [String(semana)]: e.target.value,
                      },
                    })
                  }
                  placeholder={substancia}
                  className="flex-1 min-w-0 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">
            {usaItens ? 'Unitário (soma itens)' : 'Valor unitário (R$/sem)'}
          </span>
          {usaItens ? (
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium tabular-nums">
              {formatarMoedaBRL(semanal)}
            </p>
          ) : (
            <input
              type="number"
              min={0}
              step={0.01}
              value={protocolo.valorUnitario || ''}
              onChange={(e) => {
                const valorUnitario = Math.max(0, Number(e.target.value) || 0);
                onPatch({
                  ...protocolo,
                  valorUnitario,
                  valorTotalManual: null,
                });
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums"
            />
          )}
        </label>
        <label className="block col-span-2">
          <span className="text-xs font-medium text-slate-600">
            Total da linha — {semanasSel.length} × {formatarMoedaBRL(semanal)}
          </span>
          <p className="mt-1 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950 tabular-nums">
            {formatarMoedaBRL(linha)}
          </p>
        </label>
      </div>
    </div>
  );
}
