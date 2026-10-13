export const WHITELABEL_PROFISSOES = ['medico', 'nutricionista', 'personal'] as const;

export type WhiteLabelProfissao = (typeof WHITELABEL_PROFISSOES)[number];

export const WHITELABEL_PROFISSAO_LABELS: Record<WhiteLabelProfissao, string> = {
  medico: 'Médico',
  nutricionista: 'Nutricionista',
  personal: 'Personal',
};

export const WHITELABEL_PROFISSAO_OPTIONS: { value: WhiteLabelProfissao; label: string }[] = [
  { value: 'medico', label: 'Médico' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'personal', label: 'Personal trainer' },
];

export function isWhiteLabelProfissao(value: unknown): value is WhiteLabelProfissao {
  return typeof value === 'string' && (WHITELABEL_PROFISSOES as readonly string[]).includes(value);
}

export function parseWhiteLabelProfissao(
  value: unknown,
  fallback: WhiteLabelProfissao = 'medico'
): WhiteLabelProfissao {
  return isWhiteLabelProfissao(value) ? value : fallback;
}

export function whiteLabelProfissaoLabel(profissao: WhiteLabelProfissao | string | null | undefined): string {
  if (isWhiteLabelProfissao(profissao)) return WHITELABEL_PROFISSAO_LABELS[profissao];
  return WHITELABEL_PROFISSAO_LABELS.medico;
}

/** Rótulo do registro profissional (CRM / CRN / CREF). */
export function whiteLabelRegistroLabel(profissao: WhiteLabelProfissao): string {
  if (profissao === 'nutricionista') return 'CRN';
  if (profissao === 'personal') return 'CREF';
  return 'CRM';
}

export function whiteLabelTratamentoOptions(profissao: WhiteLabelProfissao): string[] {
  if (profissao === 'medico') return ['Dr.', 'Dra.'];
  if (profissao === 'nutricionista') return ['Nutricionista', 'Dr.', 'Dra.'];
  return ['Personal', 'Prof.'];
}

export function whiteLabelClienteNoun(profissao: WhiteLabelProfissao): {
  singular: string;
  plural: string;
} {
  if (profissao === 'personal') return { singular: 'aluno', plural: 'alunos' };
  return { singular: 'paciente', plural: 'pacientes' };
}

export function whiteLabelExperienciaNoun(profissao: WhiteLabelProfissao): string {
  if (profissao === 'medico') return 'experiência médica';
  if (profissao === 'nutricionista') return 'experiência em nutrição';
  return 'experiência como personal';
}

export function whiteLabelCadastroPath(profissao: WhiteLabelProfissao): string {
  if (profissao === 'nutricionista') return '/whitelabel/cadastronutricionista';
  if (profissao === 'personal') return '/whitelabel/cadastropersonal';
  return '/whitelabel/cadastromedico';
}

export function whiteLabelCadastroOrigem(
  profissao: WhiteLabelProfissao
): 'whitelabel_cadastromedico' | 'whitelabel_cadastronutricionista' | 'whitelabel_cadastropersonal' {
  if (profissao === 'nutricionista') return 'whitelabel_cadastronutricionista';
  if (profissao === 'personal') return 'whitelabel_cadastropersonal';
  return 'whitelabel_cadastromedico';
}
