/**
 * Persistência de cronograma no localStorage
 */

import { Schedule } from '@/types/videoLibrary';

const SCHEDULE_KEY = 'studySchedule';

/**
 * Carrega cronograma do localStorage
 */
export function loadSchedule(): Schedule | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SCHEDULE_KEY);
    if (stored) {
      return JSON.parse(stored) as Schedule;
    }
  } catch (error) {
    console.error('Erro ao carregar cronograma do localStorage:', error);
  }
  
  return null;
}

/**
 * Salva cronograma no localStorage
 */
export function saveSchedule(schedule: Schedule): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  } catch (error) {
    console.error('Erro ao salvar cronograma no localStorage:', error);
  }
}

/**
 * Remove cronograma do localStorage
 */
export function clearSchedule(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SCHEDULE_KEY);
  } catch (error) {
    console.error('Erro ao limpar cronograma do localStorage:', error);
  }
}
