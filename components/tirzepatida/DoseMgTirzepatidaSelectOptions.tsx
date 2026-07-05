import { DOSES_MG_TIRZEPATIDA, formatarDoseMgLabel } from '@/lib/tirzepatida/doseTitulacao';

/** Opções <option> para selects de dose (mg) — 1,25 … 15. */
export function DoseMgTirzepatidaSelectOptions() {
  return (
    <>
      {DOSES_MG_TIRZEPATIDA.map((d) => (
        <option key={d} value={d}>
          {formatarDoseMgLabel(d)}
        </option>
      ))}
    </>
  );
}
