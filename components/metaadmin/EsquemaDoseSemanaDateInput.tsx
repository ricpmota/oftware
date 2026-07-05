'use client';

import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import {
  formatDateAsDDMMYY,
  parseDDMMYYToYyyyMmDd,
  parseYyyyMmDdToLocalDate,
  yyyyMmDdFromLocalDate,
} from '@/utils/esquemaDoseSemanaDateFormat';

export {
  formatDateAsDDMMYY,
  formatWeekdayPt,
  yyyyMmDdFromLocalDate,
  parseDDMMYYToYyyyMmDd,
  parseYyyyMmDdToLocalDate,
} from '@/utils/esquemaDoseSemanaDateFormat';

type EsquemaDoseSemanaDateInputProps = {
  semana: number;
  dataExibicao: Date;
  yyyyMmDdFromMap: string | undefined;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  onApplyYyyyMmDd: (semana: number, ymd: string) => void;
  onRemoveOverride: (semana: number) => void;
};

export function EsquemaDoseSemanaDateInput({
  semana,
  dataExibicao,
  yyyyMmDdFromMap,
  dataAplicacaoFocoRef,
  onApplyYyyyMmDd,
}: EsquemaDoseSemanaDateInputProps) {
  const resolved = useMemo(() => {
    if (yyyyMmDdFromMap) {
      const p = parseYyyyMmDdToLocalDate(yyyyMmDdFromMap);
      if (p) return p;
    }
    return dataExibicao;
  }, [yyyyMmDdFromMap, dataExibicao]);

  const [text, setText] = useState(() => formatDateAsDDMMYY(resolved));

  useEffect(() => {
    setText(formatDateAsDDMMYY(resolved));
  }, [resolved]);

  const ymdCanonical = yyyyMmDdFromLocalDate(resolved);

  const valorReferenciaInicial = (): string => {
    if (dataAplicacaoFocoRef.current?.semana === semana) {
      return dataAplicacaoFocoRef.current.valor;
    }
    return ymdCanonical;
  };

  const confirmarESalvarYmd = (ymd: string): void => {
    const valorInicial = valorReferenciaInicial();
    if (ymd === valorInicial) return;
    if (!window.confirm('Deseja salvar a alteração da data da aplicação?')) {
      setText(formatDateAsDDMMYY(resolved));
      return;
    }
    onApplyYyyyMmDd(semana, ymd);
    dataAplicacaoFocoRef.current = null;
  };

  const pickerValue = useMemo(() => {
    const parsed = parseDDMMYYToYyyyMmDd(text);
    return parsed ?? ymdCanonical;
  }, [text, ymdCanonical]);

  const marcarValorInicial = () => {
    dataAplicacaoFocoRef.current = { semana, valor: ymdCanonical };
  };

  return (
    <div className="relative w-full min-h-[28px]">
      {/* Exibição DD/MM/AA — não recebe toque (mobile abre o date por cima) */}
      <input
        type="text"
        readOnly
        tabIndex={-1}
        aria-hidden
        placeholder="DD/MM/AA"
        value={text}
        className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 text-gray-900 text-center tabular-nums pointer-events-none bg-white dark:bg-gray-900"
      />
      {/* Date nativo cobrindo o campo: funciona com toque no iOS/Android (showPicker/sr-only não) */}
      <input
        type="date"
        value={pickerValue}
        aria-label="Selecionar data da aplicação"
        onPointerDown={marcarValorInicial}
        onFocus={marcarValorInicial}
        onChange={(e) => {
          const ymd = e.target.value;
          if (!ymd) return;
          const d = parseYyyyMmDdToLocalDate(ymd);
          if (!d) return;
          setText(formatDateAsDDMMYY(d));
          confirmarESalvarYmd(ymd);
        }}
        className="absolute inset-0 z-10 m-0 h-full w-full min-h-[28px] cursor-pointer opacity-0"
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          fontSize: '16px',
        }}
      />
    </div>
  );
}
