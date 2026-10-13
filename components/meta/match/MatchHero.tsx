import Image from 'next/image';

export function MatchHero({ className = 'object-cover object-center' }: { className?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A1F44]">
      <Image
        src="/matchsaudavel2.png"
        alt="Grupo de pessoas caminhando e pedalando juntas ao ar livre"
        fill
        priority
        sizes="(max-width: 480px) 100vw, 480px"
        draggable={false}
        className={className}
      />
    </div>
  );
}
