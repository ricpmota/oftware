export interface Paciente {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  telefone?: string;
  anamnese: Anamnese;
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
}

export interface Anamnese {
  // Será definido depois conforme necessidade
  [key: string]: any;
}

export interface SolicitacaoTratamento {
  id: string;
  pacienteId: string;
  medicoId: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  dataSolicitacao: Date;
  dataResposta?: Date;
  motivo?: string;
  anamnese: Anamnese;
}

