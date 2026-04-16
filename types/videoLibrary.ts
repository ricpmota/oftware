/**
 * Tipos para o sistema de biblioteca de vídeos (/oftreview)
 */

/**
 * Objeto que representa um arquivo de vídeo na biblioteca
 */
export interface VideoFile {
  /** Nome do arquivo */
  name: string;
  /** Tamanho em bytes */
  sizeBytes: number;
  /** Caminho relativo completo do arquivo (inclui subpastas) */
  webkitRelativePath: string;
  /** Caminho do diretório (extraído do webkitRelativePath) */
  folderPath: string;
  /** Assunto inferido do vídeo */
  subject: string;
  /** ID estável baseado em hash do caminho + tamanho */
  videoId: string;
  /** Objeto File original (não persistido, apenas em memória) */
  file?: File;
  /** Se o arquivo está disponível (File foi relinkado) */
  available?: boolean;
  /** Duração do vídeo em segundos (salvo no Firestore) */
  duration?: number | null;
}

/**
 * Progresso de assistir um vídeo
 */
export interface VideoProgress {
  /** Se o vídeo foi marcado como assistido */
  watched: boolean;
  /** Última posição assistida (em segundos) */
  lastPosition: number;
  /** Maior valor de segundos assistidos (em segundos) */
  watchedSeconds: number;
  /** Duração total do vídeo (em segundos, null se ainda não foi carregada) */
  duration: number | null;
  /** Comentários sobre o vídeo */
  comments?: string;
  /** Timestamp da última atualização */
  updatedAt: number;
}

/**
 * Mapa de progresso (videoId -> VideoProgress)
 */
export interface ProgressMap {
  [videoId: string]: VideoProgress;
}

/**
 * Índice da biblioteca (metadados persistidos no localStorage)
 * Não inclui os objetos File, apenas metadados
 */
export interface LibraryIndex {
  /** Array de vídeos (sem o objeto File) */
  videos: Omit<VideoFile, 'file'>[];
  /** Data de criação/última atualização */
  lastUpdated: string;
}

/**
 * Dados para exportação/importação
 */
export interface ProgressExport {
  progressMap: ProgressMap;
  exportedAt: string;
  version: string;
}

/**
 * Assuntos disponíveis para classificação
 * Como cada pasta é um assunto, aceita qualquer string (nome da pasta)
 * Mantém alguns valores conhecidos para mapeamento inteligente
 */
export type VideoSubject = string;

/**
 * Status de progresso de um vídeo
 */
export type VideoProgressStatus = 'not_started' | 'in_progress' | 'watched' | 'unavailable';

/**
 * Biblioteca de vídeos salva no Firestore
 */
export interface VideoLibrary {
  id?: string; // ID único da biblioteca
  name: string; // Nome da biblioteca
  videos: Omit<VideoFile, 'file'>[]; // Metadados dos vídeos (sem objetos File)
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

/**
 * Configurações do planejador de estudo
 */
export interface PlannerSettings {
  id?: string; // ID único do planejamento (para múltiplos planejamentos)
  libraryId: string; // ID da biblioteca à qual pertence
  name?: string; // Nome do planejamento (ex: "Estudo Anual", "Foco Catarata")
  startDateISO: string; // YYYY-MM-DD
  endDateISO: string; // YYYY-MM-DD
  allowedWeekdays: number[]; // [0..6] onde 0=Domingo, 6=Sábado
  hoursPerWeekday: { [weekday: number]: number }; // Horas por dia da semana { 0: 4, 1: 1, ... }
  selectedSubjects: string[]; // Array de VideoSubject
  subjectOrder: string[]; // Ordem dos assuntos (sequência de estudo)
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

/**
 * Estatísticas do planejador
 */
export interface PlannerStats {
  studyDaysCount: number;
  totalCapacityMinutes: number;
  totalLoadMinutes: number;
  perSubjectStats: PerSubjectStat[];
  coveragePercent: number; // capacidade / carga * 100 (clamp 0-100)
  excessMinutes: number; // capacidade - carga (pode ser negativo)
}

/**
 * Estatísticas por assunto
 */
export interface PerSubjectStat {
  subject: string;
  videoCount: number;
  totalMinutes: number;
  watchedMinutes: number;
  watchedPercent: number;
}

/**
 * Dia de estudo válido
 */
export interface StudyDay {
  dateISO: string; // YYYY-MM-DD
  weekday: number; // 0=Domingo, 6=Sábado
  hoursCapacity?: number; // Horas de capacidade para este dia (opcional, usado quando hoursPerWeekday está definido)
}

/**
 * Lista de planejamentos salvos
 */
export interface PlannerList {
  planners: PlannerSettings[];
  activePlannerId?: string; // ID do planejamento ativo
}

/**
 * Input para geração do plano (Etapa 4)
 */
export interface PlanInput {
  studyDays: StudyDay[];
  hoursPerWeekday: { [weekday: number]: number }; // Horas por dia da semana
  selectedVideoIds: string[];
  selectedSubjects: string[];
  subjectOrder: string[]; // Ordem dos assuntos
  plannerId?: string; // ID do planejamento que gerou este plano
}

/**
 * Parte de um vídeo (quando vídeo longo é dividido)
 */
export interface SchedulePart {
  partNumber: number; // 1, 2, 3...
  totalParts: number;
  startSec: number; // Tempo de início em segundos
  endSec: number; // Tempo de fim em segundos
  durationSec: number; // endSec - startSec
}

/**
 * Item do cronograma (vídeo ou parte de vídeo)
 */
export interface ScheduleItem {
  videoId: string;
  itemId: string; // ID único do item (videoId ou videoId_part_N)
  isPart: boolean; // Se é uma parte de vídeo dividido
  part?: SchedulePart; // Informações da parte (se isPart = true)
  subject: string;
  name: string;
  folderPath: string;
  durationSec: number; // Duração em segundos (da parte ou do vídeo completo)
  estimatedDuration: boolean; // Se a duração é estimada (não carregada ainda)
  plannedMinutes: number; // Minutos planejados para este item
}

/**
 * Dia do cronograma
 */
export interface ScheduleDay {
  dateISO: string; // YYYY-MM-DD
  weekday: number; // 0=Domingo, 6=Sábado
  capacityMinutes: number; // Capacidade do dia em minutos
  items: ScheduleItem[]; // Itens alocados para este dia
  plannedMinutes: number; // Total de minutos planejados (soma dos items)
  watchedMinutes: number; // Total de minutos assistidos (calculado dinamicamente)
  progressPercent: number; // Percentual de progresso do dia (calculado dinamicamente)
}

/**
 * Configurações de geração do cronograma
 */
export interface ScheduleSettings {
  intercalateSubjects: boolean; // Intercalar assuntos (round-robin) vs sequencial
  splitLongVideos: boolean; // Dividir vídeos longos em partes
}

/**
 * Cronograma completo
 */
export interface Schedule {
  plannerId: string; // ID do planejamento que gerou este cronograma
  planInput: PlanInput; // Input usado para gerar
  settings: ScheduleSettings; // Configurações de geração
  days: ScheduleDay[]; // Dias do cronograma
  generatedAt: string; // ISO timestamp
  version: string; // Versão do formato (para migrações futuras)
}
