'use client';

import { labPatientInitials } from '@/components/LabResultCard';

export function AvatarBubble({
  name,
  photoUrl,
  size = 40,
  className = '',
  title,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  title?: string;
}) {
  const initials = labPatientInitials(name || '?');
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 ring-2 ring-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
      title={title || name}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{ fontSize: Math.max(10, Math.round(size * 0.32)) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

/** Avatares lado a lado (De → Para), sem overlap nem overflow no cabeçalho. */
export function AvatarPair({
  fromName,
  fromPhoto,
  toName,
  toPhoto,
  size = 40,
}: {
  fromName: string;
  fromPhoto?: string | null;
  toName: string;
  toPhoto?: string | null;
  size?: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <AvatarBubble name={fromName} photoUrl={fromPhoto} size={size} title={`De: ${fromName}`} />
      <span className="text-xs font-medium text-gray-400" aria-hidden>
        →
      </span>
      <AvatarBubble name={toName} photoUrl={toPhoto} size={size} title={`Para: ${toName}`} />
    </div>
  );
}
