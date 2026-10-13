/** Chave estável do par. A ordem dos uids não importa. */
export function matchPairKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export function otherUid(users: readonly string[], uid: string): string | null {
  return users.find((item) => item !== uid) || null;
}

export type MatchRelation = 'none' | 'outgoing_pending' | 'incoming_pending' | 'connected' | 'blocked';
