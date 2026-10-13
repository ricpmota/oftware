'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

type Props = {
  photoUrl?: string | null;
  className?: string;
};

/** Avatar circular. Usa a foto do paciente quando a URL carrega; caso contrário, o ícone genérico. */
export default function LeadPatientAvatar({ photoUrl, className }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  const showPhoto = Boolean(photoUrl) && !failed;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300 ${className ?? 'h-8 w-8'}`}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className="pointer-events-none h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <User className="h-4 w-4" aria-hidden />
      )}
    </div>
  );
}
