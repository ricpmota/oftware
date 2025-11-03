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
}

export interface CidadeAtendimento {
  estado: string;
  cidade: string;
}

