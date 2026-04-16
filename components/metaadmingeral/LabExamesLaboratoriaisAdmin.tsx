'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { FlaskConical, Save, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLabRange, calcularIdade, type LabLimitOverrides } from '@/utils/labRangesFromJson';
import type { Sex } from '@/types/labRanges';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import {
  getDefaultLabOrderBySection,
  getExpectedLabExamKeys,
  validateLabOrderBySection,
} from '@/lib/labExames/validateLabOrderBySection';
import {
  buildAllLabReferenceRows,
  buildLabReferenceRows,
  labReferenceRowId,
  parseAgeBandKey,
  type LabReferenceDisplayRow,
} from '@/lib/labExames/buildLabReferenceRows';
import { mergeLabReferenceRowsByAgeBand, type MergedLabAdminRow } from '@/lib/labExames/mergeLabRowsByAgeBand';
import {
  emptyCellDraft,
  mergeServerOverridesIntoDraft,
  buildLabLimitOverridesFromDraft,
} from '@/lib/labExames/labOverridesDraft';

const PREVIEW_DOB = new Date('1980-06-15');

function exampleAgeForRow(r: LabReferenceDisplayRow): number {
  if (r.ageBandKey === 'all' || r.ageBandKey === 'flat') return calcularIdade(PREVIEW_DOB) ?? 45;
  const p = parseAgeBandKey(r.ageBandKey);
  if (!p) return 45;
  if (p.max_age == null) return Math.max(p.min_age, 45);
  return Math.floor((p.min_age + p.max_age) / 2);
}

function dateOfBirthForAge(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

function effectiveRangeForRow(
  r: LabReferenceDisplayRow,
  overrides: LabLimitOverrides | null
): string {
  if (r.sex === '—') {
    const x = getLabRange(r.examKey, 'M', PREVIEW_DOB, overrides);
    if (!x) return '—';
    return `${x.min}–${x.max} ${x.unit}`;
  }
  const age = exampleAgeForRow(r);
  const dob = dateOfBirthForAge(age);
  const x = getLabRange(r.examKey, r.sex as Sex, dob, overrides);
  if (!x) return '—';
  return `${x.min}–${x.max} ${x.unit}`;
}

function cloneOrder(o: Record<string, string[]>): Record<string, string[]> {
  const n: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(o)) n[k] = [...v];
  return n;
}

function filterRefRowsBySearch(rows: LabReferenceDisplayRow[], q: string): LabReferenceDisplayRow[] {
  if (!q.trim()) return rows;
  const qq = q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      r.examKey.toLowerCase().includes(qq) ||
      r.label.toLowerCase().includes(qq) ||
      r.ageBandLabel.toLowerCase().includes(qq) ||
      (r.sex !== '—' && r.sex.toLowerCase().includes(qq))
  );
}

type Cell = { min: string; max: string };

const inputCls =
  'w-full min-w-[3rem] max-w-[4.25rem] bg-[#0A1F44] border border-white/20 rounded px-1.5 py-1 text-xs text-[#E8EDED]';

function OverrideBlock({
  row,
  cell,
  onChange,
  previewLabel,
  previewText,
}: {
  row: LabReferenceDisplayRow;
  cell: Cell;
  onChange: (next: Cell) => void;
  previewLabel: string;
  previewText: string;
}) {
  const hint = `Base: ${row.baseMin}–${row.baseMax} ${row.unit}`;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 items-center">
        <input
          type="text"
          inputMode="decimal"
          title={hint}
          value={cell.min}
          onChange={(e) => onChange({ ...cell, min: e.target.value })}
          className={inputCls}
          placeholder={String(row.baseMin)}
        />
        <input
          type="text"
          inputMode="decimal"
          title={hint}
          value={cell.max}
          onChange={(e) => onChange({ ...cell, max: e.target.value })}
          className={inputCls}
          placeholder={String(row.baseMax)}
        />
      </div>
      <p className="text-[10px] leading-tight text-[#4CCB7A]/85">
        {previewLabel}: {previewText}
      </p>
    </div>
  );
}

