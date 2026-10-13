'use client';

import type { CSSProperties } from 'react';
import {
  organizationPatientDashboardPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';

const SELECT_METODO =
  'min-h-[48px] w-full appearance-none rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-base font-medium text-[#0A1F44] shadow-[0_4px_14px_-10px_rgba(10,31,68,0.2)] focus:border-[#4CCB7A]/60 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/25 lg:min-h-[44px] lg:w-auto lg:min-w-[220px] lg:max-w-xs lg:py-2.5 lg:text-sm';
const SELECT_ORGANIZATION =
  'min-h-[48px] w-full appearance-none rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-base font-medium shadow-[0_4px_14px_-10px_rgba(17,24,39,0.2)] focus:border-[color:var(--meta-home-focus-ring)] focus:outline-none focus:ring-2 focus:ring-[color:var(--meta-home-focus-ring)] lg:min-h-[44px] lg:w-auto lg:min-w-[220px] lg:max-w-xs lg:py-2.5 lg:text-sm';

export interface MetaHomeDateSelectOption {
  key: string;
  label: string;
}

export interface MetaHomeDateSelectProps {
  id?: string;
  options: MetaHomeDateSelectOption[];
  value: string;
  onChange: (key: string) => void;
  /** Chrome autenticado. No Método o seletor conserva navy e verde atuais. */
  chrome?: OrganizationShellChrome | null;
}

export function MetaHomeDateSelect({
  id = 'meta-home-data-ref',
  options,
  value,
  onChange,
  chrome,
}: MetaHomeDateSelectProps) {
  if (options.length === 0) return null;
  const paint = organizationPatientDashboardPaint(chrome);
  const selectStyle = paint
    ? ({ color: paint.ink, '--meta-home-focus-ring': paint.focusRing } as CSSProperties)
    : undefined;

  return (
    <div className="min-w-0 w-full lg:flex lg:items-center lg:justify-between lg:gap-4">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-500 lg:mb-0 lg:shrink-0">
        Data de referência
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={paint ? SELECT_ORGANIZATION : SELECT_METODO}
        style={selectStyle}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
