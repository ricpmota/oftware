import { formatarDoseMgLabel, listarDosesMgTirzepatidaPasso } from '@/lib/tirzepatida/doseTitulacao';

/** Opções <option> para selects de dose (mg) — 1,25 … 15, de 1,25 em 1,25. */
export function DoseMgTirzepatidaSelectOptions() {
  return (
    <>
      {listarDosesMgTirzepatidaPasso().map((d) => (
        <option key={d} value={d}>
          {formatarDoseMgLabel(d)}
        </option>
      ))}
    </>
  );
}
