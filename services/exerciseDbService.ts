/**
 * Cliente para a API de exercícios (proxy da ExerciseDB).
 * As chamadas passam por /api/exercises* para manter RAPIDAPI_KEY no servidor.
 */

import type { Exercise } from '@/types/exercise';

const API = '/api/exercises';

export interface ExercisesParams {
  limit?: number;
  offset?: number;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  name?: string;
}

export interface ExercisesStatus {
  configured: boolean;
  hasHost: boolean;
  hasBaseUrl: boolean;
  keyLength: number;
}

export const exerciseDbService = {
  async getStatus(): Promise<ExercisesStatus> {
    const res = await fetch(`${API}/status`);
    if (!res.ok) return { configured: false, hasHost: false, hasBaseUrl: false, keyLength: 0 };
    return res.json();
  },

  async getExercises(params: ExercisesParams = {}): Promise<Exercise[]> {
    const sp = new URLSearchParams();
    if (params.limit != null) sp.set('limit', String(params.limit));
    if (params.offset != null) sp.set('offset', String(params.offset));
    if (params.bodyPart) sp.set('bodyPart', params.bodyPart);
    if (params.target) sp.set('target', params.target);
    if (params.equipment) sp.set('equipment', params.equipment);
    if (params.name) sp.set('name', params.name);
    const qs = sp.toString();
    const res = await fetch(`${API}${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error || `HTTP ${res.status}`;
      const hint = err?.hint;
      throw new Error(hint ? `${msg} ${hint}` : msg);
    }
    return res.json();
  },

  async getBodyParts(): Promise<string[]> {
    const res = await fetch(`${API}/body-parts`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error || `HTTP ${res.status}`;
      const hint = err?.hint;
      throw new Error(hint ? `${msg} ${hint}` : msg);
    }
    return res.json();
  },

  async getTargets(): Promise<string[]> {
    const res = await fetch(`${API}/targets`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getEquipment(): Promise<string[]> {
    const res = await fetch(`${API}/equipment`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
