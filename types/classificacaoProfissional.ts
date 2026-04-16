export type ProfissionalTipo = 'medico' | 'nutricionista' | 'personal';

export interface ClassificacaoProfissional {
  id: string;
  pacienteId: string;
  profissionalTipo: ProfissionalTipo;
  profissionalId: string;
  estrelas: number; // 1 a 5
  createdAt?: Date;
}
