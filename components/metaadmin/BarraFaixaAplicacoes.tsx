import type { SegmentoFaixaAplicacao } from '@/utils/tirzepatidaProtocoloDisplay';

const CORES_PADRAO: Record<SegmentoFaixaAplicacao['estado'], string> = {
  aplicada: 'bg-green-500',
  pulada: 'bg-red-500',
  pendente: 'bg-orange-200',
};

const CORES_SOBRE_ESCURO: Record<SegmentoFaixaAplicacao['estado'], string> = {
  aplicada: 'bg-[#4CCB7A]',
  pulada: 'bg-red-400',
  pendente: 'bg-orange-200',
};

/** Barra na ordem das semanas: verde = registrada, vermelho = passou sem registro, laranja = ainda à frente. */
export function BarraFaixaAplicacoes({
  segmentos,
  className = 'h-2',
  trackClassName = 'bg-gray-200',
  sobreEscuro = false,
}: {
  segmentos: SegmentoFaixaAplicacao[];
  className?: string;
  trackClassName?: string;
  sobreEscuro?: boolean;
}) {
  const total = segmentos.reduce((soma, seg) => soma + seg.quantidade, 0);
  if (total <= 0) return null;
  const cores = sobreEscuro ? CORES_SOBRE_ESCURO : CORES_PADRAO;
  return (
    <div className={`flex w-full overflow-hidden rounded-full ${trackClassName} ${className}`}>
      {segmentos.map((seg, index) => (
        <div
          key={`${seg.estado}-${index}`}
          className={cores[seg.estado]}
          style={{ width: `${(seg.quantidade / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
