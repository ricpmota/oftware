'use client';

import { ClipboardCheck } from 'lucide-react';
import { isContratoEasySignPocEnabledClient } from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';

const ITI_VALIDATOR_URL = 'https://validar.iti.gov.br';

const CHECKLIST_ITEMS = [
  'Abrir PDF final no Adobe Reader',
  'Confirmar assinatura do médico válida',
  'Confirmar assinatura do paciente presente',
] as const;

export type ContratoTratamentoPocValidacaoChecklistProps = {
  show: boolean;
};

/** Checklist interno (flag POC) — sem expor terminologia técnica ao médico. */
export default function ContratoTratamentoPocValidacaoChecklist({
  show,
}: ContratoTratamentoPocValidacaoChecklistProps) {
  if (!show || !isContratoEasySignPocEnabledClient()) return null;

  return (
    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-slate-600 shrink-0" aria-hidden />
        <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
          Conferência do documento final
        </p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        Após obter o contrato final assinado pelas duas partes, confira os itens abaixo:
      </p>
      <ul className="space-y-2 text-sm text-slate-700">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-400 bg-white"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
        <li className="flex items-start gap-2">
          <span
            className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-400 bg-white"
            aria-hidden
          />
          <span>
            Validar no ITI:{' '}
            <a
              href={ITI_VALIDATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline break-all"
            >
              {ITI_VALIDATOR_URL}
            </a>
          </span>
        </li>
      </ul>
    </div>
  );
}
