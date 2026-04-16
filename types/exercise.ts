/**
 * Tipos da API ExerciseDB (RapidAPI).
 * @see https://exercisedb.p.rapidapi.com
 */

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'balance'
  | 'stretching'
  | 'plyometrics'
  | 'rehabilitation';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
  description?: string;
  difficulty?: ExerciseDifficulty;
  category?: ExerciseCategory;
  gifUrl?: string;
}
