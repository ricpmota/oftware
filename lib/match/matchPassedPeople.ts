const storageKey = (uid: string) => `match-passed:${uid}`;

export function readPassedUids(uid: string): string[] {
  if (typeof window === 'undefined' || !uid) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function rememberPassedUid(uid: string, otherUid: string): void {
  if (!uid || !otherUid || uid === otherUid) return;
  const current = readPassedUids(uid);
  if (current.includes(otherUid)) return;
  window.localStorage.setItem(storageKey(uid), JSON.stringify([...current, otherUid]));
}

export function forgetPassedUid(uid: string, otherUid: string): void {
  if (!uid || !otherUid) return;
  const next = readPassedUids(uid).filter((item) => item !== otherUid);
  window.localStorage.setItem(storageKey(uid), JSON.stringify(next));
}
