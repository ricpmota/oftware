import { Check } from 'lucide-react';

/** Selo azul com check branco no canto do avatar (estilo Instagram). */
export function SeloVerificadoInstagram({
  ringClassName = 'ring-[#0A1F44]',
}: {
  ringClassName?: string;
}) {
  return (
    <span
      className={`-right-0.5 -bottom-0.5 pointer-events-none absolute z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#0095F6] text-white shadow-md ring-[3px] ${ringClassName}`}
      title="Verificado"
      aria-label="Perfil verificado"
    >
      <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden />
    </span>
  );
}
