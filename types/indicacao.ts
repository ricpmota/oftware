export interface Indicacao {
  id: string;
  indicadoPor: string; // Email do paciente que indicou
  indicadoPorNome?: string; // Nome do paciente que indicou (opcional, para facilitar)
  telefoneIndicador?: string; // Telefone do paciente que indicou (para contato do médico)
  nomePaciente: string; // Nome do paciente indicado
  telefonePaciente: string; // Telefone do paciente indicado (usado para matching)
  estado: string; // Estado selecionado
  cidade: string; // Cidade selecionada
  medicoId: string; // ID do médico indicado
  medicoNome: string; // Nome do médico (para facilitar)
  status: 'pendente' | 'visualizada' | 'venda' | 'paga'; // Status da indicação
  criadoEm: Date; // Data da indicação
  visualizadaEm?: Date; // Data quando médico visualizou
  virouVendaEm?: Date; // Data quando paciente fez login (matching por telefone)
  pagaEm?: Date; // Data quando médico marcou como paga
  pacienteIdVenda?: string; // ID do paciente quando virou venda (opcional)
}

