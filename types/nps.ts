// Tipos para sistema de NPS (Net Promoter Score)

export type NPSTipo = 'paciente' | 'medico';

export type NPSClassificacao = 'detrator' | 'neutro' | 'promotor';

// Resposta completa de NPS
export interface NPSResposta {
  id: string;
  userId: string; // ID do usuário que respondeu
  tipo: NPSTipo; // paciente ou medico
  dataResposta: Date;
  
  // 1. Pergunta NPS Central (obrigatória)
  npsScore: number; // 0-10
  npsClassificacao: NPSClassificacao; // Calculado automaticamente
  
  // 2. Pergunta Aberta Estratégica
  melhoriaTexto?: string; // Campo texto livre
  
  // 3. Identificação do Perfil (já vem do tipo)
  
  // Bloco Paciente (quando tipo === 'paciente')
  paciente?: {
    acompanhamentoMedico?: 1 | 2 | 3 | 4 | 5; // 1-5 (Excelente a Péssimo)
    clarezaTratamento?: 'muito_claras' | 'claras' | 'mais_ou_menos' | 'confusas';
    segurancaPrivacidade?: 'muito_seguro' | 'seguro' | 'indiferente' | 'inseguro';
    impactoTratamento?: 'ajuda_muito' | 'ajuda' | 'ajuda_pouco' | 'nao_ajuda';
    motivacaoContinuar?: string; // Texto livre
  };
  
  // Bloco Médico (quando tipo === 'medico')
  medico?: {
    facilidadeUso?: 'muito' | 'sim' | 'pouco' | 'nao';
    qualidadeInformacoes?: 'excelentes' | 'boas' | 'regulares' | 'insuficientes';
    ganhoProfissional?: 'muito' | 'sim' | 'pouco' | 'nao';
    intencaoContinuidade?: 'com_certeza' | 'provavelmente' | 'nao_sei' | 'provavelmente_nao';
    oQueTornariaIndispensavel?: string; // Texto livre
  };
  
  // Perguntas Extras (opcionais)
  extras?: {
    comoConheceu?: 'medico' | 'indicacao' | 'instagram' | 'google' | 'outro';
    oQueMaisUsa?: string[]; // Array de strings: acompanhamento_medico, chat, plano_alimentar, medicacao, relatorios
    oQueSenteFalta?: string[]; // Array de strings: mais_contato_medico, mais_conteudo_educativo, mais_automacoes, mais_relatorios, outros
  };
  
  pacienteId?: string; // ID do paciente (quando for resposta de médico sobre um paciente específico)
  medicoResponsavelId?: string; // ID do médico responsável (quando tipo === 'paciente')
}

// Dados agregados para dashboard
export interface NPSEstatisticas {
  npsGeral: number; // NPS geral calculado
  npsPacientes: number; // NPS apenas de pacientes
  npsMedicos: number; // NPS apenas de médicos
  totalRespostas: number;
  totalPacientes: number;
  totalMedicos: number;
  distribuicao: {
    promotores: number;
    neutros: number;
    detratores: number;
  };
  distribuicaoPacientes: {
    promotores: number;
    neutros: number;
    detratores: number;
  };
  distribuicaoMedicos: {
    promotores: number;
    neutros: number;
    detratores: number;
  };
  palavrasChave: Array<{ palavra: string; frequencia: number }>; // Palavras mais frequentes nas respostas abertas
  riscoChurn: number; // % de risco de churn (baseado em detratores e neutros)
}

// Helper para classificar NPS
export function classificarNPS(score: number): NPSClassificacao {
  if (score >= 9) return 'promotor';
  if (score >= 7) return 'neutro';
  return 'detrator';
}

// Helper para calcular NPS (Promotores % - Detratores %)
export function calcularNPS(respostas: NPSResposta[]): number {
  if (respostas.length === 0) return 0;
  
  const distribuicao = respostas.reduce((acc, r) => {
    acc[r.npsClassificacao]++;
    return acc;
  }, { promotor: 0, neutro: 0, detrator: 0 });
  
  const pctPromotores = (distribuicao.promotor / respostas.length) * 100;
  const pctDetratores = (distribuicao.detrator / respostas.length) * 100;
  
  return pctPromotores - pctDetratores;
}
