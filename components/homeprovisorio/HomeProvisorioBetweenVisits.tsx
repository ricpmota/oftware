'use client';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioBetweenVisits({ accentColor, pageBg }: Props) {
  return (
    <section
      className="homeprov-bleed relative overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: pageBg }}
    >
      <div
        className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: accentColor }}
        aria-hidden
      />
      <div className="homeprov-inner relative max-w-3xl text-center md:mx-auto md:text-left">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          O ponto central
        </p>
        <h2 className="homeprov-display mt-4 text-[2.15rem] font-medium leading-[1.1] text-white sm:text-[2.85rem] md:text-[3.25rem]">
          O tratamento acontece entre as consultas.
        </h2>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/70 sm:text-[17px]">
          É ali que a adesão se constrói, que as dúvidas aparecem e que a equipe precisa estar
          alinhada. O Método Emagrecer foi feito para esse intervalo — com tecnologia a serviço da
          continuidade, não do espetáculo.
        </p>
      </div>
    </section>
  );
}
