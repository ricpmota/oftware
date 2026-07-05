import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

type Props = {
  whiteLabel: MedicoWhiteLabelResolved;
  className?: string;
};

export default function PublicWhiteLabelTopBrand({ whiteLabel, className = '' }: Props) {
  const { brandName, profilePhotoUrl, primaryColor } = whiteLabel;
  const photoSrc = profilePhotoUrl?.trim() || null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10"
        />
      ) : (
        <div
          className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm"
          style={{ backgroundColor: primaryColor }}
          aria-hidden
        >
          {brandName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p
          className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate"
          style={{ color: undefined }}
        >
          {brandName}
        </p>
      </div>
    </div>
  );
}
