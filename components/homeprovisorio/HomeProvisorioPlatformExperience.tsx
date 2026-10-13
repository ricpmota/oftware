'use client';

import { useState, type CSSProperties } from 'react';
import { Stethoscope, UtensilsCrossed, Dumbbell, Users, Inbox, ClipboardList } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

type TabId = 'paciente' | 'medico';

export default function HomeProvisorioPlatformExperience({ accentColor, pageBg }: Props) {
  const [tab, setTab] = useState<TabId>('paciente');

  return (
    <section className="drprov-rise">
      <div className="text-center">
        <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[24px]">
          Uma plataforma. Duas experiências.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-gray-500 sm:text-[14px]">
          O mesmo ecossistema, com o ambiente certo para cada perfil.
        </p>
      </div>

      <div
        className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label="Experiências da plataforma"
      >
        {(
          [
            { id: 'paciente' as const, label: 'Paciente' },
            { id: 'medico' as const, label: 'Médico' },
          ] as const
        ).map(({ id, label }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={`rounded-lg py-2.5 text-[13px] font-semibold transition-colors ${
                selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto mt-5 min-h-[340px] max-w-sm sm:min-h-[360px]">
        {tab === 'paciente' ? (
          <div key="paciente" className="homeprov-tab-panel">
            <PatientMock accentColor={accentColor} pageBg={pageBg} />
          </div>
        ) : (
          <div key="medico" className="homeprov-tab-panel">
            <DoctorMock accentColor={accentColor} pageBg={pageBg} />
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-400">Demonstração da plataforma</p>
    </section>
  );
}

function PatientMock({ accentColor, pageBg }: { accentColor: string; pageBg: string }) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[1.6rem] border-[5px] border-[#0A1F44] bg-white shadow-lg">
      <div className="flex justify-center bg-[#0A1F44] py-1.5">
        <span className="h-1 w-14 rounded-full bg-white/25" aria-hidden />
      </div>
      <div className="space-y-2.5 bg-[#F7F8FA] px-3 py-3.5">
        <div>
          <p className="text-[11px] text-gray-500">Olá, Antônio</p>
          <p className="text-[14px] font-bold text-gray-900">Seu acompanhamento</p>
        </div>

        <div
          className="homeprov-soft-in rounded-xl border border-gray-100 bg-white p-2.5"
          style={{ animationDelay: '60ms', boxShadow: `inset 3px 0 0 ${accentColor}` }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
            Próxima etapa
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-gray-900">Reavaliação</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Meta</p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: `${accentColor}22`, color: pageBg }}
            >
              Em acompanhamento
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="homeprov-bar-fill h-full rounded-full"
              style={{ backgroundColor: accentColor, ['--bar-w' as string]: '58%' } as CSSProperties}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-2.5">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Equipe</p>
          <div className="flex gap-1.5">
            {[
              { icon: Stethoscope, label: 'Médico', delay: '80ms' },
              { icon: UtensilsCrossed, label: 'Nutrição', delay: '160ms' },
              { icon: Dumbbell, label: 'Treino', delay: '240ms' },
            ].map(({ icon: Icon, label, delay }) => (
              <div
                key={label}
                className="homeprov-soft-in flex flex-1 flex-col items-center gap-0.5 rounded-lg bg-gray-50 py-1.5"
                style={{ animationDelay: delay }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} aria-hidden />
                <span className="text-[8px] font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorMock({ accentColor, pageBg }: { accentColor: string; pageBg: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: pageBg }}
      >
        <div>
          <p className="text-[13px] font-bold text-white">Painel do médico</p>
          <p className="text-[11px]" style={{ color: accentColor }}>
            Acompanhamentos ativos
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/60">
          Demo
        </span>
      </div>
      <div className="space-y-2 p-3">
        {[
          { icon: Users, title: 'Pacientes', desc: 'Organizados' },
          { icon: Inbox, title: 'Solicitações', desc: 'Centralizadas' },
          { icon: ClipboardList, title: 'Pendências', desc: 'Monitoradas' },
        ].map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="homeprov-soft-in flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: pageBg, color: accentColor }}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">{title}</p>
              <p className="text-[11px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
