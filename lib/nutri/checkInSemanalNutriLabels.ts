import {
  ALIMENTACAO_FORA_PLANO_OPCOES,
  MEDIA_SONO_OPCOES,
  SEVERIDADE_GI_OPCOES,
  textoConquistaCheckIn,
  textoDificuldadeCheckIn,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import type {
  CheckInSemanalNutriAlimentacaoForaPlano,
  CheckInSemanalNutriMediaSono,
  CheckInSemanalNutriSeveridadeGI,
} from '@/lib/nutri/checkInSemanalNutriTypes';

function rotuloDe<T extends string>(
  options: { value: T; label: string }[],
  value: T | undefined,
  fallback = '—'
): string {
  if (!value) return fallback;
  return options.find((o) => o.value === value)?.label ?? fallback;
}

export function rotuloAlimentacaoForaPlano(value?: CheckInSemanalNutriAlimentacaoForaPlano): string {
  return rotuloDe(ALIMENTACAO_FORA_PLANO_OPCOES, value);
}

export function rotuloSeveridadeGI(value?: CheckInSemanalNutriSeveridadeGI): string {
  return rotuloDe(SEVERIDADE_GI_OPCOES, value);
}

export function rotuloMediaSono(value?: CheckInSemanalNutriMediaSono): string {
  return rotuloDe(MEDIA_SONO_OPCOES, value);
}

export function rotuloDiasSemana(dias?: number | null): string {
  if (dias == null || !Number.isFinite(dias)) return '—';
  return `${dias}/7`;
}

export function rotuloSessoesAtividade(sessoes?: number | null): string {
  if (sessoes == null || !Number.isFinite(sessoes)) return '—';
  if (sessoes >= 8) return '7+x';
  return `${sessoes}x`;
}

export function rotuloEnergiaSemana(valor?: number | null): string {
  if (valor == null || !Number.isFinite(valor)) return '—';
  const pct = valor <= 5 ? valor * 20 : valor;
  if (pct <= 20) return 'Esgotado';
  if (pct <= 40) return 'Baixa';
  if (pct <= 60) return 'Regular';
  if (pct <= 80) return 'Boa';
  return 'Alta';
}

export function rotuloPrincipalDificuldade(record: Partial<CheckInSemanalNutriAnswers>): string {
  return textoDificuldadeCheckIn(record) || '—';
}

export function rotuloPrincipalConquista(record: Partial<CheckInSemanalNutriAnswers>): string {
  return textoConquistaCheckIn(record) || '—';
}
