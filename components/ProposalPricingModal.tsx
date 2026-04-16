'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Printer } from 'lucide-react';
import { ProposalPricingService } from '@/services/proposalPricingService';
import { generatePropostaPdf, getPropostaFilename } from '@/utils/propostaPdf';
import type { ProposalPricingRow } from '@/types/proposalPricing';

/** Formata centavos para exibição BR: R$ 1.500,00 */
function formatBrCurrency(cents: number): string {
  if (cents < 0 || Number.isNaN(cents)) return 'R$ 0,00';
  const value = cents / 100;
  const [intPart, decPart] = value.toFixed(2).split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withDots},${decPart}`;
}

/** Parse string BR para centavos. Aceita "1.500,00", "800", etc. Retorna null se inválido. */
function parseBrCurrency(s: string): number | null {
  const t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  const withoutSymbol = t.replace(/^R\$\s?/i, '').trim();
  if (!withoutSymbol) return null;
  const lastComma = withoutSymbol.lastIndexOf(',');
  let numStr: string;
  if (lastComma >= 0) {
    const intPart = withoutSymbol.slice(0, lastComma).replace(/\./g, '');
    const decPart = withoutSymbol.slice(lastComma + 1).replace(/\D/g, '').slice(0, 2);
    numStr = `${intPart}.${decPart.padEnd(2, '0')}`;
  } else {
    numStr = withoutSymbol.replace(/\./g, '');
  }
  const num = parseFloat(numStr);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

const FIXED_ROWS: { weeklyDoseMg: number; monthlyTotalMg: number }[] = [
  { weeklyDoseMg: 2.5, monthlyTotalMg: 10 },
  { weeklyDoseMg: 5, monthlyTotalMg: 20 },
  { weeklyDoseMg: 7.5, monthlyTotalMg: 30 },
  { weeklyDoseMg: 10, monthlyTotalMg: 40 },
  { weeklyDoseMg: 12.5, monthlyTotalMg: 50 },
  { weeklyDoseMg: 15, monthlyTotalMg: 60 },
];

export interface ProposalPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string | null;
  doctorName?: string;
  doctorPhone?: string;
  onSaved?: () => void;
}

export default function ProposalPricingModal({
  isOpen,
  onClose,
  doctorId,
  doctorName = '',
  doctorPhone = '',
  onSaved,
}: ProposalPricingModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<ProposalPricingRow[]>(() => ProposalPricingService.getDefaultRows());
  const [inputValues, setInputValues] = useState<string[]>(() =>
    ProposalPricingService.getDefaultRows().map((r) => formatBrCurrency(r.priceCents))
  );
  const [inputErrors, setInputErrors] = useState<(string | null)[]>([]);

  const load = useCallback(async () => {
    if (!doctorId) {
      setRows(ProposalPricingService.getDefaultRows());
      setInputValues(ProposalPricingService.getDefaultRows().map((r) => formatBrCurrency(r.priceCents)));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const doc = await ProposalPricingService.get(doctorId);
      if (doc?.rows?.length === FIXED_ROWS.length) {
        setRows(doc.rows);
        setInputValues(doc.rows.map((r) => formatBrCurrency(r.priceCents)));
      } else {
        const defaultRows = ProposalPricingService.getDefaultRows();
        setRows(defaultRows);
        setInputValues(defaultRows.map((r) => formatBrCurrency(r.priceCents)));
      }
    } catch (e) {
      console.error('Erro ao carregar proposta:', e);
      setError('Não foi possível carregar os valores. Usando padrão.');
      const defaultRows = ProposalPricingService.getDefaultRows();
      setRows(defaultRows);
      setInputValues(defaultRows.map((r) => formatBrCurrency(r.priceCents)));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setInputErrors([]);
      load();
    }
  }, [isOpen, load]);

  const updateInput = (index: number, raw: string) => {
    const next = [...inputValues];
    next[index] = raw;
    setInputValues(next);
    const errs = [...inputErrors];
    errs[index] = null;
    setInputErrors(errs);
  };

  const validateAll = (): boolean => {
    const errs: (string | null)[] = [];
    let valid = true;
    for (let i = 0; i < inputValues.length; i++) {
      const cents = parseBrCurrency(inputValues[i]);
      if (cents === null) {
        errs.push('Valor obrigatório');
        valid = false;
      } else if (cents < 0) {
        errs.push('Não pode ser negativo');
        valid = false;
      } else if (cents === 0) {
        errs.push('Não pode ser zero');
        valid = false;
      } else {
        errs.push(null);
      }
    }
    setInputErrors(errs);
    return valid;
  };

  const handleSave = async () => {
    if (!doctorId) {
      setError('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (!validateAll()) return;
    const centsList = inputValues.map((v) => parseBrCurrency(v));
    if (centsList.some((c) => c === null || c <= 0)) return;
    const newRows: ProposalPricingRow[] = FIXED_ROWS.map((fix, i) => ({
      weeklyDoseMg: fix.weeklyDoseMg,
      monthlyTotalMg: fix.monthlyTotalMg,
      priceCents: centsList[i]!,
    }));
    setSaving(true);
    setError(null);
    try {
      await ProposalPricingService.save(doctorId, newRows);
      setRows(newRows);
      setSuccessMessage('Salvo com sucesso');
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (e) {
      console.error('Erro ao salvar proposta:', e);
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!doctorId) {
      setError('Usuário não identificado.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const defaultRows = ProposalPricingService.getDefaultRows();
      await ProposalPricingService.save(doctorId, defaultRows);
      setRows(defaultRows);
      setInputValues(defaultRows.map((r) => formatBrCurrency(r.priceCents)));
      setInputErrors([]);
      setSuccessMessage('Valores restaurados ao padrão');
      onSaved?.();
    } catch (e) {
      console.error('Erro ao restaurar padrão:', e);
      setError('Não foi possível restaurar o padrão.');
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = (index: number) => {
    const cents = parseBrCurrency(inputValues[index]);
    if (cents !== null && cents >= 0) {
      const next = [...inputValues];
      next[index] = formatBrCurrency(cents);
      setInputValues(next);
    }
  };

  const handlePrintPdf = async () => {
    setPrintingPdf(true);
    setError(null);
    try {
      let pricingRows = rows;
      if (doctorId) {
        const doc = await ProposalPricingService.get(doctorId);
        if (doc?.rows?.length === FIXED_ROWS.length) {
          pricingRows = doc.rows;
        } else {
          pricingRows = ProposalPricingService.getDefaultRows();
        }
      } else {
        pricingRows = ProposalPricingService.getDefaultRows();
      }
      const buffer = await generatePropostaPdf({
        doctorName: doctorName || 'Médico',
        doctorPhone,
        rows: pricingRows,
      });
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = getPropostaFilename(doctorName || 'Proposta');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao gerar PDF da proposta:', e);
      setError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setPrintingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configurar valores da proposta
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Valores mensais – 4 aplicações, 1 por semana
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 -mx-1">
              <table className="w-full border-collapse min-w-[300px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                  <col className="w-[44%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2.5 px-1.5 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Dose Semanal
                    </th>
                    <th className="text-left py-2.5 px-1.5 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Total Mensal (mg)
                    </th>
                    <th className="text-left py-2.5 px-1.5 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Valor (R$)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FIXED_ROWS.map((fix, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="py-2 px-1.5 sm:px-2 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {fix.weeklyDoseMg.toFixed(1)} mg
                        </span>
                      </td>
                      <td className="py-2 px-1.5 sm:px-2 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {fix.monthlyTotalMg} mg
                        </span>
                      </td>
                      <td className="py-2 px-1.5 sm:px-2 align-middle whitespace-nowrap">
                        <div className="min-w-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="R$ 0.000,00"
                            value={inputValues[index] ?? ''}
                            onChange={(e) => updateInput(index, e.target.value)}
                            onBlur={() => handleBlur(index)}
                            className={`w-full min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 ${
                              inputErrors[index]
                                ? 'border-red-500 dark:border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                            } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                          />
                          {inputErrors[index] && (
                            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 whitespace-nowrap truncate">
                              {inputErrors[index]}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRestoreDefault}
            disabled={loading || saving}
            className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Restaurar
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={loading || printingPdf}
            className="shrink-0 inline-flex items-center justify-center p-2 text-white bg-purple-600 border border-purple-700 rounded-lg shadow-sm hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition-colors"
            title="Imprimir Proposta (PDF)"
            aria-label="Imprimir Proposta (PDF)"
          >
            {printingPdf ? (
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Printer size={20} className="text-white" />
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 border border-green-700 rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {saving ? 'Salvando…' : 'Salvar valores'}
          </button>
        </div>
      </div>
    </div>
  );
}
