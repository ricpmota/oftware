import type {
  MentorActor,
  MentorCategoryCounts,
  MentorContentDto,
  MentorContentStatus,
  MentorContentType,
} from '@/types/mentorContent';

export type MentorTrailStatus = MentorContentStatus;

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface MentorTrail {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  coverUrl?: string;
  coverStoragePath?: string;
  status: MentorTrailStatus;
  order?: number;
  featured?: boolean;
  estimatedDurationMinutes?: number;
  requiresPreviousCompletion?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: MentorActor;
  updatedBy?: MentorActor;
}

export interface MentorModule {
  id: string;
  trailId: string;
  title: string;
  description?: string;
  order: number;
  status: MentorTrailStatus;
  requiresPreviousCompletion?: boolean;
  required?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Relacionamento aula ↔ trilha/módulo (many-to-many + ordem). */
export interface MentorTrailLesson {
  id: string;
  trailId: string;
  moduleId: string;
  contentId: string;
  order: number;
  createdAt: Date;
}

export interface MentorUserProgress {
  id: string;
  userId: string;
  contentId: string;
  trailId?: string;
  moduleId?: string;
  status: LessonProgressStatus;
  watchedSeconds: number;
  lastPositionSeconds: number;
  watchedPercentage: number;
  firstStartedAt?: Date;
  lastWatchedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export type MentorProgressDto = {
  contentId: string;
  trailId?: string;
  moduleId?: string;
  status: LessonProgressStatus;
  watchedSeconds: number;
  lastPositionSeconds: number;
  watchedPercentage: number;
  firstStartedAt?: string | null;
  lastWatchedAt?: string | null;
  completedAt?: string | null;
};

export type MentorTrailCardDto = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  coverUrl?: string;
  status: MentorTrailStatus;
  order?: number;
  featured?: boolean;
  moduleCount: number;
  lessonCount: number;
  durationSeconds: number;
  completedLessons: number;
  progressPercent: number;
  remainingSeconds?: number;
  isCompleted: boolean;
  continueLessonSlug?: string;
  continueLessonTitle?: string;
};

export type MentorLessonNavDto = {
  id: string;
  trailLessonId?: string;
  slug: string;
  title: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  type: MentorContentType;
  category?: string;
  status: LessonProgressStatus;
  watchedPercentage: number;
  moduleId: string;
  moduleTitle: string;
};

export type MentorModuleDto = {
  id: string;
  trailId: string;
  title: string;
  description?: string;
  order: number;
  status: MentorTrailStatus;
  lessonCount: number;
  completedLessons: number;
  progressPercent: number;
  isCompleted: boolean;
  lessons: MentorLessonNavDto[];
};

export type MentorTrailDetailDto = {
  trail: MentorTrailCardDto;
  modules: MentorModuleDto[];
  continueLesson?: MentorLessonNavDto | null;
};

export type MentorContinueWatchingDto = {
  contentId: string;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  lastPositionSeconds: number;
  resumeAtSeconds: number;
  watchedPercentage: number;
  trailId?: string;
  trailSlug?: string;
  trailTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
};

export type MentorLessonPlacement = {
  trailId: string;
  trailSlug: string;
  trailTitle: string;
  moduleId: string;
  moduleTitle: string;
};

export type MentorTrailContextDto = {
  trail: MentorTrailCardDto;
  modules: MentorModuleDto[];
  previous: MentorLessonNavDto | null;
  next: MentorLessonNavDto | null;
  current: MentorLessonNavDto;
  currentModuleCompleted: boolean;
  nextModuleTitle?: string;
  trailJustCompleted: boolean;
  resumeAtSeconds: number;
};

export type MentorHomeResponse = {
  viewer: {
    firstName: string;
    canManage: boolean;
  };
  continueWatching: MentorContinueWatchingDto | null;
  journey: MentorTrailCardDto | null;
  trails: MentorTrailCardDto[];
  contents: MentorContentDto[];
  countsByCategory: MentorCategoryCounts;
  placementsByContentId: Record<string, MentorLessonPlacement>;
};

export type MentorTrailWriteInput = {
  title: string;
  description?: string;
  shortDescription?: string;
  status?: MentorTrailStatus;
  order?: number | null;
  featured?: boolean;
};

export type MentorModuleWriteInput = {
  title: string;
  description?: string;
  status?: MentorTrailStatus;
  order?: number;
};
