export const MENTOR_ADMIN_EMAILS = [
  'ricpmota.med@gmail.com',
  'pedrok.carneiro1@gmail.com',
] as const;

export type MentorPermissionUser = {
  email?: string | null;
  isVerificado?: boolean | null;
  uploadMentor?: boolean | null;
} | null;

export function normalizeMentorEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function isMentorAdminEmail(email?: string | null): boolean {
  const normalized = normalizeMentorEmail(email);
  if (!normalized) return false;
  return (MENTOR_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

/**
 * Acesso à Central do Mentorado: médico autenticado + verificado.
 * Administradores principais nunca ficam bloqueados.
 * Ausência de isVerificado NÃO é tratada como true.
 */
export function canAccessMentorCenter(user: MentorPermissionUser): boolean {
  if (!user) return false;
  if (isMentorAdminEmail(user.email)) return true;
  return user.isVerificado === true;
}

/**
 * Gestão de conteúdos (criar, upload, editar, publicar, excluir).
 * Ausência de uploadMentor NÃO é tratada como true.
 */
export function canManageMentorContent(user: MentorPermissionUser): boolean {
  if (!user) return false;
  return user.uploadMentor === true || isMentorAdminEmail(user.email);
}
