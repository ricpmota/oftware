export interface InternalNotification {
  id: string;
  residenteEmail: string;
  residenteNome: string;
  titulo: string;
  mensagem: string;
  tipo: 'admin' | 'troca_aprovada' | 'troca_rejeitada' | 'escala' | 'geral';
  lida: boolean;
  criadoPor: string; // email do admin ou 'sistema'
  criadoEm: Date;
  dadosAdicionais?: {
    trocaId?: string;
    escalaId?: string;
    servicoNome?: string;
    localNome?: string;
    data?: string;
  };
}

export interface NotificationStats {
  total: number;
  naoLidas: number;
  porTipo: {
    admin: number;
    troca_aprovada: number;
    troca_rejeitada: number;
    escala: number;
    geral: number;
  };
}
