export interface Medico {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    lat?: number;
    lng?: number;
  };
  cidades: {
    estado: string;
    cidade: string;
  }[];
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
}

export interface CidadeAtendimento {
  estado: string;
  cidade: string;
}

