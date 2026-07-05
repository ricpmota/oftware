import type { Lembrete } from '@/types/lembrete';

export type LembretesMutation =
  | { op: 'add'; lembrete: Lembrete }
  | { op: 'update'; id: string; patch: Partial<Lembrete> }
  | { op: 'remove'; id: string };

function sortLembretes(items: Lembrete[]): Lembrete[] {
  return [...items].sort((a, b) => a.data.localeCompare(b.data));
}

export function applyLembretesMutation(
  current: Lembrete[],
  mutation: LembretesMutation
): Lembrete[] {
  switch (mutation.op) {
    case 'add':
      return sortLembretes([...current, mutation.lembrete]);
    case 'update':
      return current.map((l) =>
        l.id === mutation.id ? { ...l, ...mutation.patch } : l
      );
    case 'remove':
      return current.filter((l) => l.id !== mutation.id);
    default:
      return current;
  }
}
