export const CRM_TAG_PRESET_COLORS = [
  { id: 'green', label: 'Verde', color: '#166534', backgroundColor: '#dcfce7' },
  { id: 'blue', label: 'Azul', color: '#1e40af', backgroundColor: '#dbeafe' },
  { id: 'purple', label: 'Roxo', color: '#6b21a8', backgroundColor: '#f3e8ff' },
  { id: 'yellow', label: 'Amarelo', color: '#a16207', backgroundColor: '#fef9c3' },
  { id: 'red', label: 'Vermelho', color: '#b91c1c', backgroundColor: '#fee2e2' },
  { id: 'gray', label: 'Cinza', color: '#475569', backgroundColor: '#f1f5f9' },
  { id: 'pink', label: 'Rosa', color: '#be185d', backgroundColor: '#fce7f3' },
  { id: 'orange', label: 'Laranja', color: '#c2410c', backgroundColor: '#ffedd5' },
] as const;

export type CrmTagPresetColorId = (typeof CRM_TAG_PRESET_COLORS)[number]['id'];
