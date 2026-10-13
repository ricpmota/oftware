import type { MatchMonitorStage } from '@/lib/match/matchMonitorStage';

export type MatchCanalDeliveryStatus = 'sent' | 'no_phone' | 'failed' | 'channel_offline' | 'untracked';

export type MatchPhoneSource = 'paciente' | 'medico';

export type MatchMonitorPerson = {
  uid: string;
  displayName: string;
  city: string | null;
  stage: MatchMonitorStage;
  onboardingCompleted: boolean;
  onboardingStep: number;
  discoverable: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  visitCount: number;
  connections: number;
  pendingIn: number;
  pendingOut: number;
  hasPhone: boolean;
  phoneTail: string | null;
  phoneSource: MatchPhoneSource | null;
};

export type MatchMonitorDelivery = {
  uid: string;
  status: MatchCanalDeliveryStatus;
  at: string | null;
  sentMessage: string | null;
};

export type MatchMonitorConnection = {
  pairKey: string;
  connectedAt: string | null;
  left: { uid: string; name: string };
  right: { uid: string; name: string };
  messageForLeft: string;
  messageForRight: string;
  delivery: MatchMonitorDelivery[];
};

export type MatchMonitorRequest = {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  createdAt: string | null;
};

export type MatchMonitorSend = {
  id: string;
  kind: 'connection' | 'broadcast';
  uid: string;
  name: string;
  status: Exclude<MatchCanalDeliveryStatus, 'untracked'>;
  message: string;
  at: string | null;
  error: string | null;
};

export type MatchMonitorBroadcast = {
  id: string;
  message: string;
  createdAt: string | null;
  sent: number;
  failed: number;
  noPhone: number;
  total: number;
};

export type MatchMonitorCity = {
  city: string;
  count: number;
};

export type MatchMonitorStats = {
  entered: number;
  enteredToday: number;
  profiles: number;
  onboardingDone: number;
  discoverable: number;
  paused: number;
  connections: number;
  connectionsWeek: number;
  peopleConnected: number;
  pending: number;
  withoutPhone: number;
};

export type MatchMonitorSnapshot = {
  canalChatConnected: boolean;
  template: string;
  defaultTemplate: string;
  broadcastDraft: string;
  partial: boolean;
  totalPeople: number;
  stats: MatchMonitorStats;
  cities: MatchMonitorCity[];
  people: MatchMonitorPerson[];
  connections: MatchMonitorConnection[];
  requests: MatchMonitorRequest[];
  recentSends: MatchMonitorSend[];
  broadcasts: MatchMonitorBroadcast[];
};

export type MatchBroadcastPatient = {
  id: string;
  name: string;
  city: string | null;
  hasPhone: boolean;
  phoneTail: string | null;
  status: 'ativo' | 'inativo' | 'arquivado' | null;
  treatment: 'abandono' | 'pendente' | 'em_tratamento' | 'concluido' | null;
};

export type MatchBroadcastResultRow = {
  uid: string;
  name: string;
  status: Exclude<MatchCanalDeliveryStatus, 'untracked'>;
  error?: string;
};
