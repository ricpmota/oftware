/**
 * Tipos para controle de acesso OftPay (quem pode acessar quais cursos).
 * Coleção Firestore: oftpay_users.
 */

export interface OftPayUserDoc {
  /** Email do usuário (também usado como doc id normalizado) */
  email: string;
  /** UID do Firebase Auth */
  uid?: string;
  /** Nome exibido (do perfil Google) */
  displayName?: string | null;
  /** Último login no OftPay (timestamp ms ou Firestore Timestamp) */
  lastLoginAt?: number | { toMillis: () => number };
  /** User-Agent do último login (navegador/dispositivo) */
  lastLoginUserAgent?: string | null;
  /** auth_time do último login (segundos Unix). Usado para sessão única: só aceita token com auth_time >= este valor. */
  lastAuthTime?: number | null;
  /** IDs dos cursos que o usuário tem permissão para acessar. Vazio = nenhum acesso. */
  courseIds: string[];
  /** Acesso ao Banco de Questões (/oftpay/questoes). */
  questoesEnabled?: boolean;
  /** Início da vigência do acesso (timestamp ms). Opcional = sem limite. */
  accessStartAt?: number | null;
  /** Fim da vigência do acesso (timestamp ms). Opcional = sem limite. */
  accessEndAt?: number | null;
  /** Quando o registro foi atualizado pela última vez */
  updatedAt?: number | { toMillis: () => number };
}

export const OFTPAY_OWNER_EMAIL = 'ricpmota.med@gmail.com';
