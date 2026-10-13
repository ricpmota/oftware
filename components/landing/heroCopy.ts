export const HERO_VARIANT = 'A' as const;

export type HeroVariant = 'A' | 'B' | 'C';

export const HERO_COPY: Record<
  HeroVariant,
  { titleLines: string[]; subtitle: string }
> = {
  A: {
    titleLines: [
      'Construa sua própria estrutura',
      'digital de acompanhamento em saúde.',
    ],
    subtitle:
      'A Oftware permite que médicos, nutricionistas, personal trainers, clínicas e equipes multiprofissionais organizem pacientes, parceiros e acompanhamento contínuo com sua própria marca.',
  },
  B: {
    titleLines: [
      'Construa um consultório',
      'que continua trabalhando',
      'mesmo quando você está fora dele.',
    ],
    subtitle:
      'A infraestrutura White Label para médicos, clínicas e mentorias criarem sua própria operação de acompanhamento multidisciplinar.',
  },
  C: {
    titleLines: [
      'A primeira plataforma White Label',
      'para coordenação multidisciplinar',
      'em saúde.',
    ],
    subtitle:
      'Paciente, médico, nutricionista e personal trabalhando sobre a mesma jornada clínica.',
  },
};
