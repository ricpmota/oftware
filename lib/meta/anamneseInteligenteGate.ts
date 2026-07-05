/** E-mail do administrador geral — análise inteligente sempre liberada. */
export const METAADMIN_GERAL_EMAIL = 'ricpmota.med@gmail.com';

export function normalizeMedicoEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function isMetaAdminGeralEmail(email?: string | null): boolean {
  return normalizeMedicoEmail(email) === METAADMIN_GERAL_EMAIL;
}

/** Médico pode usar o botão / API de análise inteligente da anamnese. */
export function isAnamneseInteligenteAtivoParaMedico(medico: {
  email?: string | null;
  anamneseInteligenteAtivo?: boolean;
} | null | undefined): boolean {
  if (!medico) return false;
  if (isMetaAdminGeralEmail(medico.email)) return true;
  return medico.anamneseInteligenteAtivo === true;
}
