'use client';

import type { EyeSide, RetinaFinding, RetinaSection } from '@/types/oftpay/retinaMap';
import {
  getLocalizedFieldConfig,
  makeStructuredKey,
  needsMapPlacement,
  type LocalizedStructuredField,
} from '@/lib/oftpay/retinaStructuredMapConfig';
import { MapPin } from 'lucide-react';

export interface PlacementMode {
  section: RetinaSection;
  fieldKey: string;
  label: string;
  findingType: LocalizedStructuredField['findingType'];
  allowMultiple?: boolean;
}

export interface LocalizedFieldTogglePayload {
  section: RetinaSection;
  fieldKey: string;
  checked: boolean;
}

interface LocalizedCheckboxFieldProps {
  id: string;
  section: RetinaSection;
  fieldKey: string;
  label: string;
  checked?: boolean;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}

export function LocalizedCheckboxField({
  id,
  section,
  fieldKey,
  label,
  checked,
  findings,
  placementMode,
  onToggle,
  onRequestPlacement,
}: LocalizedCheckboxFieldProps) {
  const structuredKey = makeStructuredKey(section, fieldKey);
  const config = getLocalizedFieldConfig(section, fieldKey);
  const localized = needsMapPlacement(section, fieldKey);
  const count = findings.filter((f) => f.structuredKey === structuredKey).length;
  const isPlacing =
    placementMode?.section === section && placementMode?.fieldKey === fieldKey;

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
        isPlacing
          ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-300'
          : checked
            ? 'border-violet-300 bg-violet-50/80'
            : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={!!checked}
          onChange={(e) =>
            onToggle({ section, fieldKey, checked: e.target.checked })
          }
          className="rounded border-gray-300 text-violet-600"
        />
        {label}
      </span>
      {localized && checked && (
        <span className="flex items-center gap-1 pl-6 text-xs text-violet-700">
          <MapPin className="h-3 w-3 shrink-0" />
          {count === 0 ? (
            'Clique no mapa para indicar onde está'
          ) : isPlacing ? (
            `${count} local(is) — clique para adicionar outro`
          ) : (
            <>
              {count} local(is) marcado(s) no mapa
              {config?.allowMultiple && onRequestPlacement && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="underline hover:text-violet-900"
                    onClick={(e) => {
                      e.preventDefault();
                      onRequestPlacement({ section, fieldKey });
                    }}
                  >
                    adicionar outro
                  </button>
                </>
              )}
            </>
          )}
        </span>
      )}
    </label>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}

export function SimpleCheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        checked ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-violet-600"
      />
      {label}
    </label>
  );
}

export function countStructuredPlacements(
  findings: RetinaFinding[],
  section: RetinaSection,
  fieldKey: string
): number {
  return findings.filter((f) => f.structuredKey === makeStructuredKey(section, fieldKey)).length;
}

export function getLocalizedFieldLabel(section: RetinaSection, fieldKey: string): string {
  return getLocalizedFieldConfig(section, fieldKey)?.label ?? fieldKey;
}
