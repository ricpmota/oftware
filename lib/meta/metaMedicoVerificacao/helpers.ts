import { META_MEDICO_CHAT_INTRO_SESSION_KEY } from './constants';

export function isIntroMedicoSessionDone(introKey: string = META_MEDICO_CHAT_INTRO_SESSION_KEY): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(introKey) === '1';
}

export function markIntroMedicoSessionDone(introKey: string = META_MEDICO_CHAT_INTRO_SESSION_KEY): void {
  try {
    sessionStorage.setItem(introKey, '1');
  } catch {
    /* ignore */
  }
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, (_, a) => (a ? `(${a}` : ''));
  return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
    [a, b, c].filter(Boolean).join('.') + (d ? `-${d}` : '')
  );
}

/** Mesma lógica do cadastro em /metaadmin (meu-perfil). */
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
