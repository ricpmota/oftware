/**
 * Persistência de configurações e estatísticas do planejador
 */

import { PlannerSettings, PlannerStats, PlanInput, PlannerList } from '@/types/videoLibrary';

const SETTINGS_KEY = 'studyPlannerSettings'; // Deprecated - usar PLANNERS_LIST_KEY
const STATS_KEY = 'studyPlannerStats';
const PLAN_INPUT_KEY = 'studyPlanInput';
const PLANNERS_LIST_KEY = 'studyPlannersList'; // Lista de múltiplos planejamentos

/**
 * Gera ID único para planejamento
 */
function generatePlannerId(): string {
  return `planner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Carrega lista de planejamentos do localStorage
 */
export function loadPlannersList(): PlannerList {
  if (typeof window === 'undefined') return { planners: [] };
  
  try {
    const stored = localStorage.getItem(PLANNERS_LIST_KEY);
    if (stored) {
      return JSON.parse(stored) as PlannerList;
    }
  } catch (error) {
    console.error('Erro ao carregar lista de planejamentos:', error);
  }
  
  return { planners: [] };
}

/**
 * Salva lista de planejamentos no localStorage
 */
export function savePlannersList(list: PlannerList): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PLANNERS_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Erro ao salvar lista de planejamentos:', error);
  }
}

/**
 * Carrega um planejamento específico por ID
 */
export function loadPlannerById(plannerId: string): PlannerSettings | null {
  const list = loadPlannersList();
  return list.planners.find(p => p.id === plannerId) || null;
}

/**
 * Salva um planejamento (cria novo ou atualiza existente)
 */
export function savePlanner(settings: PlannerSettings): PlannerSettings {
  const list = loadPlannersList();
  
  // Se não tem ID, criar novo
  if (!settings.id) {
    settings.id = generatePlannerId();
    settings.createdAt = new Date().toISOString();
  }
  
  settings.updatedAt = new Date().toISOString();
  
  // Atualizar ou adicionar
  const index = list.planners.findIndex(p => p.id === settings.id);
  if (index >= 0) {
    list.planners[index] = settings;
  } else {
    list.planners.push(settings);
  }
  
  savePlannersList(list);
  return settings;
}

/**
 * Remove um planejamento
 */
export function deletePlanner(plannerId: string): void {
  const list = loadPlannersList();
  list.planners = list.planners.filter(p => p.id !== plannerId);
  
  // Se era o ativo, limpar
  if (list.activePlannerId === plannerId) {
    list.activePlannerId = undefined;
  }
  
  savePlannersList(list);
}

/**
 * Define planejamento ativo
 */
export function setActivePlannerId(plannerId: string | undefined): void {
  const list = loadPlannersList();
  list.activePlannerId = plannerId;
  savePlannersList(list);
}

/**
 * Carrega planejamento ativo
 */
export function loadActivePlanner(): PlannerSettings | null {
  const list = loadPlannersList();
  if (list.activePlannerId) {
    return loadPlannerById(list.activePlannerId);
  }
  return null;
}

/**
 * Carrega configurações do planejador do localStorage (deprecated - usar loadActivePlanner)
 */
export function loadPlannerSettings(): PlannerSettings | null {
  // Tentar carregar planejamento ativo primeiro
  const active = loadActivePlanner();
  if (active) return active;
  
  // Fallback para formato antigo
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const oldSettings = JSON.parse(stored) as PlannerSettings;
      // Migrar para novo formato se necessário
      if (!oldSettings.id) {
        oldSettings.id = generatePlannerId();
        oldSettings.name = oldSettings.name || 'Planejamento Antigo';
        oldSettings.createdAt = new Date().toISOString();
        oldSettings.updatedAt = new Date().toISOString();
      }
      // Converter hoursPerDay antigo para hoursPerWeekday se necessário
      if (!oldSettings.hoursPerWeekday && (oldSettings as any).hoursPerDay) {
        const hoursPerDay = (oldSettings as any).hoursPerDay;
        const hoursPerWeekday: { [weekday: number]: number } = {};
        oldSettings.allowedWeekdays.forEach(wd => {
          hoursPerWeekday[wd] = hoursPerDay;
        });
        oldSettings.hoursPerWeekday = hoursPerWeekday;
        delete (oldSettings as any).hoursPerDay;
      }
      return oldSettings;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações do planejador:', error);
  }
  
  return null;
}

/**
 * Salva configurações do planejador no localStorage (deprecated - usar savePlanner)
 */
export function savePlannerSettings(settings: PlannerSettings): void {
  savePlanner(settings);
  
  // Também salvar como ativo se não há lista ainda
  const list = loadPlannersList();
  if (list.planners.length === 0 || !list.activePlannerId) {
    setActivePlannerId(settings.id);
  }
}

/**
 * Carrega estatísticas do planejador do localStorage
 */
export function loadPlannerStats(): PlannerStats | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      return JSON.parse(stored) as PlannerStats;
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas do planejador:', error);
  }
  
  return null;
}

/**
 * Salva estatísticas do planejador no localStorage
 */
export function savePlannerStats(stats: PlannerStats): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Erro ao salvar estatísticas do planejador:', error);
  }
}

/**
 * Carrega planInput do localStorage
 */
export function loadPlanInput(): PlanInput | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(PLAN_INPUT_KEY);
    if (stored) {
      return JSON.parse(stored) as PlanInput;
    }
  } catch (error) {
    console.error('Erro ao carregar planInput:', error);
  }
  
  return null;
}

/**
 * Salva planInput no localStorage
 */
export function savePlanInput(planInput: PlanInput): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PLAN_INPUT_KEY, JSON.stringify(planInput));
  } catch (error) {
    console.error('Erro ao salvar planInput:', error);
  }
}

/**
 * Limpa todos os dados do planejador do localStorage
 */
export function clearPlannerStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(PLAN_INPUT_KEY);
    localStorage.removeItem(PLANNERS_LIST_KEY);
    console.log('Dados do planejador limpos do localStorage.');
  } catch (error) {
    console.error('Erro ao limpar dados do planejador do localStorage:', error);
  }
}
