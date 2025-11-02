export interface Mensagem {
  id: string;
  titulo: string;
  mensagem: string;
  destinatarios: 'todos' | 'especificos';
  residentesSelecionados: string[]; // Array de emails dos residentes selecionados
  criadoPor: string; // Email do admin
  criadoEm: Date;
  enviadoEm?: Date;
  deletada?: boolean;
  deletadaEm?: Date;
}

export interface MensagemResidente {
  id: string;
  mensagemId: string; // ID da mensagem original
  residenteEmail: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  deletada?: boolean;
}

export interface MensagemResidenteParaAdmin {
  id: string;
  residenteEmail: string;
  residenteNome: string;
  titulo: string;
  mensagem: string;
  anonima: boolean;
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  deletada?: boolean;
  deletadaEm?: Date;
}
