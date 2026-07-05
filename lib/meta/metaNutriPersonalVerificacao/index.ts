import type { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import type { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import {
  getNutriPersonalIntroKey,
  META_NUTRI_PERSONAL_STEP_COMPLETO,
  META_NUTRI_CHAT_INTRO_SESSION_KEY,
  META_PERSONAL_CHAT_INTRO_SESSION_KEY,
} from './constants';

export {
  META_NUTRI_CHAT_INTRO_SESSION_KEY,
  META_PERSONAL_CHAT_INTRO_SESSION_KEY,
  getNutriPersonalIntroKey,
  nutriPersonalStepTexts,
  META_NUTRI_PERSONAL_STEP_INTRO,
  META_NUTRI_PERSONAL_STEP_NOME,
  META_NUTRI_PERSONAL_STEP_TELEFONE,
  META_NUTRI_PERSONAL_STEP_REGISTRO,
  META_NUTRI_PERSONAL_STEP_CIDADES,
  META_NUTRI_PERSONAL_STEP_CNH,
  META_NUTRI_PERSONAL_STEP_SELFIE,
  META_NUTRI_PERSONAL_STEP_REGISTRO_DOC,
  META_NUTRI_PERSONAL_STEP_COMPLETO,
  META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS,
} from './constants';

export type ProfissionalVerificacaoDoc = NutricionistaDoc | PersonalTrainerDoc;

export function isIntroNutriPersonalSessionDone(tipo: 'nutri' | 'personal'): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(getNutriPersonalIntroKey(tipo)) === '1';
}

export function markIntroNutriPersonalSessionDone(tipo: 'nutri' | 'personal'): void {
  try {
    sessionStorage.setItem(getNutriPersonalIntroKey(tipo), '1');
  } catch {
    /* ignore */
  }
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, (_, a) => (a ? `(${a}` : ''));
  return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`);
}

export function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const distancia = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distancia / maxLen;
}

export function getFirstIncompleteNutriPersonalStep(
  p: ProfissionalVerificacaoDoc | null | undefined,
  tipo: 'nutri' | 'personal'
): number {
  if (!p) return 0;
  if (!isIntroNutriPersonalSessionDone(tipo)) return 0;
  if (!(p.nome || '').trim()) return 1;
  const tel = (p.telefone || '').replace(/\D/g, '');
  if (tel.length < 10) return 2;
  const reg = (p.registroNumero || '').replace(/\D/g, '');
  if (reg.length < 1) return 3;
  if (!p.cidades?.length) return 4;
  if (!(p.docVerificacaoCnhUrl || '').trim()) return 5;
  if (!(p.docVerificacaoSelfieUrl || '').trim()) return 6;
  if (!(p.docVerificacaoRegistroUrl || '').trim()) return 7;
  return META_NUTRI_PERSONAL_STEP_COMPLETO;
}

export function isNutriPersonalVerificacaoWizardCompleto(
  p: ProfissionalVerificacaoDoc | null | undefined,
  tipo: 'nutri' | 'personal'
): boolean {
  return getFirstIncompleteNutriPersonalStep(p, tipo) === META_NUTRI_PERSONAL_STEP_COMPLETO;
}
