export function slugifyMentorTitle(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'conteudo';
}

export function nextUniqueMentorSlug(base: string, existing: Set<string>): string {
  const normalized = slugifyMentorTitle(base);
  if (!existing.has(normalized)) return normalized;
  let n = 2;
  while (existing.has(`${normalized}-${n}`)) n += 1;
  return `${normalized}-${n}`;
}
