'use client';

import { useEffect, useState } from 'react';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import type { PacienteCompleto } from '@/types/obesidade';

const CHUNK = 40;

function uniqueValidUserIds(userIds: string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of userIds) {
    const id = raw.trim();
    if (!isValidFirebaseAuthUid(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  ids.sort();
  return ids;
}

/**
 * Fotos de perfil já cadastradas no Firebase Auth (photoURL).
 * Uma requisição em lote para `/api/user-photo` — a mesma fonte da lista de pacientes.
 * Não grava dados e não bloqueia a renderização do Kanban.
 */
export function useLeadPatientPhotos(userIds: string[]): Record<string, string | null> {
  const key = uniqueValidUserIds(userIds).join('|');
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const ids = key ? key.split('|') : [];
    if (ids.length === 0) {
      setPhotos({});
      return;
    }

    let cancelled = false;

    (async () => {
      const merged: Record<string, string | null> = {};
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        try {
          const res = await fetch('/api/user-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: slice }),
          });
          const data = res.ok
            ? ((await res.json()) as { photos?: Record<string, string | null> })
            : null;
          for (const id of slice) {
            merged[id] = data?.photos?.[id] ?? null;
          }
        } catch {
          for (const id of slice) merged[id] = null;
        }
        if (cancelled) return;
      }
      if (!cancelled) setPhotos(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return photos;
}

/** Foto do paciente já associado a este lead. Ignora URL vazia ou que não seja http(s). */
export function leadPatientPhotoUrl(
  paciente: PacienteCompleto | null | undefined,
  photos: Record<string, string | null> | undefined
): string | null {
  const uid = paciente?.userId?.trim();
  if (!uid || !isValidFirebaseAuthUid(uid) || !photos) return null;
  const url = photos[uid];
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}
