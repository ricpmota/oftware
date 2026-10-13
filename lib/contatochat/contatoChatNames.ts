export function contatoChatFirstName(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean)[0] || '';
}

function reliableGender(genero?: string | null): 'M' | 'F' | null {
  const g = (genero || '').trim().toUpperCase();
  if (g === 'F' || g === 'FEMALE') return 'F';
  if (g === 'M' || g === 'MALE') return 'M';
  return null;
}

/** Nome visível na página. Não inventa Dr./Dra. se o gênero não estiver no cadastro. */
export function contatoChatDisplayName(nome: string, genero?: string | null): string {
  const n = nome.trim();
  if (!n) return 'Equipe de acompanhamento';
  const gender = reliableGender(genero);
  if (gender === 'F') return `Dra. ${n}`;
  if (gender === 'M') return `Dr. ${n}`;
  return n;
}

/** Nome do contato salvo na agenda. */
export function contatoChatContactName(nome: string, genero?: string | null): string {
  const first = contatoChatFirstName(nome);
  const full = nome.trim();
  const gender = reliableGender(genero);
  if (gender === 'F' && first) return `Notificações Dra. ${first}`;
  if (gender === 'M' && first) return `Notificações Dr. ${first}`;
  return `Notificações ${full || first || 'acompanhamento'}`;
}

/** Nome usado no aviso “para falar diretamente com…”. */
export function contatoChatSpokenName(nome: string, genero?: string | null): string {
  return contatoChatDisplayName(nome, genero);
}
