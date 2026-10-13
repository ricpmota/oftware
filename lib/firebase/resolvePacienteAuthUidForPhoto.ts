import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';

/**
 * UID do Firebase Auth usado só para buscar a foto do login.
 *
 * Pacientes cadastrados pelo médico recebem `userId = {uidDoMedico}_{timestamp}`.
 * Extrair o prefixo faria todos herdarem a foto do médico (ou de outro paciente).
 */
export function resolvePacienteAuthUidForPhoto(paciente: {
  userId?: string | null;
  id?: string | null;
}): string | null {
  const userId = typeof paciente.userId === 'string' ? paciente.userId.trim() : '';
  if (isValidFirebaseAuthUid(userId)) return userId;
  return null;
}

export function normalizeAuthPhotoUrl(url: string | null | undefined): string | null {
  let src = url?.trim() || '';
  if (!src) return null;
  if (src.startsWith('//')) src = `https:${src}`;
  if (src.startsWith('http://')) src = `https://${src.slice(7)}`;
  if (src.includes('googleusercontent.com')) {
    const base = src.split('=')[0];
    return `${base}=s128-c`;
  }
  return src;
}
