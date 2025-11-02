export interface Ferias {
  id: string;
  residenteEmail: string;
  dataInicio: Date;
  dataFim: Date;
  motivo?: string;
  status?: 'pendente' | 'aprovada' | 'rejeitada';
  aprovadoPor?: string; // Email de quem aprovou
  rejeitadoPor?: string; // Email de quem rejeitou
  observacoes?: string; // Observações do admin
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificacaoFerias {
  id: string;
  usuarioEmail: string;
  tipo: 'solicitacao_ferias' | 'ferias_aprovada' | 'ferias_rejeitada';
  feriasId: string;
  lida: boolean;
  createdAt: Date;
}
