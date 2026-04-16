import type { ReactNode } from 'react';

/**
 * Renderiza trechos `**negrito**` ou `**rótulo:**` como <strong>.
 * Permite um único `*` dentro do bloco (evita parar no meio de `**a * b**`).
 */
export function renderInlineBold(
  text: string,
  options?: { strongClassName?: string }
): ReactNode {
  if (!text || typeof text !== 'string') return text;

  const normalized = text
    .replace(/\\\*/g, '*')
    .replace(/\uFF0A/g, '*')
    .replace(/\u2217/g, '*');

  const strongClass = options?.strongClassName ?? 'font-semibold';
  const parts: ReactNode[] = [];
  /** Entre `**` e `**`: qualquer caractere que não inicie um segundo `*`. */
  const re = /\*\*((?:[^*]|\*(?!\*))+?)\*\*/g;
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalized)) !== null) {
    const boldContent = m[1].trim();
    if (m.index > lastIndex) {
      parts.push(<span key={key++}>{normalized.slice(lastIndex, m.index)}</span>);
    }
    parts.push(
      <strong key={key++} className={strongClass}>
        {boldContent}
      </strong>
    );
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < normalized.length) {
    parts.push(<span key={key++}>{normalized.slice(lastIndex)}</span>);
  }

  return parts.length === 0 ? text : <>{parts}</>;
}
