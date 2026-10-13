'use client';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioDifferential({ accentColor, pageBg }: Props) {
  return (
    <section
      className="drprov-rise relative overflow-hidden rounded-2xl px-4 py-8 text-center sm:px-8 sm:py-10"
      style={{ backgroundColor: pageBg }}
    >
      <div
        className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: accentColor }}
        aria-hidden
      />
      <p
        className="relative text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: accentColor }}
      >
        Diferencial
      </p>
      <h2 className="relative mx-auto mt-2.5 max-w-2xl text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[26px]">
        O tratamento acontece entre as consultas.
      </h2>
      <p className="relative mx-auto mt-2.5 max-w-lg text-[13px] leading-relaxed text-white/65 sm:text-[14px]">
        A plataforma mantém médico, equipe e paciente conectados durante toda a jornada.
      </p>
    </section>
  );
}
