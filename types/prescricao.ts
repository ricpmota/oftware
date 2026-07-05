/** `prescricao`: documento padrão de medicamentos/suplementos. `recibo_medico`: recibo de pagamento da consulta (descrição + valor). */
export type PrescricaoTipoDocumento = 'prescricao' | 'recibo_medico';

export interface Prescricao {
  id: string; // Firestore document ID
  medicoId: string; // ID do médico que criou a prescrição
  pacienteId?: string; // ID do paciente (opcional, pode ser template)
  pacienteNome?: string; // Nome do paciente (para identificar para qual paciente foi salva)
  nome: string; // Nome da prescrição
  descricao: string; // Descrição completa da prescrição
  itens: PrescricaoItem[]; // Itens da prescrição
  observacoes?: string; // Observações adicionais
  /** Ausente ou `prescricao` = prescrição clássica; `recibo_medico` = recibo salvo na mesma coleção. */
  tipoDocumento?: PrescricaoTipoDocumento;
  /** Valor da consulta em reais (apenas para recibo médico). */
  valorConsulta?: number;
  /** Data do recibo definida pelo médico (YYYY-MM-DD). Ausente em templates padrão até o médico preencher. */
  dataRecibo?: string;
  /** No recibo: exibir documento do profissional conforme perfil (CPF ou CNPJ) ou não exibir. */
  reciboDocumentoProfissional?: 'omitir' | 'cpf' | 'cnpj';
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string; // Email do médico
  isTemplate: boolean; // Se é um template ou prescrição específica para um paciente
  pesoPaciente?: number; // Peso do paciente no momento da criação (para prescrições baseadas em peso)
  /** Catálogo SISTEMA: aba no metaadmingeral (`prescricao` | `protocolo`). */
  catalogoAba?: 'prescricao' | 'protocolo';
  /** Pasta do catálogo SISTEMA (Firestore `prescricao_pastas`). */
  pastaId?: string;
  /** Nome da pasta (desnormalizado para exibição). */
  pastaNome?: string;
}

export interface PrescricaoItem {
  medicamento: string; // Nome do medicamento/suplemento
  dosagem: string; // Dosagem (ex: "1,6g por kg", "1 dosador")
  frequencia: string; // Frequência (ex: "3x ao dia", "1x ao dia")
  instrucoes: string; // Instruções detalhadas
  quantidade?: string; // Quantidade total (opcional)
}

