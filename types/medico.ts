export interface Medico {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  genero?: 'M' | 'F'; // Para exibir Dr./Dra.
  telefone?: string; // Telefone do médico
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    cep?: string;
    pontoReferencia?: string;
    lat?: number;
    lng?: number;
  };
  cidades: {
    estado: string;
    cidade: string;
  }[];
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
  isVerificado?: boolean; // Verificação do médico pelo admin
  temPlanoIndicacao?: boolean; // Se o médico tem plano de indicações ativo
  planoIndicacao?: {
    tipoValor: 'negociado' | 'fixo'; // Valor negociado com cada cliente ou fixo para todos
    tipoComissao: 'por_dose' | 'por_tratamento'; // Comissão por dose ou por tratamento completo
    // Se por_dose
    valorPorDose?: number; // Valor da comissão por dose (em R$)
    // Se por_tratamento
    tempoTratamentoMeses?: number; // Duração do tratamento em meses
    totalMedicamentoMg?: number; // Total de medicamento por tratamento em mg
    valorComissaoTratamento?: number; // Valor da comissão por tratamento completo (em R$)
  };
}

export interface CidadeAtendimento {
  estado: string;
  cidade: string;
}

