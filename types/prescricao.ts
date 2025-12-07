export interface Prescricao {
  id: string; // Firestore document ID
  medicoId: string; // ID do médico que criou a prescrição
  pacienteId?: string; // ID do paciente (opcional, pode ser template)
  nome: string; // Nome da prescrição
  descricao: string; // Descrição completa da prescrição
  itens: PrescricaoItem[]; // Itens da prescrição
  observacoes?: string; // Observações adicionais
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string; // Email do médico
  isTemplate: boolean; // Se é um template ou prescrição específica para um paciente
  pesoPaciente?: number; // Peso do paciente no momento da criação (para prescrições baseadas em peso)
}

export interface PrescricaoItem {
  medicamento: string; // Nome do medicamento/suplemento
  dosagem: string; // Dosagem (ex: "1,6g por kg", "1 dosador")
  frequencia: string; // Frequência (ex: "3x ao dia", "1x ao dia")
  instrucoes: string; // Instruções detalhadas
  quantidade?: string; // Quantidade total (opcional)
}

