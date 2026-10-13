'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import PrescricaoBuscaCampo from '@/components/prescricao/PrescricaoBuscaCampo';
import PrescricaoHistoricoTab from '@/components/prescricao/PrescricaoHistoricoTab';
import { montarFonteBuscaPrescricoes } from '@/lib/prescricao/prescricaoBusca';

type Aba = 'salvas' | 'historico' | 'descricao';

type Props = {
  paciente: PacienteCompleto;
};

function getTituloExibicao(nome: string): string {
  const n = (nome || '').trim();
  if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
  return n;
}

type Subtipo =
  | 'Recibo / Documento'
  | 'Gastrointestinal'
  | 'Massa Magra & Performance'
  | 'Metabólico / Glicêmico'
  | 'Micronutrientes'
  | 'Sono & Comportamento'
  | 'Hepático / Cardiometabólico'
  | 'Outros';

const SUBTIPOS_ORDER: Subtipo[] = [
  'Recibo / Documento',
  'Gastrointestinal',
  'Massa Magra & Performance',
  'Metabólico / Glicêmico',
  'Micronutrientes',
  'Sono & Comportamento',
  'Hepático / Cardiometabólico',
  'Outros',
];

function getSubtipo(p: Prescricao): Subtipo {
  const rawNome = (p.nome || '').trim();
  if (rawNome.includes(' — ')) {
    const prefix = rawNome.split(' — ')[0].trim();
    const match = SUBTIPOS_ORDER.find((s) => s === prefix || s.startsWith(prefix));
    if (match) return match;
  }
  const txt = `${p.nome || ''} ${p.descricao || ''} ${p.observacoes || ''}`.toLowerCase();
  if (p.tipoDocumento === 'recibo_medico' || txt.includes('recibo')) return 'Recibo / Documento';
  if (
    txt.includes('probiótico') ||
    txt.includes('probiotico') ||
    txt.includes('magnésio') ||
    txt.includes('magnesio')
  ) {
    return 'Gastrointestinal';
  }
  if (txt.includes('whey') || txt.includes('creatina') || txt.includes('hmb')) {
    return 'Massa Magra & Performance';
  }
  if (txt.includes('berberina') || txt.includes('glic') || txt.includes('insulina')) {
    return 'Metabólico / Glicêmico';
  }
  if (txt.includes('vitamina') || txt.includes('b12') || txt.includes('zinco')) {
    return 'Micronutrientes';
  }
  if (txt.includes('sono') || txt.includes('melaton')) return 'Sono & Comportamento';
  if (txt.includes('omega') || txt.includes('silimarina') || txt.includes('ldl')) {
    return 'Hepático / Cardiometabólico';
  }
  return 'Outros';
}

function groupBySubtipo(arr: Prescricao[]) {
  const map = new Map<Subtipo, Prescricao[]>();
  for (const p of arr) {
    const s = getSubtipo(p);
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(p);
  }
  return SUBTIPOS_ORDER.map((s) => ({ subtipo: s, items: map.get(s) || [] })).filter(
    (g) => g.items.length > 0
  );
}

/**
 * Prescrições no workspace profissional — chrome MetaNutri (busca, abas, split), somente leitura.
 */
