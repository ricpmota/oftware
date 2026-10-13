'use client';

import { type ReactNode } from 'react';
import {
  Stethoscope,
  UtensilsCrossed,
  Dumbbell,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { SeloVerificadoInstagram } from './seloVerificado';

type ProfissionalSecundario = {
  nome: string;
  registroNumero?: string;
  isVerificado?: boolean;
  fotoUrl?: string | null;
  tipo: 'nutricionista' | 'personal';
};

type Props = {
  nomeCompleto: string;
  medicoAvatarUrl: string | null;
  accentColor: string;
  pageBg: string;
  pageText: string;
  crmEstado?: string;
  crmNumero?: string;
  isVerificado?: boolean;
  logoUrl?: string | null;
  /** Texto sobre o destaque fora do Método. Ausente mantém o navy atual. */
  accentTextColor?: string;
  profissionalSecundario?: ProfissionalSecundario | null;
};

function AvatarCircle({
  src,
  alt,
  accentColor,
  sizeClass,
  fallback,
  verified,
  ringPx = 3,
}: {
  src?: string | null;
  alt: string;
  accentColor: string;
  sizeClass: string;
  fallback: ReactNode;
  verified?: boolean;
  ringPx?: number;
}) {
  return (
    <div className={`relative shrink-0 aspect-square ${sizeClass}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full border-[3px] border-white/90 object-cover shadow-lg"
          style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 ${ringPx}px ${accentColor}50` }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white/90 shadow-lg"
          style={{
            background: `linear-gradient(145deg, ${accentColor}, #2F8FA3)`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.28), 0 0 0 ${ringPx}px ${accentColor}50`,
          }}
        >
          {fallback}
        </div>
      )}
      {verified ? <SeloVerificadoInstagram ringClassName="ring-transparent" /> : null}
    </div>
  );
}

export default function PublicDoctorHero({
  nomeCompleto,
  medicoAvatarUrl,
  accentColor,
  pageBg,
  pageText,
  crmEstado,
  crmNumero,
  isVerificado,
  logoUrl,
  accentTextColor,
  profissionalSecundario,
}: Props) {
  const accentBadgeStyle = accentTextColor
    ? { backgroundColor: accentColor, color: accentTextColor }
    : { backgroundColor: accentColor };
  const crmLabel =
    crmEstado && crmNumero ? `CRM-${crmEstado} ${crmNumero}` : null;

  return (
    <section
      className="drprov-hero relative isolate overflow-hidden px-3 py-5 sm:px-4 sm:py-6"
      style={{
        background: `linear-gradient(165deg, ${pageBg} 0%, ${pageBg}f2 60%, ${pageBg}e6 100%)`,
        color: pageText,
      }}
    >
      <div className="drprov-hero-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
      <div
        className="drprov-hero-glow pointer-events-none absolute -left-6 top-10 h-52 w-52 rounded-full opacity-[0.22] blur-3xl"
        style={{ background: accentColor }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background: `radial-gradient(ellipse 65% 50% at 16% 52%, ${accentColor}, transparent 70%)`,
        }}
        aria-hidden
      />
      <div className="drprov-scanline pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />

      <div className="relative z-[1] mx-auto max-w-xl">
        <div className="drprov-rise mb-4 flex w-full items-center justify-between gap-3" style={{ animationDelay: '40ms' }}>
          <div className="min-h-[24px] min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-6 w-auto max-w-[130px] object-contain opacity-95 sm:h-7 sm:max-w-[150px]"
              />
            ) : (
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] opacity-65">
                Acompanhamento
              </span>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium opacity-80">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Ambiente seguro
          </span>
        </div>

        <div
          className="drprov-rise grid items-start gap-4 sm:gap-5"
          style={{ gridTemplateColumns: 'auto minmax(0, 1fr)', animationDelay: '120ms' }}
        >
          <div className="flex w-[140px] max-w-[40vw] shrink-0 flex-col items-center sm:w-[150px]">
            <div className="drprov-avatar-pulse">
              <AvatarCircle
                src={medicoAvatarUrl}
                alt={nomeCompleto}
                accentColor={accentColor}
                sizeClass="h-[130px] w-[130px] sm:h-[148px] sm:w-[148px]"
                verified={isVerificado}
                fallback={<Stethoscope className="h-12 w-12 text-white sm:h-14 sm:w-14" strokeWidth={1.75} />}
              />
            </div>

            {profissionalSecundario ? (
              <div className="-mt-4 flex justify-center">
                <AvatarCircle
                  src={profissionalSecundario.fotoUrl}
                  alt={profissionalSecundario.nome}
                  accentColor={accentColor}
                  sizeClass="h-[68px] w-[68px] sm:h-[74px] sm:w-[74px]"
                  ringPx={2}
                  verified={profissionalSecundario.isVerificado}
                  fallback={
                    profissionalSecundario.tipo === 'nutricionista' ? (
                      <UtensilsCrossed className="h-6 w-6 text-white" strokeWidth={1.75} />
                    ) : (
                      <Dumbbell className="h-6 w-6 text-white" strokeWidth={1.75} />
                    )
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="min-w-0 pt-1">
            <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-tight sm:text-[30px]">
              {nomeCompleto}
            </h1>

            <span
              className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]"
              style={accentBadgeStyle}
            >
              Médico
            </span>

            {crmLabel ? (
              <p className="mt-2.5 text-[15px] font-medium opacity-85 sm:text-[16px]">{crmLabel}</p>
            ) : null}

            {isVerificado ? (
              <div className="mt-3 flex items-start gap-2 border-t border-white/15 pt-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: pageBg, color: accentColor }}
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight sm:text-[14px]">
                    Perfil verificado
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug opacity-65 sm:text-[12px]">
                    CRM ativo e verificado pela plataforma
                  </p>
                </div>
              </div>
            ) : null}

            {profissionalSecundario ? (
              <div className={`${isVerificado ? 'mt-3' : 'mt-3 border-t border-white/15 pt-3'}`}>
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A1F44]"
                    style={accentBadgeStyle}
                  >
                    {profissionalSecundario.tipo === 'nutricionista' ? 'Nutricionista' : 'Personal'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug sm:text-[14px]">
                      {profissionalSecundario.nome}
                    </p>
                    {profissionalSecundario.registroNumero ? (
                      <p className="mt-0.5 text-[11px] opacity-70">
                        {profissionalSecundario.tipo === 'nutricionista' ? 'CRN' : 'CREF'}{' '}
                        {profissionalSecundario.registroNumero}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
