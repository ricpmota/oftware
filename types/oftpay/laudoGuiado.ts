export type LaudoGuiadoExamType =
  | 'mapeamento_retina'
  | 'oct_disco'
  | 'oct_macula'
  | 'ultrassonografia'
  | 'galilei'
  | 'topografia'
  | 'microscopia'
  | 'angiografia_fluorescinica';

export interface LaudoGuiadoExamOption {
  id: LaudoGuiadoExamType;
  label: string;
  /** Módulo já disponível para uso (false = em construção). */
  available: boolean;
}

export const LAUDO_GUIADO_EXAM_OPTIONS: LaudoGuiadoExamOption[] = [
  { id: 'mapeamento_retina', label: 'Mapeamento Retina', available: true },
  { id: 'oct_disco', label: 'OCT Disco', available: false },
  { id: 'oct_macula', label: 'OCT Mácula', available: false },
  { id: 'ultrassonografia', label: 'Ultrassonografia', available: false },
  { id: 'galilei', label: 'Galillei', available: false },
  { id: 'topografia', label: 'Topografia', available: false },
  { id: 'microscopia', label: 'Microscopia', available: false },
  { id: 'angiografia_fluorescinica', label: 'Angiografia Fluorescínica', available: false },
];

export function getLaudoGuiadoExamOption(
  id: LaudoGuiadoExamType
): LaudoGuiadoExamOption | undefined {
  return LAUDO_GUIADO_EXAM_OPTIONS.find((o) => o.id === id);
}
