export const HERO_VARIANT = 'A' as const;

export type HeroVariant = 'A' | 'B' | 'C';

export const HERO_COPY: Record<
  HeroVariant,
  { titleLines: string[]; subtitle: string }
> = {
  A: {
    titleLines: [
      'Sua marca.',
      'Sua plataforma.',
      'Seus pacientes.',
    ],
    subtitle:
      'Conecte paciente, médico, nutricionista e personal em uma única jornada clínica, com prontuário compartilhado, protocolos integrados e acompanhamento contínuo.',
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
