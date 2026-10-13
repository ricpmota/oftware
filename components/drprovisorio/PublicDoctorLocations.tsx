'use client';

import { ChevronRight, MapPin, Video } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
  cidadeEstado?: string | null;
  nomeLocal?: string | null;
};

export default function PublicDoctorLocations({
  accentColor,
  pageBg,
  cidadeEstado,
  nomeLocal,
}: Props) {
  return (
    <section className="drprov-rise">
      <h2 className="mb-3 text-center text-[18px] font-bold tracking-tight text-gray-900 sm:text-[20px]">
        Onde e como atendemos
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {(cidadeEstado || nomeLocal) ? (
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: pageBg, color: accentColor }}
            >
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-gray-900">Presencial</p>
              {cidadeEstado ? (
                <p className="mt-0.5 text-[13px] text-gray-600">{cidadeEstado}</p>
              ) : null}
              {nomeLocal ? (
                <p className="mt-0.5 text-[12px] text-gray-500">{nomeLocal}</p>
              ) : null}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" aria-hidden />
          </div>
        ) : null}

        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: pageBg, color: accentColor }}
          >
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-gray-900">Online</p>
            <p className="mt-0.5 text-[13px] text-gray-600">Atendimento por videochamada</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" aria-hidden />
        </div>
      </div>
    </section>
  );
}