export default function ProfissionalPrescricoesPacienteReadonlyTab({ paciente }: Props) {
  const pacienteId = paciente.id;
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<Prescricao[]>([]);
  const [aba, setAba] = useState<Aba>('historico');
  const [selecionada, setSelecionada] = useState<Prescricao | null>(null);
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const buscaFonteRef = useRef<Prescricao[]>([]);

  const carregar = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const raw = await PrescricaoService.getPrescricoesByPaciente(pacienteId);
      const patientOnly = raw.filter((p) => !p.isTemplate);
      setLista(patientOnly);
      buscaFonteRef.current = montarFonteBuscaPrescricoes([], patientOnly);
      setGruposExpandidos(new Set(groupBySubtipo(patientOnly).map((g) => g.subtipo)));
    } catch (e) {
      console.error('[ProfissionalPrescricoesPacienteReadonlyTab]', e);
      setLista([]);
      buscaFonteRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar, refreshKey]);

  const grupos = useMemo(() => groupBySubtipo(lista), [lista]);

  const abrir = (p: Prescricao) => {
    setSelecionada(p);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setAba('descricao');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-profissional-prescricoes-readonly>
      <h3 className="shrink-0 text-lg font-semibold text-gray-900">Prescrições</h3>
      <p className="shrink-0 text-xs text-gray-500">
        Visualização somente leitura — sem emissão ou alteração neste portal.
      </p>

      <PrescricaoBuscaCampo
        itensRef={buscaFonteRef}
        loading={loading}
        accent="green"
        onSelect={abrir}
        className="shrink-0"
        actions={
          <button
            type="button"
            onClick={() => {
              setRefreshKey((k) => k + 1);
              void carregar();
            }}
            className="flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        }
      />

      <div className="flex shrink-0 overflow-hidden rounded-t-lg border-b border-gray-200 bg-gray-50">
        {(
          [
            { id: 'salvas' as const, label: 'Prescrições do paciente' },
            { id: 'historico' as const, label: 'Histórico' },
            { id: 'descricao' as const, label: 'Descrição', mobileOnly: true },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAba(tab.id)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
              'mobileOnly' in tab && tab.mobileOnly ? 'lg:hidden' : ''
            } ${
              aba === tab.id
                ? 'border-b-2 border-emerald-500 bg-white text-emerald-700'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:rounded-lg lg:border lg:border-gray-200">
        <div
          className={`${
            aba === 'descricao' ? 'hidden' : 'flex'
          } min-h-0 flex-1 flex-col overflow-hidden lg:flex lg:w-1/2 lg:border-r lg:border-gray-200`}
        >
          {loading && aba !== 'historico' ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
              <p className="mt-2 text-gray-600">Carregando prescrições...</p>
            </div>
          ) : aba === 'historico' ? (
            <PrescricaoHistoricoTab
              pacienteId={pacienteId}
              accent="green"
              refreshKey={refreshKey}
              readOnly
              onEdit={abrir}
              onReplicate={() => {}}
              className="flex min-h-0 flex-1 flex-col overflow-hidden p-2"
              maxHeightClassName="flex-1 min-h-0 max-h-none"
            />
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {lista.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Nenhuma prescrição registrada para este paciente.
                  </p>
                </div>
              ) : (
                grupos.map(({ subtipo, items }) => (
                  <div key={subtipo} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setGruposExpandidos((prev) => {
                          const n = new Set(prev);
                          if (n.has(subtipo)) n.delete(subtipo);
                          else n.add(subtipo);
                          return n;
                        })
                      }
                      className="group mt-3 mb-1 flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-left hover:bg-gray-100"
                    >
                      {gruposExpandidos.has(subtipo) ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                      )}
                      <span className="text-xs font-semibold text-gray-600">
                        {subtipo} ({items.length})
                      </span>
                    </button>
                    {gruposExpandidos.has(subtipo) && (
                      <div className="space-y-2">
                        {items.map((p) => {
                          const isSelected = selecionada?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => abrir(p)}
                              className={`w-full rounded-xl border px-3 py-3 text-left shadow-sm transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <p
                                className={`truncate text-sm font-medium ${
                                  isSelected ? 'text-green-900' : 'text-gray-900'
                                }`}
                              >
                                {getTituloExibicao(p.nome)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div
          className={`${
            aba === 'descricao' ? 'flex' : 'hidden'
          } min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:flex lg:p-5`}
        >
          {selecionada ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 lg:rounded-none lg:border-0 lg:p-0">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nome da Prescrição
                </label>
                <input
                  type="text"
                  value={selecionada.nome || ''}
                  readOnly
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={selecionada.descricao || ''}
                  readOnly
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Itens da Prescrição
                </label>
                <div className="space-y-3">
                  {(selecionada.itens || []).map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="mb-2 text-sm font-medium text-gray-900">Item {idx + 1}</p>
                      <p className="text-sm">
                        <strong>Medicamento:</strong> {it.medicamento}
                      </p>
                      <p className="text-sm">
                        <strong>Dosagem:</strong> {it.dosagem}
                      </p>
                      <p className="text-sm">
                        <strong>Frequência:</strong> {it.frequencia}
                      </p>
                      <p className="text-sm">
                        <strong>Instruções:</strong> {it.instrucoes}
                      </p>
                      {it.quantidade ? (
                        <p className="text-sm">
                          <strong>Quantidade:</strong> {it.quantidade}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {(!selecionada.itens || selecionada.itens.length === 0) && (
                    <p className="text-sm text-gray-500">Nenhum item nesta prescrição.</p>
                  )}
                </div>
              </div>
              <div className="mb-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={selecionada.observacoes || ''}
                  readOnly
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Selecione uma prescrição para ver a descrição.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
