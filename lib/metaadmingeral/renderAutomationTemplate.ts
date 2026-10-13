/**
 * Substitui variáveis `{chave}` no corpo do template.
 * Uso previsto pelo Centro de Automações — ainda não integrado aos envios reais.
 */
export function renderAutomationTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  let rendered = body;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{${key}}`, value);
  }
  return rendered;
}

/** Extrai nomes de variáveis `{chave}` usadas no corpo. */
export function extractTemplateVariableNames(body: string): string[] {
  const names: string[] = [];
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    names.push(match[1]);
  }
  return [...new Set(names)];
}

/** Retorna mensagem de erro ou null se todas as variáveis são permitidas. */
export function findDisallowedTemplateVariable(
  body: string,
  allowedVariables: string[],
): string | null {
  const allowed = new Set(allowedVariables);
  for (const name of extractTemplateVariableNames(body)) {
    if (!allowed.has(name)) {
      return `Variável não permitida: {${name}}`;
    }
  }
  return null;
}
