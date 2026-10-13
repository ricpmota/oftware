import { auth } from '@/lib/firebase';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';

async function bearerHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function uploadExerciseGymMediaClient(params: {
  file: File;
  pacienteId: string;
  exerciseId: string;
}): Promise<ExerciseGymMedia> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('pacienteId', params.pacienteId);
  formData.append('exerciseId', params.exerciseId);
  const res = await fetch('/api/meta/personal/exercise-gym-media', {
    method: 'POST',
    headers: await bearerHeaders(),
    body: formData,
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    media?: ExerciseGymMedia;
  };
  if (!res.ok || !data.ok || !data.media) {
    throw new Error(data.error || 'Não foi possível salvar a foto real.');
  }
  return data.media;
}

export async function deleteExerciseGymMediaClient(params: {
  pacienteId: string;
  exerciseId: string;
}): Promise<void> {
  const res = await fetch('/api/meta/personal/exercise-gym-media', {
    method: 'DELETE',
    headers: {
      ...(await bearerHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pacienteId: params.pacienteId,
      exerciseId: params.exerciseId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Não foi possível remover a foto real.');
  }
}
