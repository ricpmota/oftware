'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolvePacienteAuthUidForPhoto } from '@/lib/firebase/resolvePacienteAuthUidForPhoto';
import type { PacienteCompleto } from '@/types/obesidade';

const photoByUidCache: Record<string, string | null> = {};

export function usePacienteAuthPhotos(pacientes: PacienteCompleto[] | undefined): Record<string, string | null> {
  const [photosByPacienteId, setPhotosByPacienteId] = useState<Record<string, string | null>>({});
  const list = pacientes ?? [];
  const listKey = useMemo(() => list.map((p) => p.id).join('|'), [list]);

  useEffect(() => {
    if (list.length === 0) return;

    const missingUids = Array.from(
      new Set(
        list
          .map((p) => resolvePacienteAuthUidForPhoto(p))
          .filter((uid): uid is string => Boolean(uid))
          .filter((uid) => !Object.prototype.hasOwnProperty.call(photoByUidCache, uid))
      )
    );

    let cancelled = false;

    const applyFromCache = () => {
      const next: Record<string, string | null> = {};
      for (const p of list) {
        const uid = resolvePacienteAuthUidForPhoto(p);
        next[p.id] = uid && Object.prototype.hasOwnProperty.call(photoByUidCache, uid)
          ? photoByUidCache[uid]
          : null;
      }
      setPhotosByPacienteId(next);
    };

    if (missingUids.length === 0) {
      applyFromCache();
      return;
    }

    void (async () => {
      try {
        const res = await fetch('/api/user-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: missingUids }),
        });
        const data = res.ok ? ((await res.json()) as { photos?: Record<string, string | null> }) : null;
        for (const uid of missingUids) {
          photoByUidCache[uid] = data?.photos?.[uid] ?? null;
        }
      } catch {
        for (const uid of missingUids) {
          if (!Object.prototype.hasOwnProperty.call(photoByUidCache, uid)) {
            photoByUidCache[uid] = null;
          }
        }
      }
      if (cancelled) return;
      applyFromCache();
    })();

    return () => {
      cancelled = true;
    };
    // list é derivado de listKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  return photosByPacienteId;
}