function MergedExamRowCells({
  mg,
  overrideDraft,
  previewOverrides,
  setCell,
}: {
  mg: MergedLabAdminRow;
  overrideDraft: Record<string, Cell>;
  previewOverrides: LabLimitOverrides;
  setCell: (rowId: string, next: Cell) => void;
}) {
  if (mg.simple) {
    const id = labReferenceRowId(mg.simple);
    const cell = overrideDraft[id] ?? { min: '', max: '' };
    const prev = effectiveRangeForRow(mg.simple, previewOverrides);
    return (
      <>
        <td colSpan={2} className="px-2 py-2 align-top">
          <OverrideBlock
            row={mg.simple}
            cell={cell}
            onChange={(next) => setCell(id, next)}
            previewLabel="Prévia"
            previewText={prev}
          />
        </td>
        <td colSpan={2} className="px-2 py-2 align-middle text-center text-[#E8EDED]/35 text-xs">
          —
        </td>
      </>
    );
  }

  const mId = mg.m ? labReferenceRowId(mg.m) : '';
  const fId = mg.f ? labReferenceRowId(mg.f) : '';
  const mCell = mg.m ? (overrideDraft[mId] ?? { min: '', max: '' }) : null;
  const fCell = mg.f ? (overrideDraft[fId] ?? { min: '', max: '' }) : null;
  const mPrev = mg.m ? effectiveRangeForRow(mg.m, previewOverrides) : '—';
  const fPrev = mg.f ? effectiveRangeForRow(mg.f, previewOverrides) : '—';

  return (
    <>
      <td colSpan={2} className="px-2 py-2 align-top">
        {mg.m && mCell ? (
          <OverrideBlock
            row={mg.m}
            cell={mCell}
            onChange={(next) => setCell(mId, next)}
            previewLabel="Prévia M"
            previewText={mPrev}
          />
        ) : (
          <span className="text-[#E8EDED]/35 text-xs">—</span>
        )}
      </td>
      <td colSpan={2} className="px-2 py-2 align-top">
        {mg.f && fCell ? (
          <OverrideBlock
            row={mg.f}
            cell={fCell}
            onChange={(next) => setCell(fId, next)}
            previewLabel="Prévia F"
            previewText={fPrev}
          />
        ) : (
          <span className="text-[#E8EDED]/35 text-xs">—</span>
        )}
      </td>
    </>
  );
}

