'use client';

import { BioRangeBar } from '@/components/bodymap/BioRangeBar';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import { getBioRange, type Sex } from '@/utils/bioImpedanciaRanges';
import { BIO_CARD, BIO_CARD_PAD, BIO_SECTION_TITLE } from '@/components/bodymap/bioImpedanciaTokens';

interface CompRow {
  key: string;
  label: string;
  value: number | null;
  unit: string;
}

function buildRows(registro: BioImpedanciaRegistro): CompRow[] {
  const m = getBioMainMetrics(registro);
  const rows: CompRow[] = [];

  if (m.aguaKg != null) rows.push({ key: 'aguaTotalLitros', label: 'Água corporal', value: m.aguaKg, unit: 'L' });
  if (m.massaGorduraKg != null) rows.push({ key: 'massaGorduraKg', label: 'Massa de gordura', value: m.massaGorduraKg, unit: 'kg' });
  if (m.massaMuscularKg != null) rows.push({ key: 'massaMuscularKg', label: 'Massa muscular', value: m.massaMuscularKg, unit: 'kg' });
  if (m.proteinasKg != null) rows.push({ key: 'proteinasKg', label: 'Proteínas', value: m.proteinasKg, unit: 'kg' });
  if (m.mineraisKg != null) rows.push({ key: 'mineraisKg', label: 'Minerais', value: m.mineraisKg, unit: 'kg' });
  if (m.massaOsseaKg != null) rows.push({ key: 'mineraisKg', label: 'Massa óssea', value: m.massaOsseaKg, unit: 'kg' });
  if (m.metabolismoBasalKcal != null) {
    rows.push({ key: 'metabolismoBasalKcal', label: 'Metabolismo basal', value: m.metabolismoBasalKcal, unit: 'kcal' });
  }

  return rows;
}

export interface BioImpedanciaCompositionCardProps {
  registro: BioImpedanciaRegistro;
  sexo?: Sex | 'Outro' | null;
}

export function BioImpedanciaCompositionCard({ registro, sexo }: BioImpedanciaCompositionCardProps) {
  const rows = buildRows(registro);
  if (rows.length === 0) return null;

  const peso = registro.peso;

  return (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD}`}>
      <h4 className={BIO_SECTION_TITLE}>Composição corporal</h4>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Apenas campos presentes neste exame</p>
      <div className="space-y-5">
        {rows.map((row) => {
          const range = getBioRange(row.key, sexo, peso);
          return (
            <div key={`${row.key}-${row.label}`} className="min-w-0">
              <p className="text-xs font-medium text-gray-700 mb-2">{row.label}</p>
              {range ? (
                <BioRangeBar
                  label={range.label}
                  unit={range.unit || row.unit}
                  min={range.min}
                  max={range.max}
                  barMin={range.barMin}
                  barMax={range.barMax}
                  value={row.value}
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {row.value?.toFixed(1)} {row.unit}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
