'use client';

import { useEffect, useState } from 'react';
import { labPatientInitials } from '@/components/LabResultCard';
import {
  normalizeAuthPhotoUrl,
  resolvePacienteAuthUidForPhoto,
} from '@/lib/firebase/resolvePacienteAuthUidForPhoto';

export function calendarioPacienteAuthPhotoUrl(
  paciente: { userId?: string | null; id?: string | null } | null | undefined,
  photosByUid: Record<string, string | null>
): string | null {
  const uid = paciente ? resolvePacienteAuthUidForPhoto(paciente) : null;
  if (!uid || !Object.prototype.hasOwnProperty.call(photosByUid, uid)) return null;
  return photosByUid[uid];
}

export default function CalendarioPacienteAuthAvatar({
  name,
  photoUrl,
  compact,
  title,
  dimensionClass,
}: {
  name: string;
  photoUrl?: string | null;
  compact?: boolean;
  title?: string;
  /** Sobrescreve o tamanho padrão sem alterar quem já usa `compact`. */
  dimensionClass?: string;
}) {
  const src = normalizeAuthPhotoUrl(photoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const dim = dimensionClass ?? (compact ? 'h-[30px] w-[30px] text-[10px]' : 'h-[53px] w-[53px] text-[15px]');
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        title={title}
        className={`${dim} shrink-0 rounded-full object-cover object-center ring-2 ring-white/85 shadow-sm`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-semibold bg-white/85 text-[#0A1F44] ring-1 ring-white/70`}
      title={title}
      aria-hidden
    >
      {labPatientInitials(name)}
    </div>
  );
}
