'use client';

type Props = {
  className?: string;
  priority?: boolean;
};

/** Logo padrão Oftware nos wizards de cadastro (metaadmin, metanutri, metapersonal). */
export default function OftwarePlatformChatLogo({ className = '', priority }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/oftware1.jpg"
      alt="Oftware"
      className={`h-10 sm:h-12 w-auto max-w-[85vw] sm:max-w-[280px] object-contain object-left ${className}`}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
