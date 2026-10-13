'use client';

type Props = {
  accentColor: string;
  pageBg?: string;
};

const MOMENTS = [
  {
    when: 'Na rotina',
    title: 'O plano precisa caber no seu dia.',
    text: 'Alimentação, treino e orientações deixam de ser ideias soltas e passam a fazer parte de uma sequência clara.',
  },
  {
    when: 'Entre consultas',
    title: 'Alguém continua olhando com você.',
    text: 'Dúvidas, ajustes e sinais do caminho não ficam esperando a próxima agenda — a equipe permanece no mesmo fio.',
  },
  {
    when: 'Na evolução',
    title: 'Decisões com contexto, não por impulso.',
    text: 'Médico, nutrição, psiquiatria e treino enxergam a mesma jornada quando integrados. Você não precisa repetir a história a cada profissional.',
  },
] as const;

export default function HomeProvisorioPatientContinuity({ accentColor }: Props) {
  return (
    <section id="metodo" className="homeprov-bleed bg-[var(--homeprov-paper)] py-16 md:py-24">
      <div className="homeprov-inner">
        <div className="max-w-2xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            Experiência do paciente
          </p>
          <h2 className="homeprov-display mt-3 text-[2rem] font-medium leading-[1.12] text-[var(--homeprov-ink)] sm:text-[2.5rem]">
            Continuidade é o que transforma acompanhamento em cuidado de verdade.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--homeprov-muted)] sm:text-[16px]">
            Não é um checklist de app. É a sensação de não estar sozinho entre uma consulta e outra —
            com método, presença e direção.
          </p>
        </div>

        <ol className="mt-12 space-y-0 border-t border-[var(--homeprov-navy)]/10">
          {MOMENTS.map((m, i) => (
            <li
              key={m.when}
              className="grid gap-3 border-b border-[var(--homeprov-navy)]/10 py-7 md:grid-cols-[140px_1fr] md:gap-10 md:py-9"
            >
              <div className="flex items-baseline gap-2 md:block">
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  0{i + 1}
                </span>
                <span className="text-[13px] font-medium uppercase tracking-wide text-[var(--homeprov-muted)] md:mt-2 md:block">
                  {m.when}
                </span>
              </div>
              <div>
                <h3 className="homeprov-display text-[1.35rem] font-medium leading-snug text-[var(--homeprov-ink)] sm:text-[1.5rem]">
                  {m.title}
                </h3>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--homeprov-muted)]">
                  {m.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[13px] text-[var(--homeprov-muted)]">
          Ambiente digital do Método Emagrecer — para a jornada ficar organizada, não para substituir
          o cuidado humano.
        </p>
      </div>
    </section>
  );
}
