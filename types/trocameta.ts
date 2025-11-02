export interface Troca {
  id: string;
  solicitanteEmail: string;
  solicitadoEmail: string;
  escalaId: string;
  dia: string;
  turno: 'manha' | 'tarde';
  servicoId: string;
  localId: string;
  status: 'pendente' | 'aceita' | 'rejeitada' | 'aprovada' | 'cancelada' | 'revertida';
  motivo?: string;
  aprovadoPor?: string; // Email de quem aprovou
  rejeitadoPor?: string; // Email de quem rejeitou
  canceladoPor?: string; // Email de quem cancelou
  revertidoPor?: string; // Email de quem reverteu
  dataAprovacao?: Date; // Data de aprovação para controlar prazo de reversão
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificacaoTroca {
  id: string;
  usuarioEmail: string;
  tipo: 'solicitacao_recebida' | 'solicitacao_aceita' | 'solicitacao_rejeitada' | 'troca_aprovada' | 'troca_cancelada' | 'troca_revertida';
  trocaId: string;
  lida: boolean;
  createdAt: Date;
}
