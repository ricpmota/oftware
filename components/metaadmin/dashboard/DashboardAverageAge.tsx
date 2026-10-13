'use client';

import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';

type Props = {
  idadeMedia: number;
  totalComNascimento: number;
};

export default function DashboardAverageAge({ idadeMedia, totalComNascimento }: Props) {
  const hasData = totalComNascimento > 0 && idadeMedia > 0;
  const idadeLabel = hasData
    ? idadeMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '—';

  return (
    <div className="relative rounded-[18px] bg-blue-50 p-4 sm:min-w-[200px] sm:p-5">
      <div className="flex items-start gap-3">
        <MetodoEmagrecerIcon
          icon="paciente"
          size={40}
          className="sm:absolute sm:right-5 sm:top-5"
        />
        <div className="min-w-0 sm:pr-12">
          <p className="text-[13px] font-semibold text-[var(--text-secondary)]">Idade média</p>
          {hasData ? (
            <p className="mt-1 flex items-baseline gap-1.5 leading-none">
              <span className="text-[36px] font-extrabold tabular-nums text-[var(--text-primary)] sm:text-[40px]">
                {idadeLabel}
              </span>
              <span className="text-[16px] font-semibold text-[var(--text-secondary)] sm:text-[18px]">anos</span>
            </p>
          ) : (
            <p className="mt-1 text-[36px] font-extrabold leading-none text-[var(--text-primary)] sm:text-[40px]">—</p>
          )}
          <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
            {hasData
              ? `${totalComNascimento} paciente${totalComNascimento !== 1 ? 's' : ''} com data de nascimento`
              : 'Sem dados de nascimento suficientes'}
          </p>
        </div>
      </div>
    </div>
  );
}
