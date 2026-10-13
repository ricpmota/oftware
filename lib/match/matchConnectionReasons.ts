export const MATCH_CONNECTION_REASONS = [
  { id: 'activity', label: 'Praticar uma atividade' },
  { id: 'shared_goal', label: 'Compartilhamos um objetivo' },
  { id: 'exchange_experiences', label: 'Trocar experiências' },
  { id: 'meet_and_talk', label: 'Conhecer e conversar' },
  { id: 'networking', label: 'Networking' },
] as const;

export type MatchConnectionReasonId = (typeof MATCH_CONNECTION_REASONS)[number]['id'];

const byId = new Map(MATCH_CONNECTION_REASONS.map((item) => [item.id, item]));

export function connectionReasonById(id: string) {
  return byId.get(id as MatchConnectionReasonId);
}

export const MATCH_CONNECTION_MESSAGE_MAX = 300;