export default function LabExamesLaboratoriaisAdmin() {
  const [order, setOrder] = useState<Record<string, string[]>>(() => getDefaultLabOrderBySection());
  const allRefRows = useMemo(() => buildAllLabReferenceRows(getExpectedLabExamKeys()), []);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, Cell>>(() => emptyCellDraft(allRefRows));
  const [listFilter, setListFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const sectionIdsOrdered = useMemo(() => Object.keys(getDefaultLabOrderBySection()), []);

  const previewOverrides = useMemo((): LabLimitOverrides => {
    try {
      return buildLabLimitOverridesFromDraft(allRefRows, overrideDraft);
    } catch {
      return {};
    }
  }, [allRefRows, overrideDraft]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/lab-exames-config', { cache: 'no-store' });
      const j = (await res.json()) as {
        labOrderBySection?: Record<string, string[]>;
        labLimitOverrides?: LabLimitOverrides;
      };
      if (j.labOrderBySection && typeof j.labOrderBySection === 'object') {
        setOrder(cloneOrder(j.labOrderBySection));
      } else {
        setOrder(getDefaultLabOrderBySection());
      }
      setOverrideDraft(mergeServerOverridesIntoDraft(allRefRows, j.labLimitOverrides));
    } catch {
      setOrder(getDefaultLabOrderBySection());
      setOverrideDraft(emptyCellDraft(allRefRows));
      setMessage({ type: 'err', text: 'Não foi possível carregar; exibindo padrão do código.' });
    } finally {
      setLoading(false);
    }
  }, [allRefRows]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const moveExamToSection = (examKey: string, targetSection: string) => {
    setOrder((prev) => {
      const next = cloneOrder(prev);
      for (const sid of Object.keys(next)) {
        next[sid] = next[sid].filter((k) => k !== examKey);
      }
      if (!next[targetSection]) next[targetSection] = [];
      next[targetSection] = [...next[targetSection], examKey];
      return next;
    });
  };

  const setCell = (rowId: string, next: Cell) => {
    setOverrideDraft((prev) => ({ ...prev, [rowId]: next }));
  };

  const handleSave = async () => {
    const { ok, errors } = validateLabOrderBySection(order);
    if (!ok) {
      setMessage({ type: 'err', text: errors.join(' ') });
      return;
    }
    let labLimitOverrides: LabLimitOverrides;
    try {
      labLimitOverrides = buildLabLimitOverridesFromDraft(allRefRows, overrideDraft);
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Revise os campos min/max.' });
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setMessage({ type: 'err', text: 'Faça login novamente.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/lab-exames', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labOrderBySection: order, labLimitOverrides }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: j.error || j.details?.join?.(' ') || 'Erro ao salvar.' });
        return;
      }
      setMessage({
        type: 'ok',
        text: 'Referência salva no Firestore. Metaadmin, Metanutri e /meta usam ordem + faixas ao recarregar.',
      });
      await loadConfig();
    } catch {
      setMessage({ type: 'err', text: 'Falha de rede ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocal = () => {
    setOrder(getDefaultLabOrderBySection());
    setOverrideDraft(emptyCellDraft(allRefRows));
    setMessage({
      type: 'ok',
      text: 'Ordem e overrides restaurados ao padrão nesta tela. Clique em Salvar para gravar no Firestore.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#E8EDED] flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-[#4CCB7A]" />
            Exames laboratoriais
          </h2>
          <p className="text-sm text-[#E8EDED]/70 mt-2 max-w-3xl">
            Por <strong>sistema</strong>, edite <strong>Ref. M</strong> e <strong>Ref. F</strong> na mesma linha quando a
            faixa etária for a mesma. Abaixo dos campos min/máx aparece a <strong>prévia</strong> do valor efetivo (~45
            anos ou meio da faixa). Células vazias = usar só o JSON base. Última coluna: sistema de agrupamento.
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
            Restaurar padrão (código)
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
        <label className="block text-xs text-[#E8EDED]/55 mb-1">Filtrar exames em todas as tabelas</label>
        <input
          type="search"
          placeholder="Chave, nome ou faixa etária…"
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="w-full bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED]"
        />
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-green-500/15 text-green-200 border border-green-500/30' : 'bg-red-500/15 text-red-200 border border-red-500/30'
          }`}
        >
          {message.type === 'ok' ? <CheckCircle2 className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#E8EDED]/70">
          <Loader2 className="animate-spin h-10 w-10 text-[#4CCB7A]" />
        </div>
      ) : (
        <div className="space-y-8">
          {sectionIdsOrdered.map((sectionId) => {
            const keys = order[sectionId] || [];
            const title = LAB_SECTION_LABELS_PT[sectionId] || sectionId;

            const keysToShow = listFilter.trim()
              ? keys.filter((examKey) => {
                  const rows = buildLabReferenceRows(examKey);
                  return filterRefRowsBySearch(rows, listFilter).length > 0;
                })
              : keys;

            return (
              <div
                key={sectionId}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/25 transition-colors"
              >
                <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-[#E8EDED]">{title}</h3>
                  <p className="text-xs text-[#E8EDED]/50 mt-0.5">id: {sectionId}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#E8EDED]/60 text-xs uppercase tracking-wide border-b border-white/10">
                        <th className="px-3 py-2 align-bottom">Chave</th>
                        <th className="px-3 py-2 align-bottom min-w-[130px]">Nome (ref.)</th>
                        <th className="px-3 py-2 align-bottom whitespace-nowrap">Idade</th>
                        <th className="px-2 py-2 align-bottom text-center" colSpan={2}>
                          Ref. M (override)
                        </th>
                        <th className="px-2 py-2 align-bottom text-center" colSpan={2}>
                          Ref. F (override)
                        </th>
                        <th className="px-3 py-2 align-bottom min-w-[200px]">Sistema</th>
                      </tr>
                      <tr className="text-left text-[#E8EDED]/45 text-[10px] uppercase border-b border-white/10">
                        <th colSpan={3} className="px-3 py-1" />
                        <th className="px-2 py-1 font-normal">Min</th>
                        <th className="px-2 py-1 font-normal">Máx</th>
                        <th className="px-2 py-1 font-normal">Min</th>
                        <th className="px-2 py-1 font-normal">Máx</th>
                        <th className="px-3 py-1" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {keysToShow.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-[#E8EDED]/50 text-center">
                            {keys.length === 0
                              ? 'Nenhum exame neste sistema.'
                              : 'Nenhum exame corresponde ao filtro.'}
                          </td>
                        </tr>
                      ) : (
                        keysToShow.flatMap((examKey) => {
                          const refRows = filterRefRowsBySearch(buildLabReferenceRows(examKey), listFilter);
                          if (refRows.length === 0) return [];
                          const merged = mergeLabReferenceRowsByAgeBand(refRows);
                          const n = merged.length;
                          const displayName =
                            merged[0].simple?.label ?? merged[0].m?.label ?? merged[0].f?.label ?? examKey;

                          return merged.map((mg, idx) => (
                            <tr
                              key={`${examKey}-${mg.ageBandKey}`}
                              className="text-[#E8EDED]/90 hover:bg-white/5 align-top"
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={n}
                                  className="px-3 py-2 font-mono text-xs text-[#4CCB7A]/90 align-top border-r border-white/5"
                                >
                                  {examKey}
                                </td>
                              )}
                              {idx === 0 && (
                                <td
                                  rowSpan={n}
                                  className="px-3 py-2 align-top text-[#E8EDED]/90 border-r border-white/5 text-xs"
                                >
                                  {displayName}
                                </td>
                              )}
                              <td className="px-3 py-2 text-xs whitespace-nowrap text-[#E8EDED]/85">
                                {mg.ageBandLabel}
                              </td>
                              <MergedExamRowCells
                                mg={mg}
                                overrideDraft={overrideDraft}
                                previewOverrides={previewOverrides}
                                setCell={setCell}
                              />
                              {idx === 0 && (
                                <td rowSpan={n} className="px-3 py-2 align-top border-l border-white/5">
                                  <select
                                    value={sectionId}
                                    onChange={(e) => moveExamToSection(examKey, e.target.value)}
                                    className="w-full max-w-[220px] bg-[#0A1F44] border border-white/20 rounded-lg px-2 py-1.5 text-[#E8EDED] text-sm"
                                  >
                                    {sectionIdsOrdered.map((sid) => (
                                      <option key={sid} value={sid}>
                                        {LAB_SECTION_LABELS_PT[sid] || sid}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              )}
                            </tr>
                          ));
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
