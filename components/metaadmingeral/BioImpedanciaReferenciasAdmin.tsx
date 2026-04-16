'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '@/lib/firebase';
import { Activity, Save, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getBioRange } from '@/utils/bioImpedanciaRanges';
import type { BioLimitOverrides, BioLimitOverrideBranch } from '@/types/bioImpedancia';
import {
  getBioJsonSectionEntries,
  type BioJsonSectionId,
} from '@/lib/bioImpedancia/expectedBioKeys';
import limitesBio from '@/data/limites_bioimpedancia.json';

const PREVIEW_PESO = 70;

const SECTION_TITLE_PT: Record<BioJsonSectionId, string> = {
  composicao_corporal: 'Composição corporal',
  musculo_gordura: 'Músculo–gordura',
  obesidade: 'Obesidade',
  massa_magra_segmentar: 'Massa magra segmentar',
  gordura_segmentar: 'Gordura segmentar',
};

type FlatCell = { min: string; max: string };
type PgcDraft = { mMin: string; mMax: string; fMin: string; fMax: string };

const inputCls =
  'w-full min-w-[4.5rem] max-w-[6.5rem] bg-[#0A1F44] border border-white/20 rounded px-2 py-1.5 text-sm text-[#E8EDED]';

function parseOptFloat(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function labelForKey(sectionId: BioJsonSectionId, key: string): string {
  const sec = (limitesBio as Record<string, Record<{ label?: string }>>)[sectionId];
  return sec?.[key]?.label ?? key;
}

function emptyFlatDraft(keys: string[]): Record<string, FlatCell> {
  const d: Record<string, FlatCell> = {};
  for (const k of keys) {
    if (k === 'percentualGordura') continue;
    d[k] = { min: '', max: '' };
  }
  return d;
}

function mergeServerFlatDraft(server: BioLimitOverrides | undefined, keys: string[]): Record<string, FlatCell> {
  const d = emptyFlatDraft(keys);
  if (!server) return d;
  for (const [key, val] of Object.entries(server)) {
    if (key === 'percentualGordura' || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if ('M' in val || 'F' in val) continue;
    const br = val as BioLimitOverrideBranch;
    d[key] = {
      min: br.min != null ? String(br.min) : '',
      max: br.max != null ? String(br.max) : '',
    };
  }
  return d;
}

function emptyPgcDraft(): PgcDraft {
  return { mMin: '', mMax: '', fMin: '', fMax: '' };
}

function mergeServerPgcDraft(server: BioLimitOverrides | undefined): PgcDraft {
  const v = server?.percentualGordura;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return emptyPgcDraft();
  const rec = v as { M?: BioLimitOverrideBranch; F?: BioLimitOverrideBranch; min?: number; max?: number };
  if (rec.M || rec.F) {
    return {
      mMin: rec.M?.min != null ? String(rec.M.min) : '',
      mMax: rec.M?.max != null ? String(rec.M.max) : '',
      fMin: rec.F?.min != null ? String(rec.F.min) : '',
      fMax: rec.F?.max != null ? String(rec.F.max) : '',
    };
  }
  return {
    mMin: rec.min != null ? String(rec.min) : '',
    mMax: rec.max != null ? String(rec.max) : '',
    fMin: rec.min != null ? String(rec.min) : '',
    fMax: rec.max != null ? String(rec.max) : '',
  };
}

function buildOverridesFromDraft(
  flatDraft: Record<string, FlatCell>,
  pgcDraft: PgcDraft
): BioLimitOverrides {
  const out: BioLimitOverrides = {};
  for (const [key, { min, max }] of Object.entries(flatDraft)) {
    const minN = parseOptFloat(min);
    const maxN = parseOptFloat(max);
    if (minN === undefined && maxN === undefined) continue;
    const e: BioLimitOverrideBranch = {};
    if (minN !== undefined) e.min = minN;
    if (maxN !== undefined) e.max = maxN;
    out[key] = e;
  }

  const mMin = parseOptFloat(pgcDraft.mMin);
  const mMax = parseOptFloat(pgcDraft.mMax);
  const fMin = parseOptFloat(pgcDraft.fMin);
  const fMax = parseOptFloat(pgcDraft.fMax);

  const hasM = mMin !== undefined || mMax !== undefined;
  const hasF = fMin !== undefined || fMax !== undefined;
  const samePair =
    pgcDraft.mMin.trim() === pgcDraft.fMin.trim() &&
    pgcDraft.mMax.trim() === pgcDraft.fMax.trim() &&
    (pgcDraft.mMin.trim() !== '' || pgcDraft.mMax.trim() !== '');

  if (samePair && hasM) {
    const flat: BioLimitOverrideBranch = {};
    if (mMin !== undefined) flat.min = mMin;
    if (mMax !== undefined) flat.max = mMax;
    if (Object.keys(flat).length) out.percentualGordura = flat;
  } else if (hasM || hasF) {
    const entry: { M?: BioLimitOverrideBranch; F?: BioLimitOverrideBranch } = {};
    if (hasM) {
      entry.M = {};
      if (mMin !== undefined) entry.M.min = mMin;
      if (mMax !== undefined) entry.M.max = mMax;
    }
    if (hasF) {
      entry.F = {};
      if (fMin !== undefined) entry.F.min = fMin;
      if (fMax !== undefined) entry.F.max = fMax;
    }
    out.percentualGordura = entry;
  }

  return out;
}

export default function BioImpedanciaReferenciasAdmin() {
  const flatKeys = useMemo(() => {
    const all = getBioJsonSectionEntries().flatMap((s) => s.keys);
    return [...new Set(all)].filter((k) => k !== 'percentualGordura');
  }, []);

  const [flatDraft, setFlatDraft] = useState<Record<string, FlatCell>>(() => emptyFlatDraft(flatKeys));
  const [pgcDraft, setPgcDraft] = useState<PgcDraft>(emptyPgcDraft);

  const previewOverrides = useMemo(
    () => buildOverridesFromDraft(flatDraft, pgcDraft),
    [flatDraft, pgcDraft]
  );
  const [listFilter, setListFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/bio-impedancia-config', { cache: 'no-store' });
      const j = (await res.json()) as { bioLimitOverrides?: BioLimitOverrides };
      setFlatDraft(mergeServerFlatDraft(j.bioLimitOverrides, flatKeys));
      setPgcDraft(mergeServerPgcDraft(j.bioLimitOverrides));
    } catch {
      setFlatDraft(emptyFlatDraft(flatKeys));
      setPgcDraft(emptyPgcDraft());
      setMessage({ type: 'err', text: 'Não foi possível carregar; exibindo rascunho vazio.' });
    } finally {
      setLoading(false);
    }
  }, [flatKeys]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const setFlatCell = (key: string, next: FlatCell) => {
    setFlatDraft((prev) => ({ ...prev, [key]: next }));
  };

  const handleSave = async () => {
    const bioLimitOverrides = buildOverridesFromDraft(flatDraft, pgcDraft);
    const user = auth.currentUser;
    if (!user) {
      setMessage({ type: 'err', text: 'Faça login novamente.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/bio-impedancia', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bioLimitOverrides }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: j.error || j.details?.join?.(' ') || 'Erro ao salvar.' });
        return;
      }
      setMessage({
        type: 'ok',
        text: 'Faixas salvas no Firestore. /meta, Metaadmin e Metanutri usam os valores ao recarregar.',
      });
      await loadConfig();
    } catch {
      setMessage({ type: 'err', text: 'Falha de rede ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocal = () => {
    setFlatDraft(emptyFlatDraft(flatKeys));
    setPgcDraft(emptyPgcDraft());
    setMessage({
      type: 'ok',
      text: 'Overrides limpos nesta tela. Clique em Salvar para gravar no Firestore (volta a valer só a referência padrão).',
    });
  };

  /** Faixa calculada a partir do arquivo padrão (sem Firestore), peso fixo 70 kg */
  function referenciaSistemaCell(key: string): { lines: string[]; unit: string } {
    const rM = getBioRange(key, 'M', PREVIEW_PESO);
    const rF = getBioRange(key, 'F', PREVIEW_PESO);
    const u = rM?.unit ?? rF?.unit ?? '';
    if (!rM && !rF) return { lines: ['—'], unit: u };
    if (rM && rF && rM.min === rF.min && rM.max === rF.max) {
      return {
        lines: [`${rM.min.toFixed(2)} – ${rM.max.toFixed(2)}`],
        unit: u,
      };
    }
    const lines: string[] = [];
    if (rM) lines.push(`M: ${rM.min.toFixed(2)} – ${rM.max.toFixed(2)}`);
    if (rF) lines.push(`F: ${rF.min.toFixed(2)} – ${rF.max.toFixed(2)}`);
    return { lines, unit: u };
  }

  const previewTextPgc = (): string => {
    const rM = getBioRange('percentualGordura', 'M', PREVIEW_PESO);
    const rF = getBioRange('percentualGordura', 'F', PREVIEW_PESO);
    if (!rM && !rF) return '—';
    if (rM && rF && rM.min === rF.min && rM.max === rF.max) {
      return `${rM.min.toFixed(1)}–${rM.max.toFixed(1)} %`;
    }
    const parts: string[] = [];
    if (rM) parts.push(`M ${rM.min.toFixed(1)}–${rM.max.toFixed(1)}`);
    if (rF) parts.push(`F ${rF.min.toFixed(1)}–${rF.max.toFixed(1)}`);
    return `${parts.join(' · ')} %`;
  };

  const qq = listFilter.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#E8EDED] flex items-center gap-2">
            <Activity className="h-7 w-7 text-[#4CCB7A]" />
            Bio Impedância
          </h2>
          <p className="text-sm text-[#E8EDED]/70 mt-2 max-w-3xl">
            Edite as <strong>faixas de referência</strong> exibidas nas barras do paciente em /meta (e nos módulos clínicos).
            Deixe <strong>Mín./Máx. override</strong> vazios para usar só a faixa padrão do sistema. A coluna de referência usa
            peso de <strong>70 kg</strong> nos campos proporcionais ao peso. <strong>PGC</strong>: use Ref. M e Ref. F; se os
            quatro campos forem iguais aos pares M/F,
            pode preencher só uma linha duplicada — ou use M/F distintos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetLocal}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-[#E8EDED] hover:bg-white/10 disabled:opacity-50 text-sm"
          >
            <RotateCcw size={18} />
            Limpar overrides (tela)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold hover:bg-[#3fb86a] disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Salvar no Firestore
          </button>
        </div>
      </div>

      <div className="max-w-lg">
        <label className="block text-xs text-[#E8EDED]/55 mb-1">Filtrar por chave ou nome</label>
        <input
          type="search"
          placeholder="Ex.: aguaTotal, braço…"
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="w-full bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED]"
        />
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-green-500/15 text-green-200 border border-green-500/30'
              : 'bg-red-500/15 text-red-200 border border-red-500/30'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
          ) : (
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#E8EDED]/70">
          <Loader2 className="animate-spin h-10 w-10 text-[#4CCB7A]" />
        </div>
      ) : (
        <div className="space-y-8">
          {getBioJsonSectionEntries().map(({ sectionId, keys }) => {
            const title = SECTION_TITLE_PT[sectionId];
            const keysFiltered = qq
              ? keys.filter(
                  (k) =>
                    k.toLowerCase().includes(qq) || labelForKey(sectionId, k).toLowerCase().includes(qq)
                )
              : keys;

            const rows = keysFiltered.filter((k) => k !== 'percentualGordura');
            const pgcLabelLower = labelForKey(sectionId, 'percentualGordura').toLowerCase();
            const showPgc =
              keys.includes('percentualGordura') &&
              (!qq ||
                'percentualgordura'.includes(qq) ||
                pgcLabelLower.includes(qq) ||
                qq === 'pgc');

            if (rows.length === 0 && !showPgc) return null;

            return (
              <div
                key={sectionId}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/25 transition-colors"
              >
                <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-[#E8EDED]">{title}</h3>
                </div>
                <div className="overflow-x-auto">
                  {rows.length > 0 && (
                    <table className="min-w-[520px] w-full text-sm">
                      <thead>
                        <tr className="text-left text-[#E8EDED]/60 text-xs uppercase tracking-wide border-b border-white/10">
                          <th className="px-3 py-2 min-w-[140px]">Parâmetro</th>
                          <th className="px-3 py-2 min-w-[160px]">Referência (70 kg)</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap">Mín. override</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap">Máx. override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {rows.map((key) => {
                          const cell = flatDraft[key] ?? { min: '', max: '' };
                          const prevWithOvM = getBioRange(key, 'M', PREVIEW_PESO, previewOverrides);
                          const refCell = referenciaSistemaCell(key);
                          return (
                            <tr key={key} className="text-[#E8EDED]/90 hover:bg-white/5 align-top">
                              <td
                                className="px-3 py-2 text-sm text-[#E8EDED]"
                                title={`Chave interna: ${key}`}
                              >
                                {labelForKey(sectionId, key)}
                              </td>
                              <td className="px-3 py-2 text-xs text-[#E8EDED]/80">
                                <div className="space-y-0.5">
                                  {refCell.lines.map((line, i) => (
                                    <div key={i}>{line}</div>
                                  ))}
                                  {refCell.unit ? (
                                    <div className="text-[#E8EDED]/55">({refCell.unit})</div>
                                  ) : null}
                                  {prevWithOvM && (cell.min || cell.max) ? (
                                    <div className="text-[#4CCB7A]/85 mt-1 pt-1 border-t border-white/10">
                                      Com override (ex. M, 70 kg): {prevWithOvM.min.toFixed(2)} –{' '}
                                      {prevWithOvM.max.toFixed(2)} {prevWithOvM.unit}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={cell.min}
                                  onChange={(e) => setFlatCell(key, { ...cell, min: e.target.value })}
                                  className={inputCls}
                                  placeholder="padrão"
                                  aria-label={`Mínimo override ${labelForKey(sectionId, key)}`}
                                />
                              </td>
                              <td className="px-2 py-2 align-middle">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={cell.max}
                                  onChange={(e) => setFlatCell(key, { ...cell, max: e.target.value })}
                                  className={inputCls}
                                  placeholder="padrão"
                                  aria-label={`Máximo override ${labelForKey(sectionId, key)}`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {sectionId === 'obesidade' && showPgc && (
                    <div className="px-4 py-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-semibold text-[#E8EDED]">PGC — percentual de gordura (%)</h4>
                      <p className="text-xs text-[#E8EDED]/55">Padrão do sistema: {previewTextPgc()}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                        <div>
                          <label className="text-[10px] text-[#E8EDED]/50">Ref. M min</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pgcDraft.mMin}
                            onChange={(e) => setPgcDraft((p) => ({ ...p, mMin: e.target.value }))}
                            className={`${inputCls} max-w-none w-full mt-0.5`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#E8EDED]/50">Ref. M máx</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pgcDraft.mMax}
                            onChange={(e) => setPgcDraft((p) => ({ ...p, mMax: e.target.value }))}
                            className={`${inputCls} max-w-none w-full mt-0.5`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#E8EDED]/50">Ref. F min</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pgcDraft.fMin}
                            onChange={(e) => setPgcDraft((p) => ({ ...p, fMin: e.target.value }))}
                            className={`${inputCls} max-w-none w-full mt-0.5`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#E8EDED]/50">Ref. F máx</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pgcDraft.fMax}
                            onChange={(e) => setPgcDraft((p) => ({ ...p, fMax: e.target.value }))}
                            className={`${inputCls} max-w-none w-full mt-0.5`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
