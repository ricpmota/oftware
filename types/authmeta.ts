export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'residente' | 'recepcao';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Residente {
  id: string;
  nome: string;
  nivel: 'R1' | 'R2' | 'R3';
  email: string;
  telefone?: string; // Formato: +5511999999999
  createdAt: Date;
  updatedAt: Date;
}

export interface Local {
  id: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Servico {
  id: string;
  nome: string;
  localId: string;
  local?: Local;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicoDia {
  id: string;
  localId: string;
  servicoId: string;
  turno: 'manha' | 'tarde';
  residentes: string[];
}

export interface Escala {
  id: string;
  dataInicio: Date;
  dias: {
    segunda: ServicoDia[];
    terca: ServicoDia[];
    quarta: ServicoDia[];
    quinta: ServicoDia[];
    sexta: ServicoDia[];
    sabado: ServicoDia[];
    domingo: ServicoDia[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Troca {
  id: string;
  solicitanteId: string;
  destinoId: string;
  data: Date;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  motivo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
}
