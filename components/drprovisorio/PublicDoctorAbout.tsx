'use client';

import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import type { Medico } from '@/types/medico';
import { getMedicoGoogleMapsHref } from '@/lib/meta/medicoLocalizacao';

type Props = {
  medico: Medico;
  nomeCompleto: string;
  accentColor: string;
  pageBg: string;
  aberto: boolean;
  onToggle: () => void;
};

export default function PublicDoctorAbout({
  medico,
  nomeCompleto,
  accentColor,
  pageBg,
  aberto,
  onToggle,
}: Props) {
  const mapsHref = getMedicoGoogleMapsHref(medico.localizacao);
  const crmValue =
    medico.crm?.estado && medico.crm?.numero
      ? `${medico.crm.numero}-${medico.crm.estado}`
      : '—';

  const cols = [
    {
      icon: GraduationCap,
      label: 'Formação',
      value: 'Medicina',
    },
    {
      icon: BadgeCheck,
      label: 'CRM',
      value: crmValue,
    },
    {
      icon: ShieldCheck,
      label: 'Registro',
      value: medico.isVerificado ? 'Ativo' : '—',
    },
  ] as const;

  return (
    <section className="drprov-rise rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-center text-[18px] font-bold tracking-tight text-gray-900 sm:text-[20px]">
        Sobre {nomeCompleto}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-gray-600">
        Profissional com registro ativo e perfil verificado na plataforma para acompanhamento
        individualizado.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {cols.map(({ icon: Icon, label, value }, index) => (
          <div
            key={label}
            className="drprov-rise flex flex-col items-center rounded-xl bg-gray-50/90 px-1.5 py-3 text-center"
            style={{ animationDelay: `${220 + index * 80}ms` }}
          >
            <span
              className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: pageBg, color: accentColor }}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:text-[11px]">
              {label}
            </p>
            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-gray-900 sm:text-[13px]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold transition-opacity hover:opacity-80"
          style={{ color: accentColor }}
          aria-expanded={aberto}
        >
          {aberto ? 'Ocultar informações' : 'Ver mais informações'}
          {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {aberto ? (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 text-left animate-fade-in">
          {(medico.localizacao?.endereco || medico.localizacao?.nomeLocal) && (
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: pageBg, color: accentColor }}
              >
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Endereço</p>
                {medico.localizacao.nomeLocal ? (
                  <p className="text-[14px] font-medium text-gray-800">{medico.localizacao.nomeLocal}</p>
                ) : null}
                {medico.localizacao.endereco ? (
                  <p className="text-[13px] text-gray-600">
                    {medico.localizacao.endereco}
                    {medico.localizacao.numero?.trim()
                      ? `, nº ${medico.localizacao.numero.trim()}`
                      : ''}
                  </p>
                ) : null}
                {medico.localizacao.pontoReferencia ? (
                  <p className="mt-1 text-[12px] text-gray-500">
                    Ref.: {medico.localizacao.pontoReferencia}
                  </p>
                ) : null}
                {mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-[13px] font-medium"
                    style={{ color: accentColor }}
                  >
                    Ver no Google Maps →
                  </a>
                ) : null}
              </div>
            </div>
          )}

          {medico.telefone ? (
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: pageBg, color: accentColor }}
              >
                <Phone className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Telefone</p>
                <p className="text-[14px] text-gray-700">{medico.telefone}</p>
              </div>
            </div>
          ) : null}

          {medico.email ? (
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: pageBg, color: accentColor }}
              >
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">E-mail</p>
                <p className="break-all text-[14px] text-gray-700">{medico.email}</p>
              </div>
            </div>
          ) : null}

          {medico.cidades && medico.cidades.length > 0 ? (
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: pageBg, color: accentColor }}
              >
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Cidades de atendimento</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {medico.cidades.map((cidade, index) => (
                    <span
                      key={`${cidade.cidade}-${cidade.estado}-${index}`}
                      className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                      style={{
                        backgroundColor: `${pageBg}14`,
                        color: pageBg,
                        border: `1px solid ${pageBg}33`,
                      }}
                    >
                      {cidade.cidade}, {cidade.estado}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
