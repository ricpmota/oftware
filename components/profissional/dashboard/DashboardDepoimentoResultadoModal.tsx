'use client';

import { Star, X } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardPatientAvatar,
  type DashboardDepoimento,
} from '@/components/metaadmin/dashboard/DashboardTestimonialCard';

type Props = {
  depoimento: DashboardDepoimento;
  isMobile: boolean;
  onClose: () => void;
};

export default function DashboardDepoimentoResultadoModal({ depoimento, isMobile, onClose }: Props) {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/50 ${
        isMobile ? 'items-stretch' : 'items-center px-4'
      }`}
    >
      <div
        className={`relative overflow-y-auto bg-white p-6 animate-modal-enter ${
          isMobile
            ? 'h-[100dvh] w-full max-w-none rounded-none pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]'
            : 'max-h-[90vh] w-full max-w-lg rounded-2xl shadow-2xl'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-3 pr-8 text-lg font-bold text-[var(--text-primary)]">Resultado do tratamento</h3>
        <div className="mb-4 flex items-start gap-3">
          <DashboardPatientAvatar
            nome={depoimento.nome}
            photoUrl={depoimento.photoUrl}
            sizeClass="h-12 w-12 text-[13px]"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{depoimento.nome}</p>
            {(depoimento.cidadeEstado || depoimento.idade != null) && (
              <p className="text-sm text-[var(--text-secondary)]">
                {[depoimento.cidadeEstado, depoimento.idade != null ? `${depoimento.idade} anos` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        {depoimento.estrelas > 0 && (
          <div className="mb-3 flex items-center gap-0.5" aria-label={`${depoimento.estrelas} de 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                className={s <= depoimento.estrelas ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}
              />
            ))}
          </div>
        )}

        {depoimento.depoimento?.trim() ? (
          <p className="mb-4 text-sm leading-relaxed text-[var(--text-primary)]">“{depoimento.depoimento}”</p>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">Peso inicial</p>
            <p className="text-lg font-semibold text-green-900">
              {depoimento.pesoInicialKg != null ? `${depoimento.pesoInicialKg.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">Peso atual</p>
            <p className="text-lg font-semibold text-green-900">
              {depoimento.pesoAtualKg != null ? `${depoimento.pesoAtualKg.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">Perda total (kg)</p>
            <p className="text-lg font-semibold text-green-900">
              {depoimento.perdaTotalKg != null ? `-${depoimento.perdaTotalKg.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">Perda percentual</p>
            <p className="text-lg font-semibold text-green-900">
              {depoimento.perdaPercentual != null ? `-${depoimento.perdaPercentual.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>

        {depoimento.evolucao.length > 0 && (
          <DepoimentoEvolucaoChart depoimento={depoimento} isMobile={isMobile} />
        )}
      </div>
    </div>
  );
}

function DepoimentoEvolucaoChart({
  depoimento,
  isMobile,
}: {
  depoimento: DashboardDepoimento;
  isMobile: boolean;
}) {
  const maxDose = depoimento.evolucao.reduce((m, p) => Math.max(m, p.doseMg || 0), 0);
  const maxDoseAxis = maxDose > 0 ? Math.min(30, maxDose * 2) : 15;
  const doseTicks = [2.5, 5, 7.5, 10, 12.5, 15].filter((v) => v <= maxDoseAxis);
  const chartData = depoimento.evolucao.map((p) => ({
    semana: `S${p.weekIndex}`,
    peso: p.peso ?? null,
    dose: p.doseMg ?? 0,
  }));
  const totalDose = depoimento.evolucao.reduce((s, p) => s + (p.doseMg || 0), 0);
  const patternId = `dosePat_${String(depoimento.pacienteId || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const modalDosePink = '#ec4899';

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Evolução do tratamento</h4>
      <div className={`w-full ${isMobile ? 'h-72 min-h-[18rem]' : 'h-56 min-h-[14rem]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width={10} height={10}>
                <rect width="10" height="10" fill="rgba(236,72,153,0.14)" />
                <path
                  d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8"
                  stroke={modalDosePink}
                  strokeWidth={1.2}
                  strokeOpacity={0.85}
                />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis yAxisId="peso" tick={{ fontSize: 11, fill: '#6b7280' }} unit=" kg" />
            <YAxis
              yAxisId="dose"
              orientation="right"
              tick={{ fontSize: 11, fill: modalDosePink }}
              unit=" mg"
              domain={[0, maxDoseAxis]}
              ticks={doseTicks}
            />
            <Tooltip
              formatter={(val: number, key: string) => {
                if (key === 'peso') return [`${val != null ? val.toFixed(1) : '—'} kg`, 'Peso'];
                if (key === 'dose') return [`${Number(val).toFixed(1)} mg`, 'Dose aplicada'];
                return [val, key];
              }}
              labelFormatter={(l) => `Semana ${l}`}
            />
            <Bar
              yAxisId="dose"
              dataKey="dose"
              name="Dose aplicada"
              fill={`url(#${patternId})`}
              stroke={modalDosePink}
              strokeWidth={1}
              barSize={Math.min(28, Math.max(10, 320 / chartData.length))}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="peso"
              type="monotone"
              dataKey="peso"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {totalDose > 0 && (
        <div className="flex justify-center pb-1 pt-3">
          <div className="rounded-full bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow">
            {totalDose.toFixed(1)} mg (total)
          </div>
        </div>
      )}
    </div>
  );
}
