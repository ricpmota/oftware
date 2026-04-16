'use client';

import { useState, useCallback, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Loader2, Copy, Download, Check } from 'lucide-react';
import type { RelatorioTirzepatidaRequest, RelatorioTirzepatidaResponse } from '@/types/relatoriosTirzepatida';

function formatDateYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildTextoCanva(data: RelatorioTirzepatidaResponse): string {
  const { periodo, amostra, resultado, marcos, aderencia, disclaimer } = data;
  const fmt = (n: number | null) => (n == null ? '—' : `–${n}%`);
  return [
    'OFTWARE — Resultados do acompanhamento metabólico',
    'Tirzepatida + suporte médico',
    `Período analisado: ${periodo.label}`,
    '',
    `Pacientes: ${amostra.totalPacientes}`,
    `Tempo mediano: ${amostra.tempoMedianoSemanas} semanas`,
    `Aplicações médias: ${amostra.aplicacoesMediasPorPaciente}`,
    '',
    `Mediana de perda de peso: –${resultado.medianaPerdaPesoPercent}%`,
    `≥5%: ${resultado.pctAtingiu5}%`,
    `≥10%: ${resultado.pctAtingiu10}%`,
    '',
    `4 semanas: ${fmt(marcos.perda4SemPercent)}`,
    `8 semanas: ${fmt(marcos.perda8SemPercent)}`,
    `12 semanas: ${fmt(marcos.perda12SemPercent)}`,
    '',
    `Continuidade ≥8 semanas: ${aderencia.pctContinuidade8Sem}%`,
    `Continuidade ≥12 semanas: ${aderencia.pctContinuidade12Sem}%`,
    '',
    disclaimer.slice(0, 2).join(' '),
  ].join('\n');
}

export interface RelatoriosSectionProps {
  user: User | null;
}

export default function RelatoriosSection({ user }: RelatoriosSectionProps) {
  const [periodPreset, setPeriodPreset] = useState<'30' | '90' | '180' | 'custom'>('90');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minWeeks, setMinWeeks] = useState(4);
  const [onlyActive, setOnlyActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatorioTirzepatidaResponse | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    if (periodPreset === '30') start.setDate(start.getDate() - 30);
    else if (periodPreset === '90') start.setDate(start.getDate() - 90);
    else if (periodPreset === '180') start.setDate(start.getDate() - 180);
    if (periodPreset !== 'custom') {
      setDateStart(formatDateYMD(start));
      setDateEnd(formatDateYMD(end));
    }
  }, [periodPreset]);

  const getRequestParams = useCallback((): RelatorioTirzepatidaRequest => {
    const start = dateStart || formatDateYMD(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const end = dateEnd || formatDateYMD(new Date());
    return { dateStart: start, dateEnd: end, minWeeks, onlyActive };
  }, [dateStart, dateEnd, minWeeks, onlyActive]);

  const generateReport = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const params = getRequestParams();
      const res = await fetch('/api/metaadmingeral/relatorios/tirzepatida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao gerar relatório');
        setData(null);
        return;
      }
      setData(json as RelatorioTirzepatidaResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, getRequestParams]);

  const copyTexto = useCallback(async () => {
    if (!data) return;
    const text = buildTextoCanva(data);
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [data]);

  const copyJson = useCallback(async () => {
    if (!data) return;
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }, [data]);

  const downloadJson = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oftware_resultados_tirzepatida_${data.periodo.dateEnd.replace(/-/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
        <p className="text-gray-600 mt-1">Exporte dados consolidados (Tirzepatida) para uso no Canva.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resultados Metabólicos (Tirzepatida) — Exportar Dados
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <div className="flex flex-wrap gap-2 items-center">
              {(['30', '90', '180', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${periodPreset === p ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {p === 'custom' ? 'Personalizado' : `${p} dias`}
                </button>
              ))}
              {periodPreset === 'custom' && (
                <span className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-gray-500">até</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tempo mínimo de acompanhamento</label>
            <select
              value={minWeeks}
              onChange={(e) => setMinWeeks(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={1}>≥ 1 semana</option>
              <option value={4}>≥ 4 semanas</option>
              <option value={8}>≥ 8 semanas</option>
              <option value={12}>≥ 12 semanas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status do paciente</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyActive(true)}
                className={`px-3 py-1.5 rounded-lg text-sm ${onlyActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Apenas ativos
              </button>
              <button
                type="button"
                onClick={() => setOnlyActive(false)}
                className={`px-3 py-1.5 rounded-lg text-sm ${!onlyActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            {error}
          </div>
        )}
        {data && data.amostra.totalPacientes < 30 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            Amostra pequena (N = {data.amostra.totalPacientes} pacientes). Para maior anonimização recomenda-se N ≥ 30. Dados apenas informativos.
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Gerar relatório
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-gray-500 text-sm">
            Calculando...
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6 mt-6 border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900">Resumo em cards</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pacientes</div>
                <div className="text-2xl font-bold text-gray-900">{data.amostra.totalPacientes}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tempo mediano</div>
                <div className="text-2xl font-bold text-gray-900">{data.amostra.tempoMedianoSemanas} sem</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Aplicações médias</div>
                <div className="text-2xl font-bold text-gray-900">{data.amostra.aplicacoesMediasPorPaciente}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mediana perda peso</div>
                <div className="text-2xl font-bold text-gray-900">–{data.resultado.medianaPerdaPesoPercent}%</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">≥5%</div>
                <div className="text-xl font-bold text-gray-900">{data.resultado.pctAtingiu5}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">≥10%</div>
                <div className="text-xl font-bold text-gray-900">{data.resultado.pctAtingiu10}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Período</div>
                <div className="text-sm font-medium text-gray-900">{data.periodo.label}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">4 sem</div>
                <div className="text-lg font-bold text-gray-900">{data.marcos.perda4SemPercent != null ? `–${data.marcos.perda4SemPercent}%` : '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">8 sem</div>
                <div className="text-lg font-bold text-gray-900">{data.marcos.perda8SemPercent != null ? `–${data.marcos.perda8SemPercent}%` : '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">12 sem</div>
                <div className="text-lg font-bold text-gray-900">{data.marcos.perda12SemPercent != null ? `–${data.marcos.perda12SemPercent}%` : '—'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Continuidade ≥8 sem</div>
                <div className="text-xl font-bold text-gray-900">{data.aderencia.pctContinuidade8Sem}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Continuidade ≥12 sem</div>
                <div className="text-xl font-bold text-gray-900">{data.aderencia.pctContinuidade12Sem}%</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Texto pronto para Canva</h4>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans overflow-x-auto">
                {buildTextoCanva(data)}
              </pre>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={copyTexto}
                  className="inline-flex items-center px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm"
                >
                  {copiedText ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedText ? 'Copiado!' : 'Copiar texto'}
                </button>
                <button
                  type="button"
                  onClick={copyJson}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  {copiedJson ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedJson ? 'Copiado!' : 'Copiar JSON'}
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
