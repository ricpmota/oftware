'use client';

import { useEffect, useState, useCallback, type CSSProperties, type ReactNode } from 'react';
import { CheckCircle2, Flag, Target, Circle } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

const TABS = [
  { id: 'meta', label: 'Controle de Meta' },
  { id: 'lab', label: 'Análise Laboratorial' },
  { id: 'jornada', label: 'Jornada' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const ROTATION_MS = 3800;

export default function PublicDoctorTechnology({ accentColor, pageBg }: Props) {
  const [active, setActive] = useState<TabId>('meta');
  const [tick, setTick] = useState(0);

  const selectTab = useCallback((id: TabId) => {
    setActive(id);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => {
        const idx = TABS.findIndex((t) => t.id === prev);
        return TABS[(idx + 1) % TABS.length]!.id;
      });
      setTick((t) => t + 1);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  return (
    <section className="drprov-rise overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="px-3 pt-4 sm:px-4 sm:pt-5">
        <h2 className="text-center text-[18px] font-bold tracking-tight text-gray-900 sm:text-[20px]">
          Tecnologia que <span style={{ color: pageBg }}>acompanha você</span>
        </h2>

        <div
          className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-gray-50 p-1"
          role="tablist"
          aria-label="Recursos da plataforma"
        >
          {TABS.map((tab) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`drprov-tech-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`drprov-tech-panel-${tab.id}`}
                onClick={() => selectTab(tab.id)}
                className={`relative rounded-lg px-1 py-2.5 text-center text-[10px] font-semibold leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-[12px] ${
                  selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ outlineColor: accentColor }}
              >
                {tab.id === 'lab' ? (
                  <>
                    <span className="sm:hidden">
                      Análise
                      <br />
                      Laboratorial
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </>
                ) : tab.id === 'meta' ? (
                  <>
                    <span className="sm:hidden">
                      Controle
                      <br />
                      de Meta
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </>
                ) : (
                  tab.label
                )}
                <span
                  className={`absolute inset-x-2 bottom-0.5 h-0.5 rounded-full transition-opacity duration-300 ${
                    selected ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ backgroundColor: accentColor }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mx-3 mb-3 mt-3 h-[210px] overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white sm:mx-4 sm:h-[220px]">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl"
          style={{ background: accentColor }}
          aria-hidden
        />

        {active === 'meta' ? (
          <PanelMeta key={`meta-${tick}`} accentColor={accentColor} pageBg={pageBg} />
        ) : null}
        {active === 'lab' ? (
          <PanelLab key={`lab-${tick}`} accentColor={accentColor} />
        ) : null}
        {active === 'jornada' ? (
          <PanelJornada key={`jornada-${tick}`} accentColor={accentColor} pageBg={pageBg} />
        ) : null}
      </div>

      <p className="pb-3 text-center text-[10px] text-gray-400 sm:text-[11px]">
        Demonstração de recursos da plataforma
      </p>
    </section>
  );
}

function PanelShell({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      id={`drprov-tech-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`drprov-tech-tab-${id}`}
      className="drprov-tech-panel absolute inset-0 flex flex-col px-3 py-3 sm:px-4"
    >
      <p className="text-[13px] font-semibold text-gray-900 sm:text-[14px]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-[12px]">{subtitle}</p>
      <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

function PanelMeta({ accentColor, pageBg }: { accentColor: string; pageBg: string }) {
  return (
    <PanelShell
      id="meta"
      title="Controle de Meta"
      subtitle="Defina objetivos e acompanhe sua evolução ao longo do tratamento."
    >
      <div className="px-1">
        <div className="relative mx-auto h-10 max-w-sm">
          <div className="absolute left-2 right-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gray-200" />
          <div
            className="drprov-tech-progress absolute left-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-white"
                style={{
                  borderColor: i <= 2 ? accentColor : '#D1D5DB',
                  backgroundColor: i < 2 ? accentColor : '#fff',
                }}
              >
                {i === 3 ? (
                  <Target className="h-2.5 w-2.5" style={{ color: accentColor }} />
                ) : null}
              </span>
            ))}
          </div>
          <div
            className="drprov-tech-marker absolute top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
            style={{ backgroundColor: pageBg, color: accentColor }}
          >
            <Flag className="h-3 w-3" />
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-sm justify-between px-0.5 text-[10px] font-medium text-gray-500">
          <span>Início</span>
          <span>Acomp.</span>
          <span>Evolução</span>
          <span className="font-semibold" style={{ color: pageBg }}>
            Meta
          </span>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelLab({ accentColor }: { accentColor: string }) {
  const rows = [
    { label: 'Metabólico', delay: '0s' },
    { label: 'Inflamatório', delay: '0.15s' },
    { label: 'Nutricional', delay: '0.3s' },
  ];

  return (
    <PanelShell
      id="lab"
      title="Análise Laboratorial"
      subtitle="Organize e acompanhe seus exames em um único ambiente."
    >
      <div className="space-y-2.5">
        {rows.map(({ label, delay }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-[72px] shrink-0 text-[10px] font-medium text-gray-600 sm:w-20 sm:text-[11px]">
              {label}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="drprov-tech-lab-dot absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: accentColor, animationDelay: delay }}
              />
            </div>
          </div>
        ))}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: accentColor }} aria-hidden />
          Visão integrada dos seus exames
        </p>
      </div>
    </PanelShell>
  );
}

function PanelJornada({ accentColor, pageBg }: { accentColor: string; pageBg: string }) {
  const steps = ['Avaliação', 'Plano', 'Acomp.', 'Evolução'];

  return (
    <PanelShell
      id="jornada"
      title="Jornada"
      subtitle="Visualize cada etapa do seu acompanhamento."
    >
      <div className="px-0.5">
        <div className="relative mx-auto max-w-sm">
          <div className="absolute left-[12%] right-[12%] top-[14px] h-[2px] rounded-full bg-gray-200" />
          <div className="relative grid grid-cols-4 gap-1">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-col items-center text-center">
                <span
                  className="drprov-tech-journey-dot relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white"
                  style={
                    {
                      borderColor: accentColor,
                      ['--drprov-dot-on' as string]: accentColor,
                      animationDelay: `${i * 0.7}s`,
                    } as CSSProperties
                  }
                >
                  <Circle className="h-2 w-2" style={{ color: pageBg }} fill="currentColor" />
                </span>
                <span className="mt-2 text-[10px] font-medium leading-tight text-gray-600 sm:text-[11px]">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
